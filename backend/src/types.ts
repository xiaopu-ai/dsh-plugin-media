/**
 * Client-safe values of the media suite: configured accounts, platform
 * descriptors, metric snapshots, post records, AI reports and the embedded
 * browser stream exchanged between the Host controller and the Web panel.
 */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable id of one configured account. */
export type MediaAccountId = Branded<'MediaAccountId'>

/** Stable id of one embedded browser view opened by the panel. */
export type MediaBrowserId = Branded<'MediaBrowserId'>

/** Stable id of one stored AI report. */
export type MediaReportId = Branded<'MediaReportId'>

/** Id of one item waiting to be published, opaque to callers. */
export type MediaDraftId = Branded<'MediaDraftId'>

/**
 * Registered platform adapter id, such as `xiaohongshu`, `douyin` or
 * `wechat-mp`. New adapters register further ids at runtime.
 */
export type MediaPlatformId = string

/** `own` accounts are monitored and diagnosed; `benchmark` accounts feed topic references. */
export type MediaAccountRole = 'own' | 'benchmark'

/** Whether an adapter can read data by scraping, by file import, or both. */
export interface MediaPlatformDescriptor {
  /** Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it. */
  readonly search?: boolean
  readonly id: MediaPlatformId
  /** Display name in the platform's own language, such as `小红书`. */
  readonly displayName: string
  /** Home page the embedded browser opens for login. */
  readonly loginUrl: string
  /** Whether the adapter scrapes through the embedded browser. */
  readonly scrape: boolean
  /** Whether the adapter maps creator-backend export files. */
  readonly import: boolean
  /** Short hint describing which export file the user should upload. */
  readonly importHint: string
  /** Example profile URL shown as the input placeholder. */
  readonly profileUrlExample: string
  /**
   * The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not
   * report are left out, so the page and the tools never show a counter that is always empty.
   */
  readonly metrics?: MediaMetricLabels | undefined
  /** What one post is called on the platform, such as `视频`, `笔记` or `文章`. */
  readonly noun?: string | undefined
  /** Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own. */
  readonly color?: string | undefined
  /** Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial. */
  readonly beta?: boolean | undefined
}

/** Display names of the post counters a platform reports. */
export interface MediaMetricLabels {
  readonly views?: string | undefined
  readonly likes?: string | undefined
  readonly comments?: string | undefined
  readonly shares?: string | undefined
  readonly collects?: string | undefined
}

/** Per-account monitoring schedule. */
export interface MediaMonitorSettings {
  readonly enabled: boolean
  /** Minutes between automatic scrapes; the Host clamps to its configured minimum. */
  readonly intervalMinutes: number
}

/** Editable account fields. Omitting `id` creates a new account. */
export interface MediaAccountDraft {
  readonly id?: MediaAccountId | undefined
  readonly platform: MediaPlatformId
  readonly role: MediaAccountRole
  /** Display name chosen by the user. */
  readonly name: string
  /** Public profile URL used by scraping. */
  readonly profileUrl: string
  /** Content field, such as `职场成长` or `美食探店`, used by AI prompts. */
  readonly niche: string
  /** Free-form notes for AI prompts: audience, style, goals. */
  readonly notes: string
  readonly monitor: MediaMonitorSettings
  /** The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update. */
  readonly avatarUrl?: string | undefined
}

/** Stored account. */
export interface MediaAccount extends MediaAccountDraft {
  readonly id: MediaAccountId
  /** Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched. */
  readonly demo?: true | undefined
  /**
   * Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the
   * account uses the platform's shared profile, which holds one login at a time.
   */
  readonly loginProfile?: string | undefined
  /** ISO-8601 instants. */
  readonly createdAt: string
  readonly updatedAt: string
}

/** Where a snapshot or post row came from. */
export type MediaDataSource = 'scrape' | 'import'

/** Account-level counters captured at one instant. Missing counters stay undefined. */
export interface MediaMetricSnapshot {
  readonly accountId: MediaAccountId
  /** ISO-8601 capture instant. */
  readonly capturedAt: string
  readonly source: MediaDataSource
  readonly followers?: number | undefined
  readonly following?: number | undefined
  /** Total likes received; 小红书 reports likes and collects together here. */
  readonly likes?: number | undefined
  readonly posts?: number | undefined
  /** Platform-specific numeric counters, keyed by adapter-defined names. */
  readonly extra: Readonly<Record<string, number>>
}

