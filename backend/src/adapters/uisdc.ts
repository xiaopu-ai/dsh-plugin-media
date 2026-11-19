/**
 * 优设 adapter: own accounts read from the site while logged in. The author page `/u/<id>/publish/all` lists the
 * articles (title, link, date, cover, and `data-jingxuan` for 精选) a page at a time (`…/page/<n>`, 下一页 links the
 * next); `ajax.php?action=get_user_stats` answers the totals the page header shows (发布, 人气, and 粉丝 to the account
 * itself). The counters of each article are on its own page: 阅读 (rounded to 0.1k / 0.1万; some articles show none),
 * 点赞 and 收藏 (`data-count` of the buttons), 评论, the exact publish time (the `title` of its date) and the author's
 * follower count on the follow button.
 */
import type { Page } from 'playwright-core'
import { parseCount, parseDate } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import type { MediaAccount, MediaLoginState } from '../types.ts'
import { asRecord, evaluateScript, gotoPage, openLoginScript, sleep, stringField } from './page.ts'
import type { MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult, MediaSnapshotFields } from './types.ts'

const HOME = 'https://www.uisdc.com/'
const PROFILE_URL = /^https:\/\/(?:www\.)?uisdc\.com\/u\/(\d+)/
/** Author list pages read per update; a page lists 25 articles. */
const LIST_PAGES = 4
/** Article pages fetched at once. */
const ARTICLE_BATCH = 4

/**
 * The user id of a 优设 profile URL.
 * @param url - such as `https://www.uisdc.com/u/14/publish/all`.
 * @returns the id, or undefined.
 */
export function uisdcUidOf(url: string): string | undefined {
  return PROFILE_URL.exec(url.trim())?.[1]
}

const text = (html: string): string => html
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim()

/** What an author page shows. */
export interface UisdcAuthorPage {
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
  readonly snapshot: MediaSnapshotFields
  /** Articles without counters, newest first. */
  readonly posts: readonly MediaPostFields[]
  readonly hasMore: boolean
}

/** A labelled number of the author header, written `<strong>58</strong><i>文章</i>` or `文章 58`. */
function headerCount(html: string, label: string): number | undefined {
  const strong = new RegExp(`<strong>\\s*([\\d.,]+\\s*[万wWkK]?)\\s*</strong>\\s*<i>\\s*${label}\\s*</i>`).exec(html)
  if (strong !== null) return parseCount(strong[1])
  const inline = new RegExp(`>\\s*${label}\\s*([\\d.,]+\\s*[万wWkK]?)\\s*<`).exec(html)
  return inline === null ? undefined : parseCount(inline[1])
}

/**
 * Read an author page: the header totals and the article list items (`div.item-wrap` with `h2.item-title`).
 * @param html - the page's HTML.
 * @returns the author and the listed articles.
 */
