/**
 * Self-media suite Host plugin: user-configured creator accounts on registered platforms, local metric history from
 * headless-browser scraping and export-file import, scheduled monitoring, AI topic recommendations and account
 * diagnosis, and an embedded headless browser streamed to the Web panel for platform login.
 */
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { brandString } from '@deepseek-ai/dsh-brand'
import { BlockAssembler, createUserMessage, type ImageBlock, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-web'
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { Page } from 'playwright-core'
import { douyinAdapter } from './adapters/douyin.ts'
import { MediaAdapterRegistry } from './adapters/registry.ts'
import type { MediaPlatformAdapter } from './adapters/types.ts'
import { wechatMpAdapter } from './adapters/wechat-mp.ts'
import { xiaohongshuAdapter } from './adapters/xiaohongshu.ts'
import {
  buildAnalysisPrompt, buildTopicPrompt, MediaLlmOutputError, parseAnalysisOutput, parseTopicOutput,
  type BenchmarkInput, type MediaLlm, type MediaLlmCompletion, type MediaPrompt,
} from './analysis.ts'
import {
  BrowserManager, isAccountProfileKey, MediaBrowserInputError, MediaBrowserLoginRequiredError, MediaBrowserUnavailableError,
  MediaBrowserViewMissingError, newAccountProfile, type MediaBrowserProfile,
} from './browser.ts'
import { invalid, MediaScrapeError, messageOf, notFound } from './errors.ts'
import { matchOwnAccount } from './identity.ts'
import { MediaImportError, parseImportFile, type ParsedImport } from './import.ts'
import { dueAccounts, intervalOf, keepAliveDue, nextRunAt } from './monitor.ts'
import { gotoPage, sleep } from './adapters/page.ts'
import { chinaDay, historySnapshots } from './history.ts'
import { demoData } from './demo.ts'
import { readUiSettings } from './ui-settings.ts'
import { buildOverview, latestKnown } from './overview.ts'
import { accountHealth, buildDashboard, buildPostDetail, dashboardSince } from './dashboard.ts'
import { buildBriefPrompt, findSyncedWorks, networkTotals, parseBriefLines, requireBriefItems } from './network.ts'
import { wechatChannelsAdapter } from './adapters/wechat-channels.ts'
import { MediaStore } from './store.ts'
import { researchKeywords, suggestionQuery, topRelated, type MediaRecency } from './research.ts'
import { StudioGateway, type GatewayLlm, type GatewayModel, type GatewayWeb } from './gateway.ts'
import { htmlText } from './html-text.ts'
import { StudioRunner, studioIdeaFrom, studioProjectName } from './studio.ts'
import { registerMediaTools } from './tools.ts'
import { registerWritingTools } from './writing-tools.ts'
import type {
  MediaAccount, MediaAccountDraft, MediaAccountId, MediaAccountIdentity, MediaAccountOverview, MediaAnalysisReport, MediaBrowserFrame,
  MediaBrowserId, MediaBrowserInput, MediaBrowserView, MediaDraft, MediaDraftId, MediaDraftInput, MediaUiSettings, MediaImportResult,
  MediaLoginState, MediaPlatformDescriptor, MediaAccountHealth, MediaAccountSummary, MediaDashboard, MediaPostDetail, MediaSummary,
  MediaBriefItem, MediaBriefState, MediaNetwork, MediaNetworkAccount,
  MediaKeywordSearch, MediaNewsItem, MediaPlatformId, MediaPost, MediaRelatedPost, MediaReportId, MediaRunRecord, MediaTopicReport,
  MediaTopicResearch, MediaTopicSuggestion, MediaTrendingTopic,
} from './types.ts'

/** Posts read per account for the 总览 feed and the synced-work search, and the most the feed shows. */
const NETWORK_POSTS_PER_ACCOUNT = 30
const NETWORK_FEED = 60
/** Days of the 全网 trend chart. */
/** Longest a keep-alive visit may take, slow login pages included. */
const KEEP_ALIVE_TIMEOUT_MS = 90_000
/** How long a keep-alive visit waits for the backend page to show a login. */
const KEEP_ALIVE_SETTLE_MS = 30_000
const NETWORK_TREND_DAYS = 90

/** An avatar URL worth storing: https only, at most 2000 characters. */
function avatarOf(url: string | undefined): string | undefined {
  const value = url?.trim()
  return value !== undefined && /^https:\/\//.test(value) && value.length <= 2000 ? value : undefined
}

export type * from './types.ts'
export type * from './adapters/types.ts'
export { MediaScrapeError } from './errors.ts'
export { parseCount, parseDate } from './counters.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Media suite controller and platform adapter registry. */
    mediaSuite: MediaSuite
  }
}

declare module '@deepseek-ai/dsh-llm/types' {
  interface LlmRequestPurposeMap {
    'media-suite': true
  }
}

/** Deployment settings of the suite. */
export interface Config {
  /** Media data directory; defaults to `<profile dir>/media-suite`. */
  dataDir?: string
  /** Chrome or Chromium executable; defaults to the installed Google Chrome. */
  executablePath?: string
  /** Embedded browser viewport width in CSS pixels. */
  viewportWidth: number
  /** Embedded browser viewport height in CSS pixels. */
  viewportHeight: number
  /** JPEG quality of streamed frames. */
  frameQuality: number
  /** Close a platform's idle browser after these minutes. */
  browserIdleMinutes: number
  /** Close a view nobody follows after these seconds. */
  detachedViewSeconds: number
  /** Login detection interval of an open view, in seconds. */
  loginPollSeconds: number
  /** Longest wait for browsers to close when the plugin is disposed, in seconds. */
  browserCloseTimeoutSeconds: number
  /** Interval of login QR snapshots while an embedded browser is logged out, in seconds. */
  qrPollSeconds: number
  /** Navigation timeout of browser pages, in seconds; slow pages keep loading after it. */
  navigationTimeoutSeconds: number
  /** Deadline of identifying the account logged in to an embedded browser, in seconds. */
  identifyTimeoutSeconds: number
  /** Distance in CSS pixels per intermediate mouse event while dragging in the embedded browser. */
  dragStepPixels: number
  /** Deadline of one scrape, in seconds. */
  scrapeTimeoutSeconds: number
  /** Posts read per scrape. */
  maxPostsPerScrape: number
  /** Days of past daily counters an own account's scrape backfills, where the platform reports them; 0 disables it. */
  historyDays: number
  /** Deadline of one history backfill, in seconds. */
  historyTimeoutSeconds: number
  /** Smallest automatic monitoring interval, in minutes. */
  minIntervalMinutes: number
  /** Interval applied to a new account whose draft gives none, in minutes. */
  defaultIntervalMinutes: number
  /** How often the monitor looks for due accounts, in seconds. */
  monitorTickSeconds: number
  /** Visit logged-in accounts of platforms whose web sessions end when idle (视频号, 公众号) between updates, while DSH runs. */
  keepLoginsAlive: boolean
  /** Delay before an automatic scrape is tried again after a failure that may pass on its own, in minutes. */
  retryMinutes: number
  /** Window of the diagnosis report, in days. */
  analysisWindowDays: number
  /** Topic suggestions requested per report. */
  topicCount: number
  /** Earlier topic reports whose suggestions a new report is told not to repeat; 0 disables it. */
  topicHistoryReports: number
  /** Age in days inside which found platform posts rank before older ones; 0 ranks by likes only. */
  relatedRecentDays: number
  /** Extra model calls after an answer that is not the requested JSON. */
  llmParseRetries: number
  briefHour: number
  /** Keywords from the account's niche and hashtags searched on the platform before topic generation; 0 disables it. */
  researchKeywords: number
  /** Posts kept per keyword searched before topic generation. */
  researchPostsPerKeyword: number
  /** Related platform posts searched and kept per topic suggestion; 0 disables it. */
  relatedPerTopic: number
  /** Trending search entries given to topic generation; 0 disables reading the trending list. */
  trendingCount: number
  /** Web search results given to topic generation; 0 disables news search. */
  newsResults: number
  /** Age in hours after which a benchmark account is scraped again before topic generation; 0 disables refreshing. */
  benchmarkRefreshHours: number
  /** Deadline of each research stage (trending and keyword searches, related posts, benchmark refresh), in seconds. */
  researchTimeoutSeconds: number
  /** Stored reports returned per list call. */
  reportHistory: number
  /** Output-token cap of one AI report. */
  llmMaxTokens: number
  /** Deadline of one AI report, in seconds. */
  llmTimeoutSeconds: number
  /** Folder of the creation workbench (`server.mjs`) the page embeds; unset hides nothing but reports it as not set up. */
  studioDir?: string
  /** Page settings file a user edits; `界面样式.css` next to it adds styles. Unset keeps the built-in page. */
  uiFile?: string
  /** Loopback port the creation workbench is started on. */
  studioPort: number
  /** Most characters of a fetched page the gateway returns to the workbench. */
  studioFetchChars: number
  /** How long the creation workbench may take to start, in seconds. */
  studioStartSeconds: number
  /** Most own accounts one platform may hold. */
  maxAccountsPerPlatform: number
  /** Age in hours after which an account's newest data is shown as stale. */
  staleHours: number
  /** Explicit model provider for reports; paired with `model`. Defaults to the user's default model. */
  provider?: string
  /** Explicit model id for reports; paired with `provider`. */
  model?: string
}

