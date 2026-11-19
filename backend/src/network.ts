/**
 * 总览 across accounts: 全网 totals (plain sums, no de-duplication) with their 90-day trend, the same work published on
 * several platforms, and the 今日简报's prompt and lines. Pure functions; the suite gathers the accounts and posts.
 */
import { MediaLlmOutputError, type MediaPrompt } from './analysis.ts'
import { counterLabel, POST_COUNTERS } from './dashboard.ts'
import { briefLineSchema } from './schemas.ts'
import type {
  MediaAccountId, MediaBriefItem, MediaKpi, MediaKpiUnit, MediaNetworkAccount, MediaNetworkKey, MediaNetworkTotal, MediaPlatformDescriptor, MediaPost,
  MediaSyncedWork,
} from './types.ts'

/** Titles per account the 今日简报 sees, so it does not suggest a topic the account has already done. */
const BRIEF_TITLES = 20

// ---------------------------------------------------------------- 全网 totals

/** The 全网 counters, in display order, with the dashboard KPI each one sums. */
const NETWORK_KEYS: readonly { readonly key: MediaNetworkKey; readonly label: string; readonly unit: MediaKpiUnit; readonly level: boolean }[] = [
  { key: 'views', label: '播放 / 阅读', unit: 'count', level: false },
  { key: 'followers', label: '粉丝总数', unit: 'count', level: true },
  { key: 'fansNet', label: '粉丝净增', unit: 'count', level: false },
  { key: 'likes', label: '点赞', unit: 'count', level: false },
  { key: 'comments', label: '评论', unit: 'count', level: false },
  { key: 'shares', label: '分享', unit: 'count', level: false },
  { key: 'posts', label: '发布作品', unit: 'count', level: false },
]

function kpiOf(account: MediaNetworkAccount, key: MediaNetworkKey): MediaKpi | undefined {
  return account.kpis.find(kpi => kpi.key === key)
}

/**
 * Add up every account's counters over its own window (each platform's window ends on its last reported day). A
 * total's previous value and change exist only when every contributing account has one. The daily series keeps the
 * days every contributing account reported, so a platform that reports a day later does not dent the curve.
 * @param accounts - own accounts with their window counters.
 * @returns the totals that at least one account reports, in display order.
 */
export function networkTotals(accounts: readonly MediaNetworkAccount[], history: readonly MediaNetworkAccount[] = accounts): MediaNetworkTotal[] {
  const totals: MediaNetworkTotal[] = []
  for (const { key, label, unit, level } of NETWORK_KEYS) {
    const rows = accounts.flatMap((account) => {
      const kpi = kpiOf(account, key)
      const value = kpi?.value ?? (key === 'followers' ? account.followers : undefined)
      return value === undefined ? [] : [{ id: account.account.id, value, previous: kpi?.previous, daily: kpi?.daily ?? [] }]
    })
    if (rows.length === 0) continue
    const value = rows.reduce((sum, row) => sum + row.value, 0)
    const previous = rows.every(row => row.previous !== undefined) ? rows.reduce((sum, row) => sum + (row.previous ?? 0), 0) : undefined
    const change = previous === undefined || previous === 0 ? undefined : (value - previous) / Math.abs(previous)
    const reporting = rows.filter(row => row.daily.length > 0)
    const byDay = new Map<string, Record<string, number>>()
    for (const row of reporting) for (const point of row.daily) byDay.set(point.day, { ...byDay.get(point.day), [row.id]: point.value })
    const daily = [...byDay].filter(([, parts]) => reporting.every(row => parts[row.id] !== undefined))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, parts]) => ({ day, total: Object.values(parts).reduce((sum, part) => sum + part, 0), parts }))
    totals.push({ key, label, unit, value, previous, change, parts: rows.map(row => ({ accountId: row.id, value: row.value })), daily, trend: trendOf(history, key, level) })
  }
  return totals
}

