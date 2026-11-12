/**
 * Pure dashboard computations: account health, the counters of the 数据总览, 作品数据 and 粉丝数据 sections, the top
 * posts, and the detail of one post.
 *
 * Only numbers the platform reports are shown. Daily account counters come from the daily values an adapter reads from
 * the platform's creator backend (snapshot `extra` keys such as `plays`); a counter the platform does not report is
 * left out, rather than estimated from our own captures. Counts over a window are sums of the platform's daily values;
 * rates and durations are the platform's daily values averaged with each day's plays as the weight. The number of
 * posts published and the follower total come from the platform's post list and profile.
 */
import { chinaDay } from './history.ts'
import type {
  MediaAccount, MediaAccountHealth, MediaDayValue, MediaKpi, MediaKpiUnit, MediaLoginState, MediaMetricSnapshot, MediaPlatformDescriptor,
  MediaPost, MediaPostDetail, MediaPostMetric, MediaPostRate, MediaRankedPost, MediaRunRecord,
} from './types.ts'

const DAY_MS = 86_400_000
/** Posts a post is compared with in the post detail. */
const BASELINE_POSTS = 20
/** Fewest values a median is taken from. */
const MIN_BASELINE = 3
/** Days back the top posts are picked from. */
const TOP_DAYS = 30

/** Post counters, in display order. */
export const POST_COUNTERS = ['views', 'likes', 'comments', 'shares', 'collects'] as const
type PostCounter = typeof POST_COUNTERS[number]

const DEFAULT_LABELS: Readonly<Record<PostCounter, string>> = { views: '播放', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' }

/**
 * The platform's name of a post counter, or undefined when the platform does not report it. A platform without a
 * `metrics` list reports every counter under the default names.
 * @param platform - platform descriptor.
 * @param key - counter.
 * @returns the name, such as `阅读`.
 */
export function counterLabel(platform: MediaPlatformDescriptor, key: PostCounter): string | undefined {
  if (platform.metrics === undefined) return DEFAULT_LABELS[key]
  return platform.metrics[key]
}

// ---------------------------------------------------------------- health

/** Inputs of one health check. */
export interface HealthInput {
  readonly latest: MediaMetricSnapshot | undefined
  readonly lastRun: MediaRunRecord | undefined
  readonly login: MediaLoginState
  readonly nextRunAt: string | undefined
  readonly monitored: boolean
  readonly now: number
  /** Age in hours after which the newest data counts as stale. */
  readonly staleHours: number
}

/**
 * Judge how trustworthy an account's numbers are. A login detected as expired, or a last run that failed for login
 * while no newer login was detected, needs a new scan; another failed run is `failing`; data older than the stale
 * threshold is `stale`; an account never captured is `pending`.
 * @param input - newest data, last run and login state.
 * @returns the health.
 */
export function accountHealth(input: HealthInput): MediaAccountHealth {
  const updatedAt = input.latest?.capturedAt
  const base = { updatedAt, nextRunAt: input.nextRunAt, monitored: input.monitored }
  const run = input.lastRun
  const failed = run !== undefined && !run.ok ? run : undefined
  if (input.login === 'logged-out' || (failed?.errorCode === 'login-required' && input.login !== 'logged-in')) {
    return { ...base, state: 'login-required', errorCode: 'login-required', message: failed?.message }
  }
  // Logged in again after a run failed for login: the next update decides.
  if (failed?.errorCode === 'login-required') return { ...base, state: 'pending' }
  if (failed !== undefined) return { ...base, state: 'failing', errorCode: failed.errorCode, message: failed.message }
  if (updatedAt === undefined) return { ...base, state: 'pending' }
  if (input.now - Date.parse(updatedAt) > input.staleHours * 3_600_000) return { ...base, state: 'stale' }
  return { ...base, state: 'ok' }
}

// ---------------------------------------------------------------- days

/**
 * Shift a China calendar day.
 * @param day - `YYYY-MM-DD`.
 * @param offset - days to add; negative goes back.
 * @returns the shifted day.
 */
export function addDays(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10)
}