/** Content format of a post. */
export type MediaPostFormat = 'image' | 'video' | 'article' | 'other'

/** Latest known numbers of one post. */
export interface MediaPost {
  readonly accountId: MediaAccountId
  /** Platform post id, or a stable hash of the URL/title when the platform exposes none. */
  readonly postId: string
  readonly title: string
  readonly url?: string | undefined
  /** ISO-8601 instant when known. */
  readonly publishedAt?: string | undefined
  readonly format: MediaPostFormat
  readonly views?: number | undefined
  readonly likes?: number | undefined
  readonly comments?: number | undefined
  readonly collects?: number | undefined
  readonly shares?: number | undefined
  /** Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading. */
  readonly coverUrl?: string | undefined
  readonly extra: Readonly<Record<string, number>>
  readonly source: MediaDataSource
  /** ISO-8601 instant of the last write. */
  readonly updatedAt: string
}

/** Counters of one post at one capture; the store keeps one row per scrape or import that changed them. */
export interface MediaPostSnapshot {
  readonly accountId: MediaAccountId
  readonly postId: string
  /** ISO-8601 capture instant. */
  readonly capturedAt: string
  readonly views?: number | undefined
  readonly likes?: number | undefined
  readonly comments?: number | undefined
  readonly collects?: number | undefined
  readonly shares?: number | undefined
}

/**
 * How trustworthy an account's numbers are right now, worst first: the login expired and must be scanned again; the
 * last update failed for another reason; the newest data is older than the stale threshold; nothing was fetched yet;
 * or all is well.
 */
export type MediaHealthState = 'login-required' | 'failing' | 'stale' | 'pending' | 'ok'

/** Health of one account's data. */
export interface MediaAccountHealth {
  readonly state: MediaHealthState
  /** ISO-8601 instant of the newest stored counters, when any. */
  readonly updatedAt?: string | undefined
  /** Failure code of the last run, when it failed. */
  readonly errorCode?: string | undefined
  /** Failure message of the last run, when it failed, in Chinese. */
  readonly message?: string | undefined
  /** ISO-8601 instant of the next automatic update, when monitoring is on. */
  readonly nextRunAt?: string | undefined
  /** Whether automatic updates are on. */
  readonly monitored: boolean
}

/** Value of one dashboard counter on one China calendar day. */
export interface MediaDayValue {
  /** `YYYY-MM-DD`, China time. */
  readonly day: string
  readonly value: number
}

/** Unit a dashboard counter is shown in. */
export type MediaKpiUnit = 'count' | 'percent' | 'seconds'

/** One dashboard counter over a window. */
export interface MediaKpi {
  /** Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, … */
  readonly key: string
  /** Display name in the platform's words, such as `阅读量`. */
  readonly label: string
  readonly unit: MediaKpiUnit
  /** Total over the window, or the newest value for a running total such as followers; undefined when unknown. */
  readonly value?: number | undefined
  /** Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown. */
  readonly change?: number | undefined
  /** Value over the window of the same length before it; undefined when unknown. */
  readonly previous?: number | undefined
  /** Daily values inside the window, oldest first; days without data are left out. */
  readonly daily: readonly MediaDayValue[]
  /** How the number is counted, in Chinese. */
  readonly hint: string
}

/** A post ranked on the dashboard. */
export interface MediaRankedPost {
  readonly post: MediaPost
  /** What it is ranked by, such as `7日新增播放`. */
  readonly label: string
  readonly value: number
}

/** Everything the dashboard of one account shows. */
export interface MediaDashboard {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  readonly health: MediaAccountHealth
  /** Window length in days, and its first and last China days; windows end yesterday, as the platforms report whole days. */
  readonly days: number
  readonly from: string
  readonly to: string
  /** The 7-day headline counters of 数据总览, independent of the chosen window: up to five, the radar's axes. */
  readonly headline: readonly MediaKpi[]
  /** Counters of 作品数据 over the chosen window. */
  readonly works: readonly MediaKpi[]
  /** Counters of 粉丝数据 over the chosen window. */
  readonly fans: readonly MediaKpi[]
  /** The three posts with the most views (or likes) among those published in the last 30 days. */
  readonly top: readonly MediaRankedPost[]
  /** Newest posts with their latest counters. */
  readonly posts: readonly MediaPost[]
}

/** One account on the 总览 page. */
export interface MediaAccountSummary {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  readonly health: MediaAccountHealth
  /** Headline counters of the last 7 days. */
  readonly headline: readonly MediaKpi[]
  /** Newest known follower total. */
  readonly followers?: number | undefined
  readonly latestPost?: MediaPost | undefined
}

