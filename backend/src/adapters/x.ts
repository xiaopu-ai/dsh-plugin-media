/**
 * X adapter: own accounts read from the logged-in web profile. The profile page asks the GraphQL API for the user
 * (`UserByScreenName`: followers, following, post count) and the timeline (`UserTweets`: every post with its views,
 * likes, replies, reposts, quotes and bookmarks); the adapter keeps those answers while it scrolls. X's web login has
 * no QR code: the user signs in with their own name and password in the login view.
 */
import type { Page, Response } from 'playwright-core'
import { parseCount } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import type { MediaAccount, MediaLoginState, MediaPostFormat } from '../types.ts'
import { asRecord, evaluateScript, gotoPage, hasCookie, sleep, stringField } from './page.ts'
import type { MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields } from './types.ts'

const HOME = 'https://x.com/'
const PROFILE_URL = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/
/** Paths under x.com that are not profiles. */
const RESERVED = new Set(['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search', 'compose', 'login', 'logout', 'tos', 'privacy'])
const SESSION_COOKIES = ['auth_token']

/**
 * The handle of an X profile URL.
 * @param url - profile URL on x.com or twitter.com.
 * @returns the handle as written, or undefined when the URL is not a profile.
 */
export function xHandleOf(url: string): string | undefined {
  const handle = PROFILE_URL.exec(url.trim())?.[1]
  return handle === undefined || RESERVED.has(handle.toLowerCase()) ? undefined : handle
}

/** The user record of a `UserByScreenName` answer, whatever wraps it. */
function userResult(json: unknown): Readonly<Record<string, unknown>> | undefined {
  const result = asRecord(asRecord(asRecord(asRecord(json)?.data)?.user)?.result)
  return result?.__typename === 'User' || asRecord(result?.legacy) !== undefined ? result : undefined
}

/** One X user as the GraphQL API describes it. */
export interface XUser {
  readonly id: string
  readonly handle: string
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
  readonly snapshot: MediaSnapshotFields
}

/**
 * Read a `UserByScreenName` answer. Names and avatars moved from `legacy` to `core` and `avatar` in 2025; both are read.
 * @param json - response body.
 * @returns the user, or undefined when the body holds none.
 */
export function parseXUser(json: unknown): XUser | undefined {
  const user = userResult(json)
  const legacy = asRecord(user?.legacy)
  const core = asRecord(user?.core)
  const id = stringField(user, 'rest_id')
  const handle = stringField(core, 'screen_name') ?? stringField(legacy, 'screen_name')
  if (id === undefined || handle === undefined || legacy === undefined) return undefined
  const avatar = stringField(asRecord(user?.avatar), 'image_url') ?? stringField(legacy, 'profile_image_url_https')
  const extra: Record<string, number> = {}
  const listed = parseCount(legacy.listed_count)
  if (listed !== undefined) extra.listed = listed
  return {
    id,
    handle,
    name: stringField(core, 'name') ?? stringField(legacy, 'name'),
    // `_normal` is a 48 px thumbnail; `_200x200` is the same picture at the size the page shows.
    avatarUrl: avatar?.startsWith('https://') === true ? avatar.replace(/_normal(\.\w+)$/, '_200x200$1') : undefined,
    snapshot: {
      followers: parseCount(legacy.followers_count),
      following: parseCount(legacy.friends_count),
      posts: parseCount(legacy.statuses_count),
      extra,
    },
  }
}

/** The tweet inside a `tweet_results.result`, unwrapping `TweetWithVisibilityResults`. */
function unwrapTweet(value: unknown): Readonly<Record<string, unknown>> | undefined {
  const record = asRecord(value)
  if (record?.__typename === 'TweetWithVisibilityResults') return asRecord(record.tweet)
  return record
}

function formatOf(legacy: Readonly<Record<string, unknown>>): MediaPostFormat {
  const media = asRecord(legacy.extended_entities)?.media ?? asRecord(legacy.entities)?.media
  const types = (Array.isArray(media) ? media : []).map(item => stringField(asRecord(item), 'type'))
  if (types.some(type => type === 'video' || type === 'animated_gif')) return 'video'
  if (types.includes('photo')) return 'image'
  return 'other'
}

