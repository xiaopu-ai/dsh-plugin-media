/**
 * 自媒体界面 · 画面转接（Host）
 *
 * 数据、抓取、AI 都在同一个包的后台里（lib/index.js，id: media-suite），
 * 页面直接调它的接口（client.js 里的 api('accounts') 这类），这里不用再写一遍。
 *
 * 这里做两件事：
 *   1. 转接「登录平台用的小浏览器」的画面。后台是一张一张往外推画面的（一条不断开的流），
 *      手写的页面接不了这种流，所以这里替页面接住，页面每隔一会儿来问一次「有新画面吗」（action: frames）。
 *   2. 给右边的 AI 助手准备一个工作区（action: openChat）：一个专门的文件夹，默认「文稿/自媒体」。
 *      AI 导出的表格、写的稿子都放在这里，用户在访达里找得到。
 *
 * 配置（cordis.patch.yml 里 id: media-ui 那一行的 config，都可以不写）：
 *   workspaceDir  AI 助手工作区的绝对路径，默认 ~/Documents/自媒体
 *
 * 改了这个文件要重启 DSH 才生效（页面文件 client.js 改了会自动生效）。
 */
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

export const name = 'media-ui'
export const inject = ['connection', 'mediaSuite']

/** 页面调这里走的地址。页面里的 BRIDGE 要和它对上（去掉开头的 /api/）。 */
const ROUTE = '/api/mediaUi/call'

/** 页面问一次最多等多久（毫秒）。没有新画面就空手回去，页面会接着再问。 */
const WAIT_MS = 10_000
/** 页面多久没来问，就认为它关掉了，停止接画面（毫秒）。 */
const IDLE_MS = 30_000
/** 最多攒多少条还没被取走的消息。 */
const MAX_QUEUE = 200

/** 想让用户直接看到的错误用它抛。 */
export class UserError extends Error {}

// ------------------------------------------------------------------ 接住画面流

/**
 * 每个打开的小浏览器（id）一个「接收器」：把后台推来的消息排好队、编上号，等页面来取。
 * 消息有几种：frame 画面、login 登录状态、qr 二维码、identity 认出的账号、closed 已关闭。
 * 画面只留最新一张（旧的没人要看），其它几种一条都不能丢。
 */
function makeFrameHub(suite, log) {
  const hubs = new Map()

  function start(id) {
    const hub = { seq: 0, queue: [], waiters: new Set(), abort: new AbortController(), ended: false, error: null, idle: null }
    hubs.set(id, hub)
    const wake = () => { for (const fn of hub.waiters) fn(); hub.waiters.clear() }
    ;(async () => {
      try {
        for await (const frame of suite.browserFrames(id, hub.abort.signal)) {
          if (frame.kind === 'frame') hub.queue = hub.queue.filter(item => item.frame.kind !== 'frame')
          hub.queue.push({ seq: ++hub.seq, frame })
          if (hub.queue.length > MAX_QUEUE) hub.queue.splice(0, hub.queue.length - MAX_QUEUE)
          wake()
        }
      } catch (error) {
        if (!hub.abort.signal.aborted) {
          hub.error = { code: error?.code ?? `${name}/internal`, message: error?.message ?? String(error) }
          log(`小浏览器 ${id} 的画面断了：${hub.error.message}`)
        }
      }
      hub.ended = true
      wake()
    })()
    return hub
  }

  function stop(id) {
    const hub = hubs.get(id)
    if (!hub) return
    hubs.delete(id)
    clearTimeout(hub.idle)
    hub.abort.abort()
  }

  /** 页面来取：给出 after（上次取到第几号），拿回之后的新消息；没有就等一会儿。 */
  async function take(id, after) {
    const hub = hubs.get(id) ?? start(id)
    clearTimeout(hub.idle)
    hub.idle = setTimeout(() => stop(id), IDLE_MS)
    const fresh = () => hub.queue.filter(item => item.seq > after)
    if (fresh().length === 0 && !hub.ended) {
      await new Promise(resolve => {
        const timer = setTimeout(done, WAIT_MS)
        function done() { clearTimeout(timer); hub.waiters.delete(done); resolve() }
        hub.waiters.add(done)
      })
    }
    const items = fresh()
    const result = { cursor: items.length ? items[items.length - 1].seq : after, frames: items.map(item => item.frame), ended: hub.ended, error: hub.error }
    if (hub.ended) stop(id)
    return result
  }

  return { take, stop, stopAll: () => { for (const id of [...hubs.keys()]) stop(id) } }
}

