/**
 * Translation between the Messages protocol the creation workbench speaks and the Host's model calls: a request becomes
 * the Host's system prompt, messages and tools, and the Host's stream chunks become Messages stream events.
 */
import { brandString } from '@deepseek-ai/dsh-brand'
import {
  createAssistantMessage, createToolResultMessage, type ContentBlock, type ImageBlock, type RequestMessage, type StreamChunk,
  type ToolCallId, type ToolSchema,
} from '@deepseek-ai/dsh-llm'

/**
 * Store one encoded image so a request can carry it.
 * @param data - the image bytes.
 * @param mediaType - the declared media type.
 * @returns the image block, or undefined when the Host cannot store images.
 */
export type SaveImage = (data: Uint8Array, mediaType: string) => Promise<ImageBlock | undefined>

/** A Messages request translated for the Host. */
export interface BridgedRequest {
  /** `provider/model` the request runs on. */
  readonly route: string
  readonly provider: string
  readonly model: string
  readonly system: string
  readonly messages: RequestMessage[]
  readonly tools: ToolSchema[]
  readonly maxTokens: number | undefined
  readonly stream: boolean
}

type Json = Readonly<Record<string, unknown>>

/** The request is not a valid Messages request. */
export class BridgeRequestError extends Error {
  override name = 'BridgeRequestError'
}

function record(value: unknown): Json | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Json : undefined
}

function blocksOf(content: unknown): Json[] {
  if (typeof content === 'string') return content === '' ? [] : [{ type: 'text', text: content }]
  if (!Array.isArray(content)) return []
  return content.flatMap((item: unknown) => {
    const block = record(item)
    return block === undefined ? [] : [block]
  })
}

/** Text and images of one block list; other blocks are dropped. */
async function plainContent(blocks: readonly Json[], saveImage: SaveImage): Promise<ContentBlock[]> {
  const out: ContentBlock[] = []
  for (const block of blocks) {
    if (block.type === 'text' && typeof block.text === 'string') out.push({ type: 'text', text: block.text })
    if (block.type !== 'image') continue
    const source = record(block.source)
    if (source?.type !== 'base64' || typeof source.data !== 'string' || typeof source.media_type !== 'string') continue
    const image = await saveImage(Buffer.from(source.data, 'base64'), source.media_type)
    out.push(image ?? { type: 'text', text: '［这里有一张图片，当前环境无法把它交给模型］' })
  }
  return out
}

function systemText(system: unknown): string {
  if (typeof system === 'string') return system
  return blocksOf(system).flatMap(block => typeof block.text === 'string' ? [block.text] : []).join('\n\n')
}

/**
 * Split a `provider/model` route at its first slash; model ids may contain more.
 * @param route - the route.
 * @returns provider and model, or undefined without text on both sides of a slash.
 */
export function splitRoute(route: string): { readonly provider: string; readonly model: string } | undefined {
  const slash = route.indexOf('/')
  return slash <= 0 || slash === route.length - 1 ? undefined : { provider: route.slice(0, slash), model: route.slice(slash + 1) }
}

/**
 * Translate a Messages request: user turns keep their text and images, tool results become tool messages, assistant
 * turns keep their text and tool calls, and tools become Host tool schemas. Thinking and server-tool blocks are dropped,
 * since the Host replays only what its own adapters produced.
 * @param body - the parsed request; `model` is a `provider/model` route, or empty or `dsh` for the default.
 * @param saveImage - stores request images.
 * @param defaultRoute - the client's default model, used when the request names none.
 * @returns the translated request.
 * @throws {BridgeRequestError} when no model is known, the model is not `provider/model`, `messages` is missing, or a
 * turn has an unknown role.
 */