export function parseUisdcAuthorPage(html: string): UisdcAuthorPage {
  const posts: MediaPostFields[] = []
  const chunks = html.split(/<div class="item-wrap\b/)
  for (const [index, item] of chunks.entries()) {
    if (index === 0) continue
    // The item's own element, ending the chunk before, carries data-jingxuan: empty, or set when the site featured it.
    const featured = /data-jingxuan="([^"]*)"[^>]*>\s*$/.exec((chunks[index - 1] ?? '').slice(-600))?.[1]?.trim() ?? ''
    const link = /<h2 class="item-title">\s*<a href="(https:\/\/www\.uisdc\.com\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/.exec(item)
    if (link === null) continue
    const title = text(link[2] ?? '')
    const url = link[1] ?? ''
    if (title === '' || url === '') continue
    const cover = /background-image:\s*url\((?:&quot;|["'])?(https:\/\/[^"')&]+)/.exec(item)?.[1]
    posts.push({
      postId: url.replace(/^https:\/\/www\.uisdc\.com\//, ''),
      title,
      url,
      publishedAt: parseDate(/<span class="meta-item meta-time"[^>]*>([^<]+)</.exec(item)?.[1]),
      format: 'article',
      ...cover === undefined ? {} : { coverUrl: cover },
      extra: {},
      badges: featured === '' || featured === '0' ? [] : [{ key: 'featured', label: '精选' }],
    })
  }
  const extra: Record<string, number> = {}
  const popularity = headerCount(html, '人气')
  if (popularity !== undefined) extra.totalViews = popularity
  const avatar = /<div class="author-avatar[^"]*"[\s\S]{0,400}?(?:src="|url\()(https:\/\/[^"')]+)/.exec(html)?.[1]
  const name = /<h1 class="author-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? /<title>([^<-]+?)\s*-\s*设计师主页/.exec(html)?.[1]
  return {
    name: name === undefined ? undefined : text(name) || undefined,
    avatarUrl: avatar,
    snapshot: { followers: headerCount(html, '粉丝'), posts: headerCount(html, '文章'), extra },
    posts,
    hasMore: /class="next page-numbers"|class="next"|class="fy fy-next"/.test(html),
  }
}

/** The header totals as `ajax.php?action=get_user_stats` answers them. */
export interface UisdcStats {
  readonly posts?: number | undefined
  readonly views?: number | undefined
  /** Followers; the site answers them to the account itself only, else 0. */
  readonly followers?: number | undefined
}

/**
 * Read a `get_user_stats` answer: `{ error: 0, data: { publish, views, followed } }`.
 * @param json - response body.
 * @returns the totals; a follower count of 0 is left out, since the site answers 0 to anyone but the account itself.
 */
export function parseUisdcStats(json: unknown): UisdcStats {
  const body = asRecord(json)
  const data = body?.error === 0 ? asRecord(body.data) : undefined
  const followers = parseCount(data?.followed)
  return { posts: parseCount(data?.publish), views: parseCount(data?.views), followers: followers === 0 ? undefined : followers }
}

/** What one article page shows. */
export interface UisdcArticleCounts {
  readonly views?: number | undefined
  readonly likes?: number | undefined
  readonly collects?: number | undefined
  readonly comments?: number | undefined
  /** The exact publish time; the author list gives the day only. */
  readonly publishedAt?: string | undefined
  /** The author's followers, from the follow button of the author box. */
  readonly followers?: number | undefined
}

/**
 * Read an article page. 阅读 is missing on some articles: the site shows none there.
 * @param html - the article page's HTML.
 * @param uid - the author's id, to find the author's follow button.
 * @returns what the page showed.
 */
export function parseUisdcArticle(html: string, uid?: string): UisdcArticleCounts {
  const views = /<span class="meta-item meta-views">\s*阅读\s*([\d.,]+\s*[万wWkK]?)\s*<\/span>/.exec(html)?.[1]
  const likes = /class="[^"]*\bbtn-zan\b[^"]*"\s+data-count="(\d+)"/.exec(html)?.[1]
  const collects = /class="[^"]*\bbtn-fav\b[^"]*"\s+data-count="(\d+)"/.exec(html)?.[1]
  const comments = /<h2 class="comment-title">[\s\S]{0,200}?<em class="count">(\d+)<\/em>\s*条评论/.exec(html)?.[1]
  const time = /<span class="meta-item meta-time" title="(\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?)"/.exec(html)?.[1]
  const follow = uid === undefined ? undefined
    : [...html.matchAll(/<span[^>]*data-component="follow"[^>]*>/g)].map(match => match[0]).find(tag => tag.includes(`data-uid="${uid}"`))
  return {
    views: parseCount(views), likes: parseCount(likes), collects: parseCount(collects), comments: parseCount(comments),
    publishedAt: parseDate(time), followers: parseCount(follow === undefined ? undefined : /data-count="(\d+)"/.exec(follow)?.[1]),
  }
}

/**
 * The signed-in user, as the site's own scripts find it: a token `uisdcjwt` in local storage or a cookie, sent as
 * `Authorization: Bearer` to `/api/v1/user/mine`, which answers `data.id`, `nickname` and `avatar`. Without a token the
 * header's login panel shows `.notlogin`.
 */
const SELF_SCRIPT = `(async () => {
  let token = ''
  try { token = localStorage.getItem('uisdcjwt') || '' } catch {}
  if (!token) token = decodeURIComponent((document.cookie.match(/(?:^|; )uisdcjwt=([^;]+)/) || [])[1] || '')
  const notLogin = !!document.querySelector('.login-panel .notlogin')
  if (!token) return { token: false, notLogin }
  try {
    const response = await fetch('/api/v1/user/mine', { credentials: 'include', headers: { Authorization: 'Bearer ' + token } })
    return { token: true, notLogin, mine: response.ok ? await response.json() : null }
  } catch {
    return { token: true, notLogin, mine: null }
  }
})()`

/** The signed-in user as far as the page tells. */
export interface UisdcSelf {
  readonly state: MediaLoginState
  readonly uid?: string | undefined
  readonly name?: string | undefined
  readonly avatarUrl?: string | undefined
}

/**
 * Read what `SELF_SCRIPT` returned.
 * @param capture - script result.
 * @returns the login state, and the user when `/api/v1/user/mine` answered one.
 */
export function readUisdcSelf(capture: unknown): UisdcSelf {
  const record = asRecord(capture)
  const user = asRecord(asRecord(record?.mine)?.data)
  const id = stringField(user, 'id')
  const avatar = stringField(user, 'avatar')
  if (id !== undefined && /^[1-9]\d*$/.test(id)) {
    return { state: 'logged-in', uid: id, name: stringField(user, 'nickname'), avatarUrl: avatar?.startsWith('https://') === true ? avatar : undefined }
  }
  if (record?.token === true) return { state: 'logged-in' }
  return { state: record?.notLogin === true || record?.token === false ? 'logged-out' : 'unknown' }
}

async function readSelf(page: Page): Promise<UisdcSelf> {
  return readUisdcSelf(await evaluateScript(page, SELF_SCRIPT).catch(() => undefined))
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  if (!page.url().startsWith(HOME)) return 'unknown'
  const cookies = await page.context().cookies(HOME)
  if (cookies.some(cookie => cookie.name === 'uisdcjwt' && cookie.value !== '')) return 'logged-in'
  const stored = await evaluateScript(page, `(() => {
    let token = ''
    try { token = localStorage.getItem('uisdcjwt') || '' } catch {}
    return { token: token !== '', notLogin: !!document.querySelector('.login-panel .notlogin') }
  })()`).catch(() => undefined)
  const record = asRecord(stored)
  if (record?.token === true) return 'logged-in'
  return record?.notLogin === true ? 'logged-out' : 'unknown'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', '优设未登录或登录已过期，请在内嵌浏览器中用微信扫码登录后重试。')
}

async function fetchText(page: Page, url: string): Promise<string> {
  const value = await evaluateScript(page, `fetch(${JSON.stringify(url)}, { credentials: 'include' }).then(r => r.ok ? r.text() : '').catch(() => '')`)
  return typeof value === 'string' ? value : ''
}

/** Fetch several pages at once; one that fails reads as empty. */
async function fetchTexts(page: Page, urls: readonly string[]): Promise<string[]> {
  const value = await evaluateScript(page, `Promise.all(${JSON.stringify(urls)}.map(url => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.text() : '').catch(() => '')))`)
  return Array.isArray(value) ? urls.map((_, index) => typeof value[index] === 'string' ? value[index] : '') : urls.map(() => '')
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  const uid = uisdcUidOf(account.profileUrl)
  if (uid === undefined) throw new MediaScrapeError('invalid-profile', '优设主页链接应形如 https://www.uisdc.com/u/<数字ID>。')
  await gotoPage(page, `${HOME}u/${uid}/publish/all`, limits.signal)
  await sleep(1500, limits.signal)
  if (await detectLogin(page) === 'logged-out') throw loginRequired()
  const html = await evaluateScript(page, 'document.documentElement.outerHTML')
  const author = parseUisdcAuthorPage(typeof html === 'string' ? html : '')
  const listed = new Map(author.posts.map(post => [post.postId, post]))
  for (let number = 2, more = author.hasMore; more && number <= LIST_PAGES && listed.size < limits.maxPosts; number++) {
    await sleep(600, limits.signal)
    const next = parseUisdcAuthorPage(await fetchText(page, `${HOME}u/${uid}/publish/all/page/${String(number)}`))
    for (const post of next.posts) if (!listed.has(post.postId)) listed.set(post.postId, post)
    more = next.hasMore && next.posts.length > 0
  }
  const stats = parseUisdcStats(await evaluateScript(page, `fetch('/ajax.php?action=get_user_stats&uid=${uid}', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null)`).catch(() => null))
  if (stats.posts === undefined && author.snapshot.posts === undefined && listed.size === 0) {
    throw new MediaScrapeError('scrape-failed', `没有在优设主页 ${uid} 上读到文章，主页链接可能有误，或页面结构已变化。`)
  }
  const posts: MediaPostFields[] = []
  let followers = stats.followers
  const wanted = [...listed.values()].slice(0, limits.maxPosts)
  for (let start = 0; start < wanted.length; start += ARTICLE_BATCH) {
    const batch = wanted.slice(start, start + ARTICLE_BATCH)
    const pages = await fetchTexts(page, batch.map(post => post.url ?? ''))
    for (const [index, post] of batch.entries()) {
      const counts = parseUisdcArticle(pages[index] ?? '', uid)
      followers ??= counts.followers
      posts.push({ ...post, views: counts.views, likes: counts.likes, collects: counts.collects, comments: counts.comments, publishedAt: counts.publishedAt ?? post.publishedAt })
    }
    await sleep(400, limits.signal)
  }
  const extra = { ...author.snapshot.extra, ...stats.views === undefined ? {} : { totalViews: stats.views } }
  const snapshot: MediaSnapshotFields = { ...author.snapshot, posts: stats.posts ?? author.snapshot.posts, followers: followers ?? author.snapshot.followers, extra }
  return { snapshot, posts, avatarUrl: author.avatarUrl }
}

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  await gotoPage(page, HOME, signal)
  for (let waited = 0; waited < 10; waited++) {
    await sleep(1000, signal)
    const self = await readSelf(page)
    if (self.state === 'logged-out' && waited >= 3) return undefined
    if (self.uid === undefined) continue
    const profileUrl = `${HOME}u/${self.uid}/publish/all`
    const author = parseUisdcAuthorPage(await fetchText(page, profileUrl))
    return { name: self.name ?? author.name ?? `优设用户 ${self.uid}`, profileUrl, avatarUrl: self.avatarUrl ?? author.avatarUrl }
  }
  return undefined
}

/** Built-in 优设 adapter. */
export const uisdcAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'uisdc',
    displayName: '优设',
    loginUrl: HOME,
    scrape: true,
    import: false,
    importHint: '',
    profileUrlExample: 'https://www.uisdc.com/u/<数字ID>/publish/all',
    metrics: { views: '阅读', likes: '点赞', comments: '评论', collects: '收藏' },
    noun: '文章',
    color: '#FF6A00',
    beta: true,
    scanApp: '微信',
    totals: { posts: '文章数', totalViews: '人气' },
    marks: '「精选」是优设在作者主页的文章列表里标出来的，每次更新都会读到。优设的作者榜和热文榜还没接入。',
  },
  importProfile: { defaultFormat: 'article', columns: [] },
  scrapableRoles: ['own'],
  maxPosts: 100,
  detectLogin,
  scrape,
  identify,
  // The header's avatar opens the login dialog, whose first tab is the WeChat QR code.
  openLogin: openLoginScript({ selector: '.login-panel a[data-modal-id="modal_login"]' }, /^微信扫码$|安全快捷登录/),
}
