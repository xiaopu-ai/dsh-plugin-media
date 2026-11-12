/**
 * 微信公众号 adapter: the logged-in official-account backend for own accounts; benchmark accounts are import-only.
 *
 * Checked against a real account on 2026-11-12: the 发表记录 list (`cgi-bin/appmsgpublish`) carries titles, links and
 * covers but no read counts any more; 内容分析 (`misc/appmsganalysis`) answers per-article reads
 * (`get_article_list`, keyed `msg_id_item_idx` like the list's `aid`) and the daily 阅读 / 分享 of all articles
 * (`get_article_stat_tendency_and_source`, scene 9999, stamped at the day's China midnight); 用户分析
 * (`misc/useranalysis?begin_date=…`) answers the daily 新关注 / 取消关注 / 净增 / 累计 and `user_info.head_img`.
 */
import type { Page, Response } from 'playwright-core'
import { parseCount, parseDate, stablePostId } from '../counters.ts'
import { MediaScrapeError } from '../errors.ts'
import { chinaDay, type MediaHistoryDay } from '../history.ts'
import type { MediaAccount, MediaLoginState, MediaPostFormat } from '../types.ts'
import { asRecord, evaluateScript, expiredQrScript, gotoPage, hasCookie, sleep, stringField } from './page.ts'
import type { MediaHistoryLimits, MediaIdentityFields, MediaPlatformAdapter, MediaPostFields, MediaScrapeLimits, MediaScrapeResult } from './types.ts'

const HOME = 'https://mp.weixin.qq.com/'
const PAGE_SIZE = 10
/** `base_resp.ret` values the backend returns for an expired or missing login. */
const LOGIN_RETS: readonly number[] = [200003, 200040, -3]

/**
 * Read the follower total from the backend home page text, such as `总用户数 12,345`.
 * @param text - visible text of the home page.
 * @returns the follower count, or undefined.
 */
export function parseWechatHomeText(text: string): number | undefined {
  const match = /(?:总用户数|用户总数|总关注人数)\s*[:：]?\s*([\d,.]+\s*[万wW]?)/.exec(text)
  return match === null ? undefined : parseCount(match[1])
}

/** One page of the published-article list. */
export interface WechatPublishPage {
  /** Backend status: 0 is success. */
  readonly ret: number
  readonly total: number
  readonly posts: readonly MediaPostFields[]
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    // A malformed nested document carries no rows; the caller sees an empty page.
    return undefined
  }
}

const NUMBER_FIELDS: Readonly<Record<string, 'views' | 'likes' | 'comments' | 'shares' | 'collects'>> = {
  read_num: 'views', like_num: 'likes', comment_num: 'comments', share_num: 'shares', collect_num: 'collects',
}

function formatOf(showType: unknown): MediaPostFormat {
  if (showType === 5) return 'video'
  if (showType === 8) return 'image'
  return 'article'
}

/**
 * Read articles from a `cgi-bin/appmsgpublish?sub=list` response. Each publish carries `appmsgex` article rows and,
 * when the backend provides them, `appmsg_info` rows with read and interaction counters at the same index.
 * @param json - response body.
 * @returns status, total publish count and articles.
 */