/** Validated suite settings. */
export const Config: z<Partial<Config>, Config> = z.object({
  dataDir: z.string(),
  executablePath: z.string(),
  viewportWidth: z.natural().min(320).max(3840).default(1280),
  viewportHeight: z.natural().min(240).max(2160).default(800),
  frameQuality: z.natural().min(1).max(100).default(60),
  browserIdleMinutes: z.number().min(1).default(10),
  detachedViewSeconds: z.number().min(5).default(60),
  loginPollSeconds: z.number().min(1).default(3),
  browserCloseTimeoutSeconds: z.number().min(1).default(5),
  qrPollSeconds: z.number().min(0.5).default(1.5),
  navigationTimeoutSeconds: z.number().min(5).default(60),
  identifyTimeoutSeconds: z.number().min(5).default(120),
  dragStepPixels: z.number().min(1).max(200).default(8),
  scrapeTimeoutSeconds: z.number().min(10).default(180),
  maxPostsPerScrape: z.natural().min(1).max(300).default(30),
  historyDays: z.natural().max(90).default(30),
  historyTimeoutSeconds: z.number().min(10).default(150),
  minIntervalMinutes: z.number().min(5).default(30),
  defaultIntervalMinutes: z.number().min(5).default(360),
  monitorTickSeconds: z.number().min(5).default(60),
  keepLoginsAlive: z.boolean().default(true),
  retryMinutes: z.number().min(5).default(30),
  analysisWindowDays: z.natural().min(1).max(365).default(30),
  topicCount: z.natural().min(1).max(30).default(12),
  topicHistoryReports: z.natural().max(20).default(3),
  relatedRecentDays: z.natural().max(3650).default(30),
  llmParseRetries: z.natural().max(3).default(1),
  briefHour: z.natural().max(23).default(9).description('每天几点（北京时间）自动写今日简报；那时没开 DSH 的话，打开总览时补写。'),
  researchKeywords: z.natural().max(10).default(3),
  researchPostsPerKeyword: z.natural().min(1).max(30).default(8),
  relatedPerTopic: z.natural().max(20).default(6),
  trendingCount: z.natural().max(50).default(20),
  newsResults: z.natural().max(20).default(6),
  benchmarkRefreshHours: z.number().min(0).default(24),
  researchTimeoutSeconds: z.number().min(10).default(150),
  reportHistory: z.natural().min(1).max(200).default(20),
  llmMaxTokens: z.natural().min(256).default(16000),
  llmTimeoutSeconds: z.number().min(10).default(300),
  studioDir: z.string(),
  uiFile: z.string(),
  studioPort: z.natural().min(1024).max(65535).default(5289),
  studioFetchChars: z.natural().min(1000).default(60000),
  studioStartSeconds: z.number().min(1).default(20),
  maxAccountsPerPlatform: z.natural().min(1).max(20).default(3),
  staleHours: z.number().min(1).default(30),
  provider: z.string(),
  model: z.string(),
})

/** Image types the Host attachment store accepts. */
const IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const POST_LIMIT_MAX = 500
/** Longest direction a topic report accepts, in characters. */
const MAX_DIRECTION_CHARS = 500
/** Snapshots searched for the last known value of a counter the newest snapshot lacks. */
const LATEST_KNOWN_SNAPSHOTS = 50

/** Media suite controller: `ctx.mediaSuite` on the Host and `ctx.remote.mediaSuite` on the Client. */
export class MediaSuite extends TypertRemoteService {
  static inject = ['llm', 'agentDefaultModel']
  static Config = Config

  private readonly registry = new MediaAdapterRegistry()
  private readonly store: MediaStore
  private readonly browser: BrowserManager
  /** The creation workbench process, when a workbench folder is configured. */
  private readonly studio: StudioRunner | undefined
  /** Model gateway through which the workbench calls the client's models. */
  private readonly gateway: StudioGateway | undefined
  /** In-flight work keys: `<account>:data` for scrapes and imports, `<account>:ai` for reports. */
  private readonly busy = new Set<string>()
  private monitoring = false
  /** Last successful keep-alive visit of each account in this process, in epoch milliseconds. */
  private readonly lastVisit = new Map<MediaAccountId, number>()
  /** The 今日简报 being written, with its finished lines. */
  private briefRun: { partial: MediaBriefItem[] } | undefined
  /** Why the last 今日简报 failed, until the next attempt. */
  private briefProblem: string | undefined
  /** China day of the last scheduled 今日简报 attempt, so a failure is not retried every minute. */
  private briefTriedDay: string | undefined
  /** Model call used for reports; tests replace it. */
  llm: MediaLlm