export async function bridgeRequest(body: Json, saveImage: SaveImage, defaultRoute: string | undefined): Promise<BridgedRequest> {
  const named = typeof body.model === 'string' && body.model !== '' && body.model !== 'dsh' ? body.model : undefined
  const route = named ?? defaultRoute
  if (route === undefined) throw new BridgeRequestError('客户端还没有选默认模型')
  const target = splitRoute(route)
  if (target === undefined) throw new BridgeRequestError(`模型要写成「服务商/模型」：${route}`)
  if (!Array.isArray(body.messages)) throw new BridgeRequestError('messages 必须是数组')
  const messages: RequestMessage[] = []
  for (const entry of body.messages) {
    const turn = record(entry)
    const blocks = blocksOf(turn?.content)
    if (turn?.role === 'user') {
      for (const block of blocks.filter(item => item.type === 'tool_result')) {
        if (typeof block.tool_use_id !== 'string') throw new BridgeRequestError('tool_result 缺少 tool_use_id')
        messages.push(createToolResultMessage({
          callId: brandString<ToolCallId>(block.tool_use_id),
          content: await plainContent(blocksOf(block.content), saveImage),
          isError: block.is_error === true,
        }))
      }
      const content = await plainContent(blocks.filter(item => item.type !== 'tool_result'), saveImage)
      if (content.length > 0) messages.push({ role: 'user', content })
      continue
    }
    if (turn?.role !== 'assistant') throw new BridgeRequestError(`不认识的角色：${String(turn?.role)}`)
    const content: ContentBlock[] = []
    for (const block of blocks) {
      if (block.type === 'text' && typeof block.text === 'string' && block.text !== '') content.push({ type: 'text', text: block.text })
      if (block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string') {
        content.push({ type: 'tool-call', id: brandString<ToolCallId>(block.id), name: block.name, arguments: JSON.stringify(block.input ?? {}) })
      }
    }
    // History written by the workbench is attributed to the model that now answers.
    if (content.length > 0) messages.push(createAssistantMessage({ content, source: target }))
  }
  const tools = (Array.isArray(body.tools) ? body.tools : []).flatMap((item: unknown): ToolSchema[] => {
    const tool = record(item)
    // Server tools carry a versioned `type`; the Host runs only tools the caller executes.
    if (tool === undefined || typeof tool.name !== 'string' || (tool.type !== undefined && tool.type !== 'custom')) return []
    return [{ name: tool.name, description: typeof tool.description === 'string' ? tool.description : '', parameters: record(tool.input_schema) ?? { type: 'object' } }]
  })
  return {
    route,
    ...target,
    system: systemText(body.system),
    messages,
    tools,
    maxTokens: typeof body.max_tokens === 'number' && body.max_tokens > 0 ? body.max_tokens : undefined,
    stream: body.stream === true,
  }
}

/** One Messages stream event. */
export interface BridgeEvent {
  readonly type: string
  readonly [field: string]: unknown
}

type FinalBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown; json: string }

/**
 * Turn Host stream chunks into Messages stream events, and keep the assembled message for non-streaming replies.
 * Tool calls start when their id and name are known, from the first argument delta or the finished block.
 */
export class MessagesStreamWriter {
  private readonly blocks: FinalBlock[] = []
  /** Host block index to Messages block index. */
  private readonly indexes = new Map<number, number>()
  private readonly pendingTools = new Set<number>()
  private inputTokens = 0
  private outputTokens = 0
  private stopReason = 'end_turn'

  /**
   * @param id - message id.
   * @param model - the `provider/model` route that answers.
   * @param emit - receives each event in order.
   */
  constructor(private readonly id: string, private readonly model: string, private readonly emit: (event: BridgeEvent) => void) {}

  /** Emit `message_start`. */
  start(): void {
    this.emit({ type: 'message_start', message: { ...this.message(), content: [], stop_reason: null } })
  }

  private message(): Json {
    return {
      id: this.id, type: 'message', role: 'assistant', model: this.model, stop_sequence: null,
      usage: { input_tokens: this.inputTokens, output_tokens: this.outputTokens },
    }
  }

  private open(index: number, block: FinalBlock): void {
    const target = this.blocks.length
    this.blocks.push(block)
    this.indexes.set(index, target)
    const announced = block.type === 'tool_use' ? { type: 'tool_use', id: block.id, name: block.name, input: {} } : block.type === 'text' ? { type: 'text', text: '' } : { type: 'thinking', thinking: '', signature: '' }
    this.emit({ type: 'content_block_start', index: target, content_block: announced })
  }

