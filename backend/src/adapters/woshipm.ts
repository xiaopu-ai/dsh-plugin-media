/**
 * 人人都是产品经理 adapter: own accounts read from the site while logged in. `api2/user/profile` answers the account
 * totals (粉丝, 文章, total 浏览, 点赞, 评论 and 收藏 over all articles); the author page `/u/<uid>` lists the articles
 * a page at a time (`/u/<uid>/page/<n>`, WordPress pagination) with each one's 浏览 and 收藏. The list is read from the
 * pages as the server sends them: in the open page the site's scripts redraw it, and the drawn page held no cards.
 * Each update also reads the site's 日榜, 周榜 and 月榜 (`api2/app/article/popular/<daily|weekly|monthly>`) and the
 * home page's recommended slots, and marks the account's articles found there.
 */
import type { Page } from 'playwright-core'
import { parseCount, parseDate } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import type { MediaAccount, MediaLoginState, MediaPostBadge } from '../types.ts'
import { asRecord, evaluateScript, gotoPage, openLoginScript, sleep, stringField } from './page.ts'
import type { MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields } from './types.ts'

const HOME = 'https://www.woshipm.com/'
const PROFILE_URL = /^https:\/\/(?:www\.)?woshipm\.com\/u\/(\d+)/
/** Author pages read per update; a page lists 10 articles. */
const MAX_PAGES = 12
/** The site's rankings, as its home page names them. */
const RANKINGS = [['daily', '日榜'], ['weekly', '周榜'], ['monthly', '月榜']] as const

/**
 * The user id of a 人人都是产品经理 profile URL.
 * @param url - such as `https://www.woshipm.com/u/12345`.
 * @returns the id, or undefined.
 */
export function woshipmUidOf(url: string): string | undefined {
  return PROFILE_URL.exec(url.trim())?.[1]
}

/** One user as `api2/user/profile` describes it. */
export interface WoshipmUser {
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
  readonly snapshot: MediaSnapshotFields
}

/**
 * Read an `api2/user/profile?uid=` answer.
 * @param json - response body.
 * @returns the user, or undefined when the body holds none.
 */
