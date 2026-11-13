/**
 * 视频号 adapter: the logged-in 视频号助手 (channels.weixin.qq.com) for own accounts.
 *
 * It opens the backend pages and reads the JSON those pages request themselves, never calling endpoints with made-up
 * request bodies. Checked against a real account on 2026-11-12:
 * - `auth/auth_data`: `data.finderUser` holds the 视频号 (nickname, headImgUrl, fansCount, feedsCount); `data.userAttr`
 *   is the WeChat admin and is ignored.
 * - `/micro/content/…/post/post_list` (视频管理, loaded about 35 s after the page opens): `data.list[]` with objectId,
 *   createTime, desc.description, desc.media[0].coverUrl, readCount (播放), favCount (👍 点赞), likeCount (♡ 喜欢),
 *   commentCount, forwardCount (转发), fullPlayRate, avgPlayTimeSec.
 * - `/micro/statistic/…/statistic/new_post_total_data` (视频数据) and `statistic/fans_trend` (关注者数据): daily
 *   arrays from the request's `startTs` (China midnight, Unix seconds), one value per day.
 */
import type { Page, Response } from 'playwright-core'
import { parseCount, parseDate, parseDecimal, stablePostId } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import { chinaDay, type MediaHistoryDay } from '../history.ts'
import type { MediaAccount, MediaLoginState } from '../types.ts'
import { asRecord, captureJson, evaluateScript, expiredQrScript, gotoPage, sleep } from './page.ts'
import type {
  MediaHistoryLimits, MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields,
} from './types.ts'

const ORIGIN = 'https://channels.weixin.qq.com'
const HOME = `${ORIGIN}/platform`
const LOGIN = `${ORIGIN}/login.html`
const POST_LIST = `${ORIGIN}/platform/post/list`
const POST_STATS = `${ORIGIN}/platform/statistic/post`
const FOLLOWER_STATS = `${ORIGIN}/platform/statistic/follower`
/** Responses of the backend's own API, which carry the account and post records. */
const API_PATH = '/cgi-bin/mmfinderassistant-bin/'
/** Deepest level of a response searched for records. */
const MAX_DEPTH = 8

const NICKNAME_KEYS = ['nickname', 'nickName', 'finderNickname'] as const
const FOLLOWER_KEYS = ['fansCount', 'fans_count', 'followerCount', 'follower_count', 'totalFansCount'] as const
/** Post counters by field: 👍 (`favCount`) is 点赞 and ♡ (`likeCount`) is 喜欢, as the backend's own list shows them. */
const POST_COUNTERS = {
  views: ['readCount', 'playCount', 'viewCount', 'read_count', 'play_count'],
  likes: ['favCount', 'fav_count'],
  comments: ['commentCount', 'comment_count'],
  shares: ['forwardCount', 'shareCount', 'forward_count', 'share_count'],
  collects: ['likeCount', 'like_count'],
} as const

function firstNumber(record: Readonly<Record<string, unknown>>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = parseCount(record[key])
    if (value !== undefined) return value
  }
  return undefined
}