function daysFrom(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

/**
 * A window of whole China days and the window of the same length before it. It ends on the last day the platform has
 * reported (the platforms publish a day's numbers around noon of the next day), so a 7-day window holds 7 reported days
 * and its sums match the platform's own; without daily reports it ends yesterday.
 */
interface Window {
  readonly days: number
  readonly from: string
  readonly to: string
  readonly previousFrom: string
  readonly previousTo: string
}

/** Periods for which a platform may report its own figure of a ratio or duration. */
const PERIOD_DAYS = [7, 30] as const

/** How many days before yesterday the platform's last daily report may be for the window to end on it. */
const REPORT_LAG_DAYS = 2

function yesterdayOf(now: number): string {
  return addDays(chinaDay(new Date(now).toISOString()), -1)
}

function windowOf(now: number, days: number, end?: string): Window {
  const to = end ?? yesterdayOf(now)
  const from = addDays(to, -(days - 1))
  const previousTo = addDays(from, -1)
  return { days, from, to, previousTo, previousFrom: addDays(previousTo, -(days - 1)) }
}

type DayMap = ReadonlyMap<string, number>

function inRange(map: DayMap, from: string, to: string): [string, number][] {
  return [...map].filter(([day]) => day >= from && day <= to).sort(([a], [b]) => a.localeCompare(b))
}

function relative(current: number | undefined, previous: number | undefined): number | undefined {
  if (current === undefined || previous === undefined || previous === 0) return undefined
  return (current - previous) / Math.abs(previous)
}

/** Daily values the platform reported under one `extra` key, the last capture of each day winning. */
function platformDaily(snapshots: readonly MediaMetricSnapshot[], key: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const snapshot of snapshots) {
    const value = snapshot.extra[key]
    if (value !== undefined) map.set(chinaDay(snapshot.capturedAt), value)
  }
  return map
}

/** Follower total the platform reported at the end of each captured day. */
function followerTotals(snapshots: readonly MediaMetricSnapshot[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const snapshot of snapshots) if (snapshot.followers !== undefined) map.set(chinaDay(snapshot.capturedAt), snapshot.followers)
  return map
}

// ---------------------------------------------------------------- what the platforms report

/** One daily account counter a platform may report. */
interface DailyMetric {
  readonly key: string
  /** Snapshot `extra` key the adapters write it under. */
  readonly extra: string
  readonly unit: MediaKpiUnit
  /** Counts add up over days; rates and durations average with each day's plays as the weight. */
  readonly sum: boolean
  readonly label: (platform: MediaPlatformDescriptor) => string | undefined
}

const counted = (key: PostCounter) => (platform: MediaPlatformDescriptor): string | undefined => {
  const label = counterLabel(platform, key)
  return label === undefined ? undefined : `${label}量`
}

/** 作品数据, in 抖音 数据中心 order. */
const WORK_METRICS: readonly DailyMetric[] = [
  { key: 'impressions', extra: 'impressions', unit: 'count', sum: true, label: () => '曝光量' },
  { key: 'views', extra: 'plays', unit: 'count', sum: true, label: counted('views') },
  { key: 'likes', extra: 'postLikes', unit: 'count', sum: true, label: counted('likes') },
  { key: 'shares', extra: 'postShares', unit: 'count', sum: true, label: counted('shares') },
  { key: 'comments', extra: 'postComments', unit: 'count', sum: true, label: counted('comments') },
  { key: 'collects', extra: 'postCollects', unit: 'count', sum: true, label: counted('collects') },
  { key: 'completion5s', extra: 'completionRate5s', unit: 'percent', sum: false, label: () => '5秒完播率' },
  { key: 'completion', extra: 'completionRate', unit: 'percent', sum: false, label: () => '完播率' },
  { key: 'bounce2s', extra: 'bounceRate2s', unit: 'percent', sum: false, label: () => '2秒跳出率' },
  { key: 'coverCtr', extra: 'coverCtr', unit: 'percent', sum: false, label: () => '封面点击率' },
  { key: 'avgPlay', extra: 'avgPlaySeconds', unit: 'seconds', sum: false, label: platform => platform.id === 'xiaohongshu' ? '平均观看时长' : '平均播放时长' },
  { key: 'profileViews', extra: 'profileViews', unit: 'count', sum: true, label: () => '主页访问' },
]

