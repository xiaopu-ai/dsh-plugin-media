/** 抖音 adapter: captures the web profile and post-list JSON the profile page requests, with a DOM fallback for counters. */
import type { Page, Response } from 'playwright-core'
import { parseCount, parseDate, parseDecimal } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import { chinaDay, type MediaHistoryDay } from '../history.ts'
import type { MediaAccount, MediaLoginState } from '../types.ts'
import { searchDouyin, trendingDouyin } from './douyin-discover.ts'
import { asRecord, captureJson, evaluateScript, expiredQrScript, gotoPage, sleep, stringField } from './page.ts'
import type {
  MediaHistoryLimits, MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields,
} from './types.ts'

const PROFILE_URL = /^https:\/\/www\.douyin\.com\/user\/([^/?#]+)/
const PROFILE_API = '/aweme/v1/web/user/profile/'
const POSTS_API = '/aweme/v1/web/aweme/post/'
const SESSION_COOKIES = ['sessionid', 'sessionid_ss']

/**
 * Read account counters from a `/aweme/v1/web/user/profile/{self,other}/` response.
 * @param json - response body.
 * @returns counters, or undefined when the body holds no user.
 */
export function parseDouyinProfile(json: unknown): MediaSnapshotFields | undefined {
  const user = asRecord(asRecord(json)?.user)
  if (user === undefined) return undefined
  const extra: Record<string, number> = {}
  const favoriting = parseCount(user.favoriting_count)
  if (favoriting !== undefined) extra.favoriting = favoriting
  return {
    followers: parseCount(user.mplatform_followers_count) ?? parseCount(user.follower_count),
    following: parseCount(user.following_count),
    likes: parseCount(user.total_favorited),
    posts: parseCount(user.aweme_count),
    extra,
  }
}

/**
 * Avatar of a Douyin user record: the first https URL of `avatar_thumb`, `avatar_medium` or `avatar_larger`, else its
 * `avatar_url` (creator-center records).
 * @param user - user record.
 * @returns the image URL, or undefined.
 */
export function douyinAvatar(user: Readonly<Record<string, unknown>> | undefined): string | undefined {
  for (const key of ['avatar_thumb', 'avatar_medium', 'avatar_larger']) {
    const list = asRecord(user?.[key])?.url_list
    const url = Array.isArray(list) ? list.find((item): item is string => typeof item === 'string' && item.startsWith('https://')) : undefined
    if (url !== undefined) return url
  }
  const direct = stringField(user, 'avatar_url')
  return direct?.startsWith('https://') === true ? direct : undefined
}

/** One page of the post list. */
export interface DouyinPostPage {
  readonly posts: readonly MediaPostFields[]
  readonly hasMore: boolean
}

/** First address of a `{ url_list: [...] }` image record. */
function firstUrl(image: unknown): string | undefined {
  const list = asRecord(image)?.url_list
  const url = Array.isArray(list) ? list.find((item): item is string => typeof item === 'string' && /^https:\/\//.test(item)) : undefined
  return url
}

/**
 * Read posts from a `/aweme/v1/web/aweme/post/` response.
 * @param json - response body.
 * @returns the posts and whether more pages exist.
 */
export function parseDouyinPosts(json: unknown): DouyinPostPage {
  const body = asRecord(json)
  const list = Array.isArray(body?.aweme_list) ? body.aweme_list : []
  const posts: MediaPostFields[] = []
  for (const item of list) {
    const aweme = asRecord(item)
    const id = stringField(aweme, 'aweme_id')
    if (id === undefined) continue
    const images = aweme?.images
    const isNote = (Array.isArray(images) && images.length > 0) || aweme?.aweme_type === 68
    const stats = asRecord(aweme?.statistics)
    const plays = parseCount(stats?.play_count)
    const extra: Record<string, number> = {}
    if (asRecord(aweme?.status)?.is_top === 1 || aweme?.is_top === 1) extra.pinned = 1
    const durationMs = parseCount(aweme?.duration)
    const cover = firstUrl(asRecord(aweme?.video)?.cover) ?? firstUrl(Array.isArray(images) ? images[0] : undefined)
    if (durationMs !== undefined && durationMs > 0) extra.durationMs = durationMs
    posts.push({
      postId: id,
      title: (stringField(aweme, 'desc') ?? '').slice(0, 200),
      url: `https://www.douyin.com/${isNote ? 'note' : 'video'}/${id}`,
      publishedAt: parseDate(aweme?.create_time),
      format: isNote ? 'image' : 'video',
      views: plays !== undefined && plays > 0 ? plays : undefined,
      likes: parseCount(stats?.digg_count),
      comments: parseCount(stats?.comment_count),
      collects: parseCount(stats?.collect_count),
      shares: parseCount(stats?.share_count),
      coverUrl: cover,
      extra,
    })
  }
  return { posts, hasMore: body?.has_more === 1 || body?.has_more === true }
}

/**
 * Read counters from the profile header texts, such as `关注 123`, `粉丝 1.2万`, `获赞 3.4万`.
 * @param texts - text of the follow, fans and like counters, in that order.
 * @returns counters, or undefined when none parses.
 */
export function parseDouyinDom(texts: readonly string[]): MediaSnapshotFields | undefined {
  const number = (text: string | undefined): number | undefined => {
    const match = /([\d.,]+\s*[万wWkK亿]?\+?)/.exec(text ?? '')
    return match === null ? undefined : parseCount(match[1])
  }
  const [following, followers, likes] = [number(texts[0]), number(texts[1]), number(texts[2])]
  if (following === undefined && followers === undefined && likes === undefined) return undefined
  return { following, followers, likes, extra: {} }
}

const DOM_SCRIPT = `(() => ['user-info-follow', 'user-info-fans', 'user-info-like']
  .map(id => document.querySelector('[data-e2e="' + id + '"]')?.textContent ?? ''))()`

/** One cookie of the browser profile, as Playwright lists it. */
export interface DouyinCookie {
  readonly name: string
  readonly value: string
  readonly domain: string
}

/**
 * Login state from the page URL and the profile's cookies: the creator center's logged-in area or a session cookie on
 * any `douyin.com` domain means logged in, so a login made at `creator.douyin.com` counts.
 * @param url - current page URL.
 * @param cookies - all cookies of the profile.
 * @returns the login state.
 */
export function douyinLoginFrom(url: string, cookies: readonly DouyinCookie[]): MediaLoginState {
  if (url.startsWith('https://creator.douyin.com/creator-micro/')) return 'logged-in'
  const session = cookies.some(cookie => SESSION_COOKIES.includes(cookie.name) && cookie.value !== ''
    && /(^|\.)douyin\.com$/.test(cookie.domain.replace(/^\./, '')))
  return session ? 'logged-in' : 'logged-out'
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  return douyinLoginFrom(page.url(), await page.context().cookies())
}

function profileUrlOf(account: MediaAccount): string {
  const url = account.profileUrl.trim()
  if (url === '' && account.role === 'own') return 'https://www.douyin.com/user/self'
  if (!PROFILE_URL.test(url)) {
    throw new MediaScrapeError('invalid-profile', '抖音主页链接应形如 https://www.douyin.com/user/<sec_uid>；自有账号可留空以读取当前登录账号。')
  }
  return url
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const url = profileUrlOf(account)
  if (await detectLogin(page) === 'logged-out') {
    throw new MediaScrapeError('login-required', '抖音未登录，请在内嵌浏览器中扫码登录后重试。')
  }
  let snapshot: MediaSnapshotFields | undefined
  let avatarUrl: string | undefined
  const posts = new Map<string, MediaPostFields>()
  const progress = { hasMore: true }
  let pending = 0
  const onResponse = (response: Response): void => {
    const target = response.url()
    const isProfile = target.includes(PROFILE_API)
    if (!isProfile && !target.includes(POSTS_API)) return
    pending++
    response.json().then((json: unknown) => {
      if (isProfile) {
        snapshot = parseDouyinProfile(json) ?? snapshot
        avatarUrl = douyinAvatar(asRecord(asRecord(json)?.user)) ?? avatarUrl
        return
      }
      // The own posts carry their author: the avatar when the profile answer did not come.
      const list = asRecord(json)?.aweme_list
      avatarUrl ??= douyinAvatar(asRecord(asRecord(Array.isArray(list) ? list[0] : undefined)?.author))
      const page = parseDouyinPosts(json)
      for (const post of page.posts) posts.set(post.postId, post)
      progress.hasMore = page.hasMore
    }).catch(() => {
      // An unreadable body (redirect, empty or non-JSON) carries no data; the DOM fallback covers counters.
    }).finally(() => { pending-- })
  }
  page.on('response', onResponse)
  const stopCapture = captureJson(page, target => target.includes(PROFILE_API))
  try {
    await gotoPage(page, url, limits.signal)
    for (let waited = 0; waited < 12 && (snapshot === undefined || posts.size === 0); waited++) await sleep(1000, limits.signal)
    for (let round = 0; round < 8 && progress.hasMore && posts.size < limits.maxPosts; round++) {
      const before = posts.size
      await page.mouse.wheel(0, 5000)
      await sleep(1800, limits.signal)
      if (posts.size === before && pending === 0) break
    }
  } finally {
    page.off('response', onResponse)
    stopCapture?.()
  }
  if (snapshot === undefined) {
    const texts = await evaluateScript(page, DOM_SCRIPT)
    snapshot = parseDouyinDom(Array.isArray(texts) ? texts.map(text => typeof text === 'string' ? text : '') : [])
  }
  if (snapshot === undefined) {
    throw new MediaScrapeError('scrape-failed', '没有在抖音主页上读到粉丝等数据，页面可能出现了验证码或结构已变化；可在内嵌浏览器中查看，或改用创作者中心导出文件导入。')
  }
  const sorted = [...posts.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  return { snapshot, posts: sorted.slice(0, limits.maxPosts), avatarUrl }
}

/**
 * Read the logged-in account from a `/aweme/v1/web/user/profile/self/` response.
 * @param json - response body.
 * @returns nickname and canonical profile URL, or undefined when the body holds no `sec_uid`.
 */
export function parseDouyinSelf(json: unknown): MediaIdentityFields | undefined {
  const user = asRecord(asRecord(json)?.user)
  const secUid = stringField(user, 'sec_uid')
  if (secUid === undefined) return undefined
  return { name: stringField(user, 'nickname') ?? `抖音用户 ${secUid.slice(0, 8)}`, profileUrl: `https://www.douyin.com/user/${secUid}`, avatarUrl: douyinAvatar(user) }
}

const SEC_UID_KEYS = ['sec_uid', 'secUid', 'sec_user_id', 'secUserId']
const NICKNAME_KEYS = ['nickname', 'nick_name', 'nickName', 'name']

/**
 * Find the logged-in account in a creator-center user info response, searching nested objects for a `sec_uid`.
 * @param json - response body.
 * @returns nickname and canonical profile URL, or undefined when no object carries a `sec_uid`.
 */
export function parseDouyinCreatorInfo(json: unknown): MediaIdentityFields | undefined {
  const queue: { readonly value: unknown; readonly depth: number }[] = [{ value: json, depth: 0 }]
  for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
    const record = asRecord(item.value)
    if (record === undefined) continue
    const secUid = SEC_UID_KEYS.map(key => stringField(record, key)).find(value => value !== undefined)
    if (secUid !== undefined) {
      const name = NICKNAME_KEYS.map(key => stringField(record, key)).find(value => value !== undefined)
      return { name: name ?? `抖音用户 ${secUid.slice(0, 8)}`, profileUrl: `https://www.douyin.com/user/${secUid}`, avatarUrl: douyinAvatar(record) }
    }
    if (item.depth < 4) for (const value of Object.values(record)) queue.push({ value, depth: item.depth + 1 })
  }
  return undefined
}

/** Load a URL and wait until a response matching `accept` yields an identity, or the wait ends. */
async function captureIdentity(
  page: Page, url: string, accept: (responseUrl: string) => boolean, parse: (json: unknown) => MediaIdentityFields | undefined,
  waitSeconds: number, signal: AbortSignal,
): Promise<MediaIdentityFields | undefined> {
  let found: MediaIdentityFields | undefined
  const onResponse = (response: Response): void => {
    if (!accept(response.url())) return
    response.json().then((json: unknown) => { found = parse(json) ?? found }).catch(() => {
      // A non-JSON body carries no identity; the wait below ends without one.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, url, signal)
    for (let waited = 0; waited < waitSeconds && found === undefined; waited++) await sleep(1000, signal)
  } finally {
    page.off('response', onResponse)
  }
  return found
}

/**
 * The `www` self profile is tried first, which also carries the creator-center login over to `www`; the creator
 * center's user info is the fallback.
 */
async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  return await captureIdentity(page, 'https://www.douyin.com/user/self', target => target.includes('/aweme/v1/web/user/profile/self/'), parseDouyinSelf, 15, signal)
    ?? await captureIdentity(page, 'https://creator.douyin.com/creator-micro/home',
      target => target.startsWith('https://creator.douyin.com/') && /user\/info|user_info|userinfo/i.test(target), parseDouyinCreatorInfo, 40, signal)
}

/** Daily account metric of the creator center's data overview. */
export type DouyinDailyMetric = 'plays' | 'profileViews' | 'postLikes' | 'postComments' | 'postShares' | 'fansNet' | 'fansTotal' | 'newFollowers' | 'unfollows'
  | 'returningFans' | 'completionRate5s' | 'bounceRate2s' | 'coverCtr' | 'avgPlaySeconds'

/** Metrics reported as ratios (0 to 1) or seconds: kept with their decimals instead of rounded like counts. */
const DECIMAL_METRICS: ReadonlySet<DouyinDailyMetric> = new Set(['completionRate5s', 'bounceRate2s', 'coverCtr', 'avgPlaySeconds'])

/**
 * Values of one China calendar day. `p7:<metric>` and `p30:<metric>` hold the platform's own figure of a ratio or
 * duration over the 7 or 30 days ending that day (its `metric_value`); it cannot be rebuilt from daily values, since
 * a click rate is weighted by impressions the platform does not report.
 */
export type DouyinDailyValues = Partial<Record<DouyinDailyMetric | `p${number}:${DouyinDailyMetric}`, number>>

/**
 * `english_metric_name` values of the overview, including the display aliases the creator center maps them to. The
 * names of the 2026-11 data center (`/overview/dashboard` and `/overview/dashboard/fans`) were read from a real account:
 * play_cnt, digg_cnt, share_count, comment_cnt, net_fans_cnt, cancel_fans_cnt, new_fans_cnt, total_fans_cnt,
 * homepage_view_cnt, home_view_fans_cnt, cover_click_ratio, completion_rate_5s, bounce_rate_2s, avg_view_second and
 * publish_cnt (posts are counted from the post list instead).
 */
const METRIC_NAMES: Readonly<Record<string, DouyinDailyMetric>> = {
  play_cnt: 'plays', vv: 'plays', play_count: 'plays', view_count: 'plays',
  home_view_fans_cnt: 'returningFans',
  completion_rate_5s: 'completionRate5s', bounce_rate_2s: 'bounceRate2s', cover_click_ratio: 'coverCtr', avg_view_second: 'avgPlaySeconds',
  homepage_view_cnt: 'profileViews', profile_uv: 'profileViews', homepage_visit_count: 'profileViews', homepage_view: 'profileViews',
  digg_cnt: 'postLikes', like: 'postLikes', like_cnt: 'postLikes', like_count: 'postLikes',
  comment_cnt: 'postComments', comment: 'postComments', comment_count: 'postComments',
  share_cnt: 'postShares', share: 'postShares', share_count: 'postShares',
  new_fans_cnt: 'newFollowers', new_follow_fans: 'newFollowers', cancel_fans_cnt: 'unfollows', unfollow_fans: 'unfollows',
  net_fans_cnt: 'fansNet', net_follow_fans: 'fansNet',
  total_fans_cnt: 'fansTotal', fans_all: 'fansTotal',
}

/**
 * `metric_name` labels, used only when a metric has no English name; checked in order and matched whole, so
 * 平均播放时长 is never read as 播放量 (it once overwrote the play counts with the average seconds).
 */
const METRIC_LABELS: readonly (readonly [RegExp, DouyinDailyMetric])[] = [
  [/^主页访问量?$/, 'profileViews'], [/^(粉丝净增|净增粉丝)$/, 'fansNet'], [/^(粉丝|总粉丝量?|粉丝总量)$/, 'fansTotal'],
  [/^(吸粉量?|新增粉丝量?)$/, 'newFollowers'], [/^(脱粉量?|取关粉丝)$/, 'unfollows'], [/^回访粉丝量?$/, 'returningFans'],
  [/^(作品|总)?点赞量?$/, 'postLikes'], [/^(作品|总)?评论量?$/, 'postComments'], [/^(作品|总)?分享量?$/, 'postShares'],
  [/^总?播放量$/, 'plays'], [/^5秒完播率$/, 'completionRate5s'], [/^2秒跳出率$/, 'bounceRate2s'], [/^封面点击率$/, 'coverCtr'],
  [/^平均播放时长$/, 'avgPlaySeconds'],
]

/**
 * China calendar day of a trend point's `date_time`: `2026-11-06`, `2026/11/6`, `20261106`, `11-06` (the latest such
 * day not after today), or Unix seconds or milliseconds.
 * @param value - the `date_time` value.
 * @param today - today's China day, `YYYY-MM-DD`.
 * @returns the day, or undefined when the value is not a date.
 */
export function douyinDay(value: unknown, today: string): string | undefined {
  const pad = (part: string): string => part.padStart(2, '0')
  if (typeof value === 'number' || (typeof value === 'string' && /^\d{10}$|^\d{13}$/.test(value.trim()))) {
    const iso = parseDate(typeof value === 'number' ? value : Number(value.trim()))
    return iso === undefined ? undefined : chinaDay(iso)
  }
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  const full = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[ T])/.exec(text) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  if (full !== null) {
    const [, y = '', m = '', d = ''] = full
    return `${y}-${pad(m)}-${pad(d)}`
  }
  const short = /^(\d{1,2})[-/.](\d{1,2})$/.exec(text)
  if (short === null) return undefined
  const [, m = '', d = ''] = short
  const year = Number(today.slice(0, 4))
  const day = `${year}-${pad(m)}-${pad(d)}`
  return day > today ? `${year - 1}-${pad(m)}-${pad(d)}` : day
}

/** The metric of an overview entry: by its English name when it has one (an unknown name is skipped), else by its label. */
function metricOf(item: Readonly<Record<string, unknown>>): DouyinDailyMetric | undefined {
  const name = stringField(item, 'english_metric_name')?.trim().toLowerCase()
  if (name !== undefined && name !== '') return METRIC_NAMES[name]
  const label = (stringField(item, 'metric_name') ?? '').trim()
  return METRIC_LABELS.find(([pattern]) => pattern.test(label))?.[1]
}

/**
 * Read the daily trends of a creator-center data overview response (`/janus/douyin/creator/data/overview/dashboard`
 * and its `/fans` variant): `metrics[].trends[]` with `date_time` and `value`.
 * @param json - response body.
 * @param today - today's China day, `YYYY-MM-DD`, for dates printed without a year.
 * @param rangeDays - the `recent_days` the body answers; when known, each ratio's and duration's `metric_value` is kept
 *   as `p<rangeDays>:<metric>` on the range's last day.
 * @returns values by China day; empty for a failed response (`status_code` other than 0) or an unknown body.
 */
export function parseDouyinDashboard(json: unknown, today: string, rangeDays?: number): Map<string, DouyinDailyValues> {
  const days = new Map<string, DouyinDailyValues>()
  const body = asRecord(json)
  if (body === undefined || (body.status_code !== undefined && body.status_code !== 0 && body.status_code !== '0')) return days
  for (const entry of Array.isArray(body.metrics) ? body.metrics : []) {
    const item = asRecord(entry)
    const metric = item === undefined ? undefined : metricOf(item)
    if (item === undefined || metric === undefined) continue
    let lastDay: string | undefined
    for (const point of Array.isArray(item.trends) ? item.trends : []) {
      const trend = asRecord(point)
      const day = douyinDay(trend?.date_time ?? trend?.date, today)
      const value = DECIMAL_METRICS.has(metric) ? parseDecimal(trend?.value) : parseCount(trend?.value)
      if (day === undefined || value === undefined) continue
      days.set(day, { ...days.get(day), [metric]: value })
      if (lastDay === undefined || day > lastDay) lastDay = day
    }
    const period = DECIMAL_METRICS.has(metric) && rangeDays !== undefined ? parseDecimal(item.metric_value) : undefined
    if (lastDay !== undefined && period !== undefined) days.set(lastDay, { ...days.get(lastDay), [`p${rangeDays}:${metric}`]: period })
  }
  return days
}

/**
 * Merge daily values into an accumulator; later values of the same day and metric win.
 * @param into - accumulator.
 * @param from - values to add.
 */
export function mergeDouyinDays(into: Map<string, DouyinDailyValues>, from: ReadonlyMap<string, DouyinDailyValues>): void {
  for (const [day, values] of from) into.set(day, { ...into.get(day), ...values })
}

/**
 * Convert daily values into history days: totals and net changes of followers, the rest into `extra`.
 * @param days - values by China day.
 * @returns history days, oldest first.
 */
export function douyinHistoryDays(days: ReadonlyMap<string, DouyinDailyValues>): MediaHistoryDay[] {
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => {
    const extra: Record<string, number> = {}
    for (const [key, value] of Object.entries(values)) if (value !== undefined && key !== 'fansTotal' && key !== 'fansNet') extra[key] = value
    return { day, followers: values.fansTotal, followersNet: values.fansNet, extra }
  })
}

const OVERVIEW_URL = 'https://creator.douyin.com/creator-micro/data-center/operation'
const DASHBOARD_API = '/janus/douyin/creator/data/overview/dashboard'
/**
 * Ranges the overview answers in full, longest first. Asked for 90 days, `/fans` answers 「参数不合法」 and the dashboard
 * only the follower total, so a longer chart comes from keeping each update's 30 days.
 */
const RANGES = [30, 7] as const

/**
 * The `recent_days` an overview request asked for, from its query (`/fans?recent_days=7`) or JSON body.
 * @param url - request URL.
 * @param body - request body, if any.
 * @returns the day count, or undefined when the request does not say.
 */
export function recentDaysOf(url: string, body: string | null | undefined): number | undefined {
  const fromQuery = /[?&]recent_days=(\d+)/.exec(url)?.[1]
  let fromBody: unknown
  try { fromBody = body ? asRecord(JSON.parse(body))?.recent_days : undefined } catch { fromBody = undefined }
  const days = Number(fromQuery ?? fromBody)
  return Number.isInteger(days) && days > 0 ? days : undefined
}

/**
 * In-page requests of the overview for a longer range; they run inside the creator center so its request signing
 * applies. Unreadable answers are skipped.
 * @param days - `recent_days` value.
 * @returns a JavaScript expression evaluating to the response bodies.
 */
export function douyinOverviewScript(days: number): string {
  return `(async () => {
    const out = []
    const read = async (url, init) => {
      try { out.push(await (await fetch(url, { credentials: 'include', ...init })).json()) } catch {}
    }
    await read(${JSON.stringify(DASHBOARD_API)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recent_days: ${days} }) })
    await read(${JSON.stringify(`${DASHBOARD_API}/fans?recent_days=`)} + ${days})
    return out
  })()`
}

/** Creator-center pages visited only while capturing, to record the APIs behind the other data modules. */
const CAPTURE_PAGES = [
  'https://creator.douyin.com/creator-micro/data-center/content',
  'https://creator.douyin.com/creator-micro/data-center/fans',
  'https://creator.douyin.com/creator-micro/content/manage',
] as const

/** While capturing: open the other data pages and scroll each so its modules load. Errors only end the capture. */
async function captureMorePages(page: Page, signal: AbortSignal): Promise<void> {
  for (const url of CAPTURE_PAGES) {
    await gotoPage(page, url, signal)
    await sleep(4000, signal)
    for (let round = 0; round < 4; round++) {
      await page.mouse.wheel(0, 1600)
      await sleep(1500, signal)
    }
  }
}

/**
 * The creator center's data overview shows 7 days by default and is captured as it loads; a longer range is then
 * requested from inside the page.
 */
async function history(page: Page, _account: MediaAccount, limits: MediaHistoryLimits): Promise<MediaHistoryDay[]> {
  const stopCapture = captureJson(page, url => url.startsWith('https://creator.douyin.com/'))
  try {
    const result = await overviewHistory(page, limits)
    if (stopCapture !== undefined) {
      await page.mouse.wheel(0, 2400).catch(() => undefined)
      await sleep(3000, limits.signal).then(() => captureMorePages(page, limits.signal)).catch(() => undefined)
    }
    return result
  } finally {
    stopCapture?.()
  }
}

async function overviewHistory(page: Page, limits: MediaHistoryLimits): Promise<MediaHistoryDay[]> {
  const today = chinaDay(new Date().toISOString())
  const days = new Map<string, DouyinDailyValues>()
  const onResponse = (response: Response): void => {
    if (!response.url().includes(DASHBOARD_API)) return
    const requested = recentDaysOf(response.url(), response.request().postData())
    response.json().then((json: unknown) => { mergeDouyinDays(days, parseDouyinDashboard(json, today, requested)) }).catch(() => {
      // A non-JSON body carries no trend; the longer-range request below may still read one.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, OVERVIEW_URL, limits.signal)
    for (let waited = 0; waited < 30 && days.size === 0; waited++) await sleep(1000, limits.signal)
  } finally {
    page.off('response', onResponse)
  }
  if (!page.url().startsWith('https://creator.douyin.com/creator-micro/')) {
    throw new MediaScrapeError('login-required', '抖音创作者中心未登录，无法读取历史数据。')
  }
  const range = RANGES.find(candidate => candidate <= limits.days) ?? 7
  if (range > 7) {
    const bodies = await evaluateScript(page, douyinOverviewScript(range))
    for (const body of Array.isArray(bodies) ? bodies : []) mergeDouyinDays(days, parseDouyinDashboard(body, today, range))
  }
  return douyinHistoryDays(days)
}

/** Built-in 抖音 adapter. */
export const douyinAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'douyin',
    displayName: '抖音',
    loginUrl: 'https://creator.douyin.com/',
    scrape: true,
    import: true,
    importHint: '抖音创作者中心 → 数据中心 → 作品数据 → 导出数据；粉丝数据页的导出也可导入。',
    profileUrlExample: 'https://www.douyin.com/user/MS4wLjABAAAA…（自有账号可留空）',
    metrics: { views: '播放', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' },
    noun: '作品',
    color: '#FE2C55',
  },
  importProfile: {
    defaultFormat: 'video',
    columns: [
      { field: 'title', synonyms: ['作品名称', '作品标题', '视频标题', '作品描述'] },
      { field: 'postId', synonyms: ['作品id', '视频id'] },
      { field: 'views', synonyms: ['播放量', '播放', '播放次数', '观看次数'] },
      { field: 'extra:completionRate', synonyms: ['完播率'] },
      { field: 'extra:avgWatchSeconds', synonyms: ['平均播放时长', '平均观看时长'] },
      { field: 'extra:followersGained', synonyms: ['涨粉', '涨粉量', '新增粉丝'] },
      { field: 'extra:homepageVisits', synonyms: ['主页访问', '主页访问量'] },
    ],
  },
  detectLogin,
  scrape,
  history,
  search: searchDouyin,
  trending: trendingDouyin,
  qrSelectors: ['#douyin_login_comp_scan_code_qrcode img'],
  // The login page's own 「二维码已失效 / 已过期」 notice; the login view clicks its refresh so the code shown stays live.
  qrExpired: expiredQrScript(/二维码已?(失效|过期)/),
  identify,
}
