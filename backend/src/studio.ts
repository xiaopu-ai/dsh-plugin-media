/**
 * Creation workbench: an external local web app for writing articles and 小红书 cards, which the suite starts as a child
 * process and the page embeds. The suite owns the process and its write token; the workbench owns its data.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { MediaRelatedPost, MediaTopicSuggestion } from './types.ts'

/** Settings of the workbench process. */
export interface StudioOptions {
  /** Folder holding the workbench's `server.mjs`. */
  readonly dir: string
  /** Loopback port the workbench listens on. */
  readonly port: number
  /** How long the workbench may take to answer after starting, in milliseconds. */
  readonly startMs: number
  /** Origins allowed to embed the workbench's previews, as CSP `frame-ancestors` sources. */
  readonly frameAncestors: readonly string[]
  /** Model gateway through which the workbench uses the client's models; omitted keeps the workbench's own models only. */
  readonly gateway?: StudioGatewayInfo | undefined
  /**
   * Report a line the workbench wrote to stderr, or its unexpected exit.
   * @param message - the text.
   */
  readonly warn: (message: string) => void
}

/** What the workbench needs to reach the model gateway. */
export interface StudioGatewayInfo {
  /** Start the gateway unless it listens; resolves to its root URL. */
  readonly start: () => Promise<string>
  readonly key: string
}

/** A topic idea in the workbench's `idea` fields; the workbench files it under the new project's research notes. */
export interface StudioIdea {
  readonly title: string
  readonly angle?: string | undefined
  readonly why?: string | undefined
  readonly hook?: string | undefined
  readonly brief?: string | undefined
  /** Candidate titles; a video script lists them under its cover and titles. */
  readonly headlines?: readonly string[] | undefined
  /** Filming plan of a video topic; the workbench fills a new video script's skeleton from it. */
  readonly script?: {
    readonly hook: string
    readonly outline: readonly string[]
    readonly seconds: number
    readonly cover: string
  } | undefined
  readonly evidence: readonly { readonly sourceName: string; readonly title: string; readonly url: string }[]
  readonly sources: readonly string[]
}

/** Kinds of project the workbench creates: a 公众号 article, a video script or a 小红书 card set. */
export type StudioProjectType = 'article' | 'script' | 'card'

/** The workbench could not start, answer or create a project. */
export class StudioError extends Error {
  override name = 'StudioError'
}

/** Most characters of a project folder name taken from a topic title. */
const NAME_CHARS = 40

/**
 * Folder-safe project name from a topic title: slashes become dashes and long titles are cut.
 * @param title - the topic title.
 * @returns the name.
 */
export function studioProjectName(title: string): string {
  const cleaned = title.replace(/[/\\:]+/g, '-').replace(/\s+/g, ' ').trim()
  return Array.from(cleaned).slice(0, NAME_CHARS).join('').trim() || '新选题'
}

function relatedLine(post: MediaRelatedPost, platformName: string): string {
  const counts = [post.likes === undefined ? undefined : `赞 ${String(post.likes)}`, post.comments === undefined ? undefined : `评 ${String(post.comments)}`,
    post.collects === undefined ? undefined : `藏 ${String(post.collects)}`].filter(part => part !== undefined).join(' · ')
  return `- [${platformName} @${post.author || '未知作者'}] [${post.title.replace(/\s+/g, ' ').slice(0, 60) || '（无标题）'}](${post.url})${counts === '' ? '' : `（${counts}）`}`
}

/**
 * Turn a topic suggestion into a workbench idea: the angle and reasoning become the topic note, the headlines,
 * keywords, references, related posts and a video topic's filming plan become the writing brief, and the related
 * posts become the evidence links.
 * @param suggestion - the suggestion.
 * @param account - name of the account the topic is for.
 * @param platformName - display name of its platform.
 * @returns the idea.
 */