function firstText(record: Readonly<Record<string, unknown>> | undefined, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

/** Every object inside a JSON value, depth first, up to {@link MAX_DEPTH} levels. */
function* records(value: unknown, depth = 0): Generator<Readonly<Record<string, unknown>>> {
  if (depth > MAX_DEPTH) return
  if (Array.isArray(value)) {
    for (const item of value) yield* records(item, depth + 1)
    return
  }
  const record = asRecord(value)
  if (record === undefined) return
  yield record
  for (const child of Object.values(record)) if (typeof child === 'object' && child !== null) yield* records(child, depth + 1)
}

/** The 视频号 account as a backend response describes it. */
export interface ChannelsAccount {
  readonly name?: string | undefined
  readonly followers?: number | undefined
  readonly posts?: number | undefined
  readonly avatarUrl?: string | undefined
}

/**
 * Find the account record in a backend response: the `finderUser` record when there is one, else the first object
 * with a nickname, with a follower count from it or from an object beside it.
 * @param json - response body.
 * @returns nickname and followers, or undefined when the body names no account.
 */
export function parseChannelsAccount(json: unknown): ChannelsAccount | undefined {
  // The 视频号 itself first: `auth/auth_data` answers `data.finderUser` (nickname, headImgUrl, fansCount, feedsCount)
  // beside `data.userAttr`, which holds the WeChat admin's own nickname.
  for (const record of records(json)) {
    const finder = asRecord(record.finderUser)
    if (finder === undefined) continue
    const head = firstText(finder, ['headImgUrl', 'headUrl'])
    return {
      name: firstText(finder, NICKNAME_KEYS), followers: firstNumber(finder, FOLLOWER_KEYS), posts: parseCount(finder.feedsCount),
      avatarUrl: head?.startsWith('https://') === true ? head : undefined,
    }
  }
  // `userAttr` describes the WeChat admin, never the 视频号.
  const admins = new Set<unknown>()
  for (const record of records(json)) if (record.userAttr !== undefined) admins.add(record.userAttr)
  let name: string | undefined
  let followers: number | undefined
  for (const record of records(json)) {
    if (admins.has(record)) continue
    name ??= firstText(record, NICKNAME_KEYS)
    followers ??= firstNumber(record, FOLLOWER_KEYS)
    if (name !== undefined && followers !== undefined) break
  }
  return name === undefined && followers === undefined ? undefined : { name, followers }
}

/**
 * Find post records in a backend response: objects with a play or like counter and a description or create time. A
 * post's description may sit in a nested `objectDesc`.
 * @param json - response body.
 * @returns the posts recognized; empty when none.
 */
export function parseChannelsPosts(json: unknown): MediaPostFields[] {
  const posts: MediaPostFields[] = []
  const seen = new Set<string>()
  for (const record of records(json)) {
    const counters = Object.fromEntries(Object.entries(POST_COUNTERS).map(([field, keys]) => [field, firstNumber(record, keys)])) as Record<keyof typeof POST_COUNTERS, number | undefined>
    if (counters.views === undefined && counters.likes === undefined) continue
    const desc = asRecord(record.objectDesc) ?? asRecord(record.desc)
    const title = firstText(record, ['description', 'title']) ?? firstText(desc, ['description', 'title'])
    const created = record.createTime ?? record.create_time ?? record.postTime
    if (title === undefined && created === undefined) continue
    const id = firstText(record, ['objectId', 'exportId', 'id', 'objectNonceId']) ?? stablePostId(undefined, `${title ?? ''}${String(created)}`)
    if (seen.has(id)) continue
    seen.add(id)
    const media = asRecord(Array.isArray(desc?.media) ? desc.media[0] : undefined)
    const cover = firstText(media, ['coverUrl', 'thumbUrl', 'fullCoverUrl'])
    const extra: Record<string, number> = {}
    const completion = parseDecimal(record.fullPlayRate)
    const avgPlay = parseDecimal(record.avgPlayTimeSec)
    if (completion !== undefined) extra.completionRate = completion
    if (avgPlay !== undefined) extra.avgPlaySeconds = avgPlay
    posts.push({
      postId: id, title: (title ?? '视频').slice(0, 200), publishedAt: parseDate(created), format: 'video',
      ...counters, ...cover?.startsWith('https://') === true ? { coverUrl: cover } : {}, extra,
    })
  }
  return posts
}

/** Cookie the backend sets on login (with `wxuin`); a visitor has none. */
const SESSION_COOKIE = 'sessionid'

/**
 * Whether the page shows the logged-in backend. The backend renders its pages as embedded sub-apps (shadow roots and
 * same-origin iframes), so their text is gathered too; the login page lists the same features (内容管理, 数据中心 …)
 * beside its QR card, so its own prompts rule a login out first.
 */
const BACKEND_SCRIPT = `(() => {
  const texts = []
  const walk = (root, depth) => {
    if (!root || depth > 4) return
    texts.push(root.body ? root.body.innerText : (root.textContent || ''))
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot, depth + 1)
      if (el.tagName === 'IFRAME') { try { walk(el.contentDocument, depth + 1) } catch (error) {} }
    }
  }
  walk(document, 0)
  const text = texts.join('\\n')
  if (/登录视频号助手|扫码登录|微信扫一扫/.test(text)) return false
  return /昨日数据|关注者|内容管理|数据中心|互动管理|发表视频|通知中心|视频号ID/.test(text)
})()`

/**
 * Login state of a 视频号助手 page: logged in when the profile holds the backend's session cookie and the page shows
 * the backend. The backend's address (`/platform`) shows for several seconds before the site sends a visitor, or an
 * expired session, to `login.html`, so neither the address nor a left-over cookie alone proves a login: reading one
 * as logged in made the view identify the account in a second tab, whose login page replaced the QR code being scanned.
 */
async function detectLogin(page: Page): Promise<MediaLoginState> {
  const url = page.url()
  if (!url.startsWith(ORIGIN)) return 'unknown'
  if (url.startsWith(LOGIN) || url.includes('/login')) return 'logged-out'
  const session = (await page.context().cookies(ORIGIN)).some(cookie => cookie.name === SESSION_COOKIE && cookie.value !== '')
  if (!session) return 'logged-out'
  if (!url.startsWith(HOME)) return 'unknown'
  return await evaluateScript(page, BACKEND_SCRIPT) === true ? 'logged-in' : 'unknown'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', '视频号助手未登录或登录已过期，请在内嵌浏览器中用微信扫码登录后重试。')
}

/**
 * Open a backend page and collect the JSON of the backend API responses it triggers: for `settleMs`, or, with `until`,
 * until it holds for what was collected or `maxMs` passed (the pages load their data inside embedded sub-apps, late).
 */
async function capture(page: Page, url: string, signal: AbortSignal, settleMs: number, until?: (bodies: readonly unknown[]) => boolean, maxMs = 20_000): Promise<unknown[]> {
  const bodies: unknown[] = []
  const onResponse = (response: Response): void => {
    if (!response.url().includes(API_PATH)) return
    response.json().then((json: unknown) => { bodies.push(json) }).catch(() => {
      // A non-JSON or empty body carries no records.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, url, signal)
    await sleep(settleMs, signal)
    for (let waited = settleMs; until !== undefined && !until(bodies) && waited < maxMs; waited += 500) await sleep(500, signal)
  } finally {
    page.off('response', onResponse)
  }
  if (await detectLogin(page) === 'logged-out') throw loginRequired()
  return bodies
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  if (account.role !== 'own') throw new MediaScrapeError('unsupported', '视频号只能读取自己登录的账号；对标账号请导入数据文件。')
  const stopCapture = captureJson(page, url => url.startsWith(ORIGIN))
  try {
    return await scrapeBackend(page, limits)
  } finally {
    stopCapture?.()
  }
}

async function scrapeBackend(page: Page, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const homeBodies = await capture(page, HOME, limits.signal, 4000, bodies => bodies.some(body => parseChannelsAccount(body)?.followers !== undefined), 12_000)
  // 视频管理 loads its list in an embedded sub-app, about half a minute after the page opens.
  const listBodies = await capture(page, POST_LIST, limits.signal, 5000, bodies => bodies.some(body => parseChannelsPosts(body).length > 0), 50_000)
  let account: ChannelsAccount | undefined
  for (const body of [...homeBodies, ...listBodies]) {
    const found = parseChannelsAccount(body)
    if (found?.followers !== undefined || found?.name !== undefined) account = { ...found, ...account }
  }
  const followers = account?.followers
  const posts = new Map<string, MediaPostFields>()
  for (const body of listBodies) for (const post of parseChannelsPosts(body)) posts.set(post.postId, post)
  if (followers === undefined && posts.size === 0) {
    throw new MediaScrapeError('scrape-failed', '没有在视频号助手里读到粉丝和作品数据，页面结构可能和预期不同；可以在视频号助手「数据中心」导出表格后导入。')
  }
  const sorted = [...posts.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const snapshot: MediaSnapshotFields = { followers, posts: account?.posts, extra: {} }
  return { snapshot, posts: sorted.slice(0, limits.maxPosts), avatarUrl: account?.avatarUrl }
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  const stopCapture = captureJson(page, url => url.startsWith(ORIGIN))
  const bodies = await capture(page, HOME, signal, 4000, found => found.some(body => parseChannelsAccount(body)?.name !== undefined), 12_000).catch((error: unknown) => {
    if (error instanceof MediaScrapeError && error.code === 'login-required') return undefined
    throw error
  }).finally(() => { stopCapture?.() })
  if (bodies === undefined) return undefined
  for (const body of bodies) {
    const found = parseChannelsAccount(body)
    if (found?.name !== undefined) return { name: found.name, profileUrl: HOME, avatarUrl: found.avatarUrl }
  }
  return { name: '视频号', profileUrl: HOME }
}

/** Days an answer must span to be a page's full trend (the pages show 7), not its separate request for yesterday. */
const FULL_TREND_DAYS = 5

/** Daily series of the data center, by the key the history keeps them under. */
const TREND_SERIES: Readonly<Record<string, string>> = {
  browse: 'plays', fav: 'postLikes', like: 'postCollects', comment: 'postComments', forward: 'postShares',
  add: 'newFollowers', reduce: 'unfollows', netAdd: 'fansNet', total: 'fansTotal',
}

/**
 * Read a data-center trend: `statistic/new_post_total_data` (`data.totalData.browse[]` …) or `statistic/fans_trend`
 * (`data.add[]`, `reduce`, `netAdd`, `total`), one value per day from `startTs`.
 * @param json - response body.
 * @param startTs - the request's `startTs`, China midnight of the first day in Unix seconds.
 * @returns values by China day; empty for a failed or unknown body.
 */
export function parseChannelsTrend(json: unknown, startTs: number | undefined): Map<string, Record<string, number>> {
  const days = new Map<string, Record<string, number>>()
  const body = asRecord(json)
  if (startTs === undefined || body === undefined || (body.errCode !== undefined && body.errCode !== 0)) return days
  const data = asRecord(body.data)
  const series = asRecord(data?.totalData) ?? data
  for (const [field, key] of Object.entries(TREND_SERIES)) {
    const values = series?.[field]
    if (!Array.isArray(values)) continue
    values.forEach((raw, index) => {
      const value = parseCount(raw)
      if (value === undefined) return
      const day = chinaDay(new Date((startTs + index * 86_400) * 1000).toISOString())
      days.set(day, { ...days.get(day), [key]: value })
    })
  }
  return days
}

/** The `startTs` of a data-center request body, or undefined. */
export function trendStartOf(body: string | null | undefined): number | undefined {
  try {
    const start = Number(asRecord(JSON.parse(body ?? ''))?.startTs)
    return Number.isInteger(start) && start > 0 ? start : undefined
  } catch {
    return undefined
  }
}

/**
 * Daily values of the last days, as the data center's 视频数据 and 关注者数据 pages load them (7 days by default;
 * each later update writes its days again, so the history grows).
 */
async function history(page: Page, _account: MediaAccount, limits: MediaHistoryLimits): Promise<MediaHistoryDay[]> {
  const days = new Map<string, Record<string, number>>()
  const seen = new Set<string>()
  const onResponse = (response: Response): void => {
    const kind = /\/statistic\/(new_post_total_data|fans_trend)/.exec(response.url())?.[1]
    if (kind === undefined) return
    const start = trendStartOf(response.request().postData())
    response.json().then((json: unknown) => {
      const found = parseChannelsTrend(json, start)
      for (const [day, values] of found) days.set(day, { ...days.get(day), ...values })
      // Each page also asks for yesterday alone, often first: only the week's answer completes the page.
      if (found.size >= FULL_TREND_DAYS) seen.add(kind)
    }).catch(() => {
      // An unreadable answer carries no series; the other page may still.
    })
  }
  page.on('response', onResponse)
  try {
    for (const [url, kind] of [[POST_STATS, 'new_post_total_data'], [FOLLOWER_STATS, 'fans_trend']] as const) {
      await gotoPage(page, url, limits.signal)
      for (let waited = 0; waited < 45 && !seen.has(kind); waited++) await sleep(1000, limits.signal)
    }
  } finally {
    page.off('response', onResponse)
  }
  if (await detectLogin(page) === 'logged-out') throw loginRequired()
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => {
    const { fansTotal, fansNet, ...extra } = values
    return { day, followers: fansTotal, followersNet: fansNet, extra }
  })
}

/** Built-in 视频号 adapter. */
export const wechatChannelsAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'wechat-channels',
    displayName: '视频号',
    loginUrl: HOME,
    scrape: true,
    import: true,
    importHint: '视频号助手 → 数据中心 → 作品数据 → 下载表格。',
    profileUrlExample: '自有视频号无需填写',
    metrics: { views: '播放', likes: '点赞', comments: '评论', shares: '转发', collects: '喜欢' },
    noun: '视频',
    color: '#FA9D3B',
    beta: true,
  },
  importProfile: {
    defaultFormat: 'video',
    columns: [
      { field: 'title', synonyms: ['视频描述', '作品描述', '动态描述', '标题'] },
      { field: 'publishedAt', synonyms: ['发表时间', '发布时间'] },
      { field: 'views', synonyms: ['播放量', '播放次数', '浏览量'] },
      { field: 'likes', synonyms: ['点赞', '点赞数', '点赞量'] },
      { field: 'comments', synonyms: ['评论', '评论数', '评论量'] },
      { field: 'shares', synonyms: ['转发', '转发数', '分享数', '分享量'] },
      { field: 'collects', synonyms: ['收藏', '收藏数', '喜欢', '推荐数'] },
      { field: 'followers', synonyms: ['关注者总数', '总关注数', '粉丝总数'] },
      { field: 'extra:newFollowers', synonyms: ['新增关注', '涨粉', '新增粉丝'] },
    ],
  },
  scrapableRoles: ['own'],
  identityMatch: 'platform',
  detectLogin,
  scrape,
  history,
  // 视频号助手 ends idle sessions within hours; a light visit every 30 minutes kept one alive for 14 hours.
  keepAlive: { url: 'https://channels.weixin.qq.com/platform', everyMinutes: 30 },
  qrSelectors: ['.qrcode img', 'img.qrcode', '.login-qrcode img'],
  qrExpired: expiredQrScript(/二维码已?(失效|过期)/),
  identify,
}
