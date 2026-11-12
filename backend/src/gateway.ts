/**
 * Model gateway of the creation workbench: a loopback HTTP endpoint that speaks the Messages protocol and runs each
 * request on the Host's own model calls, so the workbench can use every model the client can load with the client's
 * credentials, which never reach the workbench. It also offers web search and fetch through the Host's `web` service,
 * standing in for server-side web tools that only some providers run.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { RequestMessage, StreamChunk, ToolSchema } from '@deepseek-ai/dsh-llm'
import { BridgeRequestError, bridgeRequest, MessagesStreamWriter, type BridgeEvent, type SaveImage } from './messages-bridge.ts'

export { splitRoute } from './messages-bridge.ts'

/** One model the client can call, as `provider/model`. */
export interface GatewayModel {
  readonly id: string
  readonly name: string
}

/** The Host's model calls, as the gateway uses them. */
export interface GatewayLlm {
  /** Every model the client's providers list; providers that fail to list are skipped. */
  readonly models: () => Promise<readonly GatewayModel[]>
  /** The client's default model as `provider/model`, or undefined when none is chosen. */
  readonly defaultRoute: () => string | undefined
  /** Run one model call and stream its chunks. */
  readonly stream: (request: {
    readonly provider: string
    readonly model: string
    readonly system: string
    readonly messages: RequestMessage[]
    readonly tools: ToolSchema[]
    readonly maxTokens: number | undefined
    readonly signal: AbortSignal
  }) => AsyncIterable<StreamChunk>
  readonly saveImage: SaveImage
}

/** Web access the gateway offers; undefined when the Host has no `web` service. */
export interface GatewayWeb {
  readonly search: (query: string, maxResults: number, signal: AbortSignal) => Promise<readonly {
    readonly url: string
    readonly title?: string | undefined
    readonly snippet?: string | undefined
    readonly publishedAt?: string | undefined
  }[]>
  readonly fetch: (url: string, signal: AbortSignal) => Promise<{ readonly url: string; readonly status: number; readonly text: string }>
}

/** Settings of the gateway. */
export interface GatewayOptions {
  readonly llm: GatewayLlm
  readonly web: () => GatewayWeb | undefined
  /** Most characters of a fetched page returned to the workbench. */
  readonly fetchChars: number
}

/** Most bytes of one request body; reference images make agent requests large. */
const MAX_BODY_BYTES = 64 * 1024 * 1024

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new BridgeRequestError('请求太大')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

/** An error in the Messages API error format, which the Anthropic SDK reports with its message. */
function apiError(response: ServerResponse, status: number, type: string, message: string): void {
  sendJson(response, status, { type: 'error', error: { type, message } })
}

function parseObject(raw: Buffer): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw.toString('utf8') || '{}')
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new BridgeRequestError('请求体不是 JSON 对象')
  return parsed as Record<string, unknown>
}

/** The loopback gateway; started on first use, stopped with the suite. */
export class StudioGateway {
  /** Secret the workbench presents as its API key. */
  readonly key = randomBytes(24).toString('hex')
  private server: Server | undefined
  private listening: Promise<string> | undefined
  private readonly inflight = new Set<AbortController>()

  /**
   * @param options - gateway settings.
   */
  constructor(private readonly options: GatewayOptions) {}