/** X prints dates as `Wed Oct 10 20:19:24 +0000 2018`. */
function xDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function coverOf(legacy: Readonly<Record<string, unknown>>): string | undefined {
  const media = asRecord(legacy.extended_entities)?.media ?? asRecord(legacy.entities)?.media
  const first = asRecord(Array.isArray(media) ? media[0] : undefined)
  const url = stringField(first, 'media_url_https')
  return url?.startsWith('https://') === true ? url : undefined
}

/**
 * Read one tweet record as a post of `userId`: reposts of others and posts by other users (quoted, replied to) are
 * skipped.
 * @param value - a `tweet_results.result` value.
 * @param userId - the account's `rest_id`.
 * @param handle - the account's handle, for the post URL.
 * @returns the post, or undefined.
 */
export function parseXTweet(value: unknown, userId: string, handle: string): MediaPostFields | undefined {
  const tweet = unwrapTweet(value)
  const legacy = asRecord(tweet?.legacy)
  const id = stringField(tweet, 'rest_id')
  if (legacy === undefined || id === undefined) return undefined
  if (stringField(legacy, 'user_id_str') !== userId || legacy.retweeted_status_result !== undefined) return undefined
  const long = stringField(asRecord(asRecord(asRecord(tweet?.note_tweet)?.note_tweet_results)?.result), 'text')
  const text = (long ?? stringField(legacy, 'full_text') ?? '').replace(/\s*https:\/\/t\.co\/\w+\s*$/, '').replace(/\s+/g, ' ').trim()
  const extra: Record<string, number> = {}
  const quotes = parseCount(legacy.quote_count)
  if (quotes !== undefined) extra.quotes = quotes
  const cover = coverOf(legacy)
  return {
    postId: id,
    title: text === '' ? '（图片或视频）' : text.length > 120 ? `${text.slice(0, 119)}…` : text,
    url: `https://x.com/${handle}/status/${id}`,
    publishedAt: xDate(legacy.created_at),
    format: formatOf(legacy),
    views: parseCount(stringField(asRecord(tweet?.views), 'count')),
    likes: parseCount(legacy.favorite_count),
    comments: parseCount(legacy.reply_count),
    shares: parseCount(legacy.retweet_count),
    collects: parseCount(legacy.bookmark_count),
    ...cover === undefined ? {} : { coverUrl: cover },
    extra,
  }
}

/**
 * Collect the account's own posts from a `UserTweets` answer. The timeline nests tweets in entries, pinned entries and
 * conversation modules whose layout X changes from time to time, so every `tweet_results.result` is searched for.
 * @param json - response body.
 * @param userId - the account's `rest_id`.
 * @param handle - the account's handle.
 * @returns the posts, and whether the answer held a bottom cursor (more to load).
 */