  /**
   * Translate one Host chunk.
   * @param chunk - the chunk.
   * @throws {Error} with the provider's message when the call finished with an error or was aborted.
   */
  push(chunk: StreamChunk): void {
    switch (chunk.type) {
      case 'block-start':
        if (chunk.blockType === 'text') this.open(chunk.index, { type: 'text', text: '' })
        else if (chunk.blockType === 'reasoning') this.open(chunk.index, { type: 'thinking', thinking: '', signature: '' })
        else if (chunk.blockType === 'tool-call') this.pendingTools.add(chunk.index)
        return
      case 'text-delta': {
        const target = this.indexes.get(chunk.index)
        const block = target === undefined ? undefined : this.blocks[target]
        if (target === undefined || block?.type !== 'text') return
        block.text += chunk.text
        this.emit({ type: 'content_block_delta', index: target, delta: { type: 'text_delta', text: chunk.text } })
        return
      }
      case 'reasoning-delta': {
        const target = this.indexes.get(chunk.index)
        const block = target === undefined ? undefined : this.blocks[target]
        if (target === undefined || block?.type !== 'thinking') return
        block.thinking += chunk.text
        this.emit({ type: 'content_block_delta', index: target, delta: { type: 'thinking_delta', thinking: chunk.text } })
        return
      }
      case 'tool-call-delta': {
        if (this.pendingTools.delete(chunk.index)) this.open(chunk.index, { type: 'tool_use', id: chunk.id, name: chunk.name ?? '', input: {}, json: '' })
        const target = this.indexes.get(chunk.index)
        const block = target === undefined ? undefined : this.blocks[target]
        if (target === undefined || block?.type !== 'tool_use' || chunk.argumentsDelta === '') return
        block.json += chunk.argumentsDelta
        this.emit({ type: 'content_block_delta', index: target, delta: { type: 'input_json_delta', partial_json: chunk.argumentsDelta } })
        return
      }
      case 'block-end':
        this.end(chunk.index, chunk.block)
        return
      case 'usage':
        this.inputTokens = chunk.usage.inputTokens
        this.outputTokens = chunk.usage.outputTokens
        return
      case 'finish':
        this.finish(chunk)
        return
      default:
        // Merge-extensible chunk kinds carry nothing the Messages protocol shows.
        return
    }
  }

  private end(index: number, block: ContentBlock): void {
    if (block.type === 'tool-call' && this.pendingTools.delete(index)) {
      this.open(index, { type: 'tool_use', id: block.id, name: block.name, input: {}, json: '' })
      const target = this.indexes.get(index) ?? 0
      const tool = this.blocks[target]
      if (tool?.type === 'tool_use' && block.arguments !== '') {
        tool.json = block.arguments
        this.emit({ type: 'content_block_delta', index: target, delta: { type: 'input_json_delta', partial_json: block.arguments } })
      }
    }
    const target = this.indexes.get(index)
    if (target === undefined) return
    const finished = this.blocks[target]
    if (finished?.type === 'tool_use') {
      if (block.type === 'tool-call') finished.json = block.arguments
      try {
        finished.input = finished.json === '' ? {} : JSON.parse(finished.json)
      } catch (_malformed: unknown) {
        // A truncated argument string stays visible to the caller, which reports it as incomplete input.
        finished.input = finished.json
      }
    }
    this.emit({ type: 'content_block_stop', index: target })
    this.indexes.delete(index)
  }

  private finish(chunk: Extract<StreamChunk, { type: 'finish' }>): void {
    switch (chunk.reason.kind) {
      case 'error':
      case 'aborted':
        throw new Error(chunk.reason.failure.message)
      case 'tool-calls':
        this.stopReason = 'tool_use'
        break
      case 'max-tokens':
        this.stopReason = 'max_tokens'
        break
      default:
        this.stopReason = 'end_turn'
    }
    this.emit({ type: 'message_delta', delta: { stop_reason: this.stopReason, stop_sequence: null }, usage: { output_tokens: this.outputTokens } })
    this.emit({ type: 'message_stop' })
  }

  /**
   * The assembled message, for a non-streaming reply.
   * @returns the Messages response body.
   */
  final(): Json {
    return {
      ...this.message(),
      stop_reason: this.stopReason,
      content: this.blocks.map(block => block.type === 'tool_use' ? { type: 'tool_use', id: block.id, name: block.name, input: block.input } : block),
    }
  }
}