/** The 总览 page: every own account and the newest posts across them. */
export interface MediaSummary {
  readonly accounts: readonly MediaAccountSummary[]
  /** Newest posts of all own accounts, newest first. */
  readonly latestPosts: readonly MediaPost[]
}

/** 全网: what every own account adds up to over one window. */
export type MediaNetworkKey = 'followers' | 'fansNet' | 'views' | 'likes' | 'comments' | 'shares' | 'posts'

/** One account on the 总览 page, with its counters over the window. */
export interface MediaNetworkAccount {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  readonly health: MediaAccountHealth
  /** Newest known follower total. */
  readonly followers?: number | undefined
  /** The window's works and fans counters, as on the account's own dashboard. */
  readonly kpis: readonly MediaKpi[]
  readonly from: string
  readonly to: string
}

/** One account's part of a 全网 total. */
export interface MediaNetworkPart {
  readonly accountId: MediaAccountId
  readonly value: number
}

/** A 全网 counter: the plain sum over the accounts that report it (no de-duplication), per account and per day. */
export interface MediaNetworkTotal {
  readonly key: MediaNetworkKey
  readonly label: string
  readonly unit: MediaKpiUnit
  readonly value?: number | undefined
  /** Sum of the previous windows; only when every contributing account has one, so the change compares like with like. */
  readonly previous?: number | undefined
  readonly change?: number | undefined
  readonly parts: readonly MediaNetworkPart[]
  /** Daily sums with each account's part over the window, on the days every contributing account reported, oldest first. */
  readonly daily: readonly { readonly day: string; readonly total: number; readonly parts: Readonly<Record<string, number>> }[]
  /**
   * The last 90 days for the trend chart, oldest first. A count adds the accounts that reported each day (`parts` lists
   * them, so a day an account did not report shows as missing, not as zero); a level such as the follower total keeps
   * only the days every account reported.
   */
  readonly trend: readonly { readonly day: string; readonly total: number; readonly parts: Readonly<Record<string, number>> }[]
}

/** The same work published on more than one platform, with its counters added up. */
export interface MediaSyncedWork {
  readonly title: string
  readonly posts: readonly MediaPost[]
  readonly views?: number | undefined
  readonly likes?: number | undefined
  readonly comments?: number | undefined
  readonly shares?: number | undefined
}

/** The 总览 page over one window. */
export interface MediaNetwork {
  readonly days: number
  readonly accounts: readonly MediaNetworkAccount[]
  readonly totals: readonly MediaNetworkTotal[]
  readonly synced: readonly MediaSyncedWork[]
  /** Newest posts of every own account, newest first. */
  readonly posts: readonly MediaPost[]
}

/** One line of the 今日简报: a problem to handle, a key change, an adjustment, or a next topic. */
export type MediaBriefKind = 'alert' | 'fact' | 'action' | 'topic'

/** One line of the 今日简报, short and with its numbers. */
export interface MediaBriefItem {
  readonly kind: MediaBriefKind
  readonly text: string
  /** The account the line is about, when it names one of the user's accounts. */
  readonly accountId?: MediaAccountId | undefined
  /** Platform name the line is about, as the model wrote it. */
  readonly platform?: string | undefined
  /** The longer explanation shown when the line is opened: the numbers behind it and what to do. */
  readonly detail?: string | undefined
  /** The work the line is about, when its title matches one of the recent posts. */
  readonly post?: { readonly accountId: MediaAccountId; readonly postId: string } | undefined
  /** The 全网 counter the line is about, so the page can show its numbers. */
  readonly metric?: MediaNetworkKey | undefined
}

/** The 今日简报 of one China day: what the model made of every account's last 7 days. */
export interface MediaBrief {
  readonly id: MediaReportId
  /** China day the brief is for. */
  readonly day: string
  readonly createdAt: string
  /** `provider/model` that wrote it. */
  readonly model: string
  /** Newest capture the brief saw. */
  readonly dataAt?: string | undefined
  readonly items: readonly MediaBriefItem[]
}

/** The 今日简报 as the page polls it: the newest one, and the lines of one being written. */
export interface MediaBriefState {
  readonly brief?: MediaBrief | undefined
  /** A brief is being written now; `partial` holds its finished lines. */
  readonly running: boolean
  readonly partial: readonly MediaBriefItem[]
  /** Why the last attempt failed, until the next one starts. */
  readonly problem?: string | undefined
  /** China time the daily brief is written at, such as `09:00`. */
  readonly scheduleAt: string
}