/** 粉丝数据 after the follower total, in 抖音 数据中心 order. */
const FAN_METRICS: readonly DailyMetric[] = [
  { key: 'fansNet', extra: 'fansNet', unit: 'count', sum: true, label: () => '粉丝净增' },
  { key: 'newFollowers', extra: 'newFollowers', unit: 'count', sum: true, label: platform => platform.id === 'douyin' ? '吸粉量' : '新增关注' },
  { key: 'unfollows', extra: 'unfollows', unit: 'count', sum: true, label: platform => platform.id === 'douyin' ? '脱粉量' : '取消关注' },
  { key: 'returningFans', extra: 'returningFans', unit: 'count', sum: true, label: () => '回访粉丝量' },
]

// ---------------------------------------------------------------- dashboard

/** Inputs of one dashboard. */
export interface DashboardInput {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  /** Account snapshots since the start of the previous window of the longest range asked, oldest first. */
  readonly snapshots: readonly MediaMetricSnapshot[]
  /** Newest snapshot with missing totals filled from earlier ones. */
  readonly latest: MediaMetricSnapshot | undefined
  /** Recent posts, newest first. */
  readonly posts: readonly MediaPost[]
  readonly now: number
}

interface Sources {
  readonly platform: MediaPlatformDescriptor
  readonly daily: ReadonlyMap<string, DayMap>
  /** The platform's own figure of a ratio or duration over a period ending each day, by `p<days>:<extra key>`. */
  readonly periods: ReadonlyMap<string, DayMap>
  readonly plays: DayMap
  readonly followers: DayMap
  readonly published: DayMap
  readonly latestFollowers?: number | undefined
}

function sources(input: DashboardInput): Sources {
  const daily = new Map<string, DayMap>()
  const periods = new Map<string, DayMap>()
  for (const metric of [...WORK_METRICS, ...FAN_METRICS]) {
    daily.set(metric.extra, platformDaily(input.snapshots, metric.extra))
    if (!metric.sum) for (const days of PERIOD_DAYS) periods.set(`p${days}:${metric.extra}`, platformDaily(input.snapshots, `p${days}:${metric.extra}`))
  }
  const published = new Map<string, number>()
  for (const post of input.posts) {
    if (post.publishedAt === undefined) continue
    const day = chinaDay(post.publishedAt)
    published.set(day, (published.get(day) ?? 0) + 1)
  }
  return {
    platform: input.platform, daily, periods, plays: daily.get('plays') ?? new Map(), followers: followerTotals(input.snapshots), published,
    latestFollowers: input.latest?.followers,
  }
}

/** Value of a metric over a range: the sum of a count, the plays-weighted mean of a rate or duration. */
function aggregate(metric: DailyMetric, map: DayMap, plays: DayMap, from: string, to: string): number | undefined {
  const days = inRange(map, from, to)
  if (days.length === 0) return undefined
  if (metric.sum) return days.reduce((sum, [, value]) => sum + value, 0)
  const weights = days.map(([day]) => plays.get(day))
  if (weights.every(weight => weight !== undefined && weight > 0)) {
    const total = weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
    return days.reduce((sum, [, value], index) => sum + value * (weights[index] ?? 0), 0) / total
  }
  return days.reduce((sum, [, value]) => sum + value, 0) / days.length
}

/**
 * A counter sums the platform's daily values. A ratio or duration shows the platform's own figure for the period when
 * it reported one ending on the window's last day; otherwise the daily values weighted by the day's plays. The change
 * compares like with like: both periods' own figures when both exist, else both weighted means.
 */