// ------------------------------------------------------------------ 能做的事：一个 action 一个函数

function makeHandlers(hub, chat) {
  return {
    /** AI 助手工作区在哪个文件夹：页面用它认出「这是自媒体的对话」，只在这种对话里显示输入框上方的快捷模块。 */
    async chatInfo() {
      return { folder: chat.dir }
    },
    /** 建好（或找到）AI 助手的工作区，返回它的 id；页面拿它开一段新对话。 */
    async openChat() {
      const registry = chat.registry()
      if (registry === undefined) throw new UserError('这个 DSH 没有工作区功能，没法开对话')
      await mkdir(chat.dir, { recursive: true })
      const workspace = await registry.create(chat.dir, '自媒体助手')
      return { workspaceId: workspace.id, folder: chat.dir }
    },
    /** 取小浏览器的新画面和状态。id 是 browserOpen 返回的 id，after 是上次拿到的 cursor（第一次传 0）。 */
    async frames({ id, after }) {
      if (typeof id !== 'string' || !id) throw new UserError('缺少小浏览器的 id')
      return hub.take(id, Number(after) || 0)
    },
    /** 页面不看了：停止接这个小浏览器的画面（不会关掉小浏览器本身）。 */
    async stopFrames({ id }) {
      hub.stop(String(id))
      return null
    },
  }
}

// ------------------------------------------------------------------ 把 handlers 接到页面能调的地址上（一般不用改）

async function respond(request, handlers, log) {
  let message
  try {
    message = await request.json()
  } catch {
    // 不是 JSON 的请求没有 rpcId 可以回，只能直接拒绝。
    return new Response('bad request', { status: 400 })
  }
  if (message?.type !== 'client-request' || typeof message.rpcId !== 'string') return new Response('bad request', { status: 400 })
  const { action, ...args } = message.payload ?? {}
  let result
  try {
    const handler = Object.hasOwn(handlers, action) ? handlers[action] : null
    if (!handler) throw new UserError(`后台没有「${action}」这个操作`)
    result = { ok: true, value: (await handler(args)) ?? null }
  } catch (error) {
    if (error instanceof UserError) {
      result = { ok: false, error: { code: `${name}/user`, message: error.message, details: {} } }
    } else {
      log(`操作「${action}」出错：${error?.stack ?? error}`)
      result = { ok: false, error: { code: `${name}/internal`, message: `插件内部出错了，不是你操作的问题（${error?.message ?? error}）`, details: {} } }
    }
  }
  return new Response(JSON.stringify({ type: 'server-response', rpcId: message.rpcId, result }), { headers: { 'content-type': 'application/json' } })
}

/**
 * 插件入口。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx, config) {
  const log = text => ctx.logger?.warn?.(`${name}: ${text}`)
  const hub = makeFrameHub(ctx.mediaSuite, log)
  const configured = config?.workspaceDir
  if (configured !== undefined && (typeof configured !== 'string' || !isAbsolute(configured))) throw new Error(`${name}: workspaceDir 要写绝对路径`)
  const chat = { dir: configured ?? join(homedir(), 'Documents', '自媒体'), registry: () => ctx.get('workspaceRegistry') }
  const handlers = makeHandlers(hub, chat)
  ctx.effect(() => () => hub.stopAll(), `${name}: 停止接画面`)
  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => respond(request, handlers, log),
  }), `${name}: 页面调后台的地址`)
}