/**
 * The long series of one counter: a count adds whoever reported each day (so a newly added account starts its part
 * where its data starts), a level keeps the days every reporting account has.
 */
function trendOf(history: readonly MediaNetworkAccount[], key: MediaNetworkKey, level: boolean): MediaNetworkTotal['trend'] {
  const series = history.map(account => ({ id: account.account.id, daily: kpiOf(account, key)?.daily ?? [] })).filter(row => row.daily.length > 0)
  const byDay = new Map<string, Record<string, number>>()
  for (const row of series) for (const point of row.daily) byDay.set(point.day, { ...byDay.get(point.day), [row.id]: point.value })
  return [...byDay].filter(([, parts]) => !level || series.every(row => parts[row.id] !== undefined))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, parts]) => ({ day, total: Object.values(parts).reduce((sum, part) => sum + part, 0), parts }))
}

// ---------------------------------------------------------------- the same work on several platforms

const HASHTAG = /#[^#\s]+#?/g
const SYNC_DAYS = 7
const SYNC_SIMILARITY = 0.6

/**
 * What a title says, for matching: hashtags, brackets and punctuation removed, lower case. A title of hashtags only
 * (common on 视频号) keeps its hashtag words.
 * @param title - post title.
 * @returns the comparable text.
 */
export function titleKey(title: string): string {
  const text = title.replace(/\[[^\]]*\]/g, ' ')
  const plain = text.replace(HASHTAG, ' ').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()
  return plain.length >= 4 ? plain : text.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()
}

function bigrams(text: string): Set<string> {
  const chars = [...text]
  const set = new Set<string>()
  for (let i = 0; i < chars.length - 1; i++) set.add(`${chars[i] ?? ''}${chars[i + 1] ?? ''}`)
  return set
}

/**
 * How alike two titles are, 0 to 1: 1 when one contains the other (at least 6 characters), else the Dice
 * coefficient of their character pairs.
 * @param a - first title key.
 * @param b - second title key.
 * @returns the similarity.
 */
export function titleSimilarity(a: string, b: string): number {
  if (a === '' || b === '') return 0
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length >= 6 && long.includes(short)) return 1
  const x = bigrams(a)
  const y = bigrams(b)
  if (x.size === 0 || y.size === 0) return 0
  let shared = 0
  for (const pair of x) if (y.has(pair)) shared++
  return (2 * shared) / (x.size + y.size)
}

/**
 * Find works published on more than one platform: posts of different platforms within a week of each other whose
 * titles match. Each work keeps one post per platform (the most viewed) and adds their counters up.
 * @param posts - posts of every own account.
 * @param platformOf - platform of an account id.
 * @param limit - most works returned.
 * @returns works, most viewed first.
 */
export function findSyncedWorks(posts: readonly MediaPost[], platformOf: (accountId: string) => string | undefined, limit = 8): MediaSyncedWork[] {
  const items = posts.map(post => ({ post, platform: platformOf(post.accountId), key: titleKey(post.title), at: post.publishedAt === undefined ? undefined : Date.parse(post.publishedAt) }))
    .filter(item => item.platform !== undefined && item.key.length >= 4)
  const parent = items.map((_, index) => index)
  const root = (index: number): number => {
    let at = index
    while (parent[at] !== at) at = parent[at] ?? at
    return at
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (a === undefined || b === undefined || a.platform === b.platform) continue
      const similarity = titleSimilarity(a.key, b.key)
      // Known dates must be within a week; without one, only a near-identical title counts.
      const dated = a.at !== undefined && b.at !== undefined
      const match = dated ? Math.abs((a.at ?? 0) - (b.at ?? 0)) <= SYNC_DAYS * 86_400_000 && similarity >= SYNC_SIMILARITY : similarity >= 0.85
      if (match) parent[root(j)] = root(i)
    }
  }
  const groups = new Map<number, typeof items>()
  items.forEach((item, index) => { groups.set(root(index), [...groups.get(root(index)) ?? [], item]) })
  const works: MediaSyncedWork[] = []
  for (const group of groups.values()) {
    const best = new Map<string, MediaPost>()
    for (const { post, platform } of group) {
      if (platform === undefined) continue
      const kept = best.get(platform)
      if (kept === undefined || (post.views ?? post.likes ?? 0) > (kept.views ?? kept.likes ?? 0)) best.set(platform, post)
    }
    if (best.size < 2) continue
    const chosen = [...best.values()].sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
    const sum = (field: 'views' | 'likes' | 'comments' | 'shares'): number | undefined => chosen.some(post => post[field] !== undefined)
      ? chosen.reduce((total, post) => total + (post[field] ?? 0), 0) : undefined
    // The most descriptive title: the longest once hashtags are gone.
    const title = [...chosen].sort((a, b) => titleKey(b.title).length - titleKey(a.title).length)[0]?.title ?? ''
    works.push({ title, posts: chosen, views: sum('views'), likes: sum('likes'), comments: sum('comments'), shares: sum('shares') })
  }
  return works.sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)).slice(0, limit)
}