export function parseWechatPublishPage(json: unknown): WechatPublishPage {
  const body = asRecord(json)
  const ret = parseCount(asRecord(body?.base_resp)?.ret) ?? -1
  const page = asRecord(parseJsonText(body?.publish_page))
  const list = Array.isArray(page?.publish_list) ? page.publish_list : []
  const posts: MediaPostFields[] = []
  for (const entry of list) {
    const info = asRecord(parseJsonText(asRecord(entry)?.publish_info))
    const articles = Array.isArray(info?.appmsgex) ? info.appmsgex : []
    const stats = Array.isArray(info?.appmsg_info) ? info.appmsg_info : []
    articles.forEach((item, index) => {
      const article = asRecord(item)
      const title = stringField(article, 'title')
      if (article === undefined || title === undefined) return
      const link = stringField(article, 'link')
      const numbers = { ...asRecord(stats[index]), ...article }
      const fields: Partial<Record<'views' | 'likes' | 'comments' | 'shares' | 'collects', number>> = {}
      const extra: Record<string, number> = {}
      for (const [key, value] of Object.entries(numbers)) {
        if (!key.endsWith('_num')) continue
        const count = parseCount(value)
        if (count === undefined) continue
        const field = NUMBER_FIELDS[key]
        if (field === undefined) extra[key.slice(0, -4)] = count
        else fields[field] = count
      }
      const cover = (stringField(article, 'cover') ?? stringField(article, 'cover_img'))?.replace(/^http:\/\//, 'https://')
      posts.push({
        postId: stringField(article, 'aid') ?? stablePostId(link, title),
        title,
        url: link,
        ...cover?.startsWith('https://') === true ? { coverUrl: cover } : {},
        publishedAt: parseDate(article.create_time ?? article.update_time),
        format: formatOf(article.item_show_type),
        ...fields,
        extra,
      })
    })
  }
  return { ret, total: parseCount(page?.total_count) ?? posts.length, posts }
}

/**
 * Per-article reads of 内容分析's article list (`get_article_list`): `article_list[]` with `msg_id`, `item_idx` and
 * `total_read_uv`, keyed like the publish list's `aid` (`<msg_id>_<item_idx>`).
 * @param json - response body.
 * @returns reads by article id.
 */
export function parseWechatArticleReads(json: unknown): Map<string, number> {
  const reads = new Map<string, number>()
  const list = asRecord(json)?.article_list
  for (const item of Array.isArray(list) ? list : []) {
    const row = asRecord(item)
    const id = row?.msg_id
    const index = row?.item_idx
    const value = parseCount(row?.total_read_uv)
    if ((typeof id === 'string' || typeof id === 'number') && (typeof index === 'string' || typeof index === 'number') && value !== undefined) reads.set(`${id}_${index}`, value)
  }
  return reads
}

/**
 * Daily 阅读 and 分享 of all articles (`get_article_stat_tendency_and_source`): the `scene` 9999 rows of
 * `all_article_stat_tendency.list`, each stamped with its day's China midnight in Unix seconds.
 * @param json - response body.
 * @returns values by China day.
 */
export function parseWechatReadTrend(json: unknown): Map<string, Record<string, number>> {
  const days = new Map<string, Record<string, number>>()
  const list = asRecord(asRecord(json)?.all_article_stat_tendency)?.list
  for (const item of Array.isArray(list) ? list : []) {
    const row = asRecord(item)
    const stamp = parseCount(row?.date)
    if (row === undefined || parseCount(row.scene) !== 9999 || stamp === undefined) continue
    const day = chinaDay(new Date(stamp * 1000).toISOString())
    const reads = parseCount(row.read_uv)
    const shares = parseCount(row.share_uv)
    days.set(day, { ...days.get(day), ...reads === undefined ? {} : { plays: reads }, ...shares === undefined ? {} : { postShares: shares } })
  }
  return days
}

/**
 * Daily followers of 用户分析 (`misc/useranalysis?begin_date=…`): the all-sources category (`user_source` 99999999)
 * with `date`, `new_user`, `cancel_user`, `netgain_user` and `cumulate_user`.
 * @param json - response body.
 * @returns values by day.
 */
export function parseWechatUserTrend(json: unknown): Map<string, Record<string, number>> {
  const days = new Map<string, Record<string, number>>()
  const categories = asRecord(json)?.category_list
  const all = (Array.isArray(categories) ? categories : []).map(asRecord).find(category => parseCount(category?.user_source) === 99999999)
  for (const item of Array.isArray(all?.list) ? all.list : []) {
    const row = asRecord(item)
    const day = stringField(row, 'date')
    if (row === undefined || day === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    const values: Record<string, number> = {}
    for (const [field, key] of [['new_user', 'newFollowers'], ['cancel_user', 'unfollows'], ['netgain_user', 'fansNet'], ['cumulate_user', 'fansTotal']] as const) {
      const value = parseCount(row[field])
      if (value !== undefined) values[key] = value
    }
    days.set(day, values)
  }
  return days
}

/** The account's avatar in a backend answer that carries `user_info.head_img`. */
export function wechatAvatarOf(json: unknown): string | undefined {
  const head = stringField(asRecord(asRecord(json)?.user_info), 'head_img')?.replace(/^http:\/\//, 'https://')
  return head?.startsWith('https://') === true ? head : undefined
}

const CONTENT_ANALYSIS = (token: string): string => `${HOME}misc/appmsganalysis?action=report&type=daily_v2&token=${token}&lang=zh_CN`
const USER_ANALYSIS = (token: string): string => `${HOME}misc/useranalysis?&token=${token}&lang=zh_CN`

/** Open a backend page and keep the JSON answers whose URL `accept`s, until `done` holds for them or 20 s pass. */
async function collect(page: Page, url: string, signal: AbortSignal, accept: (url: string) => boolean, done: (bodies: readonly unknown[]) => boolean): Promise<unknown[]> {
  const bodies: unknown[] = []
  const onResponse = (response: Response): void => {
    if (!accept(response.url())) return
    response.json().then((json: unknown) => { bodies.push(json) }).catch(() => {
      // The page's own HTML shares the URL; only its JSON answers count.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, url, signal)
    for (let waited = 0; waited < 40 && !done(bodies); waited++) await sleep(500, signal)
  } finally {
    page.off('response', onResponse)
  }
  return bodies
}

/** Open the backend home and wait for the session token it puts in the address. */
async function backendToken(page: Page, signal: AbortSignal): Promise<string> {
  await gotoPage(page, HOME, signal)
  let token: string | null = null
  for (let waited = 0; waited < 10 && token === null; waited++) {
    token = new URL(page.url()).searchParams.get('token')
    if (token === null) await sleep(1000, signal)
  }
  if (token === null) throw loginRequired()
  return token
}

async function history(page: Page, _account: MediaAccount, limits: MediaHistoryLimits): Promise<MediaHistoryDay[]> {
  const token = await backendToken(page, limits.signal)
  const days = new Map<string, Record<string, number>>()
  const merge = (found: ReadonlyMap<string, Record<string, number>>): void => { for (const [day, values] of found) days.set(day, { ...days.get(day), ...values }) }
  const reads = await collect(page, CONTENT_ANALYSIS(token), limits.signal, url => url.includes('get_article_stat_tendency_and_source'), bodies => bodies.length > 0)
  for (const body of reads) merge(parseWechatReadTrend(body))
  const users = await collect(page, USER_ANALYSIS(token), limits.signal, url => url.includes('/misc/useranalysis') && url.includes('begin_date'), bodies => bodies.some(body => parseWechatUserTrend(body).size > 0))
  for (const body of users) merge(parseWechatUserTrend(body))
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => {
    const { fansTotal, fansNet, ...extra } = values
    return { day, followers: fansTotal, followersNet: fansNet, extra }
  })
}

async function detectLogin(page: Page): Promise<MediaLoginState> {
  const url = page.url()
  if (url.startsWith(HOME) && new URL(url).searchParams.has('token')) return 'logged-in'
  return await hasCookie(page, HOME, ['slave_sid']) ? 'logged-in' : 'logged-out'
}

function loginRequired(): MediaScrapeError {
  return new MediaScrapeError('login-required', '公众号后台未登录或登录已过期，请在内嵌浏览器中用管理员微信扫码登录后重试。')
}

async function scrape(page: Page, account: MediaAccount, limits: MediaScrapeLimits): Promise<MediaScrapeResult> {
  if (account.role !== 'own') {
    throw new MediaScrapeError('unsupported', '对标公众号的数据无法从后台读取，请导入数据文件。')
  }
  const token = await backendToken(page, limits.signal)
  await sleep(2000, limits.signal)
  const homeText = await evaluateScript(page, 'document.body.innerText')
  const followers = parseWechatHomeText(typeof homeText === 'string' ? homeText : '')
  const posts: MediaPostFields[] = []
  let publishes: number | undefined
  for (let begin = 0; posts.length < limits.maxPosts; begin += PAGE_SIZE) {
    const query = new URLSearchParams({
      sub: 'list', search_field: 'null', begin: String(begin), count: String(PAGE_SIZE), query: '',
      type: '101_1', free_publish_type: '1', sub_action: 'list_ex', token, lang: 'zh_CN', f: 'json', ajax: '1',
    })
    const source = `fetch(${JSON.stringify(`/cgi-bin/appmsgpublish?${query.toString()}`)}, { credentials: 'include' }).then(r => r.json())`
    const result = parseWechatPublishPage(await evaluateScript(page, source))
    if (LOGIN_RETS.includes(result.ret)) throw loginRequired()
    if (result.ret !== 0) throw new MediaScrapeError('scrape-failed', `公众号后台返回错误码 ${result.ret}，无法读取已发表文章。`)
    posts.push(...result.posts)
    publishes = result.total
    if (result.posts.length === 0 || begin + PAGE_SIZE >= result.total) break
    await sleep(800, limits.signal)
  }
  if (followers === undefined && posts.length === 0) {
    throw new MediaScrapeError('scrape-failed', '公众号后台页面中没有读到总用户数和文章，页面结构可能已变化，可改用数据分析导出文件导入。')
  }
  // The publish list has no read counts: 内容分析 lists each recent article's reads.
  const analysis = await collect(page, CONTENT_ANALYSIS(token), limits.signal, url => url.includes('get_article_list'), bodies => bodies.length > 0).catch(() => [])
  const reads = new Map<string, number>()
  for (const body of analysis) for (const [id, value] of parseWechatArticleReads(body)) reads.set(id, value)
  const users = await collect(page, USER_ANALYSIS(token), limits.signal, url => url.includes('/misc/useranalysis'), bodies => bodies.some(body => wechatAvatarOf(body) !== undefined)).catch(() => [])
  const avatarUrl = users.map(wechatAvatarOf).find(url => url !== undefined)
  const withReads = posts.slice(0, limits.maxPosts).map(post => post.views === undefined && reads.has(post.postId) ? { ...post, views: reads.get(post.postId) } : post)
  return { snapshot: { followers, extra: publishes === undefined ? {} : { publishes } }, posts: withReads, avatarUrl }
}

/** Nickname candidates the backend page exposes. */
export interface WechatNameCapture {
  /** `wx.commonData.data.nick_name` of the backend page. */
  readonly common: string
  /** Text of the account name element in the page header. */
  readonly dom: string
}

/**
 * Pick the official account's name.
 * @param capture - candidates read from the backend page.
 * @returns the first non-empty name, or undefined.
 */
export function parseWechatName(capture: unknown): string | undefined {
  const record = asRecord(capture)
  return stringField(record, 'common') ?? stringField(record, 'dom')
}

const NAME_SCRIPT = `(() => ({
  common: (window.wx && window.wx.commonData && window.wx.commonData.data && window.wx.commonData.data.nick_name) || '',
  dom: (document.querySelector('.weui-desktop-account__nickname, .weui-desktop-account__info .weui-desktop-account__nickname, .account_setting_name, .weui-desktop-person_info .weui-desktop-name')?.textContent || '').trim(),
}))()`

async function identify(page: Page, signal: AbortSignal): Promise<MediaIdentityFields | undefined> {
  await gotoPage(page, HOME, signal)
  for (let waited = 0; waited < 10 && !new URL(page.url()).searchParams.has('token'); waited++) await sleep(1000, signal)
  if (!new URL(page.url()).searchParams.has('token')) return undefined
  for (let waited = 0; waited < 6; waited++) {
    const name = parseWechatName(await evaluateScript(page, NAME_SCRIPT))
    if (name !== undefined) return { name, profileUrl: HOME }
    await sleep(1000, signal)
  }
  return { name: '微信公众号', profileUrl: HOME }
}

/** Built-in 微信公众号 adapter. */
export const wechatMpAdapter: MediaPlatformAdapter = {
  descriptor: {
    id: 'wechat-mp',
    displayName: '微信公众号',
    loginUrl: HOME,
    scrape: true,
    import: true,
    importHint: '公众号后台 → 数据分析 → 内容分析（单篇群发）或用户分析 → 下载表格；对标公众号只能导入。',
    profileUrlExample: '自有公众号无需填写；对标公众号可填文章或主页链接备注',
    metrics: { views: '阅读', likes: '点赞', comments: '留言', shares: '分享', collects: '收藏' },
    noun: '文章',
    color: '#07C160',
  },
  importProfile: {
    defaultFormat: 'article',
    columns: [
      { field: 'title', synonyms: ['文章标题', '内容标题'] },
      { field: 'publishedAt', synonyms: ['群发时间', '发表时间'] },
      { field: 'views', synonyms: ['阅读次数', '阅读人数', '图文阅读次数', '总阅读次数', '阅读数'] },
      { field: 'likes', synonyms: ['点赞人数', '点赞次数', '赞'] },
      { field: 'shares', synonyms: ['分享次数', '分享人数', '转发次数'] },
      { field: 'collects', synonyms: ['收藏次数', '收藏人数'] },
      { field: 'comments', synonyms: ['留言数', '留言次数', '评论数'] },
      { field: 'extra:wow', synonyms: ['在看人数', '在看次数', '在看'] },
      { field: 'extra:newFollowers', synonyms: ['新关注人数', '新增关注人数'] },
      { field: 'extra:unfollows', synonyms: ['取消关注人数'] },
      { field: 'extra:netFollowers', synonyms: ['净增关注人数'] },
      { field: 'followers', synonyms: ['累积关注人数', '累计关注人数', '总用户数'] },
      { field: 'extra:completionRate', synonyms: ['完读率', '阅读完成率'] },
    ],
  },
  scrapableRoles: ['own'],
  identityMatch: 'platform',
  detectLogin,
  scrape,
  history,
  qrSelectors: ['img.login__type__container__scan__qrcode', '.login__type__container__scan img'],
  qrExpired: expiredQrScript(/二维码已?(失效|过期)/),
  identify,
}
