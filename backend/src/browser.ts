/**
 * Headless Chrome for the media suite. Each browser profile owns one persistent directory, so a login made in the
 * embedded view is reused by scrapes. A platform has one shared profile, and an own account connected by scanning has
 * its own, so several accounts of one platform stay logged in side by side. Views stream CDP screencast JPEG frames
 * to the panel and receive its input; no visible window ever opens. Contexts launch lazily and close after an idle
 * period without views or scrapes.
 */
import { randomUUID } from 'node:crypto'
import { appendFile, chmod, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { BrowserContext, BrowserType, CDPSession, Frame, Page } from 'playwright-core'
import { brandString } from '@deepseek-ai/dsh-brand'
import type {
  MediaAccountIdentity, MediaBrowserFrame, MediaBrowserId, MediaBrowserInput, MediaBrowserView, MediaLoginState, MediaPlatformId,
} from './types.ts'
import { asRecord, captureDir, captureJson } from './adapters/page.ts'
import type { MediaPlatformAdapter } from './adapters/types.ts'
import { offsetQrCapture, parseQrCapture, pickQrRect, QrTracker, snapshotQr, type MediaQrFrame, type QrPoll } from './qr.ts'

const requireFromHere = createRequire(import.meta.url)

/**
 * Load Chromium through the CommonJS module cache on first launch. Re-importing Playwright's ESM entry after the plugin
 * is disabled and enabled again in the same Host process yields an uninitialized bundle, so the module is required
 * instead of statically imported.
 * @returns Playwright's Chromium browser type.
 */
function chromium(): BrowserType {
  const playwright = requireFromHere('playwright-core') as typeof import('playwright-core')
  return playwright.chromium
}

/** Chrome could not be launched or its profile is locked by another process. */
export class MediaBrowserUnavailableError extends Error {
  override name = 'MediaBrowserUnavailableError'

  /**
   * @param platform - platform whose browser failed.
   * @param message - actionable explanation.
   * @param options - underlying launch failure.
   */
  constructor(readonly platform: MediaPlatformId, message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

/** No open view carries the id. */
export class MediaBrowserViewMissingError extends Error {
  override name = 'MediaBrowserViewMissingError'
}

/** The view's profile is not logged in. */
export class MediaBrowserLoginRequiredError extends Error {
  override name = 'MediaBrowserLoginRequiredError'
}

/** Panel input outside the accepted ranges. */
export class MediaBrowserInputError extends Error {
  override name = 'MediaBrowserInputError'
}

/** Directory names of account profiles: the platform id, two hyphens, and a UUID. */
const ACCOUNT_PROFILE_KEY = /^[A-Za-z0-9_-]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** One persistent browser profile: where a login is kept. */
export interface MediaBrowserProfile {
  readonly platform: MediaPlatformId
  /** Directory name under the profiles directory: the platform id for its shared profile, or an account profile key. */
  readonly key: string
}

/**
 * Name a new, empty account profile of a platform.
 * @param platform - platform id.
 * @returns the profile; its directory is created on first use.
 */
export function newAccountProfile(platform: MediaPlatformId): MediaBrowserProfile {
  return { platform, key: `${platform}--${randomUUID()}` }
}

/**
 * Whether a stored key names an account profile, as opposed to a platform's shared profile.
 * @param key - directory name.
 * @returns whether it has the form {@link newAccountProfile} produces.
 */
export function isAccountProfileKey(key: string): boolean {
  return ACCOUNT_PROFILE_KEY.test(key)
}

/** Settings of one manager, resolved from the plugin Config. */
export interface BrowserManagerOptions {
  /** Directory holding one directory per browser profile. */
  readonly profilesDir: string
  /** Chrome or Chromium executable; undefined uses the installed Google Chrome. */
  readonly executablePath: string | undefined
  readonly viewport: { readonly width: number; readonly height: number }
  /** JPEG quality of screencast frames, 1 to 100. */
  readonly frameQuality: number
  /** Close a profile's browser after this long without views or scrapes. */
  readonly idleMs: number
  /** Close a view after this long without a frame subscriber. */
  readonly detachedViewMs: number
  /** Interval of login detection while a view is open. */
  readonly loginPollMs: number
  /** Distance in CSS pixels per intermediate mouse event while a button is held, so drag targets see a continuous path. */
  readonly dragStepPixels: number
  /** Adapter lookup; views of unregistered platforms are refused by the caller. */
  readonly adapter: (platform: MediaPlatformId) => MediaPlatformAdapter | undefined
  /** Longest wait for browsers to close when the manager is disposed. */
  readonly closeTimeoutMs: number
  /** Interval of QR snapshots while a view is logged out. */
  readonly qrPollMs: number
  /** Navigation timeout of every page; a slow page keeps loading after it, and only waits for it end. */
  readonly navigationTimeoutMs: number
  /** Deadline of one identification of the logged-in account. */
  readonly identifyTimeoutMs: number
  /**
   * Identify the logged-in account on a blank page of the platform's profile.
   * @returns the identity, or undefined when the platform cannot identify accounts or reading failed.
   */
  readonly identify: (platform: MediaPlatformId, page: Page, signal: AbortSignal) => Promise<MediaAccountIdentity | undefined>
  /** Receives every detected login state change of a profile. */
  readonly onLogin: (profile: MediaBrowserProfile, state: MediaLoginState) => void
  readonly warn: (message: string) => void
}

/** Pending stream items of one subscriber; consecutive screencast frames coalesce to the newest. */
class FrameChannel {
  private readonly items: MediaBrowserFrame[] = []
  private waiter: ((item: MediaBrowserFrame | undefined) => void) | undefined
  private ended = false

  push(item: MediaBrowserFrame): void {
    if (this.ended) return
    if (this.waiter !== undefined) {
      const resolve = this.waiter
      this.waiter = undefined
      resolve(item)
      return
    }
    const last = this.items.at(-1)
    if (item.kind === 'frame' && last?.kind === 'frame') this.items[this.items.length - 1] = item
    else this.items.push(item)
  }

  next(): Promise<MediaBrowserFrame | undefined> {
    const item = this.items.shift()
    if (item !== undefined) return Promise.resolve(item)
    if (this.ended) return Promise.resolve(undefined)
    return new Promise((resolve) => { this.waiter = resolve })
  }

  end(): void {
    this.ended = true
    this.waiter?.(undefined)
    this.waiter = undefined
  }
}

/**
 * A view's input in arrival order, one at a time. Hover moves come every ~80 ms; while the page is busy they would
 * pile up and a click would wait behind all of them, so a hover move that has not started yet takes the newer point
 * instead of queueing another. Moves while a button is down (a drag, a slider) all run: their path matters.
 */
export class InputQueue {
  private tail: Promise<void> = Promise.resolve()
  private waiting: { input: MediaBrowserInput; run: Promise<void> } | undefined
  private held = false

  /**
   * Queue one input.
   * @param input - the input.
   * @param dispatch - applies an input to the page.
   * @returns once this input (or the newer move that replaced it) is applied.
   */
  push(input: MediaBrowserInput, dispatch: (input: MediaBrowserInput) => Promise<void>): Promise<void> {
    if (input.kind === 'down') this.held = true
    if (input.kind === 'up') this.held = false
    if (input.kind !== 'move' || this.held) this.waiting = undefined
    if (input.kind === 'move' && !this.held) {
      if (this.waiting !== undefined) {
        this.waiting.input = input
        return this.waiting.run
      }
      const entry: { input: MediaBrowserInput; run: Promise<void> } = { input, run: Promise.resolve() }
      entry.run = this.tail.then(() => {
        if (this.waiting === entry) this.waiting = undefined
        return dispatch(entry.input)
      })
      this.waiting = entry
      this.tail = entry.run.catch(() => undefined)
      return entry.run
    }
    return this.task(() => dispatch(input))
  }

  /**
   * Queue other page work that must not interleave with input, such as clicking a page control.
   * @param work - the work.
   * @returns its completion.
   */
  task(work: () => Promise<void>): Promise<void> {
    // Only the last queued move may take a newer point; anything queued after it keeps it in place.
    this.waiting = undefined
    const run = this.tail.then(work)
    this.tail = run.catch(() => undefined)
    return run
  }
}

/** Mouse operations pointer input needs; Playwright's `page.mouse` provides them. */
export interface PointerMouse {
  move(x: number, y: number, options?: { steps?: number }): Promise<void>
  down(options?: { button?: 'left' | 'right' }): Promise<void>
  up(options?: { button?: 'left' | 'right' }): Promise<void>
  click(x: number, y: number, options?: { button?: 'left' | 'right' }): Promise<void>
}

/** Last pointer position and held button of one view. */
export interface PointerState {
  x: number
  y: number
  pressed: 'left' | 'right' | undefined
}

/** Pointer variants of {@link MediaBrowserInput}. */
export type MediaPointerInput = Extract<MediaBrowserInput, { kind: 'click' | 'down' | 'up' | 'move' }>

/**
 * Apply one pointer input. Moves while a button is held are split into steps of at most `stepPixels`, so slider
 * captchas receive intermediate `mousemove` events; `up` first moves to its point the same way. A `down` while a
 * button is still held releases that button first.
 * @param mouse - page mouse.
 * @param state - the view's pointer state, updated in place.
 * @param input - validated pointer input.
 * @param stepPixels - maximum distance per intermediate event while dragging.
 * @returns after the events are dispatched.
 */
export async function applyPointer(mouse: PointerMouse, state: PointerState, input: MediaPointerInput, stepPixels: number): Promise<void> {
  const moveTo = async (x: number, y: number): Promise<void> => {
    const distance = Math.hypot(x - state.x, y - state.y)
    const steps = state.pressed === undefined ? 1 : Math.max(1, Math.min(100, Math.ceil(distance / stepPixels)))
    await mouse.move(x, y, { steps })
    state.x = x
    state.y = y
  }
  switch (input.kind) {
    case 'click':
      await mouse.click(input.x, input.y, { button: input.button })
      state.x = input.x
      state.y = input.y
      return
    case 'move':
      await moveTo(input.x, input.y)
      return
    case 'down':
      if (state.pressed !== undefined) await mouse.up({ button: state.pressed })
      state.pressed = undefined
      await moveTo(input.x, input.y)
      await mouse.down({ button: input.button })
      state.pressed = input.button
      return
    case 'up':
      await moveTo(input.x, input.y)
      await mouse.up({ button: input.button })
      state.pressed = undefined
      return
    default: {
      const never: never = input
      throw new MediaBrowserInputError(`Unknown pointer input ${JSON.stringify(never)}.`)
    }
  }
}

/**
 * Status words of a login page's QR-polling answer, for the development trace: WeChat's `wx_errcode=408` (waiting),
 * `404` (scanned), `405` (confirmed), `402` (expired), or the status, code and message fields of a JSON answer, at the
 * top level and under `data`. Tokens and login codes are never kept.
 * @param body - response text.
 * @returns the summary, or undefined when the answer carries none.
 */
export function loginStatusOf(body: string): string | undefined {
  const wechat = /wx_errcode\s*=\s*(\d+)/.exec(body)
  if (wechat !== null) return `wx_errcode=${wechat[1] ?? ''}`
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return undefined
  }
  const parts: string[] = []
  const pick = (record: Readonly<Record<string, unknown>> | undefined, prefix: string): void => {
    for (const key of ['status', 'status_code', 'code', 'error_code', 'errcode', 'message', 'msg', 'description']) {
      const value = record?.[key]
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') parts.push(`${prefix}${key}=${String(value).slice(0, 60)}`)
    }
  }
  const root = asRecord(json)
  pick(root, '')
  pick(asRecord(root?.data), 'data.')
  return parts.length === 0 ? undefined : parts.join(' ')
}

/**
 * Development aid: with `DSH_MEDIA_CAPTURE_DIR` set, append the status of every QR-polling answer of a login view to
 * `login-trace.log` in that folder, to see where a scan stops (scanned, confirmed, expired). Off when the variable is unset.
 */
/** Append one line to the development login trace; nothing when capturing is off. */
function noteLogin(platform: string, line: string): void {
  const dir = captureDir()
  if (dir === undefined) return
  void mkdir(dir, { recursive: true })
    .then(() => appendFile(join(dir, 'login-trace.log'), `${new Date().toISOString()} ${platform} ${line}\n`))
    .catch(() => undefined)
}

function traceLogin(page: Page, platform: string): void {
  if (captureDir() === undefined) return
  const write = (line: string): void => { noteLogin(platform, line) }
  // Addresses without their query: login codes travel there.
  const bare = (url: string): string => { try { const { origin, pathname } = new URL(url); return `${origin}${pathname}` } catch { return url.slice(0, 80) } }
  const relevant = (url: string): boolean => /qrconnect|check_qr|qr_?code|login|oauth|auth|callback/i.test(url) && !/\.(png|jpe?g|gif|svg|css|woff2?)(\?|$)/i.test(url)
  page.on('response', (response) => {
    const url = response.url()
    if (!relevant(url) || /\.js(\?|$)/i.test(url)) return
    response.text().then((body) => { write(`${response.status()} ${bare(url)} ${loginStatusOf(body) ?? ''}`) }).catch(() => undefined)
  })
  page.on('requestfailed', (request) => {
    if (relevant(request.url())) write(`failed ${bare(request.url())} ${request.failure()?.errorText ?? ''}`)
  })
  page.on('framenavigated', (frame) => { write(`nav ${frame === page.mainFrame() ? 'top' : 'frame'} ${bare(frame.url())}`) })
  page.on('console', (message) => { if (message.type() === 'error') write(`console ${message.text().slice(0, 160)}`) })
  page.on('dialog', (dialog) => { write(`dialog ${dialog.type()} ${dialog.message().slice(0, 80)}`) })
}

/** A finite `{ x, y }` point from an untrusted page result. */
function pointOf(value: unknown): { x: number; y: number } | undefined {
  const point = asRecord(value)
  const x = point?.x
  const y = point?.y
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined
}

function numberOr0(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * The user agent this Chrome sends by default, with `HeadlessChrome` written as `Chrome`. CDP's `Browser.getVersion`
 * reports the browser's own agent even while the context overrides it, so a remembered agent can be checked against it.
 * @param context - a launched context.
 * @returns the agent, or undefined when it cannot be read.
 */
async function defaultAgent(context: BrowserContext): Promise<string | undefined> {
  try {
    const page = context.pages()[0] ?? await context.newPage()
    const session = await context.newCDPSession(page)
    const { userAgent } = await session.send('Browser.getVersion')
    await session.detach().catch(() => undefined)
    return userAgent.replace('HeadlessChrome', 'Chrome')
  } catch {
    return undefined
  }
}

/** Viewport position of a child frame's element in the page, or undefined when it is detached or not rendered. */
async function frameOrigin(frame: Frame): Promise<{ x: number; y: number } | undefined> {
  const element = await frame.frameElement().catch(() => undefined)
  if (element === undefined) return undefined
  try {
    const box = await element.boundingBox()
    return box === null ? undefined : { x: box.x, y: box.y }
  } catch {
    return undefined
  } finally {
    await element.dispose().catch(() => undefined)
  }
}

/** Shortest gap between two clicks on an expired QR code's refresh control. */
const QR_REFRESH_GAP_MS = 5000
/** How often a view looks for its QR code until the first one shows. */
const FIRST_QR_POLL_MS = 300
/** File in the profiles directory remembering the user agent of the installed Chrome, so a launch needs no second start. */
const AGENT_FILE = '.user-agent.json'
/** How long a view must keep reading as logged in before the login is announced. */
const LOGIN_CONFIRM_MS = 2000

interface ViewState {
  readonly id: MediaBrowserId
  readonly platform: MediaPlatformId
  readonly profile: MediaBrowserProfile
  readonly page: Page
  readonly cdp: CDPSession
  readonly subscribers: Set<FrameChannel>
  readonly pointer: PointerState
  lastFrame: MediaBrowserFrame | undefined
  title: string
  login: MediaLoginState
  closed: boolean
  poll: NodeJS.Timeout | undefined
  detachTimer: NodeJS.Timeout | undefined
  /** Input in arrival order, hover moves coalesced. */
  readonly inputs: InputQueue
  /** Whether the main frame is loading, as Chrome reports it. */
  loading: boolean
  /** QR frames sent so far; the latest is replayed to new subscribers. */
  readonly qr: QrTracker
  qrTimer: NodeJS.Timeout | undefined
  qrBusy: boolean
  /** When the view last clicked the page's refresh control of an expired QR code, in epoch milliseconds. */
  qrRefreshedAt: number
  /** When the current run of logged-in readings began, in epoch milliseconds; undefined while not logged in. */
  loggedInSince: number | undefined
}

interface ProfileSlot {
  context: BrowserContext | undefined
  launching: Promise<BrowserContext> | undefined
  users: number
  idleTimer: NodeJS.Timeout | undefined
  /** Tail of the scrape queue; it never rejects. */
  queue: Promise<void>
}

const KEY_NAMES = 'Enter|Backspace|Tab|Escape|Delete|Space|Home|End|PageUp|PageDown|Arrow(?:Up|Down|Left|Right)'
const NAMED_KEY = new RegExp(`^(?:(?:Control|Alt|Shift|Meta)\\+)*(?:[A-Za-z0-9]|F\\d{1,2}|${KEY_NAMES})$`)

/**
 * Validate one panel input against the viewport.
 * @param input - input from the panel.
 * @param viewport - view size in CSS pixels.
 * @throws {MediaBrowserInputError} when a coordinate, key or URL is outside the accepted ranges.
 */
export function validateInput(input: MediaBrowserInput, viewport: { readonly width: number; readonly height: number }): void {
  const point = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > viewport.width || y > viewport.height) {
      throw new MediaBrowserInputError(`Point (${x}, ${y}) lies outside the ${viewport.width}x${viewport.height} view.`)
    }
  }
  switch (input.kind) {
    case 'click':
    case 'down':
    case 'up':
    case 'move':
      point(input.x, input.y)
      return
    case 'wheel': {
      point(input.x, input.y)
      const delta = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= 10000
      if (!delta(input.deltaX) || !delta(input.deltaY)) {
        throw new MediaBrowserInputError('Wheel deltas must be finite and at most 10000.')
      }
      return
    }
    case 'key':
      if (!NAMED_KEY.test(input.key)) throw new MediaBrowserInputError(`Key "${input.key}" is not an accepted key name.`)
      return
    case 'text':
      if (input.text.length > 2000) throw new MediaBrowserInputError('Text input is limited to 2000 characters per event.')
      return
    case 'navigate': {
      let url: URL
      try {
        url = new URL(input.url)
      } catch (error) {
        throw new MediaBrowserInputError(`"${input.url}" is not an absolute URL.`, { cause: error })
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new MediaBrowserInputError('Only http and https URLs can be opened.')
      return
    }
    case 'back':
    case 'reload':
      return
    default: {
      const never: never = input
      throw new MediaBrowserInputError(`Unknown input ${JSON.stringify(never)}.`)
    }
  }
}

function loginOf(view: { readonly login: MediaLoginState }): MediaLoginState {
  return view.login
}

/**
 * Frames a new subscriber receives before live changes: the latest screencast frame, the latest QR frame, then the
 * current login state.
 * @param state - the view's latest frames and login state.
 * @returns frames in delivery order.
 */
export function replayFrames(state: {
  readonly lastFrame: MediaBrowserFrame | undefined
  readonly lastQr: MediaQrFrame | undefined
  readonly login: MediaLoginState
}): MediaBrowserFrame[] {
  const frames: MediaBrowserFrame[] = []
  if (state.lastFrame !== undefined) frames.push(state.lastFrame)
  if (state.lastQr !== undefined) frames.push(state.lastQr)
  frames.push({ kind: 'login', state: state.login })
  return frames
}

/** Owner of every headless browser context and embedded view of the suite. */
export class BrowserManager {
  private readonly slots = new Map<string, ProfileSlot>()
  private readonly views = new Map<MediaBrowserId, ViewState>()
  /** User agent without the `HeadlessChrome` token, learned on the first launch. */
  private userAgent: string | undefined
  private disposed = false

  /**
   * @param options - resolved settings.
   */
  constructor(private readonly options: BrowserManagerOptions) {}

  private slot(profile: MediaBrowserProfile): ProfileSlot {
    let slot = this.slots.get(profile.key)
    if (slot === undefined) {
      slot = { context: undefined, launching: undefined, users: 0, idleTimer: undefined, queue: Promise.resolve() }
      this.slots.set(profile.key, slot)
    }
    return slot
  }

  private async launch(profile: MediaBrowserProfile): Promise<BrowserContext> {
    const dir = join(this.options.profilesDir, profile.key)
    const { executablePath } = this.options
    const open = async (userAgent: string | undefined): Promise<BrowserContext> => await chromium().launchPersistentContext(dir, {
      headless: true,
      ...executablePath === undefined ? { channel: 'chrome' } : { executablePath },
      viewport: { ...this.options.viewport },
      locale: 'zh-CN',
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
      ...userAgent === undefined ? {} : { userAgent },
    })
    try {
      await mkdir(dir, { recursive: true, mode: 0o700 })
      await chmod(dir, 0o700)
      // Chrome starts once: with the user agent remembered from an earlier launch, checked against the one this Chrome
      // reports; only a new Chrome version (or the very first launch) needs a second start with the corrected agent.
      const remembered = this.userAgent ?? await this.readAgent()
      let context = await open(remembered)
      const actual = await defaultAgent(context)
      if (actual !== undefined && actual !== remembered) {
        this.userAgent = actual
        await this.writeAgent(actual)
        await context.close()
        context = await open(actual)
      } else {
        this.userAgent = remembered
      }
      return context
    } catch (error) {
      const reason = error instanceof Error ? error.message.split('\n')[0] ?? error.message : String(error)
      throw new MediaBrowserUnavailableError(profile.platform, `无法启动无头 Chrome（${reason}）。请安装 Google Chrome，或在插件配置中设置 executablePath；若另一个 DeepSeek Harness 进程正在使用同一浏览器资料目录，请先关闭它。`, { cause: error })
    }
  }

  private async acquire(profile: MediaBrowserProfile): Promise<BrowserContext> {
    if (this.disposed) throw new MediaBrowserUnavailableError(profile.platform, '媒体套件正在关闭。')
    const slot = this.slot(profile)
    slot.users++
    clearTimeout(slot.idleTimer)
    slot.idleTimer = undefined
    try {
      if (slot.context !== undefined) return slot.context
      slot.launching ??= this.launch(profile).then((context) => {
        slot.context = context
        context.on('close', () => {
          if (slot.context !== context) return
          slot.context = undefined
          for (const view of [...this.views.values()]) if (view.profile.key === profile.key) void this.close(view.id, 'browser-closed')
        })
        return context
      }).finally(() => { slot.launching = undefined })
      return await slot.launching
    } catch (error) {
      this.release(profile)
      throw error
    }
  }

  private async readAgent(): Promise<string | undefined> {
    try {
      const saved = asRecord(JSON.parse(await readFile(join(this.options.profilesDir, AGENT_FILE), 'utf8')))?.userAgent
      return typeof saved === 'string' && saved !== '' ? saved : undefined
    } catch {
      return undefined
    }
  }

  private async writeAgent(userAgent: string): Promise<void> {
    await writeFile(join(this.options.profilesDir, AGENT_FILE), JSON.stringify({ userAgent }), { mode: 0o600 }).catch(() => undefined)
  }

  private release(profile: MediaBrowserProfile): void {
    const slot = this.slot(profile)
    slot.users = Math.max(0, slot.users - 1)
    if (slot.users > 0 || slot.context === undefined) return
    clearTimeout(slot.idleTimer)
    slot.idleTimer = setTimeout(() => {
      slot.idleTimer = undefined
      const context = slot.context
      if (slot.users > 0 || context === undefined) return
      slot.context = undefined
      context.close().catch((error: unknown) => { this.options.warn(`media-suite: closing idle ${profile.key} browser failed: ${String(error)}`) })
    }, this.options.idleMs)
  }

  /**
   * Run work on a fresh page of a profile. Work for one profile runs one at a time.
   * @param profile - browser profile.
   * @param signal - cancellation while queued or running.
   * @param run - work; the page closes afterwards.
   * @returns the work's result.
   * @throws {MediaBrowserUnavailableError} when Chrome cannot launch.
   */
  async withPage<T>(profile: MediaBrowserProfile, signal: AbortSignal, run: (page: Page) => Promise<T>): Promise<T> {
    const slot = this.slot(profile)
    const previous = slot.queue
    let done!: () => void
    slot.queue = new Promise((resolve) => { done = resolve })
    try {
      await previous
      signal.throwIfAborted()
      const context = await this.acquire(profile)
      try {
        const page = await context.newPage()
        page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs)
        try {
          return await run(page)
        } finally {
          await page.close().catch(() => undefined)
        }
      } finally {
        this.release(profile)
      }
    } finally {
      done()
    }
  }

  /**
   * Open an embedded view.
   * @param profile - browser profile of a registered platform.
   * @param url - first URL.
   * @returns the view's id and size.
   * @throws {MediaBrowserUnavailableError} when Chrome cannot launch.
   */
  async open(profile: MediaBrowserProfile, url: string): Promise<MediaBrowserView> {
    const { platform } = profile
    const context = await this.acquire(profile)
    let page: Page | undefined
    try {
      page = await context.newPage()
      page.setDefaultNavigationTimeout(this.options.navigationTimeoutMs)
      traceLogin(page, platform)
      // Development capture: the data a view shows (a backend page the user opens) is recorded like a scrape's.
      captureJson(page, target => /^https:\/\/(channels\.weixin\.qq\.com|creator\.douyin\.com|creator\.xiaohongshu\.com|edith\.xiaohongshu\.com|mp\.weixin\.qq\.com)\//.test(target))
      const cdp = await context.newCDPSession(page)
      const view: ViewState = {
        id: brandString<MediaBrowserId>(`browser-${randomUUID()}`), platform, profile, page, cdp, subscribers: new Set(),
        pointer: { x: 0, y: 0, pressed: undefined }, inputs: new InputQueue(), loading: true,
        qr: new QrTracker(), qrTimer: undefined, qrBusy: false, qrRefreshedAt: 0, loggedInSince: undefined,
        lastFrame: undefined, title: '', login: 'unknown', closed: false, poll: undefined, detachTimer: undefined,
      }
      this.views.set(view.id, view)
      // Page events on this session: the loading state the panel's progress bar follows.
      await cdp.send('Page.enable').catch(() => undefined)
      this.wire(view)
      await cdp.send('Page.startScreencast', {
        format: 'jpeg', quality: this.options.frameQuality,
        maxWidth: this.options.viewport.width, maxHeight: this.options.viewport.height, everyNthFrame: 1,
      })
      this.armDetach(view)
      // The screencast shows whatever has loaded, so the view never waits for or fails on a slow page.
      page.goto(url, { waitUntil: 'commit' }).catch((error: unknown) => {
        if (!view.closed) this.options.warn(`media-suite: ${platform} view could not open ${url}: ${String(error)}`)
      })
      return { id: view.id, platform, width: this.options.viewport.width, height: this.options.viewport.height }
    } catch (error) {
      await page?.close().catch(() => undefined)
      this.release(profile)
      throw error
    }
  }

  private wire(view: ViewState): void {
    const { page, cdp } = view
    cdp.on('Page.screencastFrame', (event) => {
      cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => undefined)
      const frame: MediaBrowserFrame = {
        kind: 'frame', data: event.data, width: event.metadata.deviceWidth, height: event.metadata.deviceHeight,
        url: page.url(), title: view.title, loading: view.loading,
      }
      view.lastFrame = frame
      this.broadcast(view, frame)
    })
    page.on('load', () => {
      page.title().then((title) => { view.title = title }).catch(() => undefined)
      void this.checkLogin(view)
    })
    // The panel's progress bar follows Chrome's own loading state of the main frame; a static page sends no new
    // screencast frame when it changes, so the last frame goes out again with the new state.
    const setLoading = (loading: boolean): void => {
      if (view.loading === loading || view.closed) return
      view.loading = loading
      if (view.lastFrame?.kind !== 'frame') return
      view.lastFrame = { ...view.lastFrame, loading }
      this.broadcast(view, view.lastFrame)
    }
    let mainFrameId: string | undefined
    cdp.send('Page.getFrameTree').then(({ frameTree }) => { mainFrameId = frameTree.frame.id }).catch(() => undefined)
    cdp.on('Page.frameStartedLoading', ({ frameId }) => { if (frameId === mainFrameId || mainFrameId === undefined) setLoading(true) })
    cdp.on('Page.frameStoppedLoading', ({ frameId }) => { if (frameId === mainFrameId) setLoading(false) })
    page.on('dialog', (dialog) => { dialog.dismiss().catch(() => undefined) })
    // A login flow that opens a new tab continues in the embedded view instead.
    page.on('popup', (popup) => {
      const target = popup.url()
      popup.close().catch(() => undefined)
      if (target.startsWith('http')) page.goto(target, { waitUntil: 'commit' }).catch(() => undefined)
    })
    page.on('close', () => { void this.close(view.id, 'page-closed') })
    view.poll = setInterval(() => { void this.checkLogin(view) }, this.options.loginPollMs)
    // Until the first QR code shows, look for it every FIRST_QR_POLL_MS so it appears as soon as the page draws it.
    const nextQrPoll = (): void => {
      if (view.closed) return
      const delay = view.qr.latest === undefined && view.login !== 'logged-in' ? Math.min(FIRST_QR_POLL_MS, this.options.qrPollMs) : this.options.qrPollMs
      view.qrTimer = setTimeout(() => { void this.pollQr(view).finally(nextQrPoll) }, delay)
    }
    nextQrPoll()
  }

  /**
   * Send a sharp PNG of the login QR code when it changes, and one empty `qr` frame when it disappears. Runs only
   * while the view is not logged in; capture goes through the view's CDP session at twice the CSS size, so the page,
   * its screencast and input are not touched. Failures are ignored until the next poll.
   */
  private async pollQr(view: ViewState): Promise<void> {
    if (view.qrBusy || !this.has(view.id)) return
    view.qrBusy = true
    try {
      const adapter = this.options.adapter(view.platform)
      if (view.login !== 'logged-in' && adapter?.qrExpired !== undefined && await this.refreshExpiredQr(view, adapter.qrExpired)) return
      const selectors = adapter?.qrSelectors ?? []
      const poll: QrPoll = view.login === 'logged-in' ? { kind: 'none' } : await snapshotQr({
        evaluate: script => this.findQrInFrames(view, script, selectors.length === 0),
        capture: clip => view.cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 2 },
        }),
      }, selectors, view.qr.key)
      // The view can log in or close while the snapshot is taken.
      if (!this.has(view.id)) return
      const frame = view.qr.update(loginOf(view) === 'logged-in' ? { kind: 'none' } : poll)
      if (frame !== undefined) this.broadcast(view, frame)
    } catch {
      // Snapshots race navigation and page teardown; the next poll retries.
    } finally {
      view.qrBusy = false
    }
  }

  /**
   * Run the QR capture script in the page and, when it finds no code there, in each child frame: the WeChat login of
   * 视频号 draws its code in an `open.weixin.qq.com` iframe. Boxes found in a frame are shifted into the page's
   * document coordinates, so the snapshot clip lands on them.
   */
  private async findQrInFrames(view: ViewState, script: string, largestFallback: boolean): Promise<unknown> {
    const { page } = view
    const main = await page.evaluate(script)
    if (pickQrRect(parseQrCapture(main), largestFallback) !== undefined) return main
    const scroll = asRecord(await page.evaluate('({ x: scrollX, y: scrollY })'))
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue
      const at = await frameOrigin(frame)
      if (at === undefined) continue
      const inner = asRecord(await frame.evaluate('({ x: scrollX, y: scrollY })').catch(() => undefined))
      const found = offsetQrCapture(await frame.evaluate(script).catch(() => undefined),
        at.x + numberOr0(scroll?.x) - numberOr0(inner?.x), at.y + numberOr0(scroll?.y) - numberOr0(inner?.y))
      if (pickQrRect(found, largestFallback) !== undefined) return found
    }
    return main
  }

  /**
   * When the page or one of its frames shows the QR code as expired, hide the sharp copy and click the page's own
   * refresh control, as a user would; at most once every {@link QR_REFRESH_GAP_MS}, so a control that does not respond
   * is not hammered.
   * @returns whether the code was expired.
   */
  private async refreshExpiredQr(view: ViewState, script: string): Promise<boolean> {
    let found = pointOf(await view.page.evaluate(script))
    for (const frame of found === undefined ? view.page.frames() : []) {
      if (frame === view.page.mainFrame()) continue
      const inFrame = pointOf(await frame.evaluate(script).catch(() => undefined))
      const at = inFrame === undefined ? undefined : await frameOrigin(frame)
      if (inFrame !== undefined && at !== undefined) {
        found = { x: at.x + inFrame.x, y: at.y + inFrame.y }
        break
      }
    }
    if (found === undefined) return false
    const { x, y } = found
    noteLogin(view.platform, `expired QR seen at ${Math.round(x)},${Math.round(y)}${Date.now() - view.qrRefreshedAt < QR_REFRESH_GAP_MS ? ' (waiting)' : ', clicking refresh'}`)
    const hidden = view.qr.update({ kind: 'none' })
    if (hidden !== undefined) this.broadcast(view, hidden)
    if (Date.now() - view.qrRefreshedAt < QR_REFRESH_GAP_MS) return true
    view.qrRefreshedAt = Date.now()
    await view.inputs.task(() => applyPointer(view.page.mouse, view.pointer, { kind: 'click', button: 'left', x, y }, this.options.dragStepPixels))
    return true
  }

  private async checkLogin(view: ViewState): Promise<void> {
    const adapter = this.options.adapter(view.platform)
    if (adapter === undefined || view.closed) return
    let state: MediaLoginState
    try {
      state = await adapter.detectLogin(view.page)
    } catch {
      // Detection races navigation; the next poll or load retries it.
      return
    }
    if (!this.has(view.id)) return
    // A login must read as such for LOGIN_CONFIRM_MS: some sites show their logged-in address for a moment before
    // sending a visitor to the login page, and announcing it would identify the account in a second tab, whose own
    // login page can replace the QR code the user is scanning.
    if (state !== 'logged-in') view.loggedInSince = undefined
    else if (view.login !== 'logged-in') {
      view.loggedInSince ??= Date.now()
      if (Date.now() - view.loggedInSince < LOGIN_CONFIRM_MS) return
    }
    if (state === 'unknown' || state === view.login) return
    view.login = state
    this.options.onLogin(view.profile, state)
    this.broadcast(view, { kind: 'login', state })
    if (state === 'logged-in') void this.announceIdentity(view)
  }

  /** Best effort: a failed identification sends nothing, and the panel can still call `identify`. */
  private async announceIdentity(view: ViewState): Promise<void> {
    let identity: MediaAccountIdentity | undefined
    try {
      identity = await this.identifyOn(view)
    } catch (error) {
      this.options.warn(`media-suite: identifying the ${view.platform} account failed: ${String(error)}`)
      return
    }
    if (identity !== undefined && this.has(view.id) && view.login === 'logged-in') this.broadcast(view, { kind: 'identity', identity })
  }

  private async identifyOn(view: ViewState, signal?: AbortSignal): Promise<MediaAccountIdentity | undefined> {
    const deadline = AbortSignal.timeout(this.options.identifyTimeoutMs)
    const combined = signal === undefined ? deadline : AbortSignal.any([signal, deadline])
    return await this.withPage(view.profile, combined, page => this.options.identify(view.platform, page, combined))
  }

  /**
   * Identify the account logged in to a view's profile, on a separate page so the view is not navigated.
   * @param id - open view.
   * @param signal - cancellation.
   * @returns the identity, or undefined when it cannot be read.
   * @throws {MediaBrowserViewMissingError | MediaBrowserLoginRequiredError} for a missing or logged-out view.
   */
  async identify(id: MediaBrowserId, signal: AbortSignal): Promise<MediaAccountIdentity | undefined> {
    const view = this.view(id)
    if (view.login !== 'logged-in') {
      const adapter = this.options.adapter(view.platform)
      const state = adapter === undefined ? 'unknown' : await adapter.detectLogin(view.page).catch((): MediaLoginState => 'unknown')
      if (state !== 'logged-in') throw new MediaBrowserLoginRequiredError(`The ${view.platform} view is not logged in.`)
    }
    return await this.identifyOn(view, signal)
  }

  private broadcast(view: ViewState, frame: MediaBrowserFrame): void {
    for (const channel of view.subscribers) channel.push(frame)
  }

  private armDetach(view: ViewState): void {
    clearTimeout(view.detachTimer)
    view.detachTimer = view.subscribers.size > 0 ? undefined : setTimeout(() => { void this.close(view.id, 'detached') }, this.options.detachedViewMs)
  }

  private view(id: MediaBrowserId): ViewState {
    const view = this.views.get(id)
    if (view === undefined || view.closed) throw new MediaBrowserViewMissingError(`No open browser view "${id}".`)
    return view
  }

  /**
   * Follow a view: the latest frame and login state first, then changes, ending with `closed`.
   * @param id - open view.
   * @param signal - ends the subscription; the view stays open for the detach period.
   * @returns frames until the view closes or the signal aborts.
   * @throws {MediaBrowserViewMissingError} when the view is not open.
   */
  async *frames(id: MediaBrowserId, signal: AbortSignal): AsyncIterable<MediaBrowserFrame> {
    const view = this.view(id)
    const channel = new FrameChannel()
    view.subscribers.add(channel)
    this.armDetach(view)
    for (const frame of replayFrames({ lastFrame: view.lastFrame, lastQr: view.qr.latest, login: view.login })) channel.push(frame)
    const stop = (): void => { channel.end() }
    signal.addEventListener('abort', stop, { once: true })
    try {
      for (;;) {
        const item = await channel.next()
        if (item === undefined) return
        yield item
        if (item.kind === 'closed') return
      }
    } finally {
      signal.removeEventListener('abort', stop)
      view.subscribers.delete(channel)
      if (!view.closed) this.armDetach(view)
    }
  }

  /**
   * Apply panel input to a view. Inputs of one view apply in arrival order, so a drag's `down`, `move` and `up`
   * reach the page in sequence.
   * @param id - open view.
   * @param input - validated by {@link validateInput} first.
   * @returns after the input is dispatched; navigation resolves once committed.
   * @throws {MediaBrowserViewMissingError | MediaBrowserInputError} for a missing view or invalid input.
   */
  async input(id: MediaBrowserId, input: MediaBrowserInput): Promise<void> {
    const view = this.view(id)
    validateInput(input, this.options.viewport)
    await view.inputs.push(input, next => this.dispatch(view, next))
  }

  private async dispatch(view: ViewState, input: MediaBrowserInput): Promise<void> {
    const { page } = view
    switch (input.kind) {
      case 'click':
      case 'down':
      case 'up':
      case 'move':
        await applyPointer(page.mouse, view.pointer, input, this.options.dragStepPixels)
        return
      case 'wheel':
        await page.mouse.move(input.x, input.y)
        await page.mouse.wheel(input.deltaX, input.deltaY)
        return
      case 'key':
        await page.keyboard.press(input.key === 'Space' ? ' ' : input.key)
        return
      case 'text':
        await page.keyboard.insertText(input.text)
        return
      case 'navigate':
        await page.goto(input.url, { waitUntil: 'commit' })
        return
      case 'back':
        await page.goBack({ waitUntil: 'commit' })
        return
      case 'reload':
        await page.reload({ waitUntil: 'commit' })
        return
      default: {
        const never: never = input
        throw new MediaBrowserInputError(`Unknown input ${JSON.stringify(never)}.`)
      }
    }
  }

  /**
   * Close a view; subscribers receive `closed` with the reason.
   * @param id - view id; an already closed view is ignored.
   * @param reason - reason shown to subscribers.
   * @returns after the page closed.
   */
  async close(id: MediaBrowserId, reason: string): Promise<void> {
    const view = this.views.get(id)
    if (view === undefined || view.closed) return
    view.closed = true
    this.views.delete(id)
    clearInterval(view.poll)
    clearTimeout(view.qrTimer)
    clearTimeout(view.detachTimer)
    this.broadcast(view, { kind: 'closed', reason })
    for (const channel of view.subscribers) channel.end()
    await view.cdp.send('Page.stopScreencast').catch(() => undefined)
    await view.page.close().catch(() => undefined)
    this.release(view.profile)
  }

  /**
   * Platform of an open view.
   * @param id - view id.
   * @returns the platform, or undefined when the view is not open.
   */
  platformOf(id: MediaBrowserId): MediaPlatformId | undefined {
    return this.has(id) ? this.views.get(id)?.platform : undefined
  }

  /**
   * Browser profile of an open view.
   * @param id - view id.
   * @returns the profile, or undefined when the view is not open.
   */
  profileOf(id: MediaBrowserId): MediaBrowserProfile | undefined {
    return this.has(id) ? this.views.get(id)?.profile : undefined
  }

  /**
   * Delete an account profile nobody uses any more, with the login kept in it. A profile with an open view or a
   * running scrape is left alone; {@link sweep} removes it on a later start.
   * @param key - account profile key; any other key is refused.
   * @returns whether the directory was removed.
   */
  async discard(key: string): Promise<boolean> {
    if (!isAccountProfileKey(key)) return false
    const slot = this.slots.get(key)
    if (slot !== undefined) {
      if (slot.users > 0 || slot.launching !== undefined) return false
      clearTimeout(slot.idleTimer)
      const context = slot.context
      slot.context = undefined
      this.slots.delete(key)
      await context?.close().catch(() => undefined)
    }
    try {
      await rm(join(this.options.profilesDir, key), { recursive: true, force: true })
      return true
    } catch (error) {
      this.options.warn(`media-suite: removing browser profile ${key} failed: ${String(error)}`)
      return false
    }
  }

  /**
   * Delete account profiles no account refers to, such as one opened for a scan that was never finished.
   * @param keep - profile keys in use.
   * @returns the keys removed.
   */
  async sweep(keep: ReadonlySet<string>): Promise<string[]> {
    let names: string[]
    try {
      names = await readdir(this.options.profilesDir)
    } catch {
      // The profiles directory does not exist before the first launch: nothing to sweep.
      return []
    }
    const removed: string[] = []
    for (const name of names) {
      // Dot files are the manager's own (the remembered user agent), never profiles.
      if (name.startsWith('.') || keep.has(name) || this.slots.has(name)) continue
      if (await this.discard(name)) removed.push(name)
    }
    return removed
  }

  /**
   * Whether a view is open.
   * @param id - view id.
   * @returns whether it exists and is open.
   */
  has(id: MediaBrowserId): boolean {
    return this.views.get(id)?.closed === false
  }

  /**
   * Close every view and browser; later calls fail as unavailable.
   * @returns after all browsers closed.
   */
  async dispose(): Promise<void> {
    this.disposed = true
    await Promise.all([...this.views.keys()].map(id => this.close(id, 'disposed')))
    const contexts: BrowserContext[] = []
    for (const slot of this.slots.values()) {
      clearTimeout(slot.idleTimer)
      if (slot.context !== undefined) contexts.push(slot.context)
      slot.context = undefined
    }
    // A heavy page can keep Chrome closing for many seconds; disposal waits a bounded time and Chrome finishes alone.
    const closing = Promise.all(contexts.map(context => context.close().catch(() => undefined)))
    let timer: NodeJS.Timeout | undefined
    await Promise.race([closing, new Promise<void>((resolve) => { timer = setTimeout(resolve, this.options.closeTimeoutMs) })])
    clearTimeout(timer)
  }
}