export function studioIdeaFrom(suggestion: MediaTopicSuggestion, account: string, platformName: string): StudioIdea {
  const brief = [
    `来自「自媒体 · 选题」：账号 ${account}（${platformName}）`,
    suggestion.headlines.length === 0 ? '' : `## 候选标题\n${suggestion.headlines.map(headline => `- ${headline}`).join('\n')}`,
    suggestion.video === undefined ? '' : [
      '## 视频方案',
      suggestion.video.hook === '' ? '' : `- 开口第一句：${suggestion.video.hook}`,
      ...suggestion.video.outline.map((point, index) => `- 第 ${String(index + 1)} 段：${point}`),
      suggestion.video.seconds === 0 ? '' : `- 建议时长：${String(suggestion.video.seconds)} 秒`,
      suggestion.video.cover === '' ? '' : `- 封面字：${suggestion.video.cover}`,
    ].filter(line => line !== '').join('\n'),
    suggestion.keywords.length === 0 ? '' : `## 关键词\n${suggestion.keywords.join('、')}`,
    suggestion.references.length === 0 ? '' : `## 参考的自有作品\n${suggestion.references.map(reference => `- ${reference}`).join('\n')}`,
    suggestion.related.length === 0 ? '' : `## ${platformName}同类作品\n${suggestion.related.map(post => relatedLine(post, platformName)).join('\n')}`,
  ].filter(part => part !== '').join('\n\n')
  return {
    title: suggestion.title,
    angle: suggestion.angle || undefined,
    why: suggestion.reason || undefined,
    hook: suggestion.headlines[0],
    brief,
    headlines: suggestion.headlines,
    script: suggestion.video,
    // Titles go into Markdown link text, where a line break would end the link.
    evidence: suggestion.related.map(post => ({
      sourceName: `${platformName} @${post.author || '未知作者'}`, title: post.title.replace(/\s+/g, ' ').trim().slice(0, 80) || '（无标题）', url: post.url,
    })),
    sources: suggestion.related.map(post => post.url),
  }
}

/** What one turn of the workbench's writing assistant did. */
export interface StudioTurn {
  readonly reply: string
  readonly files: readonly string[]
  readonly steps: readonly string[]
}

function textField(event: Record<string, unknown>, key: string): string {
  const value = event[key]
  return typeof value === 'string' ? value : ''
}

/**
 * Fold the assistant's newline-delimited event stream into its outcome.
 * @param body - the response body.
 * @returns the turn outcome.
 * @throws {StudioError} when the stream reports an error or ends without finishing.
 */
export async function readTurn(body: ReadableStream<Uint8Array>): Promise<StudioTurn> {
  const steps: string[] = []
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffered = ''
  const handle = (line: string): StudioTurn | undefined => {
    if (line.trim() === '') return undefined
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch (_error: unknown) {
      // A line that is not JSON carries no event; the stream continues.
      return undefined
    }
    if (parsed === null || typeof parsed !== 'object') return undefined
    const event = parsed as Record<string, unknown>
    if (event.type === 'step') steps.push(textField(event, 'text'))
    if (event.type === 'error') throw new StudioError(textField(event, 'error') || '写作助手出错了')
    if (event.type !== 'done') return undefined
    const files = Array.isArray(event.files) ? event.files.filter((file): file is string => typeof file === 'string') : []
    return { reply: textField(event, 'reply'), files, steps }
  }
  for (;;) {
    const { done, value } = await reader.read()
    buffered += decoder.decode(value, { stream: !done })
    const lines = buffered.split('\n')
    buffered = done ? '' : lines.pop() ?? ''
    for (const line of lines) {
      const outcome = handle(line)
      if (outcome !== undefined) return outcome
    }
    if (done) throw new StudioError('写作助手没有做完就断开了')
  }
}

/** Owner of the workbench process: starts it on first use and stops it on dispose. */
export class StudioRunner {
  private readonly token = randomBytes(16).toString('hex')
  private child: ChildProcess | undefined
  private starting: Promise<void> | undefined