/** One counter of a post and how it compares with the account's other posts. */
export interface MediaPostMetric {
  readonly key: 'views' | 'likes' | 'comments' | 'shares' | 'collects'
  readonly label: string
  readonly value?: number | undefined
  /** Median of the same counter over the account's other recent posts, when at least three have it. */
  readonly median?: number | undefined
}

/** One rate of a post, such as likes per view. */
export interface MediaPostRate {
  readonly key: string
  readonly label: string
  /** Fraction, such as 0.034 for 3.4%. */
  readonly value: number
  /** Median of the same rate over the account's other recent posts, when at least three have it. */
  readonly median?: number | undefined
}

/** Detail of one post for the post dialog and the post tool. */
export interface MediaPostDetail {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  readonly post: MediaPost
  readonly metrics: readonly MediaPostMetric[]
  readonly rates: readonly MediaPostRate[]
  /** How many of the account's other recent posts the medians come from. */
  readonly baselinePosts: number
  /** Rank of the post among the account's recent posts by views, or by likes when views are unknown; 1 is best. */
  readonly rank?: { readonly by: string; readonly position: number; readonly of: number } | undefined
}

/** Login state of one persistent browser profile. */
export type MediaLoginState = 'logged-in' | 'logged-out' | 'unknown'

/** Outcome of the most recent scrape or import of one account. */
export interface MediaRunRecord {
  readonly accountId: MediaAccountId
  readonly kind: 'scrape' | 'import'
  /** ISO-8601 instants. */
  readonly startedAt: string
  readonly finishedAt: string
  readonly ok: boolean
  /** Localizable failure code, such as `login-required` or `parse-failed`. */
  readonly errorCode?: string | undefined
  readonly message?: string | undefined
  readonly postsWritten: number
}

/** One point of a metric time series. */
export interface MediaSeriesPoint {
  /** ISO-8601 capture instant. */
  readonly at: string
  readonly followers?: number | undefined
  readonly likes?: number | undefined
  readonly posts?: number | undefined
  /** Daily plays, from snapshot `extra.plays` where the platform reports them. */
  readonly plays?: number | undefined
  /** Daily profile visits, from snapshot `extra.profileViews` where the platform reports them. */
  readonly profileViews?: number | undefined
  /** Daily net follower change, from snapshot `extra.fansNet` where the platform reports it. */
  readonly fansNet?: number | undefined
  /** Daily likes received on posts, from snapshot `extra.postLikes` where the platform reports them. */
  readonly postLikes?: number | undefined
}

/** Dashboard summary of one account. */
export interface MediaAccountOverview {
  readonly account: MediaAccount
  readonly latest?: MediaMetricSnapshot | undefined
  /** Snapshots inside the requested window, oldest first. */
  readonly series: readonly MediaSeriesPoint[]
  /** Change of each counter between the first and the latest snapshot in the window. */
  readonly deltas: {
    readonly followers?: number | undefined
    readonly likes?: number | undefined
    readonly posts?: number | undefined
  }
  /** Engagement averages over posts published inside the window. */
  readonly engagement: {
    readonly postCount: number
    readonly avgLikes?: number | undefined
    readonly avgComments?: number | undefined
    readonly avgCollects?: number | undefined
    readonly avgViews?: number | undefined
  }
  readonly lastRun?: MediaRunRecord | undefined
  readonly login: MediaLoginState
  /** ISO-8601 instant of the next automatic scrape, when monitoring is enabled. */
  readonly nextRunAt?: string | undefined
}

/** How to film a video topic. */
export interface MediaTopicVideo {
  /** The first line spoken, written to hold the viewer through the first three seconds. */
  readonly hook: string
  /** Talking points in order, one per segment of the script. */
  readonly outline: readonly string[]
  /** Suggested length in seconds; 0 when the model gave none. */
  readonly seconds: number
  /** Text for the cover image. */
  readonly cover: string
}