// ---------------------------------------------------------------- the AI overview

function figure(value: number | undefined, unit: MediaKpiUnit): string {
  if (value === undefined) return '-'
  if (unit === 'percent') return `${(value * 100).toFixed(1)}%`
  if (unit === 'seconds') return `${value.toFixed(1)}秒`
  return String(Math.round(value))
}

function changeText(change: number | undefined): string {
  return change === undefined ? '' : `（较上期 ${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%）`
}

/**
 * Name a post's marks for the model, such as `首页推荐、日榜第 3 名`.
 * @param post - the post.
 * @returns the marks joined, or an empty string.
 */
export function badgeText(post: MediaPost): string {
  return (post.badges ?? []).map(badge => badge.rank === undefined ? badge.label : `${badge.label}第 ${String(badge.rank)} 名`).join('、')
}

function postLine(post: MediaPost, platform: MediaPlatformDescriptor | undefined): string {
  // Each platform's own names: 少数派's 充电 is not a 点赞, and a 阅读 is not a 播放.
  const counters = POST_COUNTERS.flatMap(key => {
    const label = platform === undefined ? DEFAULT_COUNTER_NAMES[key] : counterLabel(platform, key)
    return label === undefined || post[key] === undefined ? [] : [`${label}${String(post[key])}`]
  }).join(' ')
  const marks = badgeText(post)
  return `- [${platform?.displayName ?? '未知平台'}] ${post.publishedAt === undefined ? '时间未知' : chinaDayOf(post.publishedAt)}《${post.title.slice(0, 60)}》 ${counters}${marks === '' ? '' : ` ［平台标记：${marks}］`}`
}