  /**
   * @param ctx - owning plugin context.
   * @param config - validated settings.
   * @throws {Error} when neither `dataDir` nor a dsh profile directory is available, or the database is newer than this build.
   */
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'mediaSuite')
    if ((config.provider === undefined) !== (config.model === undefined)) {
      throw new Error('media-suite: provider and model must be configured together')
    }
    const profileDir = ctx.get('profileContext')?.dir
    const dataDir = config.dataDir ?? (profileDir === undefined ? undefined : join(profileDir, 'media-suite'))
    if (dataDir === undefined) throw new Error('media-suite: set the dataDir config, or launch through a dsh profile that provides profileContext')
    mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    this.store = new MediaStore(join(dataDir, 'media.db'))
    this.browser = new BrowserManager({
      profilesDir: join(dataDir, 'browser'),
      executablePath: config.executablePath,
      viewport: { width: config.viewportWidth, height: config.viewportHeight },
      frameQuality: config.frameQuality,
      idleMs: config.browserIdleMinutes * 60000,
      detachedViewMs: config.detachedViewSeconds * 1000,
      loginPollMs: config.loginPollSeconds * 1000,
      closeTimeoutMs: config.browserCloseTimeoutSeconds * 1000,
      qrPollMs: config.qrPollSeconds * 1000,
      navigationTimeoutMs: config.navigationTimeoutSeconds * 1000,
      identifyTimeoutMs: config.identifyTimeoutSeconds * 1000,
      identify: (platform, page, signal) => this.identifyOnPage(platform, page, signal),
      dragStepPixels: config.dragStepPixels,
      adapter: platform => this.registry.get(platform),
      onLogin: (profile, state) =>{  this.store.setLogin(profile.key, state, new Date().toISOString()) },
      warn: (message) =>{  this.ctx.logger.warn(message) },
    })
    this.llm = (request, signal, onText) => this.completeWithModel(request, signal, onText)
    this.gateway = config.studioDir === undefined ? undefined : new StudioGateway({
      llm: {
        models: () => this.clientModels(),
        defaultRoute: () => {
          const route = this.reportRoute()
          return `${route.provider}/${route.model}`
        },
        stream: request => this.streamClientModel(request),
        saveImage: (data, mediaType) => this.saveRequestImage(data, mediaType),
      },
      fetchChars: config.studioFetchChars,
      web: () => this.gatewayWeb(),
    })
    this.studio = config.studioDir === undefined ? undefined : new StudioRunner({
      dir: config.studioDir,
      port: config.studioPort,
      startMs: config.studioStartSeconds * 1000,
      // The Web UI is served from a loopback port and the desktop app from its own scheme; both embed the workbench.
      frameAncestors: ['http://127.0.0.1:*', 'http://localhost:*', 'dsh-app:'],
      gateway: this.gateway === undefined ? undefined : {
        start: () => this.gateway?.start() ?? Promise.reject(new Error('gateway stopped')),
        key: this.gateway.key,
      },
      warn: (message) => { this.ctx.logger.warn(message) },
    })
  }

  protected [Service.init](): void {
    for (const adapter of [douyinAdapter, xiaohongshuAdapter, wechatMpAdapter, wechatChannelsAdapter]) this.registerAdapter(adapter)
    this.ctx.inject(['tools'], (child) => {
      registerMediaTools(child, this)
      // The workbench's assistant runs on the client's default model through the gateway ('dsh' in the workbench).
      if (this.studio !== undefined) registerWritingTools(child, this.studio, this.gateway === undefined ? undefined : 'dsh')
    })
    this.ctx.effect(() => {
      const timer = setInterval(() => { void this.monitorTick() }, this.config.monitorTickSeconds * 1000)
      return () =>{  clearInterval(timer) }
    }, 'media-suite: monitor')
    this.ctx.effect(() => () => {
      this.studio?.stop()
      this.gateway?.stop()
    }, 'media-suite: stop the creation workbench and its model gateway')
    this.ctx.effect(() => async () => {
      await this.browser.dispose()
      this.store.close()
    }, 'media-suite: close browsers and database')
    void this.sweepProfiles()
  }

  /**
   * Register a platform adapter for the caller's lifetime.
   * @param adapter - adapter with an unused platform id.
   * @returns a disposer removing the adapter.
   * @throws {Error} when the id is malformed or already registered.
   */
  registerAdapter(adapter: MediaPlatformAdapter): () => void {
    const dispose = this.ctx.effect(() => this.registry.register(adapter), `media-suite: platform ${adapter.descriptor.id}`)
    return () => { void dispose() }
  }

  /**
   * Display name of a platform.
   * @param platform - platform id.
   * @returns the display name, or the id when unregistered.
   */
  platformName(platform: MediaPlatformId): string {
    return this.registry.get(platform)?.descriptor.displayName ?? platform
  }

  /** Whether automatic scraping applies to the account's platform and role. */
  private scrapes(account: MediaAccount): boolean {
    const adapter = this.registry.get(account.platform)
    return adapter?.descriptor.scrape === true && (adapter.scrapableRoles?.includes(account.role) ?? true)
  }

  private account(id: MediaAccountId): MediaAccount {
    const account = this.store.account(id)
    if (account === undefined) throw notFound('account', id)
    return account
  }

  private adapter(platform: MediaPlatformId): MediaPlatformAdapter {
    const adapter = this.registry.get(platform)
    if (adapter === undefined) throw notFound('platform', platform)
    return adapter
  }

  private async exclusive<T>(id: MediaAccountId, lane: 'data' | 'ai', run: () => Promise<T>): Promise<T> {
    const key = `${id}:${lane}`
    if (this.busy.has(key)) throw new RemoteError('media/busy', 'This account already has the same kind of work in progress.', { accountId: id })
    this.busy.add(key)
    try {
      return await run()
    } finally {
      this.busy.delete(key)
    }
  }

  /**
   * List registered platforms.
   * @returns descriptors in registration order.
   */
  @Remote
  platforms(): MediaPlatformDescriptor[] {
    return this.registry.descriptors()
  }

  /**
   * List configured accounts.
   * @returns accounts in creation order.
   */
  @Remote
  accounts(): MediaAccount[] {
    return this.store.accounts()
  }

  /**
   * Create or update an account.
   * @param draft - editable fields; omitting `id` creates an account.
   * @param view - embedded view the own account was scanned in; the account then keeps its login in that view's
   * browser profile, and an account profile it used before is deleted.
   * @returns the stored account.
   * @throws {RemoteError} `media/invalid` for an unregistered platform or empty name; `media/not-found` for an unknown id.
   */
  @Remote
  saveAccount(draft: MediaAccountDraft, view?: MediaBrowserId): MediaAccount {
    if (this.registry.get(draft.platform) === undefined) throw invalid('platform', `Platform "${draft.platform}" is not registered.`)
    const name = draft.name.trim()
    if (name === '') throw invalid('name', 'Account name must not be empty.')
    const profileUrl = draft.profileUrl.trim()
    if (profileUrl !== '' && !/^https?:\/\//.test(profileUrl)) throw invalid('profileUrl', 'Profile URL must start with http:// or https://.')
    // An own account saved again without its id, as after scanning in the same account twice, updates the stored one.
    const previous = draft.id === undefined
      ? (draft.role === 'own' ? this.matchingOwnAccount(draft.platform, profileUrl, name, true) : undefined)
      : this.account(draft.id)
    if (previous === undefined && draft.role === 'own') {
      const held = this.store.accounts().filter(item => item.role === 'own' && item.platform === draft.platform && item.demo !== true).length
      if (held >= this.config.maxAccountsPerPlatform) {
        throw new RemoteError('media/limit', `每个平台最多添加 ${this.config.maxAccountsPerPlatform} 个账号，${this.platformName(draft.platform)}已经满了；先删掉一个再添加。`, { platform: draft.platform, limit: this.config.maxAccountsPerPlatform })
      }
    }
    const now = new Date().toISOString()
    const interval = Number.isFinite(draft.monitor.intervalMinutes) && draft.monitor.intervalMinutes > 0
      ? draft.monitor.intervalMinutes
      : this.config.defaultIntervalMinutes
    const account: MediaAccount = {
      id: previous?.id ?? brandString<MediaAccountId>(`acct-${randomUUID()}`),
      platform: draft.platform,
      role: draft.role,
      name,
      profileUrl,
      niche: draft.niche.trim(),
      notes: draft.notes.trim(),
      monitor: { enabled: draft.monitor.enabled, intervalMinutes: Math.max(this.config.minIntervalMinutes, Math.round(interval)) },
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      ...avatarOf(draft.avatarUrl) === undefined && previous?.avatarUrl === undefined ? {} : { avatarUrl: avatarOf(draft.avatarUrl) ?? previous?.avatarUrl },
    }
    const scanned = view === undefined || draft.role !== 'own' ? undefined : this.browser.profileOf(view)
    // A view of the platform's shared profile, as the page of an earlier release opens, leaves the account as it was.
    const loginProfile = scanned !== undefined && scanned.platform === draft.platform && isAccountProfileKey(scanned.key)
      ? scanned.key
      : draft.role === 'own' ? previous?.loginProfile : undefined
    this.store.putAccount(loginProfile === undefined ? account : { ...account, loginProfile })
    if (previous?.loginProfile !== undefined && previous.loginProfile !== loginProfile) this.dropProfile(previous.loginProfile)
    return loginProfile === undefined ? account : { ...account, loginProfile }
  }

  /** Store the avatar an update read, when it changed; the account may have been edited or deleted meanwhile. */
  private keepAvatar(id: MediaAccountId, url: string | undefined): void {
    const avatarUrl = avatarOf(url)
    const current = this.store.accounts().find(item => item.id === id)
    if (avatarUrl === undefined || current === undefined || current.avatarUrl === avatarUrl) return
    this.store.putAccount({ ...current, avatarUrl })
  }

  /** The browser profile that scrapes, searches and views for an account run in. */
  private profileFor(account: MediaAccount): MediaBrowserProfile {
    const { platform } = account
    if (account.role === 'own') return { platform, key: account.loginProfile ?? platform }
    // A benchmark account has no login of its own: it is read with an own account's login on the same platform.
    const own = this.store.accounts().filter(item => item.role === 'own' && item.platform === platform && item.demo !== true)
    const reader = own.find(item => this.store.login(item.loginProfile ?? platform) === 'logged-in') ?? own[0]
    return { platform, key: reader?.loginProfile ?? platform }
  }

  /** Delete an account profile no account uses any more, with its stored login state. */
  private dropProfile(key: string): void {
    if (this.store.accounts().some(account => account.loginProfile === key)) return
    this.store.forgetLogin(key)
    void this.browser.discard(key)
  }

  /** Delete account profiles left by scans that were never finished. */
  private async sweepProfiles(): Promise<void> {
    const keep = new Set(this.store.accounts().flatMap(account => account.loginProfile === undefined ? [] : [account.loginProfile]))
    const removed = await this.browser.sweep(keep)
    for (const key of removed) this.store.forgetLogin(key)
  }

  /**
   * Delete an account with its snapshots, posts, runs and reports.
   * @param id - account id.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  deleteAccount(id: MediaAccountId): void {
    const account = this.store.account(id)
    if (!this.store.deleteAccount(id)) throw notFound('account', id)
    if (account?.loginProfile !== undefined) this.dropProfile(account.loginProfile)
  }

  /**
   * Read the page settings file again; the page asks each time it opens.
   * @returns the settings, with what could not be understood.
   */
  @Remote
  uiSettings(): MediaUiSettings {
    return { ...readUiSettings(this.config.uiFile), writing: this.studio !== undefined }
  }

  /**
   * Hand content to the suite to publish, such as a finished video from another plugin or a new article. Other plugins
   * call it through `ctx.get('mediaSuite')`; it is not a Remote method.
   * @param input - the content.
   * @returns the new draft's id.
   * @throws {RemoteError} `media/invalid` for an empty title or a relative path.
   */
  addDraft(input: MediaDraftInput): { readonly id: MediaDraftId } {
    const title = input.title.trim()
    if (title === '') throw invalid('title', 'Draft title must not be empty.')
    for (const [field, path] of [['file', input.file], ['folder', input.folder]] as const) {
      if (path !== undefined && !path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) throw invalid(field, `${field} must be an absolute path.`)
    }
    const draft: MediaDraft = {
      id: brandString<MediaDraftId>(`draft-${randomUUID()}`), source: input.source.trim() || '其他', kind: input.kind, title,
      file: input.file, folder: input.folder, note: input.note?.trim() || undefined, studioProject: input.studioProject,
      createdAt: new Date().toISOString(),
    }
    this.store.putDraft(draft)
    return { id: draft.id }
  }

  /**
   * List the drafts, newest first.
   * @returns drafts waiting to be published and published ones.
   */
  @Remote
  drafts(): MediaDraft[] {
    return this.store.drafts()
  }

  /**
   * Record where a draft was published, or clear it.
   * @param id - draft id.
   * @param url - address of the published post; empty marks the draft unpublished again.
   * @returns the updated draft.
   */
  @Remote
  markDraftPublished(id: MediaDraftId, url: string): MediaDraft {
    const draft = this.store.drafts().find(item => item.id === id)
    if (draft === undefined) throw notFound('draft', id)
    const address = url.trim()
    if (address !== '' && !/^https?:\/\//.test(address)) throw invalid('url', 'The post address must start with http:// or https://.')
    const updated: MediaDraft = address === ''
      ? { ...draft, publishedUrl: undefined, publishedAt: undefined }
      : { ...draft, publishedUrl: address, publishedAt: new Date().toISOString() }
    this.store.putDraft(updated)
    return updated
  }

  /**
   * Remove a draft from the list; its files stay where they are.
   * @param id - draft id.
   */
  @Remote
  removeDraft(id: MediaDraftId): void {
    if (!this.store.deleteDraft(id)) throw notFound('draft', id)
  }

  /**
   * Show a draft's file, or its folder, in the system file manager on the Host computer.
   * @param id - draft id.
   */
  @Remote
  revealDraft(id: MediaDraftId): void {
    const draft = this.store.drafts().find(item => item.id === id)
    if (draft === undefined) throw notFound('draft', id)
    const target = [draft.file, draft.folder].find(path => path !== undefined && existsSync(path))
    if (target === undefined) throw invalid('file', '这条内容的文件已经不在原来的位置了。')
    const [command, args] = process.platform === 'darwin' ? ['open', ['-R', target]]
      : process.platform === 'win32' ? ['explorer', [`/select,${target}`]] : ['xdg-open', [draft.folder ?? target]]
    execFile(command, args, (error) => { if (error !== null) this.ctx.logger.warn(`media-suite: could not reveal ${target}: ${error.message}`) })
  }

  /**
   * Add the sample accounts, counters, posts, reports and drafts for a demonstration, replacing earlier sample data.
   * @returns the sample own account.
   */
  @Remote
  loadDemo(): MediaAccount {
    this.clearDemo()
    const data = demoData(Date.now())
    for (const account of data.accounts) this.store.putAccount(account)
    for (const snapshot of data.snapshots) this.store.addSnapshot(snapshot)
    this.store.upsertPosts(data.posts)
    for (const run of data.runs) this.store.addRun(run)
    this.store.addTopicReport(data.topicReport)
    this.store.addAnalysisReport(data.analysisReport)
    for (const draft of data.drafts) this.store.putDraft(draft)
    const own = data.accounts.find(account => account.role === 'own')
    if (own === undefined) throw new Error('demo data has no own account')
    return own
  }

  /**
   * Delete every sample account with its data, and the sample drafts.
   * @returns how many sample accounts were deleted.
   */
  @Remote
  clearDemo(): number {
    let removed = 0
    for (const account of this.store.accounts()) if (account.demo === true && this.store.deleteAccount(account.id)) removed++
    for (const draft of this.store.drafts()) if (draft.demo === true) this.store.deleteDraft(draft.id)
    return removed
  }

  /**
   * Dashboard summary of one account.
   * @param id - account id.
   * @param days - window in days, clamped to 1..365.
   * @returns counters, series, deltas, engagement, last run, login state and next scheduled scrape.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  overview(id: MediaAccountId, days: number): MediaAccountOverview {
    const account = this.account(id)
    const window = Number.isFinite(days) ? Math.min(365, Math.max(1, Math.round(days))) : 30
    const now = Date.now()
    const since = new Date(now - window * 86400000).toISOString()
    const scrapes = this.scrapes(account)
    return buildOverview({
      account,
      snapshots: this.store.snapshots(id, since),
      latest: latestKnown(this.store.recentSnapshots(id, LATEST_KNOWN_SNAPSHOTS)),
      posts: this.store.posts(id, POST_LIMIT_MAX),
      since,
      lastRun: this.store.lastRun(id),
      login: this.store.login(this.profileFor(account).key),
      nextRunAt: scrapes ? nextRunAt(account, this.store.lastRun(id, 'scrape'), this.config.minIntervalMinutes, now, this.config.retryMinutes) : undefined,
    })
  }

  /**
   * Newest posts of one account.
   * @param id - account id.
   * @param limit - maximum posts, clamped to 1..500.
   * @returns posts, newest first.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  posts(id: MediaAccountId, limit: number): MediaPost[] {
    this.account(id)
    return this.store.posts(id, Number.isFinite(limit) ? Math.min(POST_LIMIT_MAX, Math.max(1, Math.round(limit))) : 50)
  }

  /** The descriptor of a platform, or a bare one when its adapter is not registered. */
  private descriptorOf(platform: MediaPlatformId): MediaPlatformDescriptor {
    return this.registry.descriptors().find(item => item.id === platform)
      ?? { id: platform, displayName: platform, loginUrl: '', scrape: false, import: false, importHint: '', profileUrlExample: '' }
  }

  /**
   * How trustworthy one account's numbers are right now.
   * @param account - stored account.
   * @param now - the current moment.
   * @returns the health.
   */
  healthOf(account: MediaAccount, now: number = Date.now()): MediaAccountHealth {
    const scrapes = this.scrapes(account)
    const monitored = scrapes && account.monitor.enabled && account.demo !== true
    return accountHealth({
      latest: latestKnown(this.store.recentSnapshots(account.id, LATEST_KNOWN_SNAPSHOTS)),
      lastRun: this.store.lastRun(account.id),
      login: account.demo === true ? 'unknown' : this.store.login(this.profileFor(account).key),
      nextRunAt: monitored ? nextRunAt(account, this.store.lastRun(account.id, 'scrape'), this.config.minIntervalMinutes, now, this.config.retryMinutes) : undefined,
      monitored,
      now,
      staleHours: this.config.staleHours,
    })
  }

  private sections(account: MediaAccount, days: number, now: number): ReturnType<typeof buildDashboard> {
    const since = dashboardSince(now, days)
    return buildDashboard({
      account,
      platform: this.descriptorOf(account.platform),
      snapshots: this.store.snapshots(account.id, since),
      latest: latestKnown(this.store.recentSnapshots(account.id, LATEST_KNOWN_SNAPSHOTS)),
      posts: this.store.posts(account.id, POST_LIMIT_MAX),
      now,
    }, days)
  }

  /**
   * The 总览 page: every own account with its health and 7-day headline counters, and the newest posts across them.
   * @returns own accounts in creation order and up to twelve newest posts.
   */
  @Remote
  summary(): MediaSummary {
    const now = Date.now()
    const own = this.store.accounts().filter(account => account.role === 'own')
    const accounts: MediaAccountSummary[] = own.map(account => ({
      account,
      platform: this.descriptorOf(account.platform),
      health: this.healthOf(account, now),
      headline: this.sections(account, 7, now).headline,
      followers: latestKnown(this.store.recentSnapshots(account.id, LATEST_KNOWN_SNAPSHOTS))?.followers,
      latestPost: this.store.posts(account.id, 1)[0],
    }))
    const latestPosts = own.flatMap(account => this.store.posts(account.id, 12))
      .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt)).slice(0, 12)
    return { accounts, latestPosts }
  }

  /**
   * The 总览 page over a window: every own account's counters, the 全网 totals (plain sums), works published on several
   * platforms, and the newest posts of every account.
   * @param days - window length, 1 to 90 days, each account's ending on its platform's last reported day.
   * @returns the network.
   */
  @Remote
  network(days: number): MediaNetwork {
    const span = Math.min(90, Math.max(1, Math.round(Number.isFinite(days) ? days : 7)))
    const now = Date.now()
    const own = this.store.accounts().filter(account => account.role === 'own')
    const entry = (account: MediaAccount, length: number): MediaNetworkAccount => {
      const sections = this.sections(account, length, now)
      return {
        account, platform: this.descriptorOf(account.platform), health: this.healthOf(account, now),
        followers: latestKnown(this.store.recentSnapshots(account.id, LATEST_KNOWN_SNAPSHOTS))?.followers,
        kpis: [...sections.works, ...sections.fans], from: sections.from, to: sections.to,
      }
    }
    const accounts = own.map(account => entry(account, span))
    const history = own.map(account => entry(account, NETWORK_TREND_DAYS))
    const posts = own.flatMap(account => this.store.posts(account.id, NETWORK_POSTS_PER_ACCOUNT))
      .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))
    const platformOf = new Map<string, string>(own.map(account => [account.id, account.platform]))
    return {
      days: span, accounts, totals: networkTotals(accounts, history),
      synced: findSyncedWorks(posts, id => platformOf.get(id)), posts: posts.slice(0, NETWORK_FEED),
    }
  }

  /**
   * The 今日简报 as the page polls it: the newest one, and the finished lines of one being written.
   * @returns the state.
   */
  @Remote
  brief(): MediaBriefState {
    const run = this.briefRun
    return {
      brief: this.store.latestBrief(), running: run !== undefined, partial: run?.partial ?? [],
      ...this.briefProblem === undefined ? {} : { problem: this.briefProblem },
      scheduleAt: `${String(this.config.briefHour).padStart(2, '0')}:00`,
    }
  }

  /**
   * Start writing a 今日简报 now, unless one is being written; the page polls {@link MediaSuite.brief} for its lines.
   * @returns the state right after starting.
   * @throws {RemoteError} `media/invalid` without accounts.
   */
  @Remote
  startBrief(): MediaBriefState {
    if (this.store.accounts().every(account => account.role !== 'own')) throw invalid('accounts', '还没有账号，先添加一个账号。')
    if (this.briefRun === undefined) void this.writeBrief()
    return this.brief()
  }

  /** Write a 今日简报 from the last 7 days, keeping its finished lines in {@link briefRun} as the model writes them. */
  private async writeBrief(): Promise<void> {
    const run = { partial: [] as MediaBriefItem[] }
    this.briefRun = run
    this.briefProblem = undefined
    try {
      const network = this.network(7)
      const names = new Map<string, string>(network.accounts.map(item => [item.account.id, item.platform.displayName]))
      const prompt = buildBriefPrompt({ ...network, platformName: id => names.get(id) ?? '', today: chinaDay(new Date().toISOString()) })
      const signal = AbortSignal.timeout(this.config.llmTimeoutSeconds * 1000)
      let items: readonly MediaBriefItem[] = []
      let model = ''
      for (let attempt = 0; ; attempt++) {
        const completion = await this.llm(prompt, signal, (text) => { run.partial = parseBriefLines(text, false, network.accounts, network.posts) })
        try {
          items = requireBriefItems(parseBriefLines(completion.text, true, network.accounts, network.posts))
          model = completion.model
          break
        } catch (error) {
          if (!(error instanceof MediaLlmOutputError) || attempt >= this.config.llmParseRetries) throw error
          run.partial = []
        }
      }
      const dataAt = network.accounts.map(item => this.store.latestSnapshot(item.account.id)?.capturedAt).filter((at): at is string => at !== undefined).sort().at(-1)
      const now = new Date().toISOString()
      this.store.addBrief({ id: brandString<MediaReportId>(`brief-${randomUUID()}`), day: chinaDay(now), createdAt: now, model, dataAt, items })
    } catch (error) {
      this.briefProblem = messageOf(error)
      this.ctx.logger.warn('media-suite: writing the 今日简报 failed: %s', this.briefProblem)
    } finally {
      this.briefRun = undefined
    }
  }

  /**
   * Write the day's 今日简报 once the configured hour has come, when today has none and real accounts have data.
   * A failed attempt is not repeated the same day.
   */
  private maybeScheduledBrief(now: number): void {
    const iso = new Date(now).toISOString()
    const today = chinaDay(iso)
    const hour = new Date(now + 8 * 3_600_000).getUTCHours()
    if (hour < this.config.briefHour || this.briefRun !== undefined || this.briefTriedDay === today) return
    if (this.store.latestBrief()?.day === today) return
    const real = this.store.accounts().filter(account => account.role === 'own' && account.demo !== true)
    if (!real.some(account => this.store.latestSnapshot(account.id) !== undefined)) return
    this.briefTriedDay = today
    void this.writeBrief()
  }

  /**
   * Everything the dashboard of one account shows.
   * @param id - account id.
   * @param days - window in whole days ending yesterday, clamped to 1..90.
   * @returns health, the 7-day headline, the works and fans counters over the window, top posts and newest posts.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  dashboard(id: MediaAccountId, days: number): MediaDashboard {
    const account = this.account(id)
    const window = Number.isFinite(days) ? Math.min(90, Math.max(1, Math.round(days))) : 7
    const now = Date.now()
    return {
      ...this.sections(account, window, now),
      account,
      platform: this.descriptorOf(account.platform),
      health: this.healthOf(account, now),
      posts: this.store.posts(id, 50),
    }
  }

  /**
   * Detail of one post: the platform's counters, rates and how they compare with the account's other posts.
   * @param id - account id.
   * @param postId - platform post id.
   * @returns the detail.
   * @throws {RemoteError} `media/not-found` for an unknown account or post.
   */
  @Remote
  postDetail(id: MediaAccountId, postId: string): MediaPostDetail {
    const account = this.account(id)
    const post = this.store.post(id, postId)
    if (post === undefined) throw notFound('post', postId)
    return buildPostDetail({ account, platform: this.descriptorOf(account.platform), post, recent: this.store.posts(id, 50) })
  }

  /**
   * Scrape one account now through the platform's headless browser. The run is recorded even when it fails.
   * @param id - account id.
   * @param signal - cancellation.
   * @returns the recorded run; failures carry `ok: false` and an error code.
   * @throws {RemoteError} `media/not-found`, or `media/busy` while the account is already being scraped or imported.
   */
  @Remote
  async refresh(id: MediaAccountId, signal: AbortSignal): Promise<MediaRunRecord> {
    const account = this.account(id)
    if (account.demo === true) throw invalid('demo', '演示账号的数据是预置的，不会去平台抓取。')
    return await this.exclusive(id, 'data', () => this.scrape(account, signal))
  }

  private async scrape(account: MediaAccount, signal: AbortSignal): Promise<MediaRunRecord> {
    const startedAt = new Date().toISOString()
    const adapter = this.registry.get(account.platform)
    const finish = (fields: { ok: boolean; errorCode?: string; message?: string; postsWritten: number }): MediaRunRecord => {
      const run: MediaRunRecord = { accountId: account.id, kind: 'scrape', startedAt, finishedAt: new Date().toISOString(), ...fields }
      this.store.addRun(run)
      return run
    }
    const scrape = adapter?.scrape
    if (adapter === undefined || scrape === undefined || !adapter.descriptor.scrape) {
      return finish({ ok: false, errorCode: 'unsupported', message: '该平台不支持自动抓取，请导入数据文件。', postsWritten: 0 })
    }
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.scrapeTimeoutSeconds * 1000)])
    const profile = this.profileFor(account)
    try {
      const limits = { maxPosts: this.config.maxPostsPerScrape, signal: deadline }
      const result = await this.browser.withPage(profile, deadline, page => scrape(page, account, limits))
      const at = new Date().toISOString()
      this.store.setLogin(profile.key, 'logged-in', at)
      this.store.addSnapshot({ ...result.snapshot, accountId: account.id, capturedAt: at, source: 'scrape' })
      this.keepAvatar(account.id, result.avatarUrl)
      const written = this.store.upsertPosts(result.posts.map(post => ({ ...post, accountId: account.id, source: 'scrape', updatedAt: at })))
      const backfill = await this.backfill(account, adapter, signal)
      return finish({ ok: true, postsWritten: written, ...backfill === undefined ? {} : { message: backfill } })
    } catch (error) {
      signal.throwIfAborted()
      if (error instanceof MediaScrapeError) {
        if (error.code === 'login-required') this.store.setLogin(profile.key, 'logged-out', new Date().toISOString())
        return finish({ ok: false, errorCode: error.code, message: error.message, postsWritten: 0 })
      }
      if (error instanceof MediaBrowserUnavailableError) return finish({ ok: false, errorCode: 'browser-unavailable', message: error.message, postsWritten: 0 })
      const timedOut = deadline.aborted
      this.ctx.logger.warn('media-suite: scrape of %s failed: %s', account.id, messageOf(error))
      return finish({
        ok: false, errorCode: 'scrape-failed', postsWritten: 0,
        message: timedOut ? `抓取超过 ${this.config.scrapeTimeoutSeconds} 秒未完成，页面可能需要验证；请在内嵌浏览器中查看。` : `抓取失败：${messageOf(error)}`,
      })
    }
  }

  /**
   * Backfill past daily snapshots of an own account after a successful scrape. Failures are reported in the run
   * message and never fail the scrape.
   * @returns the run message, or undefined when the adapter offers no history or backfill is disabled.
   */
  private async backfill(account: MediaAccount, adapter: MediaPlatformAdapter, signal: AbortSignal): Promise<string | undefined> {
    const history = adapter.history
    if (history === undefined || account.role !== 'own' || this.config.historyDays === 0) return undefined
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.historyTimeoutSeconds * 1000)])
    try {
      const limits = { days: this.config.historyDays, signal: deadline }
      const days = await this.browser.withPage(this.profileFor(account), deadline, page => history(page, account, limits))
      const latest = latestKnown(this.store.recentSnapshots(account.id, LATEST_KNOWN_SNAPSHOTS))
      // Every reported day is written again: the platform finishes a day's numbers later (and corrects them), and
      // the regular captures of that day hold no daily values, so skipping days that already have a snapshot would
      // freeze the dashboard at the first backfill. Each day's backfill sits at a fixed instant and replaces the last one.
      const snapshots = historySnapshots({
        accountId: account.id, days, latestFollowers: latest?.followers,
        today: chinaDay(latest?.capturedAt ?? new Date().toISOString()),
        existingDays: new Set(),
      })
      let added = 0
      for (const snapshot of snapshots) if (!this.store.replaceSnapshot(snapshot)) added++
      return added === 0 ? undefined : `已补全 ${added} 天的历史数据。`
    } catch (error) {
      signal.throwIfAborted()
      this.ctx.logger.warn('media-suite: history backfill of %s failed: %s', account.id, messageOf(error))
      return `历史数据未能补全：${deadline.aborted ? `超过 ${this.config.historyTimeoutSeconds} 秒未完成` : messageOf(error)}`
    }
  }

  /**
   * Import a creator-backend export file (xlsx, xls, csv in UTF-8 or GBK).
   * @param id - account id.
   * @param fileName - original file name; the extension selects CSV decoding.
   * @param base64 - file content.
   * @returns what was written and which headers were not recognized.
   * @throws {RemoteError} `media/not-found`, `media/busy`, `media/invalid` for a non-base64 body, or `media/import-failed`.
   */
  @Remote
  async importFile(id: MediaAccountId, fileName: string, base64: string): Promise<MediaImportResult> {
    const account = this.account(id)
    if (account.demo === true) throw invalid('demo', '演示账号的数据是预置的，不能导入文件。')
    const adapter = this.adapter(account.platform)
    const bytes = Buffer.from(base64, 'base64')
    if (bytes.length === 0 || bytes.toString('base64').replace(/=+$/, '') !== base64.replace(/\s/g, '').replace(/=+$/, '')) {
      throw invalid('base64', 'File content must be non-empty canonical base64.')
    }
    return await this.exclusive(id, 'data', () => {
      const startedAt = new Date().toISOString()
      let parsed: ParsedImport
      try {
        parsed = parseImportFile(fileName, bytes, adapter.importProfile)
      } catch (error) {
        const reason = messageOf(error)
        this.store.addRun({ accountId: id, kind: 'import', startedAt, finishedAt: new Date().toISOString(), ok: false, errorCode: 'parse-failed', message: reason, postsWritten: 0 })
        if (error instanceof MediaImportError) throw new RemoteError('media/import-failed', reason, { fileName, reason }, { cause: error })
        throw error
      }
      const at = new Date().toISOString()
      for (const snapshot of parsed.snapshots) {
        this.store.addSnapshot({ ...snapshot.fields, accountId: id, capturedAt: snapshot.capturedAt ?? at, source: 'import' })
      }
      const written = this.store.upsertPosts(parsed.posts.map(post => ({ ...post, accountId: id, source: 'import', updatedAt: at })))
      this.store.addRun({ accountId: id, kind: 'import', startedAt, finishedAt: new Date().toISOString(), ok: true, postsWritten: written })
      return Promise.resolve({
        snapshotWritten: parsed.snapshots.length > 0, postsWritten: written, unmappedColumns: parsed.unmappedColumns,
      })
    })
  }

  private benchmarksFor(account: MediaAccount): BenchmarkInput[] {
    const niche = account.niche.trim()
    return this.store.accounts()
      .filter(other => other.role === 'benchmark' && other.id !== account.id
        && (other.platform === account.platform || (niche !== '' && other.niche.trim() === niche)))
      .map(other => ({ account: other, posts: this.store.posts(other.id, 60) }))
  }

  /**
   * Generate and store a topic report. Research comes first: stale benchmark accounts are scraped again, and the
   * platform's trending list, platform searches for the account's own keywords and web news are read. The model sees
   * all of it with the account's posts and the titles recent reports already suggested, and returns search keywords
   * per topic; each topic's keywords are then searched on the platform and the best results are attached. A research
   * source that fails is skipped with a note.
   * @param id - account id.
   * @param signal - cancellation.
   * @returns the stored report.
   * @throws {RemoteError} `media/not-found`, `media/busy`, or `media/llm-failed`.
   */
  @Remote
  async generateTopics(id: MediaAccountId, signal: AbortSignal): Promise<MediaTopicReport> {
    return await this.topics(id, '', signal)
  }

  /**
   * Generate and store a topic report about a direction the user names, such as a theme, a product or an event.
   * Everything else is as in {@link MediaSuite.generateTopics}.
   * @param id - account id.
   * @param direction - what the topics should be about, in the user's words; blank means no direction.
   * @param signal - cancellation.
   * @returns the stored report, which records the direction.
   * @throws {RemoteError} `media/not-found`, `media/busy`, `media/llm-failed`, or `media/invalid` for a direction
   * longer than 500 characters.
   */
  @Remote
  async generateTopicsAbout(id: MediaAccountId, direction: string, signal: AbortSignal): Promise<MediaTopicReport> {
    const about = direction.replace(/\s+/g, ' ').trim()
    if (about.length > MAX_DIRECTION_CHARS) throw invalid('direction', `方向最多写 ${String(MAX_DIRECTION_CHARS)} 个字。`)
    return await this.topics(id, about, signal)
  }

  private async topics(id: MediaAccountId, direction: string, signal: AbortSignal): Promise<MediaTopicReport> {
    const account = this.account(id)
    return await this.exclusive(id, 'ai', async () => {
      const posts = this.store.posts(id, 60)
      const notes: string[] = []
      const benchmarksRefreshed = await this.refreshBenchmarks(account, notes, signal)
      const benchmarks = this.benchmarksFor(account)
      const research = await this.research(account, posts, benchmarksRefreshed, notes, signal)
      const platformName = this.platformName(account.platform)
      const earlier = this.config.topicHistoryReports === 0 ? [] : this.store.topicReports(id, this.config.topicHistoryReports)
      const previous = [...new Set(earlier.flatMap(report => report.suggestions.map(suggestion => suggestion.title)))]
      const prompt = buildTopicPrompt(account, platformName, posts, benchmarks, this.config.topicCount, research, { direction, previous })
      const { output, model } = await this.ask(id, prompt, parseTopicOutput, signal)
      const suggestions = await this.attachRelated(account, posts, output.suggestions, notes, signal)
      const report: MediaTopicReport = {
        id: reportId(), accountId: id, createdAt: new Date().toISOString(), model, summary: output.summary, suggestions,
        research: { ...research, notes }, ...direction === '' ? {} : { direction },
      }
      this.store.addTopicReport(report)
      return report
    })
  }

  /** Scrape benchmark accounts whose newest snapshot is older than the refresh age; busy or failing ones are noted. */
  private async refreshBenchmarks(account: MediaAccount, notes: string[], signal: AbortSignal): Promise<number> {
    const hours = this.config.benchmarkRefreshHours
    if (hours === 0) return 0
    const staleBefore = new Date(Date.now() - hours * 3_600_000).toISOString()
    const stale = this.benchmarksFor(account)
      .map(item => item.account)
      .filter(other => this.registry.get(other.platform)?.scrape !== undefined
        && (this.store.recentSnapshots(other.id, 1)[0]?.capturedAt ?? '') < staleBefore)
    let refreshed = 0
    for (const other of stale) {
      try {
        const run = await this.exclusive(other.id, 'data', () => this.scrape(other, signal))
        if (run.ok) refreshed++
        else notes.push(`对标账号「${other.name}」更新失败：${run.message ?? run.errorCode ?? '未知原因'}`)
      } catch (error) {
        signal.throwIfAborted()
        notes.push(`对标账号「${other.name}」正在更新，本次使用已有数据：${messageOf(error)}`)
      }
    }
    return refreshed
  }

  /**
   * Read the trending list and search the account's keywords on its platform, then search the web for news. Each
   * source is bounded by the research deadline; failures become notes.
   */
  private async research(
    account: MediaAccount, posts: readonly MediaPost[], benchmarksRefreshed: number, notes: string[], signal: AbortSignal,
  ): Promise<Omit<MediaTopicResearch, 'notes'>> {
    const adapter = this.registry.get(account.platform)
    const keywords = researchKeywords(account, posts, this.config.researchKeywords)
    let trending: readonly MediaTrendingTopic[] = []
    const searches: MediaKeywordSearch[] = []
    const { trending: readTrending, search } = adapter ?? {}
    const platformWork = (readTrending !== undefined && this.config.trendingCount > 0) || (search !== undefined && keywords.length > 0)
    if (platformWork) {
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.researchTimeoutSeconds * 1000)])
      try {
        await this.browser.withPage(this.profileFor(account), deadline, async (page) => {
          if (readTrending !== undefined && this.config.trendingCount > 0) {
            trending = (await readTrending(page, deadline)).slice(0, this.config.trendingCount)
            if (trending.length === 0) notes.push(`没有读到${this.platformName(account.platform)}热榜`)
          }
          if (search === undefined) return
          for (const keyword of keywords) {
            const found = await search(page, keyword, { maxPosts: this.config.researchPostsPerKeyword * 2, signal: deadline })
            const ownIds = new Set(posts.map(post => post.postId))
            searches.push({ keyword, posts: topRelated(found, ownIds, account.name, this.config.researchPostsPerKeyword, this.recency()) })
          }
        })
      } catch (error) {
        signal.throwIfAborted()
        notes.push(`${this.platformName(account.platform)}热榜和搜索未完成：${deadline.aborted ? `超过 ${this.config.researchTimeoutSeconds} 秒` : messageOf(error)}`)
      }
    }
    const news = await this.searchNews(keywords, account, notes, signal)
    return { searches, trending, news, benchmarksRefreshed }
  }

  private async searchNews(
    keywords: readonly string[], account: MediaAccount, notes: string[], signal: AbortSignal,
  ): Promise<MediaNewsItem[]> {
    const web = this.ctx.get('web')
    if (this.config.newsResults === 0 || keywords.length === 0) return []
    if (web === undefined) {
      notes.push('未启用联网搜索，没有查询相关新闻')
      return []
    }
    const query = [account.niche.trim(), ...keywords.slice(0, 2), '最新消息'].filter(part => part !== '').join(' ')
    try {
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.researchTimeoutSeconds * 1000)])
      const result = await web.search({ query, maxResults: this.config.newsResults }, deadline)
      return result.sources.slice(0, this.config.newsResults).map(source => ({
        title: source.title ?? source.url, url: source.url, snippet: source.snippet ?? source.summary ?? '',
        ...source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt },
      }))
    } catch (error) {
      signal.throwIfAborted()
      notes.push(`联网搜索新闻失败：${messageOf(error)}`)
      return []
    }
  }

  /** The window inside which found platform posts rank first. */
  private recency(): MediaRecency {
    return { now: Date.now(), days: this.config.relatedRecentDays }
  }

  /** Search each suggestion's keywords on the platform and attach the best results, recent ones first. */
  private async attachRelated(
    account: MediaAccount, posts: readonly MediaPost[], suggestions: readonly Omit<MediaTopicSuggestion, 'related'>[], notes: string[],
    signal: AbortSignal,
  ): Promise<MediaTopicSuggestion[]> {
    const related = new Map<number, MediaRelatedPost[]>()
    const search = this.registry.get(account.platform)?.search
    if (search !== undefined && this.config.relatedPerTopic > 0) {
      const ownIds = new Set(posts.map(post => post.postId))
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.researchTimeoutSeconds * 1000)])
      try {
        await this.browser.withPage(this.profileFor(account), deadline, async (page) => {
          for (const [index, suggestion] of suggestions.entries()) {
            const found = await search(page, suggestionQuery(suggestion), { maxPosts: this.config.relatedPerTopic * 2, signal: deadline })
            related.set(index, topRelated(found, ownIds, account.name, this.config.relatedPerTopic, this.recency()))
          }
        })
      } catch (error) {
        signal.throwIfAborted()
        notes.push(`部分选题没有搜到同类作品：${deadline.aborted ? `超过 ${this.config.researchTimeoutSeconds} 秒` : messageOf(error)}`)
      }
    }
    return suggestions.map((suggestion, index) => ({ ...suggestion, related: related.get(index) ?? [] }))
  }

  /**
   * Search the platform for each suggestion of a stored topic report again and store the most liked results, for a
   * report generated before related posts existed or whose related posts are stale. Suggestions without keywords are
   * searched by title. A search that fails keeps the suggestion's previous related posts and adds a note.
   * @param id - report id.
   * @param signal - cancellation.
   * @returns the updated report.
   * @throws {RemoteError} `media/not-found` for an unknown report or a deleted account, `media/invalid` when the
   * platform offers no search, or `media/busy` while the account has AI work in progress.
   */
  @Remote
  async findRelated(id: MediaReportId, signal: AbortSignal): Promise<MediaTopicReport> {
    const report = this.store.topicReport(id)
    if (report === undefined) throw notFound('report', id)
    const account = this.account(report.accountId)
    if (this.registry.get(account.platform)?.search === undefined) {
      throw invalid('platform', 'This platform offers no search.')
    }
    return await this.exclusive(account.id, 'ai', async () => {
      const notes = [...report.research?.notes ?? []]
      const searched = await this.attachRelated(account, this.store.posts(account.id, 60), report.suggestions, notes, signal)
      const suggestions = searched.map((suggestion, index) => suggestion.related.length > 0
        ? suggestion
        : { ...suggestion, related: report.suggestions[index]?.related ?? [] })
      const research = report.research === undefined ? {} : { research: { ...report.research, notes } }
      const updated: MediaTopicReport = { ...report, suggestions, ...research }
      this.store.replaceTopicReport(updated)
      return updated
    })
  }

  /** Every model the client's providers list, as `provider/model`; providers that fail to list are skipped. */
  private async clientModels(): Promise<GatewayModel[]> {
    const models: GatewayModel[] = []
    for (const provider of this.ctx.llm.listProviders()) {
      try {
        for (const model of await this.ctx.llm.listModels(provider.id)) models.push({ id: `${provider.id}/${model.id}`, name: `${model.name} · ${provider.name}` })
      } catch (error) {
        this.ctx.logger.warn('media-suite: listing models of %s failed: %s', provider.id, messageOf(error))
      }
    }
    const route = this.reportRoute()
    const fallback = `${route.provider}/${route.model}`
    // The default model works even when its provider's catalog cannot be listed.
    return models.some(model => model.id === fallback) ? models : [{ id: fallback, name: route.model }, ...models]
  }

  /** The model reports and the workbench default to: the configured pair, else the client's current default. */
  private reportRoute(): { readonly provider: string; readonly model: string } {
    const { provider, model } = this.config
    return provider !== undefined && model !== undefined ? { provider, model } : this.ctx.agentDefaultModel.currentSelection()
  }

  /** Run one workbench model call on the Host's model layer, with the client's credentials. */
  private async *streamClientModel(request: Parameters<GatewayLlm['stream']>[0]): AsyncIterable<StreamChunk> {
    const { provider, model, signal } = request
    const call = await this.ctx.llm.prepareCall({ provider, model, maxTokens: request.maxTokens ?? this.config.llmMaxTokens }, signal)
    yield* call.stream({
      ...call.config,
      system: request.system,
      messages: request.messages,
      ...request.tools.length === 0 ? {} : { tools: request.tools },
      purpose: 'media-suite',
      signal: request.signal,
    })
  }

  /** Store a request image in the Host's attachment store, or report that the Host has none. */
  private async saveRequestImage(data: Uint8Array, mediaType: string): Promise<ImageBlock | undefined> {
    const store = this.ctx.get('attachments')
    if (store === undefined || !IMAGE_TYPES.includes(mediaType)) return undefined
    const [ref] = await store.saveImages([{ data, mediaType: mediaType as ImageMediaType }])
    return ref === undefined ? undefined : { type: 'image', attachment: ref }
  }

  /** Web search and fetch through the Host's `web` service, when it is installed. */
  private gatewayWeb(): GatewayWeb | undefined {
    const web = this.ctx.get('web')
    if (web === undefined) return undefined
    return {
      search: async (query, maxResults, signal) => (await web.search({ query, maxResults }, signal)).sources.map(source => ({
        url: source.url, title: source.title, snippet: source.snippet ?? source.summary, publishedAt: source.publishedAt,
      })),
      fetch: async (url, signal) => {
        const page = await web.fetch({ url }, signal)
        return { url: page.url, status: page.statusCode, text: page.body.kind === 'html' ? htmlText(page.body.content) : page.body.content }
      },
    }
  }

  /**
   * Start the creation workbench unless it runs, and return its page URL.
   * @param signal - cancellation.
   * @returns the URL, or undefined when no workbench folder is configured.
   * @throws {RemoteError} `media/studio-failed` when the workbench does not start.
   */
  @Remote
  async studioOpen(signal: AbortSignal): Promise<string | undefined> {
    if (this.studio === undefined) return undefined
    try {
      return await this.studio.ensure(signal)
    } catch (error) {
      signal.throwIfAborted()
      throw new RemoteError('media/studio-failed', messageOf(error), { reason: messageOf(error) }, { cause: error })
    }
  }

  /**
   * Create a project in the creation workbench from one suggestion of a stored topic report: a video script for a
   * video topic, whose skeleton is filled from the topic's filming plan, and an article otherwise. The topic's angle,
   * reasoning, headlines, keywords, references and related posts become the project's research notes.
   * @param id - report id.
   * @param index - suggestion index in the report.
   * @param signal - cancellation.
   * @returns the workbench URL that opens the new article's research step or the new script's writing step.
   * @throws {RemoteError} `media/not-found` for an unknown report, `media/invalid` for an index outside the report or
   * when no workbench folder is configured, or `media/studio-failed` when the workbench does not start or refuses.
   */
  @Remote
  async studioWriteArticle(id: MediaReportId, index: number, signal: AbortSignal): Promise<string> {
    const report = this.store.topicReport(id)
    if (report === undefined) throw notFound('report', id)
    const suggestion = report.suggestions[index]
    if (suggestion === undefined) throw invalid('index', 'No suggestion has that index.')
    if (this.studio === undefined) throw invalid('studioDir', 'No creation workbench folder is configured.')
    const account = this.store.accounts().find(item => item.id === report.accountId)
    const idea = studioIdeaFrom(suggestion, account?.name ?? '', this.platformName(account?.platform ?? ''))
    try {
      const type = suggestion.format === 'video' ? 'script' : 'article'
      const project = await this.studio.create(type, studioProjectName(suggestion.title), idea, signal)
      this.addDraft({ source: '写作', kind: type === 'script' ? 'video' : 'article', title: suggestion.title, studioProject: project })
      return this.studio.projectUrl(project, type)
    } catch (error) {
      signal.throwIfAborted()
      throw new RemoteError('media/studio-failed', messageOf(error), { reason: messageOf(error) }, { cause: error })
    }
  }

  /**
   * List stored topic reports.
   * @param id - account id.
   * @returns reports, newest first.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  topicReports(id: MediaAccountId): MediaTopicReport[] {
    this.account(id)
    return this.store.topicReports(id, this.config.reportHistory)
  }

  /**
   * Generate and store a diagnosis of what an own account should improve over the analysis window.
   * @param id - own account id.
   * @param signal - cancellation.
   * @returns the stored report.
   * @throws {RemoteError} `media/not-found`, `media/invalid` for a benchmark account, `media/busy`, or `media/llm-failed`.
   */
  @Remote
  async analyze(id: MediaAccountId, signal: AbortSignal): Promise<MediaAnalysisReport> {
    const account = this.account(id)
    if (account.role !== 'own') throw invalid('role', 'Diagnosis is available for own accounts only.')
    return await this.exclusive(id, 'ai', async () => {
      const days = this.config.analysisWindowDays
      const overview = this.overview(id, days)
      const since = new Date(Date.now() - days * 86400000).toISOString()
      const posts = this.store.posts(id, POST_LIMIT_MAX).filter(post => (post.publishedAt ?? post.updatedAt) >= since)
      const prompt = buildAnalysisPrompt(overview, this.platformName(account.platform), posts, days)
      const { output, model } = await this.ask(id, prompt, parseAnalysisOutput, signal)
      const report: MediaAnalysisReport = {
        id: reportId(), accountId: id, createdAt: new Date().toISOString(), model,
        summary: output.summary, strengths: output.strengths, items: output.items,
      }
      this.store.addAnalysisReport(report)
      return report
    })
  }

  /**
   * List stored diagnosis reports.
   * @param id - account id.
   * @returns reports, newest first.
   * @throws {RemoteError} `media/not-found` for an unknown id.
   */
  @Remote
  analysisReports(id: MediaAccountId): MediaAnalysisReport[] {
    this.account(id)
    return this.store.analysisReports(id, this.config.reportHistory)
  }

  /**
   * Ask the model and parse its answer. An answer that is not the requested JSON is asked again, up to the configured
   * number of extra calls; a failed call is not retried.
   */
  private async ask<T>(
    id: MediaAccountId, prompt: MediaPrompt, parse: (text: string) => T, signal: AbortSignal,
  ): Promise<{ output: T; model: string }> {
    for (let attempt = 0; ; attempt++) {
      let completion: MediaLlmCompletion
      try {
        completion = await this.llm(prompt, signal)
      } catch (error) {
        signal.throwIfAborted()
        throw new RemoteError('media/llm-failed', `模型调用失败：${messageOf(error)}`, { accountId: id, reason: messageOf(error) }, { cause: error })
      }
      try {
        return { output: parse(completion.text), model: completion.model }
      } catch (error) {
        if (!(error instanceof MediaLlmOutputError)) throw error
        if (attempt < this.config.llmParseRetries) {
          this.ctx.logger.warn('media-suite: model answer for %s was not the requested JSON, asking again: %s', id, error.message)
          continue
        }
        throw new RemoteError('media/llm-failed', error.message, { accountId: id, reason: error.message }, { cause: error })
      }
    }
  }

  private async completeWithModel(request: MediaPrompt, signal: AbortSignal, onText?: (text: string) => void): Promise<MediaLlmCompletion> {
    const { provider, model } = this.config
    const route = provider !== undefined && model !== undefined ? { provider, model } : this.ctx.agentDefaultModel.currentSelection()
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.config.llmTimeoutSeconds * 1000)])
    const call = await this.ctx.llm.prepareCall({ ...route, maxTokens: this.config.llmMaxTokens }, deadline)
    const assembler = new BlockAssembler()
    const stream = call.stream({
      ...call.config,
      system: request.system,
      messages: [createUserMessage({ content: [{ type: 'text', text: request.input }], source: { kind: 'user' } })],
      purpose: 'media-suite',
      signal: deadline,
    })
    for await (const chunk of stream) {
      assembler.push(chunk)
      if (onText !== undefined) onText(assembler.blocks().map(block => block.type === 'text' ? block.text : '').join(''))
    }
    const finish = assembler.finish
    if (finish.kind === 'error' || finish.kind === 'aborted') throw new Error(finish.failure.message)
    const text = assembler.blocks().map(block => block.type === 'text' ? block.text : '').join('')
    if (finish.kind === 'max-tokens' && text.lastIndexOf('}') < 0) throw new Error(`回答超过 ${this.config.llmMaxTokens} 个 token 上限被截断。`)
    return { text, model: `${route.provider}/${route.model}` }
  }

  /**
   * Last detected login state of a browser profile.
   * @param platform - platform id.
   * @param account - account whose profile is asked about; without it, the platform's shared profile.
   * @returns the state, or `unknown` when never detected.
   * @throws {RemoteError} `media/not-found` for an unregistered platform or unknown account.
   */
  @Remote
  loginState(platform: MediaPlatformId, account?: MediaAccountId): MediaLoginState {
    this.adapter(platform)
    return this.store.login(account === undefined ? platform : this.profileFor(this.account(account)).key)
  }

  /**
   * Open an embedded headless browser view in a persistent profile.
   * @param platform - platform id.
   * @param url - first URL; defaults to the platform's login page.
   * @param account - account whose profile the view opens in; without it, the platform's shared profile.
   * @param fresh - open a new, empty account profile instead, to scan in another account of the platform while the
   * accounts already connected stay logged in. Saving the account with this view keeps the profile; otherwise it is
   * deleted on a later start.
   * @returns the view id and viewport size.
   * @throws {RemoteError} `media/not-found`, `media/invalid` for a non-http URL or an account of another platform, or
   * `media/browser-unavailable`.
   */
  @Remote
  async browserOpen(platform: MediaPlatformId, url?: string, account?: MediaAccountId, fresh?: boolean): Promise<MediaBrowserView> {
    const adapter = this.adapter(platform)
    const target = url?.trim() || adapter.descriptor.loginUrl
    if (!/^https?:\/\//.test(target)) throw invalid('url', 'Only http and https URLs can be opened.')
    const owner = account === undefined ? undefined : this.account(account)
    if (owner !== undefined && owner.platform !== platform) throw invalid('account', `Account "${owner.id}" is not on platform "${platform}".`)
    const shared: MediaBrowserProfile = { platform, key: platform }
    const profile = fresh === true ? newAccountProfile(platform) : owner === undefined ? shared : this.profileFor(owner)
    try {
      return await this.browser.open(profile, target)
    } catch (error) {
      if (error instanceof MediaBrowserUnavailableError) {
        throw new RemoteError('media/browser-unavailable', error.message, { platform }, { cause: error })
      }
      throw error
    }
  }

  /**
   * Follow an embedded view: the latest frame and login state, then JPEG frames and login changes, ending with `closed`.
   * @param id - view id.
   * @param signal - ends the subscription; an unfollowed view closes after the detach period.
   * @returns the frame stream.
   * @throws {RemoteError} `media/not-found` when the view is not open.
   */
  @Remote({ mode: 'stream' })
  async *browserFrames(id: MediaBrowserId, signal: AbortSignal): AsyncIterable<MediaBrowserFrame> {
    if (!this.browser.has(id)) throw notFound('browser', id)
    yield* this.browser.frames(id, signal)
  }

  /**
   * Forward panel input to an embedded view.
   * @param id - view id.
   * @param input - pointer, key, text or navigation input in viewport pixels.
   * @returns after the input is dispatched.
   * @throws {RemoteError} `media/not-found` for a closed view or `media/invalid` for out-of-range input.
   */
  @Remote
  async browserInput(id: MediaBrowserId, input: MediaBrowserInput): Promise<void> {
    try {
      await this.browser.input(id, input)
    } catch (error) {
      if (error instanceof MediaBrowserViewMissingError) throw notFound('browser', id)
      if (error instanceof MediaBrowserInputError) throw invalid('input', error.message)
      if (input.kind === 'navigate' || input.kind === 'back' || input.kind === 'reload') {
        // A navigation the page itself redirects or aborts is not a panel error; frames show the result.
        this.ctx.logger.debug('media-suite: navigation in %s ended early: %s', id, messageOf(error))
        return
      }
      throw error
    }
  }

  /**
   * Identify the account logged in to an embedded view's profile, for adding it as an own account. The view itself
   * is not navigated.
   * @param id - open view.
   * @param signal - cancellation.
   * @returns nickname, canonical profile URL and the matching stored own account, if any.
   * @throws {RemoteError} `media/not-found` for an unknown view, `media/login-required` when the view is not logged in,
   * `media/invalid` when the account cannot be identified, or `media/browser-unavailable`.
   */
  @Remote
  async identify(id: MediaBrowserId, signal: AbortSignal): Promise<MediaAccountIdentity> {
    let identity: MediaAccountIdentity | undefined
    try {
      identity = await this.browser.identify(id, signal)
    } catch (error) {
      signal.throwIfAborted()
      if (error instanceof MediaBrowserViewMissingError) throw notFound('browser', id)
      if (error instanceof MediaBrowserLoginRequiredError) {
        const platform = this.browser.platformOf(id) ?? ''
        throw new RemoteError('media/login-required', '请先在内嵌浏览器中扫码登录。', { platform }, { cause: error })
      }
      if (error instanceof MediaBrowserUnavailableError) {
        throw new RemoteError('media/browser-unavailable', error.message, { platform: error.platform }, { cause: error })
      }
      this.ctx.logger.warn('media-suite: identify in %s failed: %s', id, messageOf(error))
      throw invalid('identity', `没能识别当前登录的账号（${messageOf(error)}）。请确认已登录完成后重试，或手动填写账号信息。`)
    }
    if (identity === undefined) {
      throw invalid('identity', '没能识别当前登录的账号：页面上没有读到账号信息。请在内嵌浏览器中确认已登录后重试，或手动填写账号信息。')
    }
    return identity
  }

  private async identifyOnPage(platform: MediaPlatformId, page: Page, signal: AbortSignal): Promise<MediaAccountIdentity | undefined> {
    const identify = this.registry.get(platform)?.identify
    if (identify === undefined) return undefined
    const fields = await identify(page, signal)
    if (fields === undefined) return undefined
    const existing = this.matchingOwnAccount(platform, fields.profileUrl, fields.name, false)
    return { platform, name: fields.name, profileUrl: fields.profileUrl, avatarUrl: avatarOf(fields.avatarUrl), existingAccountId: existing?.id }
  }

  /** The stored own account an identity or draft refers to; see {@link matchOwnAccount}. */
  private matchingOwnAccount(platform: MediaPlatformId, profileUrl: string, name: string, forSave: boolean): MediaAccount | undefined {
    const adapter = this.registry.get(platform)
    const mode = adapter?.identityMatch ?? 'profile-url'
    const nameUnknown = name.trim() === '' || name.trim() === adapter?.descriptor.displayName
    return matchOwnAccount(this.store.accounts(), { platform, profileUrl, name, mode, forSave, nameUnknown })
  }

  /**
   * Close an embedded view.
   * @param id - view id; closing a closed view does nothing.
   * @returns after the page closed.
   */
  @Remote
  async browserClose(id: MediaBrowserId): Promise<void> {
    await this.browser.close(id, 'closed-by-user')
  }

  /**
   * Run every account whose automatic scrape is due, one at a time; a tick is skipped while the previous one runs.
   * @returns after the due accounts ran.
   */
  async monitorTick(): Promise<void> {
    this.maybeScheduledBrief(Date.now())
    if (this.monitoring) return
    this.monitoring = true
    try {
      const now = Date.now()
      const candidates = this.store.accounts().filter((account) => {
        return this.scrapes(account)
      })
      const lastScrape = (item: MediaAccount): MediaRunRecord | undefined => this.store.lastRun(item.id, 'scrape')
      for (const account of dueAccounts(candidates, lastScrape, this.config.minIntervalMinutes, now, this.config.retryMinutes)) {
        if (this.busy.has(`${account.id}:data`)) continue
        await this.exclusive(account.id, 'data', () => this.scrape(account, AbortSignal.timeout(this.config.scrapeTimeoutSeconds * 2000)))
          .catch((error: unknown) => { this.ctx.logger.warn('media-suite: monitor run of %s failed: %s', account.id, messageOf(error)) })
      }
      if (this.config.keepLoginsAlive) await this.keepLoginsAlive(Date.now())
    } finally {
      this.monitoring = false
    }
  }

  /**
   * Visit the logged-in accounts whose platform ends idle web sessions (adapter `keepAlive`), once their interval has
   * passed since the last successful update or visit. Automatic updates must be on for the account.
   * @param now - epoch milliseconds.
   */
  private async keepLoginsAlive(now: number): Promise<void> {
    for (const account of this.store.accounts()) {
      if (account.role !== 'own' || account.demo === true || !account.monitor.enabled) continue
      const adapter = this.registry.get(account.platform)
      const keep = adapter?.keepAlive
      if (adapter === undefined || keep === undefined) continue
      const due = keepAliveDue({
        everyMinutes: keep.everyMinutes, loggedIn: this.store.login(this.profileFor(account).key) === 'logged-in',
        busy: this.busy.has(`${account.id}:data`), lastRun: this.store.lastRun(account.id, 'scrape'), lastVisit: this.lastVisit.get(account.id), now,
      })
      if (!due) continue
      await this.exclusive(account.id, 'data', () => this.keepAlive(account, adapter, keep.url))
        .catch((error: unknown) => { this.ctx.logger.warn('media-suite: keep-alive visit of %s failed: %s', account.id, messageOf(error)) })
    }
  }

  /**
   * Open the platform's backend page in the account's profile and read whether it is still logged in. A login that is
   * gone is recorded at once, so the account shows 需要重新扫码 without waiting for its next update.
   */
  private async keepAlive(account: MediaAccount, adapter: MediaPlatformAdapter, url: string): Promise<void> {
    const profile = this.profileFor(account)
    const signal = AbortSignal.timeout(KEEP_ALIVE_TIMEOUT_MS)
    const state = await this.browser.withPage(profile, signal, async (page) => {
      await gotoPage(page, url, signal)
      // A backend page may show its login prompt for a moment before it renders: wait for a login, else take the last reading.
      let found: MediaLoginState = 'unknown'
      for (let waited = 0; waited < KEEP_ALIVE_SETTLE_MS; waited += 2000) {
        await sleep(2000, signal)
        found = await adapter.detectLogin(page).catch((): MediaLoginState => 'unknown')
        if (found === 'logged-in') break
      }
      return found
    })
    if (state === 'unknown') return
    this.store.setLogin(profile.key, state, new Date().toISOString())
    if (state === 'logged-in') this.lastVisit.set(account.id, Date.now())
    else this.ctx.logger.warn('media-suite: %s (%s) is logged out; it needs a new scan', account.id, account.platform)
  }

  /**
   * Effective monitoring interval of an account.
   * @param account - account.
   * @returns minutes between automatic scrapes.
   */
  intervalOf(account: MediaAccount): number {
    return intervalOf(account, this.config.minIntervalMinutes)
  }
}

function reportId(): MediaReportId {
  return brandString<MediaReportId>(`report-${randomUUID()}`)
}

export default MediaSuite