  /**
   * @param options - process settings.
   */
  constructor(private readonly options: StudioOptions) {}

  /** Root URL of the workbench server. */
  get url(): string {
    return `http://127.0.0.1:${String(this.options.port)}/`
  }

  /** URL of the workbench page in embedded mode, which leaves its branding to the surrounding page. */
  get pageUrl(): string {
    return `${this.url}?embed=dsh`
  }

  /**
   * Start the workbench unless it is running, and wait until it answers.
   * @param signal - cancellation of the wait.
   * @returns the embedded page URL.
   * @throws {StudioError} when the folder has no `server.mjs`, the process exits, or it does not answer in time.
   */
  async ensure(signal: AbortSignal): Promise<string> {
    // A process killed by a signal keeps exitCode null and sets signalCode instead.
    if (this.child === undefined || this.child.exitCode !== null || this.child.signalCode !== null) this.starting = undefined
    this.starting ??= this.start()
    const starting = this.starting
    try {
      await Promise.race([starting, new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => { reject(signal.reason instanceof Error ? signal.reason : new Error('aborted')) }, { once: true })
      })])
    } catch (error) {
      if (this.starting === starting && !signal.aborted) this.starting = undefined
      throw error
    }
    return this.pageUrl
  }

  private async start(): Promise<void> {
    const script = join(this.options.dir, 'server.mjs')
    if (!existsSync(script)) throw new StudioError(`创作工作台文件夹里没有 server.mjs：${this.options.dir}`)
    const gateway = this.options.gateway
    // The workbench lists the client's models as providers when these variables are present.
    const gatewayEnv = gateway === undefined ? {} : { WB_DSH_GATEWAY: await gateway.start(), WB_DSH_GATEWAY_KEY: gateway.key }
    const child = spawn(process.execPath, [script, '--port', String(this.options.port)], {
      cwd: this.options.dir,
      // The desktop Host runs inside Electron; ELECTRON_RUN_AS_NODE makes its binary run the script as plain Node.
      env: {
        ...process.env, ELECTRON_RUN_AS_NODE: '1', WB_TOKEN: this.token, WB_FRAME_ANCESTORS: this.options.frameAncestors.join(' '), ...gatewayEnv,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    this.child = child
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
      this.options.warn(`media-suite: workbench: ${chunk.trim()}`)
    })
    const exited = new Promise<never>((_resolve, reject) => {
      child.once('exit', (code) => { reject(new StudioError(`创作工作台启动后退出了（代码 ${String(code)}）：${stderr.trim().slice(-300) || '没有输出'}`)) })
      child.once('error', (error) => { reject(new StudioError(`无法启动创作工作台：${error.message}`)) })
    })
    exited.catch(() => {
      // Observed through the race below and by later calls; an exit after startup only resets the runner.
    })
    const deadline = Date.now() + this.options.startMs
    while (Date.now() < deadline) {
      const ready = await Promise.race([this.answers(), exited])
      if (ready) return
      await Promise.race([new Promise((resolve) => { setTimeout(resolve, 250) }), exited])
    }
    this.stop()
    throw new StudioError(`创作工作台 ${String(this.options.startMs / 1000)} 秒内没有响应；端口 ${String(this.options.port)} 可能被别的程序占用`)
  }

  private async answers(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}api/stamp`, { signal: AbortSignal.timeout(1000) })
      return response.ok
    } catch (_error: unknown) {
      // Not listening yet; the caller polls again until the deadline.
      return false
    }
  }

  /**
   * Call one workbench API route with the write token.
   * @param method - HTTP method.
   * @param path - path under `/api/`, already encoded.
   * @param body - JSON body; omitted for reads.
   * @param signal - cancellation.
   * @returns the parsed JSON answer.
   * @throws {StudioError} with the workbench's reason when it answers with an error.
   */
  async request(method: 'GET' | 'POST' | 'PUT', path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    await this.ensure(signal)
    const response = await fetch(`${this.url}api/${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-wb-token': this.token, origin: this.url.slice(0, -1) },
      body: body === undefined ? null : JSON.stringify(body),
      signal,
    })
    const answer: unknown = await response.json().catch(() => undefined)
    if (response.ok) return answer
    const record = answer !== null && typeof answer === 'object' ? answer as Record<string, unknown> : {}
    throw new StudioError(typeof record.error === 'string' ? record.error : `HTTP ${String(response.status)}`)
  }

  /**
   * Create a project in the workbench from an idea.
   * @param type - `article`, `script` (a video script) or `card`.
   * @param name - project name; a taken name gets a number appended.
   * @param idea - the topic idea.
   * @param signal - cancellation.
   * @returns the new project's id.
   * @throws {StudioError} when the workbench refuses the project.
   */
  async create(type: StudioProjectType, name: string, idea: StudioIdea, signal: AbortSignal): Promise<string> {
    for (let attempt = 1; attempt <= 20; attempt++) {
      const candidate = attempt === 1 ? name : `${name} ${String(attempt)}`
      try {
        const answer = await this.request('POST', 'projects', { type, name: candidate, idea }, signal)
        const fields = answer !== null && typeof answer === 'object' ? answer as Record<string, unknown> : {}
        if (typeof fields.id === 'string') return fields.id
        throw new StudioError(typeof fields.error === 'string' ? fields.error : '创作工作台没有返回新项目的 id')
      } catch (error) {
        if (!(error instanceof StudioError) || !error.message.includes('已存在')) {
          throw error instanceof StudioError ? new StudioError(`创作工作台没能新建项目：${error.message}`) : error
        }
      }
    }
    throw new StudioError('同名项目太多，没能新建项目')
  }

  /**
   * The embedded page address that opens one project.
   * @param id - project id.
   * @param type - project type; an article opens on its research step and a video script on its writing step.
   * @returns the page URL.
   */
  projectUrl(id: string, type: StudioProjectType): string {
    return `${this.pageUrl}#/p/${encodeURIComponent(id)}${type === 'article' ? '/research' : type === 'script' ? '/write' : ''}`
  }

  /**
   * Run one turn of the workbench's own writing assistant on a project and wait for it to finish.
   * @param id - project id.
   * @param message - the instruction.
   * @param provider - the workbench provider id to run on, or undefined for the workbench default.
   * @param signal - cancellation; it stops the assistant's turn.
   * @returns the assistant's reply, the files it changed and the steps it took.
   * @throws {StudioError} when the workbench refuses the turn or the assistant fails.
   */
  async assist(id: string, message: string, provider: string | undefined, signal: AbortSignal): Promise<StudioTurn> {
    await this.ensure(signal)
    const project = encodeURIComponent(id)
    const response = await fetch(`${this.url}api/projects/${project}/studio/agent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wb-token': this.token, origin: this.url.slice(0, -1) },
      body: JSON.stringify({ message, provider }),
      signal,
    })
    if (!response.ok || response.body === null) {
      const answer: unknown = await response.json().catch(() => undefined)
      const reason = answer !== null && typeof answer === 'object' && 'error' in answer && typeof answer.error === 'string' ? answer.error : undefined
      throw new StudioError(reason ?? `HTTP ${String(response.status)}`)
    }
    // The workbench keeps a turn running when its connection drops; a cancelled call stops it explicitly.
    const stop = (): void => { void this.request('POST', `projects/${project}/studio/agent-stop`, {}, AbortSignal.timeout(5000)).catch(() => undefined) }
    signal.addEventListener('abort', stop, { once: true })
    try {
      return await readTurn(response.body)
    } finally {
      signal.removeEventListener('abort', stop)
    }
  }

  /** Stop the workbench process. */
  stop(): void {
    this.child?.kill()
    this.child = undefined
    this.starting = undefined
  }
}