const DEFAULT_COUNTER_NAMES: Readonly<Record<typeof POST_COUNTERS[number], string>> = { views: '播放/阅读', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' }

/** The China day of an instant, as `2026-11-19`. */
function chinaDayOf(iso: string): string {
  return new Date(Date.parse(iso) + 8 * 3600_000).toISOString().slice(0, 10)
}

/** Everything the 今日简报 reads, and how to name a platform. */
export interface BriefInput {
  readonly accounts: readonly MediaNetworkAccount[]
  readonly totals: readonly MediaNetworkTotal[]
  readonly synced: readonly MediaSyncedWork[]
  readonly posts: readonly MediaPost[]
  readonly platformName: (accountId: string) => string
  /** Today's China day, so the model can count days since the last post. */
  readonly today: string
}

/**
 * The prompt of the 今日简报: every account's counters of the last 7 days, the 全网 totals, each account's best recent
 * posts, the newest posts and the works published on several platforms; the answer is one JSON line per item, so the
 * page can show each line as soon as it is written.
 * @param input - the 7-day network and its posts.
 * @returns the prompt.
 */
export function buildBriefPrompt(input: BriefInput): MediaPrompt {
  const lines: string[] = [`今天是 ${input.today}（北京时间）。`, '', '## 各账号近 7 天（各平台统计周期以平台为准）', '']
  for (const item of input.accounts) {
    lines.push(`### 平台：${item.platform.displayName}；账号名：${item.account.name}${item.account.niche ? `；领域：${item.account.niche}` : ''}`)
    lines.push(`粉丝 ${figure(item.followers, 'count')}，统计周期 ${item.from} 至 ${item.to}`)
    for (const kpi of item.kpis) if (kpi.value !== undefined) lines.push(`- ${kpi.label}：${figure(kpi.value, kpi.unit)}${changeText(kpi.change)}`)
    const recent = input.posts.filter(post => post.accountId === item.account.id)
    const newest = recent[0]?.publishedAt
    if (newest !== undefined) lines.push(`最近一次发布：${chinaDayOf(newest)}`)
    const best = [...recent].sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)).slice(0, 3)
    if (best.length > 0) lines.push('表现最好的作品：', ...best.map(post => postLine(post, item.platform)))
    if (recent.length > 0) {
      lines.push(`已发布作品的标题（最近 ${String(Math.min(recent.length, BRIEF_TITLES))} 条，新的在前；推荐选题前对照）：`)
      lines.push(...recent.slice(0, BRIEF_TITLES).map(post => `- ${post.publishedAt === undefined ? '' : `${chinaDayOf(post.publishedAt).slice(5)} `}${post.title.slice(0, 40)}`))
    }
    lines.push('')
  }
  lines.push('## 全网合计（各平台直接相加，不去重）', '')
  for (const total of input.totals) lines.push(`- ${total.label}：${figure(total.value, total.unit)}${changeText(total.change)}`)
  const platformOf = new Map(input.accounts.map(item => [item.account.id as string, item.platform]))
  lines.push('', '## 最近发布的作品', '', ...input.posts.slice(0, 12).map(post => postLine(post, platformOf.get(post.accountId))))
  if (input.synced.length > 0) {
    lines.push('', '## 多平台同步发布的作品（合计）', '')
    for (const work of input.synced) lines.push(`- 《${work.title.slice(0, 60)}》 ${work.posts.length} 个平台，合计播放/阅读 ${figure(work.views, 'count')}，点赞 ${figure(work.likes, 'count')}`)
  }
  return {
    system: [
      '你是自媒体运营助手，每天给创作者写「今日简报」：看他在各平台的真实数据，挑出今天最值得知道的几件事。',
      '每行输出一个 JSON 对象，不要其他文字、不要代码块，一共 5 到 8 行，最重要的放前面：',
      '{"kind":"alert","text":"需要处理的问题，比如停更、掉量","detail":"…","account":"账号名","metric":"views"}',
      '{"kind":"fact","text":"关键的数据变化","detail":"…","metric":"fansNet"}',
      '{"kind":"action","text":"一条具体的调整","detail":"…","account":"账号名","work":"作品标题"}',
      '{"kind":"topic","text":"下一条选题","detail":"…","platform":"平台名","work":"参照的作品标题"}',
      '规则：text 不超过 28 个字，必须带具体数字或作品名；只用给出的数据，不编造。',
      'detail 是点开这一行看到的说明，60 到 120 个字，分两句：先写依据（引用上面的具体数字、日期或作品），再写具体怎么做（发什么、什么形式、标题怎么写、发在哪个平台、什么时候发）。',
      'account 照抄给出的账号名，platform 写平台名；work 照抄上面出现过的作品标题（不涉及具体作品就省略）；metric 是这一行说的指标，取 views（播放/阅读）、followers（粉丝）、fansNet（粉丝净增）、likes、comments、shares、posts（发布数）之一；没有的字段省略。',
      '至少 2 条 action、2 条 topic；alert 只写真有问题的。',
      '说「停更」「掉量」之前，先核对这个账号的「最近一次发布」和统计周期里的发布数；周期里有新作品就不能说停更。',
      'topic 不要推荐账号已经做过的题：先对照上面每个账号「已发布作品的标题」。同一主题已经发过的，要么换题，要么在 detail 里点明「已发过《原标题》（日期、数据），这次做续篇／复盘／换角度」，并说清和原作品的区别。',
      '各平台的指标名照上面写的用（比如少数派的「充电」不是点赞、文章的「阅读」不是播放），不要换成别的平台的叫法。',
      '原因只写数据直接支持的；推测要写「可能」，并说明还缺什么数据。插件读不到流量来源、观众画像和推荐曝光，平台标记只有上面写出来的那些。',
    ].join('\n'),
    input: lines.join('\n'),
  }
}