function dailyKpi(metric: DailyMetric, source: Sources, window: Window): MediaKpi | undefined {
  const label = metric.label(source.platform)
  const map = source.daily.get(metric.extra)
  if (label === undefined || map === undefined) return undefined
  const estimate = aggregate(metric, map, source.plays, window.from, window.to)
  const estimatePrevious = aggregate(metric, map, source.plays, window.previousFrom, window.previousTo)
  const own = metric.sum ? undefined : source.periods.get(`p${window.days}:${metric.extra}`)
  const exact = own?.get(window.to)
  const exactPrevious = own?.get(window.previousTo)
  const value = exact ?? estimate
  if (value === undefined) return undefined
  const both = exact !== undefined && exactPrevious !== undefined
  const previous = both ? exactPrevious : estimatePrevious
  const noun = source.platform.noun ?? '作品'
  return {
    key: metric.key, label, unit: metric.unit, value, previous, change: both ? relative(exact, exactPrevious) : relative(estimate, estimatePrevious),
    daily: inRange(map, window.from, window.to).map(([day, item]) => ({ day, value: item })),
    hint: metric.sum ? `平台每天报告的${label}，包含所有${noun}`
      : exact !== undefined ? `平台报告的近 ${window.days} 天${label}；走势是每天的${label}` : `平台每天报告的${label}，多天按当天播放量加权`,
  }
}

/** (Likes + comments + shares) ÷ views, from the platform's daily values over the days that report all of them. */
function engagementKpi(source: Sources, window: Window): MediaKpi | undefined {
  const views = source.daily.get('plays')
  const parts = ['postLikes', 'postComments', 'postShares'].map(key => source.daily.get(key)).filter((map): map is DayMap => map !== undefined && map.size > 0)
  // Without the platform's daily likes (公众号 reports only shares), a ratio would be a share rate dressed as 互动率.
  if (views === undefined || views.size === 0 || (source.daily.get('postLikes')?.size ?? 0) === 0 || parts.length === 0) return undefined
  const rateIn = (from: string, to: string): { value?: number | undefined; daily: MediaDayValue[] } => {
    let viewSum = 0
    let interactionSum = 0
    const daily: MediaDayValue[] = []
    for (const [day, viewCount] of inRange(views, from, to)) {
      const values = parts.map(map => map.get(day))
      if (viewCount <= 0 || values.some(value => value === undefined)) continue
      const interactions = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      viewSum += viewCount
      interactionSum += interactions
      daily.push({ day, value: interactions / viewCount })
    }
    return { value: viewSum === 0 ? undefined : interactionSum / viewSum, daily }
  }
  const current = rateIn(window.from, window.to)
  if (current.value === undefined) return undefined
  const previous = rateIn(window.previousFrom, window.previousTo).value
  const labels = [['postLikes', 'likes'], ['postComments', 'comments'], ['postShares', 'shares']]
    .filter(([extra]) => (source.daily.get(extra ?? '')?.size ?? 0) > 0).map(([, key]) => counterLabel(source.platform, key as PostCounter) ?? '')
  return {
    key: 'engagement', label: '互动率', unit: 'percent', value: current.value, previous, change: relative(current.value, previous), daily: current.daily,
    hint: `（${labels.join('+')}）÷ ${counterLabel(source.platform, 'views') ?? '播放'}，按平台每天的数字`,
  }
}

function publishedKpi(source: Sources, window: Window): MediaKpi {
  const noun = source.platform.noun ?? '作品'
  const label = source.platform.id === 'douyin' ? '投稿量' : `发布${noun}数`
  const daily = daysFrom(window.from, window.to).map(day => ({ day, value: source.published.get(day) ?? 0 }))
  const value = daily.reduce((sum, item) => sum + item.value, 0)
  const previous = daysFrom(window.previousFrom, window.previousTo).reduce((sum, day) => sum + (source.published.get(day) ?? 0), 0)
  return { key: 'posts', label, unit: 'count', value, previous, change: relative(value, previous), daily, hint: `按平台上的发布时间数的${noun}条数` }
}

