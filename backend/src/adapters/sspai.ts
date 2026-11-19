/**
 * 少数派 adapter: own accounts read through the site's JSON API from a logged-in page. `user/slug/info/get` answers the
 * account totals (关注者, 文章, 充电 received, total reads) and `article/user/public/page/get` the articles with their
 * 充电 and comment counts. Article reads are hidden from the public (always 0); they are kept only when the API gives
 * the logged-in author real numbers.
 */
import type { Page } from 'playwright-core'
import { parseCount, parseDate } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import type { MediaAccount, MediaLoginState } from '../types.ts'
import { asRecord, evaluateScript, gotoPage, sleep, stringField } from './page.ts'
import type { MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields } from './types.ts'

const HOME = 'https://sspai.com/'
const PROFILE_URL = /^https:\/\/sspai\.com\/u\/([^/?#]+)/
const SESSION_COOKIES = ['sspai_jwt_token', 'sspai_cross_token']
const IMAGE_HOST = 'https://cdnfile.sspai.com/'
const PAGE_SIZE = 20

/**
 * The slug of a 少数派 profile URL.
 * @param url - such as `https://sspai.com/u/abc/posts`.
 * @returns the slug, or undefined.
 */
export function sspaiSlugOf(url: string): string | undefined {
  return PROFILE_URL.exec(url.trim())?.[1]
}

/** Images are stored as keys such as `2023/02/24/abc.png` under the CDN host. */
function imageUrl(key: string | undefined): string | undefined {
  if (key === undefined) return undefined
  if (key.startsWith('https://')) return key
  return /^[\w/.-]+\.\w+$/.test(key) ? `${IMAGE_HOST}${key.replace(/^\/+/, '')}` : undefined
}

/** An answer of the API: `{ error: 0, data }` on success. */
function dataOf(json: unknown): unknown {
  const body = asRecord(json)
  return body?.error === 0 ? body.data : undefined
}

/** One 少数派 user as `user/slug/info/get` or `user/info/get` describes it. */
export interface SspaiUser {
  readonly slug: string
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
  readonly snapshot: MediaSnapshotFields
}

/**
 * Read a user answer.
 * @param json - response body.
 * @returns the user, or undefined when the answer failed or holds no slug.
 */
export function parseSspaiUser(json: unknown): SspaiUser | undefined {
  const user = asRecord(dataOf(json))
  const slug = stringField(user, 'slug')
  if (user === undefined || slug === undefined) return undefined
  const extra: Record<string, number> = {}
  const views = parseCount(user.article_view_count)
  if (views !== undefined) extra.totalViews = views
  const words = parseCount(user.articles_word_count)
  if (words !== undefined) extra.words = words
  return {
    slug,
    name: stringField(user, 'nickname'),
    avatarUrl: imageUrl(stringField(user, 'avatar')),
    snapshot: {
      followers: parseCount(user.followed_count),
      following: parseCount(user.following_count),
      likes: parseCount(user.liked_count),
      posts: parseCount(user.released_article_count),
      extra,
    },
  }
}

/** One page of an author's articles. */
export interface SspaiPostPage {
  readonly posts: readonly MediaPostFields[]
  readonly total?: number | undefined
}

/**
 * Read an `article/user/public/page/get` answer. A read count of 0 is the API hiding it, so it is left out.
 * @param json - response body.
 * @returns the articles and the author's total when given.
 */
export function parseSspaiPosts(json: unknown): SspaiPostPage {
  const body = asRecord(json)
  const list = dataOf(json)
  const posts: MediaPostFields[] = []
  for (const item of Array.isArray(list) ? list : []) {
    const article = asRecord(item)
    const id = stringField(article, 'id')
    const title = stringField(article, 'title')
    if (article === undefined || id === undefined || title === undefined) continue
    const views = parseCount(article.view_count)
    const cover = imageUrl(stringField(article, 'banner'))
    const extra: Record<string, number> = {}
    const words = parseCount(article.words_count)
    if (words !== undefined) extra.words = words
    posts.push({
      postId: id,
      title,
      url: `https://sspai.com/post/${id}`,
      publishedAt: parseDate(article.released_time ?? article.created_time),
      format: 'article',
      ...views === undefined || views === 0 ? {} : { views },
      likes: parseCount(article.like_count),
      comments: parseCount(article.comment_count),
      ...cover === undefined ? {} : { coverUrl: cover },
      extra,
    })
  }
  return { posts, total: parseCount(body?.total) }
}

/**
 * Fetch an API path from the page, sending the session token as the site's own pages do: they keep it in local storage
 * (`ssToken`) and in the `sspai_jwt_token` cookie, and send `Authorization: Bearer <token>`.
 */
function apiScript(path: string): string {
  return `(async () => {
    let token = ''
    try { token = localStorage.getItem('ssToken') || '' } catch {}
    if (!token) token = decodeURIComponent((document.cookie.match(/(?:^|; )sspai_jwt_token=([^;]+)/) || [])[1] || '')
    const headers = token ? { Authorization: 'Bearer ' + token } : {}
    const response = await fetch(${JSON.stringify(path)}, { credentials: 'include', headers })
    return response.ok ? await response.json() : { error: response.status }
  })()`
}

async function api(page: Page, path: string): Promise<unknown> {
  return await evaluateScript(page, apiScript(path))
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  const cookies = await page.context().cookies(HOME)
  if (cookies.some(cookie => SESSION_COOKIES.includes(cookie.name) && cookie.value !== '')) return 'logged-in'
  if (!page.url().startsWith(HOME)) return 'unknown'
  // The site writes the token to local storage first and to the cookie right after.
  const stored = await evaluateScript(page, `(() => { try { return localStorage.getItem('ssToken') || '' } catch { return '' } })()`).catch(() => '')
  return typeof stored === 'string' && stored !== '' ? 'logged-in' : 'logged-out'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', '少数派未登录或登录已过期，请在内嵌浏览器中重新登录后重试。')
}

/** Open the site so its API calls go out with the profile's cookies. */
async function openSite(page: Page, signal: AbortSignal): Promise<void> {
  await gotoPage(page, HOME, signal)
  await sleep(1500, signal)
  if (await detectLogin(page) !== 'logged-in') throw loginRequired()
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const slug = sspaiSlugOf(account.profileUrl)
  if (slug === undefined) throw new MediaScrapeError('invalid-profile', '少数派主页链接应形如 https://sspai.com/u/<个性域名>。')
  await openSite(page, limits.signal)
  const user = parseSspaiUser(await api(page, `/api/v1/user/slug/info/get?slug=${encodeURIComponent(slug)}`))
  if (user === undefined) throw new MediaScrapeError('scrape-failed', `没有读到少数派用户 ${slug} 的数据，主页链接可能有误，或接口已变化。`)
  const posts: MediaPostFields[] = []
  for (let offset = 0; posts.length < limits.maxPosts; offset += PAGE_SIZE) {
    const page_ = parseSspaiPosts(await api(page, `/api/v1/article/user/public/page/get?limit=${PAGE_SIZE}&offset=${offset}&slug=${encodeURIComponent(slug)}`))
    posts.push(...page_.posts)
    if (page_.posts.length < PAGE_SIZE || (page_.total !== undefined && offset + PAGE_SIZE >= page_.total)) break
    await sleep(600, limits.signal)
  }
  return { snapshot: user.snapshot, posts: posts.slice(0, limits.maxPosts), avatarUrl: user.avatarUrl }
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  await gotoPage(page, HOME, signal)
  await sleep(1500, signal)
  if (await detectLogin(page) !== 'logged-in') return undefined
  const self = parseSspaiUser(await api(page, '/api/v1/user/info/get'))
  if (self === undefined) return undefined
  return { name: self.name ?? self.slug, profileUrl: `https://sspai.com/u/${self.slug}`, avatarUrl: self.avatarUrl }
}

/** Built-in 少数派 adapter. */
export const sspaiAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'sspai',
    displayName: '少数派',
    loginUrl: 'https://sspai.com/login',
    scrape: true,
    import: false,
    importHint: '',
    profileUrlExample: 'https://sspai.com/u/<个性域名>',
    metrics: { views: '阅读', likes: '充电', comments: '评论' },
    noun: '文章',
    color: '#D71A1B',
    beta: true,
    loginHint: '输入手机号收验证码登录，或点下方的微信图标扫码',
    totals: { posts: '文章数', likes: '获得充电', totalViews: '总阅读' },
  },
  importProfile: { defaultFormat: 'article', columns: [] },
  scrapableRoles: ['own'],
  detectLogin,
  scrape,
  identify,
}