/** One AI topic suggestion. */
export interface MediaTopicSuggestion {
  readonly title: string
  /** Angle or hook that differentiates the topic. */
  readonly angle: string
  /** Why the topic suits this account, citing data. */
  readonly reason: string
  readonly format: MediaPostFormat
  /** Candidate post titles. */
  readonly headlines: readonly string[]
  /** Titles of own or benchmark posts that inspired the suggestion. */
  readonly references: readonly string[]
  readonly priority: 'high' | 'medium' | 'low'
  /** Short platform search keywords for the topic; empty in reports generated before keywords were requested. */
  readonly keywords: readonly string[]
  /** Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable. */
  readonly related: readonly MediaRelatedPost[]
  /** Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested. */
  readonly video?: MediaTopicVideo | undefined
}

/** A post found on the platform outside the configured accounts, such as a search result. */
export interface MediaRelatedPost {
  readonly postId: string
  readonly title: string
  readonly url: string
  /** Author nickname. */
  readonly author: string
  /** Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading. */
  readonly coverUrl?: string | undefined
  /** ISO-8601 publish instant. */
  readonly publishedAt?: string | undefined
  readonly format: MediaPostFormat
  readonly views?: number | undefined
  readonly likes?: number | undefined
  readonly comments?: number | undefined
  readonly collects?: number | undefined
  readonly shares?: number | undefined
}

/** One entry of a platform's trending search list. */
export interface MediaTrendingTopic {
  readonly word: string
  /** Platform heat score, where reported. */
  readonly heat?: number | undefined
}

/** One web search result used as topic background. */
export interface MediaNewsItem {
  readonly title: string
  readonly url: string
  readonly snippet: string
  /** ISO-8601 or platform-formatted publish date, where reported. */
  readonly publishedAt?: string | undefined
}

/** One keyword searched on the platform before topic generation, with the popular posts it returned. */
export interface MediaKeywordSearch {
  readonly keyword: string
  readonly posts: readonly MediaRelatedPost[]
}

/** Material gathered before topic generation; every source is optional and a failed source leaves a note. */
export interface MediaTopicResearch {
  /** Platform searches for the account's own keywords. */
  readonly searches: readonly MediaKeywordSearch[]
  readonly trending: readonly MediaTrendingTopic[]
  readonly news: readonly MediaNewsItem[]
  /** Benchmark accounts whose data was refreshed for this report. */
  readonly benchmarksRefreshed: number
  /** Sources that were skipped or failed, in Chinese. */
  readonly notes: readonly string[]
}

/** One AI improvement finding. */
export interface MediaImprovementItem {
  /** Area such as `发布节奏`, `标题封面`, `互动转化`, `内容方向`. */
  readonly area: string
  readonly finding: string
  /** Numbers or posts that support the finding. */
  readonly evidence: string
  /** Concrete next step. */
  readonly action: string
  readonly priority: 'high' | 'medium' | 'low'
}

/** Stored topic recommendation report. */
export interface MediaTopicReport {
  readonly id: MediaReportId
  readonly accountId: MediaAccountId
  readonly createdAt: string
  /** `provider/model` that generated the report. */
  readonly model: string
  readonly summary: string
  readonly suggestions: readonly MediaTopicSuggestion[]
  /** Material gathered before generation; absent in reports generated before research existed. */
  readonly research?: MediaTopicResearch | undefined
  /** What the user asked this report to be about; absent when no direction was given. */
  readonly direction?: string | undefined
}

/** Stored account diagnosis report. */
export interface MediaAnalysisReport {
  readonly id: MediaReportId
  readonly accountId: MediaAccountId
  readonly createdAt: string
  readonly model: string
  readonly summary: string
  readonly strengths: readonly string[]
  readonly items: readonly MediaImprovementItem[]
}

/** Result of importing one export file. */
export interface MediaImportResult {
  readonly snapshotWritten: boolean
  readonly postsWritten: number
  /** Header names that matched no known column. */
  readonly unmappedColumns: readonly string[]
}

/** Embedded browser viewport opened for one platform. */
export interface MediaBrowserView {
  readonly id: MediaBrowserId
  readonly platform: MediaPlatformId
  readonly width: number
  readonly height: number
}

/** Account currently logged in inside a browser profile. */
export interface MediaAccountIdentity {
  readonly platform: MediaPlatformId
  /** Platform nickname. */
  readonly name: string
  /** Canonical profile URL usable as MediaAccountDraft.profileUrl. */
  readonly profileUrl: string
  /** Avatar image URL, when the platform showed one. */
  readonly avatarUrl?: string | undefined
  /** Existing own account with the same platform and profile URL, if any. */
  readonly existingAccountId?: MediaAccountId | undefined
}

