/** 小红书 adapter: profile-page scraping from `__INITIAL_STATE__` with a DOM fallback, and creator-center export columns. */
import type { Page, Response } from 'playwright-core'
import { parseCount, parseDate, parseDecimal, stablePostId } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import type { MediaHistoryDay } from '../history.ts'
import type { MediaAccount, MediaLoginState, MediaPostFormat } from '../types.ts'
import { asRecord, evaluateScript, expiredQrScript, gotoPage, readPageGlobal, sleep, stringField } from './page.ts'
import type {
  MediaHistoryLimits, MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields,
} from './types.ts'

const PROFILE_URL = /^https:\/\/www\.(?:xiaohongshu|rednote)\.com\/user\/profile\/([0-9a-zA-Z]+)/
/** Outside mainland China the site redirects to its international domain, which serves the same pages. */
const SITE = /^https:\/\/www\.(?:xiaohongshu|rednote)\.com\//
/** The login page shows the QR code; the site leaves it once a login succeeds. */
const LOGIN_PAGE = /^https:\/\/www\.(?:xiaohongshu|rednote)\.com\/login(?:[/?#]|$)/

/**
 * Login state implied by the URL alone.
 * @param url - page URL.
 * @returns `logged-out` on the login page, `unknown` off the site, or undefined when the page state decides.
 */
export function xhsLoginFromUrl(url: string): MediaLoginState | undefined {
  if (LOGIN_PAGE.test(url)) return 'logged-out'
  return SITE.test(url) ? undefined : 'unknown'
}

/** Raw values the DOM fallback reads from a profile page. */
export interface XhsDomCapture {
  /** Text of the counters block, such as `12关注 1.2万粉丝 3.4万获赞与收藏`. */
  readonly interactionsText: string
  readonly notes: readonly { readonly href: string; readonly title: string; readonly likes: string }[]
}

/**
 * Read counters and notes from the profile page's `__INITIAL_STATE__`.
 * @param state - cloned page state.
 * @param maxPosts - maximum notes returned.
 * @returns the scrape, or undefined when the state carries no profile data.
 */
export function parseXhsState(state: unknown, maxPosts: number): MediaScrapeResult | undefined {
  const user = asRecord(asRecord(state)?.user)
  const page = asRecord(user?.userPageData)
  const interactions = page?.interactions
  if (!Array.isArray(interactions) || interactions.length === 0) return undefined
  let followers: number | undefined
  let following: number | undefined
  let likes: number | undefined
  for (const item of interactions) {
    const record = asRecord(item)
    const type = stringField(record, 'type') ?? ''
    const name = stringField(record, 'name') ?? ''
    const count = parseCount(record?.count)
    if (type === 'fans' || name.includes('粉丝')) followers = count
    else if (type === 'follows' || name === '关注') following = count
    else if (type === 'interaction' || name.includes('获赞')) likes = count
  }
  // `liked` and `collected` are exact; the displayed counter is rounded, as `1万+`, for visitors.
  const liked = typeof page?.liked === 'number' ? page.liked : undefined
  const collected = typeof page?.collected === 'number' ? page.collected : undefined
  const extra: Record<string, number> = {}
  if (liked !== undefined && collected !== undefined) {
    likes = liked + collected
    extra.liked = liked
    extra.collected = collected
  }
  const tabs = user?.notes
  const firstTab: unknown = Array.isArray(tabs) && Array.isArray(tabs[0]) ? tabs[0] : []
  const posts: MediaPostFields[] = []
  for (const item of Array.isArray(firstTab) ? firstTab : []) {
    const record = asRecord(item)
    const card = asRecord(record?.noteCard)
    if (card === undefined) continue
    // Visitors see notes without ids; such notes are keyed by title and publish time.
    const id = stringField(card, 'noteId') ?? stringField(record, 'id')
    const title = stringField(card, 'displayTitle') ?? ''
    const publishedAt = parseDate(card.time)
    if (id === undefined && title === '') continue
    const token = stringField(record, 'xsecToken') ?? stringField(card, 'xsecToken')
    const format: MediaPostFormat = stringField(card, 'type') === 'video' ? 'video' : 'image'
    const coverRecord = asRecord(card.cover)
    const coverInfo = asRecord(Array.isArray(coverRecord?.infoList) ? coverRecord.infoList[0] : undefined)
    const cover = (stringField(coverRecord, 'urlDefault') ?? stringField(coverRecord, 'url') ?? stringField(coverInfo, 'url'))?.replace(/^http:\/\//, 'https://')
    const interact = asRecord(card.interactInfo)
    posts.push({
      postId: id ?? stablePostId(title, publishedAt),
      title,
      url: id === undefined ? undefined : `https://www.xiaohongshu.com/explore/${id}${token === undefined ? '' : `?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_user`}`,
      publishedAt,
      format,
      likes: parseCount(interact?.likedCount),
      ...cover?.startsWith('https://') === true ? { coverUrl: cover } : {},
      extra: interact?.sticky === true ? { pinned: 1 } : {},
    })
    if (posts.length >= maxPosts) break
  }
  const snapshot: MediaSnapshotFields = { followers, following, likes, extra }
  return { snapshot, posts, avatarUrl: xhsAvatar(asRecord(page?.basicInfo)) }
}

/**
 * Avatar of a 小红书 user record (`userInfo` or a profile's `basicInfo`): its `imageb` or `images` URL.
 * @param info - user record.
 * @returns the https image URL, or undefined.
 */
export function xhsAvatar(info: Readonly<Record<string, unknown>> | undefined): string | undefined {
  for (const key of ['imageb', 'images', 'image', 'avatar']) {
    const url = stringField(info, key)?.replace(/^http:\/\//, 'https://')
    if (url?.startsWith('https://') === true) return url
  }
  return undefined
}

/**
 * Read counters and notes from the DOM fallback capture.
 * @param capture - texts read from the rendered profile page.
 * @param maxPosts - maximum notes returned.
 * @returns the scrape, or undefined when no counter was found.
 */
export function parseXhsDom(capture: XhsDomCapture, maxPosts: number): MediaScrapeResult | undefined {
  const counter = (label: string): number | undefined => {
    const match = new RegExp(`([\\d.,]+\\s*[万wWkK千亿]?\\+?)\\s*${label}`).exec(capture.interactionsText)
    return match === null ? undefined : parseCount(match[1])
  }
  const followers = counter('粉丝')
  const following = counter('关注')
  const likes = counter('获赞与收藏')
  if (followers === undefined && following === undefined && likes === undefined) return undefined
  const posts: MediaPostFields[] = []
  for (const note of capture.notes) {
    const id = /\/(?:explore|user\/profile\/[0-9a-zA-Z]+)\/([0-9a-zA-Z]+)/.exec(note.href)?.[1]
    const title = note.title.trim()
    if (id === undefined && title === '') continue
    posts.push({ postId: id ?? stablePostId(title), title, url: id === undefined ? undefined : `https://www.xiaohongshu.com/explore/${id}`, format: 'image', likes: parseCount(note.likes), extra: {} })
    if (posts.length >= maxPosts) break
  }
  return { snapshot: { followers, following, likes, extra: {} }, posts }
}

const LOGIN_SCRIPT = `(() => {
  if (document.querySelector('.side-bar a[href*="/user/profile/"], .user.side-bar-component a[href*="/user/profile/"]') !== null) return 'logged-in'
  if (document.querySelector('.login-container, .login-btn, #login-btn') !== null) return 'logged-out'
  return 'unknown'
})()`

const DOM_SCRIPT = `(() => ({
  interactionsText: document.querySelector('.user-interactions')?.textContent ?? '',
  notes: [...document.querySelectorAll('section.note-item')].map(item => ({
    href: item.querySelector('a[href*="/explore/"], a.cover')?.getAttribute('href') ?? '',
    title: item.querySelector('.title')?.textContent ?? '',
    likes: item.querySelector('.like-wrapper .count, .count')?.textContent ?? '',
  })),
}))()`

/**
 * Validate the untrusted value the DOM script returned.
 * @param value - page result.
 * @returns the capture with non-string fields replaced by empty text.
 */
export function toDomCapture(value: unknown): XhsDomCapture {
  const record = asRecord(value)
  const text = (input: unknown): string => typeof input === 'string' ? input : ''
  const notes = Array.isArray(record?.notes) ? record.notes : []
  return {
    interactionsText: text(record?.interactionsText),
    notes: notes.map((item) => {
      const note = asRecord(item)
      return { href: text(note?.href), title: text(note?.title), likes: text(note?.likes) }
    }),
  }
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  const byUrl = xhsLoginFromUrl(page.url())
  if (byUrl !== undefined) return byUrl
  const state = asRecord(asRecord(await readPageGlobal(page, '__INITIAL_STATE__'))?.user)
  if (typeof state?.loggedIn === 'boolean') return state.loggedIn ? 'logged-in' : 'logged-out'
  const dom = await evaluateScript(page, LOGIN_SCRIPT)
  return dom === 'logged-in' || dom === 'logged-out' ? dom : 'unknown'
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const url = account.profileUrl.trim()
  if (!PROFILE_URL.test(url)) {
    throw new MediaScrapeError('invalid-profile', '小红书主页链接应形如 https://www.xiaohongshu.com/user/profile/<用户ID>（rednote.com 链接同样可用）。')
  }
  await gotoPage(page, url, limits.signal)
  await sleep(2500, limits.signal)
  if (await detectLogin(page) === 'logged-out') {
    throw new MediaScrapeError('login-required', '小红书未登录，请在内嵌浏览器中扫码登录后重试。')
  }
  // The first state holds about 30 notes; scrolling loads more into the same store.
  for (let round = 0; round < 3; round++) {
    const state = parseXhsState(await readPageGlobal(page, '__INITIAL_STATE__'), limits.maxPosts)
    if (state !== undefined && (state.posts.length >= limits.maxPosts || round === 2)) return state
    await page.mouse.wheel(0, 4000)
    await sleep(1500, limits.signal)
  }
  const capture = toDomCapture(await evaluateScript(page, DOM_SCRIPT))
  const parsed = parseXhsDom(capture, limits.maxPosts)
  if (parsed === undefined) throw new MediaScrapeError('scrape-failed', '没有在小红书主页上读到粉丝等数据，页面结构可能已变化，可改用创作服务平台导出文件导入。')
  return parsed
}

/** The logged-in user as the page state or sidebar shows it. */
export interface XhsSelf {
  readonly userId: string | undefined
  readonly nickname: string | undefined
  readonly avatarUrl?: string | undefined
}

function firstString(record: Readonly<Record<string, unknown>> | undefined, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = stringField(record, key)
    if (value !== undefined) return value
  }
  return undefined
}

/**
 * Read the logged-in user from `__INITIAL_STATE__.user.userInfo`, or from the sidebar profile link.
 * @param state - cloned page state.
 * @param sidebarHref - `href` of the sidebar link to the user's own profile, or empty.
 * @returns the user id and nickname found, each possibly undefined.
 */
export function parseXhsSelf(state: unknown, sidebarHref: string): XhsSelf {
  const user = asRecord(asRecord(state)?.user)
  const info = asRecord(user?.userInfo)
  const loggedIn = user?.loggedIn !== false
  const userId = (loggedIn ? firstString(info, ['userId', 'user_id', 'userid', 'id']) : undefined)
    ?? /\/user\/profile\/([0-9a-zA-Z]+)/.exec(sidebarHref)?.[1]
  const nickname = loggedIn ? firstString(info, ['nickname', 'nickName', 'nick_name', 'name']) : undefined
  return { userId, nickname, avatarUrl: loggedIn ? xhsAvatar(info) : undefined }
}

/**
 * Read the nickname from a profile page state.
 * @param state - cloned page state.
 * @returns the nickname, or undefined.
 */
export function parseXhsNickname(state: unknown): string | undefined {
  return stringField(asRecord(asRecord(asRecord(asRecord(state)?.user)?.userPageData)?.basicInfo), 'nickname')
}

const SIDEBAR_SCRIPT = '(() => document.querySelector(\'.side-bar a[href*="/user/profile/"], a.link-wrapper[href*="/user/profile/"], li.user a[href*="/user/profile/"]\')?.getAttribute(\'href\') ?? \'\')()'

/**
 * Canonical 小红书 profile URL of a user.
 * @param userId - user id.
 * @returns the URL on the main domain.
 */
export function xhsProfileUrl(userId: string): string {
  return `https://www.xiaohongshu.com/user/profile/${userId}`
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  await gotoPage(page, 'https://www.xiaohongshu.com/explore', signal)
  await sleep(2500, signal)
  if (xhsLoginFromUrl(page.url()) === 'logged-out') return undefined
  const sidebar = await evaluateScript(page, SIDEBAR_SCRIPT)
  const self = parseXhsSelf(await readPageGlobal(page, '__INITIAL_STATE__'), typeof sidebar === 'string' ? sidebar : '')
  if (self.userId === undefined) return undefined
  const profileUrl = xhsProfileUrl(self.userId)
  let name = self.nickname
  if (name === undefined) {
    await gotoPage(page, profileUrl, signal)
    await sleep(2500, signal)
    name = parseXhsNickname(await readPageGlobal(page, '__INITIAL_STATE__'))
  }
  return { name: name ?? `小红书用户 ${self.userId}`, profileUrl, avatarUrl: self.avatarUrl }
}

const CREATOR_HOME = 'https://creator.xiaohongshu.com/new/home'
/** The 创作服务平台's account overview: `data.seven` and `data.thirty`, each with daily `*_list`s and the period's figures. */
const ACCOUNT_BASE = '/api/galaxy/v2/creator/datacenter/account/base'

/** Daily lists of the account overview, by the key the history keeps them under, and the divisor (100 turns a percent into a ratio). */
const XHS_SERIES: Readonly<Record<string, readonly [string, number]>> = {
  impl_count_list: ['impressions', 1], view_list: ['plays', 1], like_list: ['postLikes', 1], collect_list: ['postCollects', 1],
  comment_list: ['postComments', 1], share_list: ['postShares', 1], home_view_list: ['profileViews', 1],
  rise_fans_list: ['newFollowers', 1], loss_fans_count_list: ['unfollows', 1], net_rise_fans_count_list: ['fansNet', 1],
  cover_click_rate_list: ['coverCtr', 100], video_full_view_rate_list: ['completionRate', 100], avg_view_time_list: ['avgPlaySeconds', 1],
}
/** The period's own figures of ratios and durations, kept as `p<days>:<key>` on the period's last day. */
const XHS_PERIOD: Readonly<Record<string, readonly [string, number]>> = {
  cover_click_rate: ['coverCtr', 100], video_full_view_rate: ['completionRate', 100], avg_view_time: ['avgPlaySeconds', 1],
}

/** A percent as a ratio, rounded to six decimals so 11.7 % reads 0.117 rather than 0.11699999999999999. */
function ratio(value: number, divisor: number): number {
  return divisor === 1 ? value : Math.round((value / divisor) * 1e6) / 1e6
}

/**
 * The day a 创作服务平台 value belongs to. Each value is stamped with the China midnight that ends its day (the overview
 * of 11-04 to 11-10 runs from 11-05 00:00 to 11-11 00:00), which is that day's date in UTC.
 * @param stamp - epoch milliseconds.
 * @returns `YYYY-MM-DD`, or undefined for a non-number.
 */
export function xhsDay(stamp: unknown): string | undefined {
  const ms = typeof stamp === 'number' ? stamp : Number(stamp)
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : undefined
}

/**
 * Read the account overview (`datacenter/account/base`) into daily values, with the period figures of the 7 and
 * 30 days on each period's last day.
 * @param json - response body.
 * @returns values by day; empty for a failed or unknown body.
 */
export function parseXhsAccountBase(json: unknown): Map<string, Record<string, number>> {
  const days = new Map<string, Record<string, number>>()
  const data = asRecord(asRecord(json)?.data)
  const put = (day: string | undefined, key: string, value: number | undefined): void => {
    if (day !== undefined && value !== undefined) days.set(day, { ...days.get(day), [key]: value })
  }
  for (const [period, length] of [['seven', 7], ['thirty', 30]] as const) {
    const block = asRecord(data?.[period])
    if (block === undefined) continue
    for (const [field, [key, divisor]] of Object.entries(XHS_SERIES)) {
      const list = block[field]
      for (const item of Array.isArray(list) ? list : []) {
        const entry = asRecord(item)
        // Rates carry their decimals in count_with_double; counts leave it 0.
        const precise = divisor === 1 ? undefined : parseDecimal(entry?.count_with_double)
        const raw = precise !== undefined && precise !== 0 ? precise : parseDecimal(entry?.count)
        put(xhsDay(entry?.date), key, raw === undefined ? undefined : ratio(raw, divisor))
      }
    }
    const end = xhsDay(block.end_time)
    for (const [field, [key, divisor]] of Object.entries(XHS_PERIOD)) {
      const value = parseDecimal(block[field])
      put(end, `p${length}:${key}`, value === undefined ? undefined : ratio(value, divisor))
    }
  }
  return days
}

/** Daily values from the 创作服务平台 home, which loads the 7- and 30-day account overview by itself. */
async function history(page: Page, _account: MediaAccount, limits: MediaHistoryLimits): Promise<MediaHistoryDay[]> {
  let body: unknown
  const onResponse = (response: Response): void => {
    if (!response.url().includes(ACCOUNT_BASE)) return
    response.json().then((json: unknown) => { body = json }).catch(() => {
      // An unreadable answer carries no series.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, CREATOR_HOME, limits.signal)
    for (let waited = 0; waited < 40 && body === undefined; waited++) await sleep(1000, limits.signal)
  } finally {
    page.off('response', onResponse)
  }
  if (/\/login/.test(page.url())) throw new MediaScrapeError('login-required', '小红书创作服务平台未登录，无法读取每日数据。')
  return [...parseXhsAccountBase(body)].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => {
    const { fansNet, ...extra } = values
    return { day, followers: undefined, followersNet: fansNet, extra }
  })
}

/** Built-in 小红书 adapter. */
export const xiaohongshuAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'xiaohongshu',
    displayName: '小红书',
    loginUrl: 'https://www.xiaohongshu.com/login',
    scrape: true,
    import: true,
    importHint: '小红书创作服务平台 → 数据中心 → 笔记数据 → 导出数据（xlsx）；粉丝数据页的导出也可导入。',
    profileUrlExample: 'https://www.xiaohongshu.com/user/profile/5ff0e6410000000001008400',
    // Views come from the 创作服务平台 (观看数); the public profile shows likes only.
    metrics: { views: '观看', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' },
    noun: '笔记',
    color: '#FF2442',
  },
  importProfile: {
    defaultFormat: 'image',
    columns: [
      { field: 'title', synonyms: ['笔记标题', '笔记名称'] },
      { field: 'postId', synonyms: ['笔记id'] },
      { field: 'views', synonyms: ['观看', '观看量', '观看数', '阅读量'] },
      { field: 'extra:impressions', synonyms: ['曝光', '曝光量', '曝光数'] },
      { field: 'extra:coverCtr', synonyms: ['封面点击率'] },
      { field: 'extra:followersGained', synonyms: ['涨粉', '涨粉数'] },
      { field: 'extra:avgWatchSeconds', synonyms: ['人均观看时长', '平均观看时长'] },
    ],
  },
  detectLogin,
  scrape,
  history,
  qrSelectors: ['.login-container .qrcode:has(img.qrcode-img)', 'img.qrcode-img'],
  qrExpired: expiredQrScript(/二维码已?(失效|过期)/),
  identify,
}