function worksKpis(source: Sources, window: Window): MediaKpi[] {
  const kpis = [publishedKpi(source, window), ...WORK_METRICS.map(metric => dailyKpi(metric, source, window))]
  // 互动率 sits after the counts it comes from, before the rates.
  const at = kpis.findIndex(kpi => kpi !== undefined && kpi.unit !== 'count')
  kpis.splice(at < 0 ? kpis.length : at, 0, engagementKpi(source, window))
  return kpis.filter((kpi): kpi is MediaKpi => kpi !== undefined)
}

function fansKpis(source: Sources, window: Window): MediaKpi[] {
  const kpis: (MediaKpi | undefined)[] = []
  const followers = source.latestFollowers
  if (followers !== undefined) {
    const at = (day: string): number | undefined => [...source.followers].filter(([item]) => item <= day).sort(([a], [b]) => a.localeCompare(b)).pop()?.[1]
    const previous = at(window.previousTo)
    kpis.push({
      key: 'followers', label: source.platform.id === 'douyin' ? '总粉丝量' : '粉丝总数', unit: 'count', value: followers, previous,
      change: relative(followers, previous),
      daily: inRange(source.followers, window.from, window.to).map(([day, value]) => ({ day, value })),
      hint: '平台上显示的粉丝总数；每天的值是当天最后一次读到的总数',
    })
  }
  for (const metric of FAN_METRICS) kpis.push(dailyKpi(metric, source, window))
  return kpis.filter((kpi): kpi is MediaKpi => kpi !== undefined)
}

/** Axes of the 数据总览 radar: 抖音's five first, then others the platform reports, five at most. */
const RADAR_KEYS = ['views', 'engagement', 'completion5s', 'posts', 'fansNet', 'completion', 'likes', 'comments', 'shares', 'profileViews', 'collects'] as const

/** The last day up to yesterday with any daily value the platform reported, when it is recent enough to end windows on. */
function lastReportedDay(source: Sources, now: number): string | undefined {
  const yesterday = yesterdayOf(now)
  let last: string | undefined
  for (const map of source.daily.values()) for (const day of map.keys()) if (day <= yesterday && (last === undefined || day > last)) last = day
  return last !== undefined && last >= addDays(yesterday, -REPORT_LAG_DAYS) ? last : undefined
}

function headlineKpis(source: Sources, now: number): MediaKpi[] {
  const week = windowOf(now, 7, lastReportedDay(source, now))
  const all = [...worksKpis(source, week), ...fansKpis(source, week)]
  return RADAR_KEYS.map(key => all.find(kpi => kpi.key === key)).filter((kpi): kpi is MediaKpi => kpi !== undefined && kpi.value !== undefined).slice(0, 5)
}

/** The posts published in the last 30 days with the most views (or likes, on a platform without views), by the platform's totals. */
function topPosts(source: Sources, input: DashboardInput, count: number): MediaRankedPost[] {
  const since = new Date(input.now - TOP_DAYS * DAY_MS).toISOString()
  for (const key of ['views', 'likes'] as const) {
    const label = counterLabel(source.platform, key)
    if (label === undefined) continue
    const ranked = input.posts.filter(post => (post.publishedAt ?? post.updatedAt) >= since && post[key] !== undefined)
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, count)
      .map(post => ({ post, label: `${label}量`, value: post[key] ?? 0 }))
    if (ranked.length > 0) return ranked
  }
  return []
}

/** What one dashboard computes, apart from the account, platform and health the caller adds. */
export interface DashboardSections {
  readonly days: number
  readonly from: string
  readonly to: string
  readonly headline: readonly MediaKpi[]
  readonly works: readonly MediaKpi[]
  readonly fans: readonly MediaKpi[]
  readonly top: readonly MediaRankedPost[]
}

/**
 * Compute the dashboard sections of one account.
 * @param input - stored values; `snapshots` must reach back over the previous window.
 * @param days - window length in whole days, ending on the platform's last reported day (yesterday when unknown).
 * @returns the headline, the works and fans counters over the window, and the top posts.
 */