export function parseXTimeline(json: unknown, userId: string, handle: string): { posts: MediaPostFields[]; hasMore: boolean } {
  const posts = new Map<string, MediaPostFields>()
  let hasMore = false
  const visit = (value: unknown, depth: number): void => {
    if (depth > 24 || value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    const record = value as Record<string, unknown>
    if (record.cursorType === 'Bottom') hasMore = true
    const results = asRecord(record.tweet_results)?.result
    if (results !== undefined) {
      const post = parseXTweet(results, userId, handle)
      if (post !== undefined) posts.set(post.postId, post)
    }
    for (const [key, item] of Object.entries(record)) if (key !== 'tweet_results') visit(item, depth + 1)
  }
  visit(json, 0)
  return { posts: [...posts.values()], hasMore }
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  if (await hasCookie(page, HOME, SESSION_COOKIES)) return 'logged-in'
  const url = page.url()
  return url.startsWith(HOME) || url.startsWith('https://twitter.com/') ? 'logged-out' : 'unknown'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', 'X 未登录或登录已过期，请在内嵌浏览器中重新登录后重试。')
}

const GRAPHQL = /\/i\/api\/graphql\/[^/]+\/(UserByScreenName|UserTweets)\b/

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const handle = xHandleOf(account.profileUrl)
  if (handle === undefined) throw new MediaScrapeError('invalid-profile', 'X 主页链接应形如 https://x.com/<用户名>。')
  if (!await hasCookie(page, HOME, SESSION_COOKIES)) throw loginRequired()
  let user: XUser | undefined
  const answers: unknown[] = []
  let pending = 0
  const onResponse = (response: Response): void => {
    const name = GRAPHQL.exec(response.url())?.[1]
    if (name === undefined) return
    pending++
    response.json().then((json: unknown) => {
      if (name === 'UserByScreenName') {
        const found = parseXUser(json)
        if (found !== undefined && found.handle.toLowerCase() === handle.toLowerCase()) user = found
      } else {
        answers.push(json)
      }
    }).catch(() => {
      // A rate-limited or empty answer carries no data.
    }).finally(() => { pending-- })
  }
  const posts = new Map<string, MediaPostFields>()
  const read = (): boolean => {
    if (user === undefined) return true
    let more = false
    for (const json of answers.splice(0)) {
      const timeline = parseXTimeline(json, user.id, user.handle)
      for (const post of timeline.posts) posts.set(post.postId, post)
      more = more || timeline.hasMore
    }
    return more
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, `https://x.com/${handle}`, limits.signal)
    for (let waited = 0; waited < 20 && (user === undefined || answers.length === 0); waited++) await sleep(1000, limits.signal)
    if (!await hasCookie(page, HOME, SESSION_COOKIES) || new URL(page.url()).pathname.startsWith('/i/flow/login')) throw loginRequired()
    read()
    for (let round = 0; round < 12 && posts.size < limits.maxPosts; round++) {
      const before = posts.size
      await page.mouse.wheel(0, 6000)
      await sleep(2000, limits.signal)
      read()
      if (posts.size === before && pending === 0) break
    }
  } finally {
    page.off('response', onResponse)
  }
  if (user === undefined) {
    throw new MediaScrapeError('scrape-failed', `没有在 X 主页 @${handle} 上读到粉丝等数据，页面可能要求验证或结构已变化；可在内嵌浏览器中打开 X 查看。`)
  }
  const sorted = [...posts.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  return { snapshot: user.snapshot, posts: sorted.slice(0, limits.maxPosts), avatarUrl: user.avatarUrl }
}

/** The handle in the side bar's profile link, the account switcher's name and avatar. */
const SELF_SCRIPT = `(() => {
  const link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')
  const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
  const avatar = switcher ? switcher.querySelector('img[src^="https://"]') : null
  const name = switcher ? [...switcher.querySelectorAll('span')].map(span => span.textContent.trim()).find(text => text && !text.startsWith('@')) : ''
  return { href: link ? link.getAttribute('href') : '', name: name || '', avatar: avatar ? avatar.getAttribute('src') : '' }
})()`

/**
 * Read the logged-in account from the side bar of x.com.
 * @param capture - what `SELF_SCRIPT` returned.
 * @returns name, profile URL and avatar, or undefined when the side bar shows no profile link.
 */
export function parseXSelf(capture: unknown): MediaIdentityFields | undefined {
  const record = asRecord(capture)
  const handle = xHandleOf(`https://x.com${stringField(record, 'href') ?? ''}`)
  if (handle === undefined) return undefined
  const avatar = stringField(record, 'avatar')
  return {
    name: stringField(record, 'name') ?? `@${handle}`,
    profileUrl: `https://x.com/${handle}`,
    avatarUrl: avatar?.startsWith('https://') === true ? avatar.replace(/_normal(\.\w+)$/, '_200x200$1') : undefined,
  }
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  if (!await hasCookie(page, HOME, SESSION_COOKIES)) return undefined
  await gotoPage(page, 'https://x.com/home', signal)
  for (let waited = 0; waited < 20; waited++) {
    const self = parseXSelf(await evaluateScript(page, SELF_SCRIPT))
    if (self !== undefined) return self
    await sleep(1000, signal)
  }
  return undefined
}

/** Built-in X adapter. */
export const xAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'x',
    displayName: 'X',
    loginUrl: 'https://x.com/i/flow/login',
    scrape: true,
    import: false,
    importHint: '',
    profileUrlExample: 'https://x.com/<用户名>',
    metrics: { views: '查看', likes: '喜欢', comments: '回复', shares: '转帖', collects: '书签' },
    noun: '帖子',
    // X's own black would vanish from charts in dark mode; its secondary grey shows in both.
    color: '#71767B',
    beta: true,
    loginHint: '在窗口里输入 X 的用户名和密码登录',
    totals: { posts: '帖子数', following: '正在关注' },
  },
  importProfile: { defaultFormat: 'other', columns: [] },
  scrapableRoles: ['own'],
  detectLogin,
  scrape,
  identify,
}