export function parseWoshipmProfile(json: unknown): WoshipmUser | undefined {
  const result = asRecord(asRecord(json)?.RESULT)
  const info = asRecord(result?.userInfoVo)
  const articles = asRecord(result?.userArticleCountVo)
  const common = asRecord(result?.userCommonCountVo)
  if (info === undefined && articles === undefined && common === undefined) return undefined
  const extra: Record<string, number> = {}
  for (const [key, field] of [['totalViews', 'newsViewCountInt'], ['totalComments', 'newsCommentCountInt'], ['totalCollects', 'newsFavoritesCountInt']] as const) {
    const value = parseCount(articles?.[field])
    if (value !== undefined) extra[key] = value
  }
  const avatar = stringField(info, 'avartar') ?? stringField(info, 'avatar')
  return {
    name: stringField(info, 'nickName'),
    avatarUrl: avatar?.replace(/^http:\/\//, 'https://').startsWith('https://') === true ? avatar.replace(/^http:\/\//, 'https://') : undefined,
    snapshot: {
      followers: parseCount(common?.fansCount),
      following: parseCount(common?.attentionUserCount),
      likes: parseCount(articles?.articalPraiseCount) ?? parseCount(common?.praiseCount),
      posts: parseCount(articles?.articalCount),
      extra,
    },
  }
}

const decode = (text: string): string => text
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim()

/** One page of the author page's article list. */
export interface WoshipmPostPage {
  readonly posts: readonly MediaPostFields[]
  /** Whether the page links a next page. */
  readonly hasMore: boolean
}

/**
 * Read the article cards (`div.post--card[data-id]`) of an author page.
 * @param html - the page's HTML.
 * @returns the articles in page order, and whether a next page exists.
 */
export function parseWoshipmAuthorPage(html: string): WoshipmPostPage {
  const posts: MediaPostFields[] = []
  const cards = html.split(/<div class="post--card\b/).slice(1)
  for (const card of cards) {
    const id = /data-id="(\d+)"/.exec(card)?.[1]
    const link = /<h2 class="post--card__title">\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(card)
    if (id === undefined || link === null) continue
    const title = decode(link[2] ?? '')
    if (title === '') continue
    const meta = /<div class="stream-list-meta">([\s\S]*?)<\/div>/.exec(card)?.[1] ?? ''
    const count = (label: string): number | undefined => {
      const match = new RegExp(`<span>\\s*([\\d.,]+\\s*[万wWkK]?)\\s*${label}\\s*</span>`).exec(meta)
      return match === null ? undefined : parseCount(match[1])
    }
    const cover = /<div class="post--card__img">[\s\S]*?<img[^>]*src="(https:\/\/[^"]+)"/.exec(card)?.[1]
    posts.push({
      postId: id,
      title,
      url: (link[1] ?? '').replace(/^http:\/\//, 'https://'),
      publishedAt: parseDate(/<time>([^<]+)<\/time>/.exec(meta)?.[1]),
      format: 'article',
      views: count('浏览'),
      collects: count('收藏'),
      ...cover === undefined ? {} : { coverUrl: cover },
      extra: {},
    })
  }
  return { posts, hasMore: /class="next page-numbers"/.test(html) }
}

/**
 * Read a ranking answer (`api2/app/article/popular/<period>`): `RESULT` lists the articles in ranking order, each as
 * `{ data: { id } }`.
 * @param json - response body.
 * @returns the article ids, first place first.
 */
export function parseWoshipmRanking(json: unknown): string[] {
  const list = asRecord(json)?.RESULT
  return (Array.isArray(list) ? list : []).flatMap(item => {
    const id = stringField(asRecord(asRecord(item)?.data), 'id')
    return id === undefined ? [] : [id]
  })
}

/**
 * The articles in a slot of the home page's banner, as the site's script loads it
 * (`server.woshipm.com/api/v1/advert/feed?position_ids=32` for the big slider, `34` for the small one): `result` lists
 * the slides, articles among them linking `woshipm.com/<category>/<id>.html`.
 * @param json - response body.
 * @returns the article ids shown there.
 */
export function parseWoshipmHomeSlots(json: unknown): string[] {
  const list = asRecord(json)?.result
  return (Array.isArray(list) ? list : []).flatMap(item => {
    const id = /^https?:\/\/(?:www\.)?woshipm\.com\/[\w-]+\/(\d+)\.html/.exec(stringField(asRecord(item), 'url') ?? '')?.[1]
    return id === undefined ? [] : [id]
  })
}

/**
 * Marks of the account's articles: a place on each ranking it is on, and a home page slot.
 * @param rankings - each ranking's article ids in order, by period.
 * @param homeSlots - ids in the home page's recommended slots.
 * @returns the marks by article id.
 */
export function woshipmBadges(rankings: Readonly<Record<string, readonly string[]>>, homeSlots: readonly string[]): Map<string, MediaPostBadge[]> {
  const marks = new Map<string, MediaPostBadge[]>()
  const add = (id: string, badge: MediaPostBadge): void => { marks.set(id, [...marks.get(id) ?? [], badge]) }
  for (const [period, label] of RANKINGS) {
    for (const [index, id] of (rankings[period] ?? []).entries()) add(id, { key: `rank:${period}`, label, rank: index + 1 })
  }
  for (const id of new Set(homeSlots)) add(id, { key: 'home', label: '首页推荐位' })
  return marks
}

/**
 * The signed-in user: every page sets the global `PURE` with `is_user_logged_in` and `user_id` (0 when signed out),
 * which the site's own scripts read; the header's profile link, nickname and avatar, and whether it offers 登录, are
 * the fallback.
 */
const SELF_SCRIPT = `(() => {
  const pure = window.PURE && typeof window.PURE === 'object' ? window.PURE : undefined
  const header = document.querySelector('header') || document.body
  const link = [...header.querySelectorAll('a[href*="/u/"]')].find(a => /\\/u\\/\\d+/.test(a.getAttribute('href') || ''))
  const avatar = header.querySelector('img[src*="avatar"], .user-avatar img, .avatar img')
  const loginOffered = [...header.querySelectorAll('a, span, div, button')].some(el => el.children.length === 0 && /^\\s*(注册\\s*\\|\\s*)?登录\\s*$/.test(el.textContent || ''))
  return {
    pureLoggedIn: pure ? (pure.is_user_logged_in === true || pure.is_user_logged_in === 1 || pure.is_user_logged_in === '1') : null,
    pureUid: pure && pure.user_id ? String(pure.user_id) : '',
    href: link ? link.href : '', name: link ? (link.getAttribute('title') || link.textContent || '').trim() : '', avatar: avatar ? avatar.src : '', loginOffered,
  }
})()`

interface SelfCapture {
  readonly uid?: string | undefined
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
  /** Whether the page says it is signed in; undefined when it does not say. */
  readonly loggedIn?: boolean | undefined
}

/**
 * Read what `SELF_SCRIPT` returned.
 * @param capture - script result.
 * @returns the signed-in user id and state, as far as the page tells.
 */
export function readWoshipmSelf(capture: unknown): SelfCapture {
  const record = asRecord(capture)
  const avatar = stringField(record, 'avatar')
  const pureUid = stringField(record, 'pureUid')
  const uid = pureUid !== undefined && /^[1-9]\d*$/.test(pureUid) ? pureUid : woshipmUidOf(stringField(record, 'href') ?? '')
  const pure = record?.pureLoggedIn
  return {
    uid,
    name: stringField(record, 'name'),
    avatarUrl: avatar?.startsWith('https://') === true ? avatar : undefined,
    loggedIn: typeof pure === 'boolean' ? pure && uid !== undefined : uid !== undefined ? true : record?.loginOffered === true ? false : undefined,
  }
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  if (!page.url().startsWith(HOME)) return 'unknown'
  const self = readWoshipmSelf(await evaluateScript(page, SELF_SCRIPT).catch(() => undefined))
  return self.loggedIn === undefined ? 'unknown' : self.loggedIn ? 'logged-in' : 'logged-out'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', '人人都是产品经理未登录或登录已过期，请在内嵌浏览器中用微信扫码登录后重试。')
}

async function fetchText(page: Page, path: string): Promise<string> {
  const text = await evaluateScript(page, `fetch(${JSON.stringify(path)}, { credentials: 'include' }).then(r => r.ok ? r.text() : '').catch(() => '')`)
  return typeof text === 'string' ? text : ''
}

async function fetchJson(page: Page, path: string): Promise<unknown> {
  return await evaluateScript(page, `fetch(${JSON.stringify(path)}, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null)`)
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const uid = woshipmUidOf(account.profileUrl)
  if (uid === undefined) throw new MediaScrapeError('invalid-profile', '人人都是产品经理主页链接应形如 https://www.woshipm.com/u/<数字ID>。')
  await gotoPage(page, `${HOME}u/${uid}`, limits.signal)
  await sleep(1500, limits.signal)
  if (await detectLogin(page) === 'logged-out') throw loginRequired()
  const user = parseWoshipmProfile(await fetchJson(page, `/api2/user/profile?uid=${uid}`))
  if (user === undefined) throw new MediaScrapeError('scrape-failed', `没有读到人人都是产品经理用户 ${uid} 的数据，主页链接可能有误，或接口已变化。`)
  const posts = new Map<string, MediaPostFields>()
  for (let number = 1; number <= MAX_PAGES && posts.size < limits.maxPosts; number++) {
    if (number > 1) await sleep(800, limits.signal)
    const result = parseWoshipmAuthorPage(await fetchText(page, number === 1 ? `/u/${uid}` : `/u/${uid}/page/${number}`))
    for (const post of result.posts) posts.set(post.postId, post)
    if (!result.hasMore || result.posts.length === 0) break
  }
  if (posts.size === 0 && (user.snapshot.posts ?? 0) > 0) {
    throw new MediaScrapeError('scrape-failed', `人人都是产品经理显示有 ${String(user.snapshot.posts)} 篇文章，但作者主页上没有读到文章列表，页面结构可能已变化。`)
  }
  const marks = woshipmBadges(await readRankings(page, limits.signal), await readHomeSlots(page))
  const listed = [...posts.values()].slice(0, limits.maxPosts).map(post => ({ ...post, badges: marks.get(post.postId) ?? [] }))
  return { snapshot: user.snapshot, posts: listed, avatarUrl: user.avatarUrl }
}

/** The home page banner's two sliders; like the rankings, one that fails to load counts as empty. */
async function readHomeSlots(page: Page): Promise<string[]> {
  const ids: string[] = []
  for (const position of [32, 34]) {
    const json = await evaluateScript(page, `fetch('https://server.woshipm.com/api/v1/advert/feed?position_ids=${String(position)}').then(r => r.ok ? r.json() : null).catch(() => null)`).catch(() => null)
    ids.push(...parseWoshipmHomeSlots(json))
  }
  return ids
}

/** The site's three rankings; one that fails to load counts as empty, so a ranking never fails an update. */
async function readRankings(page: Page, signal: AbortSignal): Promise<Record<string, string[]>> {
  const rankings: Record<string, string[]> = {}
  for (const [period] of RANKINGS) {
    rankings[period] = parseWoshipmRanking(await fetchJson(page, `/api2/app/article/popular/${period}`).catch(() => null))
    await sleep(300, signal)
  }
  return rankings
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  await gotoPage(page, HOME, signal)
  for (let waited = 0; waited < 10; waited++) {
    await sleep(1000, signal)
    const self = readWoshipmSelf(await evaluateScript(page, SELF_SCRIPT))
    if (self.loggedIn === false && waited >= 3) return undefined
    if (self.uid === undefined) continue
    const profile = parseWoshipmProfile(await fetchJson(page, `/api2/user/profile?uid=${self.uid}`))
    return {
      name: profile?.name ?? self.name ?? `人人都是产品经理用户 ${self.uid}`,
      profileUrl: `${HOME}u/${self.uid}`,
      avatarUrl: profile?.avatarUrl ?? self.avatarUrl,
    }
  }
  return undefined
}

/** Built-in 人人都是产品经理 adapter. */
export const woshipmAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'woshipm',
    displayName: '人人都是产品经理',
    loginUrl: HOME,
    scrape: true,
    import: false,
    importHint: '',
    profileUrlExample: 'https://www.woshipm.com/u/<数字ID>',
    metrics: { views: '浏览', collects: '收藏' },
    noun: '文章',
    color: '#2F6BFF',
    beta: true,
    scanApp: '微信',
    totals: { posts: '文章数', likes: '被赞', totalViews: '总阅读', totalComments: '总评论', totalCollects: '总收藏' },
    marks: '每次更新时看一遍人人都是产品经理的日榜、周榜、月榜和首页顶部的推荐位，你的文章在上面就记下来（记最好的名次）。只有插件看到时才记得到：两次更新之间上榜又下榜的，这里没有。',
  },
  importProfile: { defaultFormat: 'article', columns: [] },
  scrapableRoles: ['own'],
  maxPosts: 100,
  detectLogin,
  scrape,
  identify,
  // The header's 「注册 | 登录」 opens a card whose 「立即登录」 opens a dialog; its iframe (passport.woshipm.com) shows
  // the WeChat QR code.
  openLogin: openLoginScript([{ selector: 'button.login-guide-login-button' }, { text: /^注册\s*\|\s*登录$/ }], { selector: 'iframe[src*="passport.woshipm.com"]' }),
  // The code is WeChat's own image in that iframe; the page also carries QR codes of the site's App and groups.
  qrSelectors: ['img[src*="showqrcode"]'],
}