export function buildDashboard(input: DashboardInput, days: number): DashboardSections {
  const source = sources(input)
  const window = windowOf(input.now, days, lastReportedDay(source, input.now))
  return {
    days, from: window.from, to: window.to,
    headline: headlineKpis(source, input.now),
    works: worksKpis(source, window),
    fans: fansKpis(source, window),
    top: topPosts(source, input, 3),
  }
}

/**
 * The instant from which a dashboard over `days` needs stored values: the start of the previous window, a day
 * earlier so the follower total before it is known.
 * @param now - the current moment.
 * @param days - window length in days.
 * @returns an ISO instant.
 */
export function dashboardSince(now: number, days: number): string {
  const window = windowOf(now, Math.max(days, 7))
  return new Date(`${addDays(window.previousFrom, -1 - REPORT_LAG_DAYS)}T00:00:00+08:00`).toISOString()
}

// ---------------------------------------------------------------- post detail

function median(values: readonly number[]): number | undefined {
  if (values.length < MIN_BASELINE) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

const RATES: readonly { readonly key: string; readonly counter: Exclude<PostCounter, 'views'> | 'interactions' }[] = [
  { key: 'likeRate', counter: 'likes' }, { key: 'commentRate', counter: 'comments' }, { key: 'shareRate', counter: 'shares' },
  { key: 'collectRate', counter: 'collects' }, { key: 'interactionRate', counter: 'interactions' },
]

function rateOf(post: MediaPost, counter: Exclude<PostCounter, 'views'> | 'interactions'): number | undefined {
  if (post.views === undefined || post.views <= 0) return undefined
  if (counter !== 'interactions') return post[counter] === undefined ? undefined : (post[counter] ?? 0) / post.views
  const parts = [post.likes, post.comments, post.shares, post.collects].filter((value): value is number => value !== undefined)
  return parts.length === 0 ? undefined : parts.reduce((sum, value) => sum + value, 0) / post.views
}

/** Inputs of one post detail. */
export interface PostDetailInput {
  readonly account: MediaAccount
  readonly platform: MediaPlatformDescriptor
  readonly post: MediaPost
  /** The account's recent posts, newest first, including this one. */
  readonly recent: readonly MediaPost[]
}

/**
 * Build the detail of one post from the platform's totals: each counter against the median of the account's other
 * recent posts, rates per view, and the post's rank among recent posts.
 * @param input - the post and the account's recent posts.
 * @returns the detail.
 */
export function buildPostDetail(input: PostDetailInput): MediaPostDetail {
  const { platform, post } = input
  const others = input.recent.filter(item => item.postId !== post.postId).slice(0, BASELINE_POSTS)
  const metrics: MediaPostMetric[] = []
  for (const key of POST_COUNTERS) {
    const label = counterLabel(platform, key)
    if (label === undefined || post[key] === undefined) continue
    metrics.push({ key, label, value: post[key], median: median(others.map(item => item[key]).filter((value): value is number => value !== undefined)) })
  }
  const rates: MediaPostRate[] = []
  if (counterLabel(platform, 'views') !== undefined) {
    for (const rate of RATES) {
      const label = rate.counter === 'interactions' ? '互动率' : `${counterLabel(platform, rate.counter) ?? ''}率`
      if (rate.counter !== 'interactions' && counterLabel(platform, rate.counter) === undefined) continue
      const value = rateOf(post, rate.counter)
      if (value === undefined) continue
      rates.push({ key: rate.key, label, value, median: median(others.map(item => rateOf(item, rate.counter)).filter((item): item is number => item !== undefined)) })
    }
  }
  const by = post.views !== undefined && counterLabel(platform, 'views') !== undefined ? 'views' : post.likes !== undefined ? 'likes' : undefined
  const ranked = by === undefined ? [] : input.recent.filter(item => item[by] !== undefined).sort((a, b) => (b[by] ?? 0) - (a[by] ?? 0))
  const position = ranked.findIndex(item => item.postId === post.postId)
  return {
    account: input.account, platform, post, metrics, rates, baselinePosts: others.length,
    rank: by === undefined || position < 0 ? undefined : { by: counterLabel(platform, by) ?? by, position: position + 1, of: ranked.length },
  }
}