/** Frames pushed by the embedded browser stream. */
export type MediaBrowserFrame =
  /** JPEG screenshot encoded as base64, in viewport pixels. */
  | {
    readonly kind: 'frame'; readonly data: string; readonly width: number; readonly height: number; readonly url: string; readonly title: string
    /** Whether the page is still loading (Chrome's own loading state of the main frame), for the panel's progress bar. */
    readonly loading?: boolean | undefined
  }
  | { readonly kind: 'login'; readonly state: MediaLoginState }
  /**
   * Sharp snapshot of the login QR code while the view is logged out: a base64 PNG with its CSS-pixel size, sent
   * when it changes. `data` is undefined, with zero size, once no QR code is visible.
   */
  | { readonly kind: 'qr'; readonly data?: string | undefined; readonly width: number; readonly height: number }
  /** Sent once each time the view turns logged-in and the adapter identifies the account. */
  | { readonly kind: 'identity'; readonly identity: MediaAccountIdentity }
  | { readonly kind: 'closed'; readonly reason: string }

/** User input forwarded from the panel to the embedded browser, in viewport pixels. */
export type MediaBrowserInput =
  | { readonly kind: 'click'; readonly x: number; readonly y: number; readonly button: 'left' | 'right' }
  /** Press a button without releasing it; `move` events until the matching `up` drag, as for slider captchas. */
  | { readonly kind: 'down'; readonly x: number; readonly y: number; readonly button: 'left' | 'right' }
  | { readonly kind: 'up'; readonly x: number; readonly y: number; readonly button: 'left' | 'right' }
  | { readonly kind: 'move'; readonly x: number; readonly y: number }
  | { readonly kind: 'wheel'; readonly x: number; readonly y: number; readonly deltaX: number; readonly deltaY: number }
  /** A named key such as `Enter`, `Backspace`, `Tab`, `ArrowLeft`. */
  | { readonly kind: 'key'; readonly key: string }
  /** Literal text inserted at the focused element. */
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'navigate'; readonly url: string }
  | { readonly kind: 'back' }
  | { readonly kind: 'reload' }

/** Kind of content waiting to be published. */
export type MediaDraftKind = 'video' | 'article' | 'card'

/** Content another tool hands to the suite to publish, such as a finished video or a new article. */
export interface MediaDraftInput {
  /** Name of the tool that made it, shown beside the title, such as 宣传片工坊. */
  readonly source: string
  readonly kind: MediaDraftKind
  readonly title: string
  /** Absolute path of the finished file, when there is one. */
  readonly file?: string | undefined
  /** Absolute path of the folder that holds the work. */
  readonly folder?: string | undefined
  /** One line about the content, such as its ratio and length. */
  readonly note?: string | undefined
  /** Creation-workbench project id of an article or card set. */
  readonly studioProject?: string | undefined
}

/** Content waiting to be published, or published with the post's address. */
export interface MediaDraft extends MediaDraftInput {
  readonly id: MediaDraftId
  readonly createdAt: string
  /** Address of the published post; its counters come from the fetched posts with the same address. */
  readonly publishedUrl?: string | undefined
  readonly publishedAt?: string | undefined
  /** Set on drafts `loadDemo` creates. */
  readonly demo?: true | undefined
}

/** A view of the media page. */
export type MediaView = 'today' | 'topics' | 'studio' | 'data' | 'accounts'

/** A panel of the 今天 view. */
export type MediaTodaySection = 'todo' | 'numbers' | 'ready' | 'drafts' | 'own' | 'peers'

/** Page settings read from the user's settings file; every field is optional and falls back to the built-in page. */
export interface MediaUiSettings {
  readonly title?: string | undefined
  /** Accent color as `#rgb` or `#rrggbb`. */
  readonly accent?: string | undefined
  /** Navigation names by view. */
  readonly labels: Readonly<Partial<Record<MediaView, string>>>
  /** Views left out of the navigation; 今天 is never hidden. */
  readonly hidden: readonly MediaView[]
  /** 今天 panels in the order shown; panels left out are hidden. Undefined keeps the built-in order. */
  readonly today?: readonly MediaTodaySection[] | undefined
  /** Free-form styles applied to the page. */
  readonly css: string
  /** What could not be understood, in Chinese. */
  readonly problems: readonly string[]
  /** The settings file, when one is configured. */
  readonly file?: string | undefined
  /** Whether a creation workbench is configured; without one the page leaves out 写作 and its actions. */
  readonly writing?: boolean | undefined
}