  /**
   * Start listening on a free loopback port unless already listening.
   * @returns the gateway root URL.
   */
  async start(): Promise<string> {
    this.listening ??= new Promise((resolve, reject) => {
      const server = createServer((request, response) => { void this.handle(request, response) })
      this.server = server
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${String((server.address() as AddressInfo).port)}`)
      })
    })
    return await this.listening
  }

  /** Stop listening and abort running calls. */
  stop(): void {
    for (const controller of this.inflight) controller.abort()
    this.inflight.clear()
    this.server?.close()
    this.server?.closeAllConnections()
    this.server = undefined
    this.listening = undefined
  }

  private authorized(request: IncomingMessage): boolean {
    const header = request.headers['x-api-key'] ?? request.headers.authorization?.replace(/^Bearer\s+/i, '')
    const given = Buffer.from(typeof header === 'string' ? header : '')
    const expected = Buffer.from(this.key)
    return given.length === expected.length && timingSafeEqual(given, expected)
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const controller = new AbortController()
    this.inflight.add(controller)
    response.on('close', () => { if (!response.writableEnded) controller.abort() })
    try {
      // Only the workbench holds the key; a browser page elsewhere cannot read it or pass this check.
      if (!this.authorized(request)) {
        apiError(response, 401, 'authentication_error', 'gateway key mismatch')
        return
      }
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
      if (request.method === 'GET' && path === '/models') {
        sendJson(response, 200, { default: this.options.llm.defaultRoute(), models: await this.options.llm.models() })
      } else if (request.method === 'POST' && path === '/v1/messages') {
        await this.messages(request, response, controller.signal)
      } else if (request.method === 'POST' && path === '/web/search') {
        await this.search(request, response, controller.signal)
      } else if (request.method === 'POST' && path === '/web/fetch') {
        await this.fetchPage(request, response, controller.signal)
      } else {
        apiError(response, 404, 'not_found_error', 'not found')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (response.headersSent) response.end()
      else apiError(response, error instanceof BridgeRequestError || error instanceof SyntaxError ? 400 : 500, 'api_error', message)
    } finally {
      this.inflight.delete(controller)
    }
  }

  private async messages(request: IncomingMessage, response: ServerResponse, signal: AbortSignal): Promise<void> {
    const bridged = await bridgeRequest(parseObject(await readBody(request)), this.options.llm.saveImage, this.options.llm.defaultRoute())
    const routeText = bridged.route
    const chunks = this.options.llm.stream({
      provider: bridged.provider, model: bridged.model, system: bridged.system, messages: bridged.messages, tools: bridged.tools,
      maxTokens: bridged.maxTokens, signal,
    })
    const id = `msg_${randomUUID().replaceAll('-', '')}`
    if (!bridged.stream) {
      const writer = new MessagesStreamWriter(id, routeText, () => {})
      for await (const chunk of chunks) writer.push(chunk)
      sendJson(response, 200, writer.final())
      return
    }
    response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' })
    const send = (event: BridgeEvent): void => { response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`) }
    const writer = new MessagesStreamWriter(id, routeText, send)
    writer.start()
    try {
      for await (const chunk of chunks) writer.push(chunk)
    } catch (error) {
      send({ type: 'error', error: { type: 'api_error', message: error instanceof Error ? error.message : String(error) } })
    }
    response.end()
  }

  private async search(request: IncomingMessage, response: ServerResponse, signal: AbortSignal): Promise<void> {
    const web = this.options.web()
    if (web === undefined) {
      apiError(response, 503, 'api_error', '客户端没有启用联网搜索')
      return
    }
    const body = parseObject(await readBody(request))
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (query === '') throw new BridgeRequestError('缺少 query')
    const max = typeof body.max_results === 'number' && body.max_results > 0 ? Math.min(20, Math.floor(body.max_results)) : 8
    sendJson(response, 200, { results: await web.search(query, max, signal) })
  }

  private async fetchPage(request: IncomingMessage, response: ServerResponse, signal: AbortSignal): Promise<void> {
    const web = this.options.web()
    if (web === undefined) {
      apiError(response, 503, 'api_error', '客户端没有启用网页读取')
      return
    }
    const body = parseObject(await readBody(request))
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!/^https?:\/\//.test(url)) throw new BridgeRequestError('url 要以 http:// 或 https:// 开头')
    const page = await web.fetch(url, signal)
    const limit = this.options.fetchChars
    sendJson(response, 200, { ...page, text: page.text.slice(0, limit), truncated: page.text.length > limit })
  }
}