/**
 * Read the finished lines of a 今日简报 answer: each complete line that is one valid item. A line still being written,
 * or one that is not an item, is skipped.
 * @param text - the answer so far.
 * @param complete - whether the answer is finished (its last line counts even without a line break).
 * @param accounts - the user's accounts, to link a line to the account it names.
 * @returns the items in order.
 */
export function parseBriefLines(text: string, complete: boolean, accounts: readonly MediaNetworkAccount[], posts: readonly MediaPost[] = []): MediaBriefItem[] {
  const rows = text.split('\n')
  const finished = complete ? rows : rows.slice(0, -1)
  const items: MediaBriefItem[] = []
  for (const row of finished) {
    const line = row.trim().replace(/^```(?:json)?|```$/g, '').trim()
    if (!line.startsWith('{')) continue
    let value: unknown
    try {
      value = JSON.parse(line)
    } catch {
      continue
    }
    const parsed = briefLineSchema.safeParse(value)
    if (!parsed.success) continue
    const { kind, text: body, detail, account, platform, work, metric } = parsed.data
    const named = account === undefined ? undefined : accounts.find(item => item.account.name === account.trim())
      ?? accounts.find(item => account.includes(item.account.name) && (platform === undefined || platform.includes(item.platform.displayName)))
    const accountId: MediaAccountId | undefined = named?.account.id
    const post = work === undefined ? undefined : matchWork(work, posts, accountId)
    const platformName = platform ?? named?.platform.displayName
    items.push({
      kind, text: body,
      ...detail === undefined || detail.trim() === '' ? {} : { detail: detail.trim() },
      ...accountId === undefined ? {} : { accountId },
      ...platformName === undefined ? {} : { platform: platformName },
      ...post === undefined ? {} : { post: { accountId: post.accountId, postId: post.postId } },
      ...metric !== undefined && BRIEF_METRICS.has(metric as MediaNetworkKey) ? { metric: metric as MediaNetworkKey } : {},
    })
  }
  return items
}

const BRIEF_METRICS: ReadonlySet<MediaNetworkKey> = new Set(['followers', 'fansNet', 'views', 'likes', 'comments', 'shares', 'posts'])

/**
 * The recent post a brief line names: the best title match, the named account's posts first.
 * @param work - the title the model copied (it may be cut short).
 * @param posts - recent posts.
 * @param accountId - the account the line names, if any.
 * @returns the post, or undefined when no title is close enough.
 */
function matchWork(work: string, posts: readonly MediaPost[], accountId: MediaAccountId | undefined): MediaPost | undefined {
  const key = titleKey(work)
  let best: { post: MediaPost; score: number } | undefined
  for (const post of posts) {
    const score = titleSimilarity(key, titleKey(post.title)) + (post.accountId === accountId ? 0.01 : 0)
    if (score >= 0.6 && (best === undefined || score > best.score)) best = { post, score }
  }
  return best?.post
}

/**
 * Check a finished 今日简报.
 * @param items - its lines.
 * @returns them.
 * @throws {MediaLlmOutputError} when no line is a valid item.
 */
export function requireBriefItems(items: readonly MediaBriefItem[]): readonly MediaBriefItem[] {
  if (items.length === 0) throw new MediaLlmOutputError('模型没有按要求逐行返回简报。')
  return items
}
