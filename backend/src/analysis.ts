/** Prompts for topic recommendations and account diagnosis, and validation of the model's JSON answers. */
import type { z } from 'zod'
import { analysisOutputSchema, topicOutputSchema } from './schemas.ts'
import { interactionsOf } from './overview.ts'
import type { MediaAccount, MediaAccountOverview, MediaPost, MediaRelatedPost, MediaTopicResearch } from './types.ts'

/** One completed model call. */
export interface MediaLlmCompletion {
  readonly text: string
  /** `provider/model` that answered. */
  readonly model: string
}

/** One-shot model call used by the suite; the Host binds it to `ctx.llm`, tests to a fake. */
/**
 * One model call. `onText`, when given, receives the answer written so far as it streams, so a caller can show finished
 * lines before the whole answer is in.
 */
export type MediaLlm = (request: { readonly system: string; readonly input: string }, signal: AbortSignal, onText?: (text: string) => void) => Promise<MediaLlmCompletion>

/** System prompt and user input of one request. */
export interface MediaPrompt {
  readonly system: string
  readonly input: string
}

/** A benchmark account with its posts, used as topic references. */
export interface BenchmarkInput {
  readonly account: MediaAccount
  readonly posts: readonly MediaPost[]
}

/** The model answer was not the requested JSON. */
export class MediaLlmOutputError extends Error {
  override name = 'MediaLlmOutputError'
}

const FORMAT_LABELS: Readonly<Record<MediaPost['format'], string>> = { image: '图文', video: '视频', article: '文章', other: '其他' }

function fmt(value: number | undefined): string {
  return value === undefined ? '-' : String(value)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** China time of an instant, the time zone the supported platforms and their audiences use. */
function chinaTime(iso: string | undefined): Date | undefined {
  const time = iso === undefined ? Number.NaN : Date.parse(iso)
  return Number.isNaN(time) ? undefined : new Date(time + 8 * 3600_000)
}

function percent(value: number | undefined): string {
  return value === undefined ? '-' : `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`
}

function rate(post: MediaPost, counter: number | undefined): number | undefined {
  return post.views === undefined || post.views <= 0 || counter === undefined ? undefined : counter / post.views
}

/**
 * Render posts as compact lines for a prompt, with the publish time in China time and the per-post rates.
 * @param posts - posts to list.
 * @returns one line per post.
 */
export function postLines(posts: readonly MediaPost[]): string {
  if (posts.length === 0) return '（暂无）'
  return posts.map((post) => {
    const at = chinaTime(post.publishedAt)
    const date = at === undefined ? '日期未知' : `${at.toISOString().slice(0, 16).replace('T', ' ')} ${WEEKDAYS[at.getUTCDay()] ?? ''}`
    const extra = Object.entries(post.extra).map(([key, value]) => `${key}=${value}`).join(' ')
    return `- [${date}] ${post.title.replace(/\s+/g, ' ').slice(0, 80) || '（无标题）'} | ${FORMAT_LABELS[post.format]} | 阅读/播放 ${fmt(post.views)} | 赞 ${fmt(post.likes)} | 评 ${fmt(post.comments)} | 藏 ${fmt(post.collects)} | 转 ${fmt(post.shares)} | 互动率 ${percent(rate(post, interactionsOf(post)))} | 收藏率 ${percent(rate(post, post.collects))}${extra === '' ? '' : ` | ${extra}`}`
  }).join('\n')
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.slice(Math.ceil(sorted.length / 2) - 1, Math.floor(sorted.length / 2) + 1)
  return middle.reduce((sum, value) => sum + value, 0) / middle.length
}

function known(values: readonly (number | undefined)[]): number[] {
  return values.filter((value): value is number => value !== undefined && Number.isFinite(value))
}

function groupLine(label: string, posts: readonly MediaPost[]): string {
  const views = median(known(posts.map(post => post.views)))
  return `${label} ${posts.length} 篇，播放中位数 ${views === undefined ? '-' : Math.round(views)}，互动率中位数 ${percent(median(known(posts.map(post => rate(post, interactionsOf(post))))))}`
}

/** Publish-time slots in China time: start hour inclusive, end hour exclusive. */
const SLOTS: readonly (readonly [string, number, number])[] = [['早间 6–12 点', 6, 12], ['午后 12–18 点', 12, 18], ['晚间 18–24 点', 18, 24], ['深夜 0–6 点', 0, 6]]

/**
 * Pre-computed content statistics, so the model compares against the account's own medians instead of estimating
 * them: medians and rates, the spread of plays, and the split by format and publish time.
 * @param posts - posts, any order.
 * @returns a multi-line description.
 */
export function contentStatsBlock(posts: readonly MediaPost[]): string {
  if (posts.length === 0) return '（暂无作品数据）'
  const views = known(posts.map(post => post.views))
  const middle = median(views)
  const lines = [`样本 ${posts.length} 篇，其中 ${views.length} 篇有阅读/播放数据。`]
  if (middle !== undefined) {
    const mean = views.reduce((sum, value) => sum + value, 0) / views.length
    const top = Math.max(...views)
    lines.push(`阅读/播放：中位数 ${Math.round(middle)}，平均 ${Math.round(mean)}，最高 ${top}${middle > 0 ? `（中位数的 ${(top / middle).toFixed(1)} 倍）` : ''}。平均值受个别爆款影响，判断常态请用中位数。`)
  }
  lines.push(`互动率中位数 ${percent(median(known(posts.map(post => rate(post, interactionsOf(post))))))}，收藏率中位数 ${percent(median(known(posts.map(post => rate(post, post.collects)))))}，评论率中位数 ${percent(median(known(posts.map(post => rate(post, post.comments)))))}，转发率中位数 ${percent(median(known(posts.map(post => rate(post, post.shares)))))}。`)
  const formats = (Object.keys(FORMAT_LABELS) as MediaPost['format'][]).map(format => [format, posts.filter(post => post.format === format)] as const).filter(([, list]) => list.length > 0)
  if (formats.length > 1) lines.push(`按形式：${formats.map(([format, list]) => groupLine(FORMAT_LABELS[format], list)).join('；')}。`)
  const slots = SLOTS.map(([label, from, to]) => [label, posts.filter((post) => {
    const hour = chinaTime(post.publishedAt)?.getUTCHours()
    return hour !== undefined && hour >= from && hour < to
  })] as const).filter(([, list]) => list.length > 0)
  if (slots.length > 0) lines.push(`按发布时段（北京时间）：${slots.map(([label, list]) => groupLine(label, list)).join('；')}。`)
  const tags = posts.map(post => (post.title.match(/#[^\s#]+/g) ?? []).length)
  lines.push(`平均每篇话题标签 ${(tags.reduce((sum, value) => sum + value, 0) / posts.length).toFixed(1)} 个。`)
  return lines.join('\n')
}

/**
 * Account funnel from the platform's daily creator data in the window: plays, profile visits and net followers, with
 * the visit-to-follow rate.
 * @param overview - dashboard summary over the window.
 * @returns a description, or undefined when the platform reports no daily data.
 */
export function dailyFunnelLine(overview: MediaAccountOverview): string | undefined {
  const sum = (pick: (point: MediaAccountOverview['series'][number]) => number | undefined): number | undefined => {
    const values = known(overview.series.map(pick))
    return values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0)
  }
  const plays = sum(point => point.plays)
  const visits = sum(point => point.profileViews)
  const net = sum(point => point.fansNet)
  if (plays === undefined && visits === undefined && net === undefined) return undefined
  const conversion = visits !== undefined && visits > 0 && net !== undefined ? `，主页访问转粉率（净增粉丝 ÷ 主页访问）${percent(net / visits)}` : ''
  return `创作者后台日数据合计：播放 ${fmt(plays)}，主页访问 ${fmt(visits)}，净增粉丝 ${fmt(net)}${conversion}。`
}

/**
 * Split posts into the best and worst performers by interactions.
 * @param posts - posts.
 * @param top - number of best posts.
 * @param bottom - number of worst posts, disjoint from the best.
 * @returns best first, then worst ascending.
 */
export function rankPosts(
  posts: readonly MediaPost[], top: number, bottom: number,
): { readonly best: MediaPost[]; readonly worst: MediaPost[] } {
  const scored = posts.filter(post => interactionsOf(post) !== undefined)
    .sort((a, b) => (interactionsOf(b) ?? 0) - (interactionsOf(a) ?? 0))
  const best = scored.slice(0, top)
  const worst = scored.slice(best.length).reverse().slice(0, bottom)
  return { best, worst }
}

function accountBlock(account: MediaAccount, platformName: string): string {
  return [
    `平台：${platformName}`,
    `账号：${account.name}`,
    `内容领域：${account.niche.trim() || '未填写'}`,
    `账号说明（受众、风格、目标）：${account.notes.trim() || '未填写'}`,
  ].join('\n')
}

/**
 * Cadence facts: posts per week and the longest gap between dated posts.
 * @param posts - posts, any order.
 * @returns a one-line description.
 */
export function cadenceLine(posts: readonly MediaPost[]): string {
  const dates = posts.map(post => post.publishedAt).filter((value): value is string => value !== undefined).sort()
  if (dates.length < 2) return `可确定发布时间的作品 ${dates.length} 篇，不足以计算发布节奏。`
  const first = Date.parse(dates[0] ?? '')
  const last = Date.parse(dates[dates.length - 1] ?? '')
  const weeks = Math.max(1, (last - first) / (7 * 86400000))
  let longest = 0
  for (let i = 1; i < dates.length; i++) longest = Math.max(longest, Date.parse(dates[i] ?? '') - Date.parse(dates[i - 1] ?? ''))
  return `${dates[0]?.slice(0, 10)} 至 ${dates[dates.length - 1]?.slice(0, 10)} 共 ${dates.length} 篇，平均每周 ${(dates.length / weeks).toFixed(1)} 篇，最长间隔 ${(longest / 86400000).toFixed(1)} 天。`
}

const JSON_RULE = '只输出一个 JSON 对象，不要输出 Markdown、代码块或任何解释文字。所有文字使用简体中文。'

/** Metric definitions and evidence rules both prompts share. */
const METRIC_RULES = [
  '指标口径：互动率 =（赞 + 评 + 藏 + 转）÷ 阅读/播放；收藏率反映内容的干货价值，评论率反映话题讨论度，转发率反映社交传播意愿。',
  '判断作品表现时以账号自己的中位数为基准，用倍数表达，例如“播放是账号中位数的 3.2 倍”；单条爆款不代表常态。',
  '引用的数字必须来自输入数据，不要估算或编造；样本少于 5 篇或缺少关键数据时，明确写出结论的把握有限，以及需要补充哪些数据。',
  'summary 写 2 到 3 段，每段不超过 80 个字，段落之间用换行符分隔；先写结论，再写依据。',
].join('\n')

/**
 * Render platform posts found outside the configured accounts, such as search results.
 * @param posts - the posts.
 * @returns one line per post.
 */
export function relatedLines(posts: readonly MediaRelatedPost[]): string {
  if (posts.length === 0) return '（没有搜到）'
  return posts.map((post) => {
    const at = chinaTime(post.publishedAt)
    const date = at === undefined ? '日期未知' : at.toISOString().slice(0, 10)
    const title = post.title.replace(/\s+/g, ' ').slice(0, 80) || '（无标题）'
    return `- [${date}] ${title} | @${post.author || '未知作者'} | ${FORMAT_LABELS[post.format]} | 赞 ${fmt(post.likes)} | 评 ${fmt(post.comments)} | 藏 ${fmt(post.collects)} | 转 ${fmt(post.shares)}`
  }).join('\n')
}

/**
 * Render the research gathered before topic generation as prompt sections.
 * @param research - the gathered material.
 * @param platformName - platform display name.
 * @returns the sections; empty when nothing was gathered.
 */
export function researchSections(research: Omit<MediaTopicResearch, 'notes'>, platformName: string): string[] {
  const sections: string[] = []
  if (research.trending.length > 0) {
    sections.push(`## ${platformName}实时热榜`, research.trending.map((item, index) => `${index + 1}. ${item.word}${item.heat === undefined ? '' : `（热度 ${item.heat}）`}`).join('\n'))
  }
  for (const search of research.searches) sections.push(`## ${platformName}搜索“${search.keyword}”的高赞作品`, relatedLines(search.posts))
  if (research.news.length > 0) {
    sections.push('## 相关新闻', research.news.map(item => `- ${item.title}${item.publishedAt === undefined ? '' : `（${item.publishedAt.slice(0, 10)}）`}：${item.snippet.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n'))
  }
  return sections
}

/** What steers one topic report beyond the account's data. */
export interface MediaTopicBrief {
  /** What the user wants the topics to be about; empty or absent leaves the choice to the model. */
  readonly direction?: string | undefined
  /** Titles earlier reports already suggested, which the new report must not repeat. */
  readonly previous?: readonly string[] | undefined
}

/**
 * Build the topic recommendation prompt.
 * @param account - own or benchmark account the topics are for.
 * @param platformName - platform display name.
 * @param posts - the account's recent posts, newest first.
 * @param benchmarks - benchmark accounts with their posts.
 * @param count - number of suggestions to request.
 * @param research - trending topics, keyword searches and news gathered before generation.
 * @param brief - what the user asked for and what earlier reports already suggested.
 * @returns system prompt and input.
 */
export function buildTopicPrompt(
  account: MediaAccount, platformName: string, posts: readonly MediaPost[], benchmarks: readonly BenchmarkInput[], count: number,
  research?: Omit<MediaTopicResearch, 'notes'>, brief: MediaTopicBrief = {},
): MediaPrompt {
  const direction = brief.direction?.trim() ?? ''
  const previous = brief.previous ?? []
  const { best, worst } = rankPosts(posts, 8, 5)
  const benchmarkText = benchmarks.length === 0
    ? '（未配置对标账号）'
    : benchmarks.map(({ account: other, posts: otherPosts }) => `### ${other.name}（${other.niche || '领域未填写'}）\n${postLines(rankPosts(otherPosts, 10, 0).best)}`).join('\n\n')
  const system = [
    '你是资深的自媒体内容策划，熟悉小红书、抖音、微信公众号等平台的内容规律与流量机制。',
    '你根据账号定位、历史作品数据、对标账号的爆款作品，以及平台热榜、同类内容的搜索结果和相关新闻，提出具体、可直接执行、与该账号差异化的选题。',
    '每个选题的 reason 至少引用一组与账号中位数对比的数据；用到热榜、搜索结果或新闻时，写明是哪一条；不要重复账号近期已经发过的选题。',
    '优先选择既贴合账号定位、又有时效性的选题；搜索结果里同类作品已经很多时，要给出差异化的切入角度。',
    '输入里有“这次想做的方向”时，每个选题都要围绕它，再结合账号数据挑角度；没有这一节时按账号定位自由选。',
    '输入里“最近已经给过的选题”不要再给；确实值得再做的，要换成明显不同的角度，并在 angle 里写明和上次的差别。',
    '候选标题要符合平台习惯：小红书不超过 20 个字，抖音和微信公众号不超过 30 个字；标题之间要换角度，不要只换措辞。',
    `keywords 给 2 到 3 个用于在${platformName}搜索同类作品的短关键词，每个不超过 8 个字，从具体到宽泛排列。`,
    'format 是 video 的选题另给 video 字段，其它形式不要给：hook 是开口第一句的原话，直接给结果、反差、数字或一个问题，不超过 30 个字，不寒暄；outline 是 3 到 5 条口播提纲，按讲的顺序，每条一句话写清这一段讲什么；seconds 是建议时长（秒），参考账号里表现好的视频的时长；cover 是封面字，不超过 10 个字。',
    METRIC_RULES,
    JSON_RULE,
    'JSON 结构：{"summary": "一段话总结选题思路", "suggestions": [{"title": "选题名", "angle": "切入角度或钩子", "reason": "为什么适合这个账号，引用数据", "format": "image|video|article|other", "headlines": ["候选标题1", "候选标题2", "候选标题3"], "references": ["启发该选题的作品标题"], "keywords": ["搜索关键词1", "搜索关键词2"], "priority": "high|medium|low", "video": {"hook": "开口第一句", "outline": ["第一段讲什么", "第二段讲什么"], "seconds": 90, "cover": "封面字"}}]}',
    `给出 ${count} 个选题，按优先级从高到低排列。`,
  ].join('\n')
  const input = [
    '## 账号信息', accountBlock(account, platformName),
    ...direction === '' ? [] : ['## 这次想做的方向', direction],
    '## 作品数据统计', contentStatsBlock(posts),
    ...previous.length === 0 ? [] : ['## 最近已经给过的选题', previous.map(title => `- ${title}`).join('\n')],
    '## 近期作品（最新在前）', postLines(posts.slice(0, 20)),
    '## 表现最好的作品', postLines(best),
    '## 表现最差的作品', postLines(worst),
    '## 对标账号的高互动作品', benchmarkText,
    ...research === undefined ? [] : researchSections(research, platformName),
  ].join('\n\n')
  return { system, input }
}

/**
 * Build the account diagnosis prompt.
 * @param overview - dashboard summary over the analysis window.
 * @param platformName - platform display name.
 * @param posts - posts in the analysis window, newest first.
 * @param windowDays - window length in days.
 * @returns system prompt and input.
 */
export function buildAnalysisPrompt(
  overview: MediaAccountOverview, platformName: string, posts: readonly MediaPost[], windowDays: number,
): MediaPrompt {
  const { best, worst } = rankPosts(posts, 5, 5)
  const latest = overview.latest
  const engagement = overview.engagement
  const rates = posts.filter(post => post.views !== undefined && post.views > 0 && interactionsOf(post) !== undefined)
  const rate = rates.length === 0
    ? '无法计算（缺少阅读/播放数据）'
    : `${(rates.reduce((sum, post) => sum + (interactionsOf(post) ?? 0) / (post.views ?? 1), 0) / rates.length * 100).toFixed(2)}%`
  const system = [
    '你是资深的自媒体运营顾问。你根据账号数据诊断最近的运营问题，找出最值得改进的地方。',
    '每条结论都必须有数据或具体作品作为证据，并给出下一步可以直接执行的动作。',
    'action 要能在接下来的几条作品里验证：写清楚做什么，以及看哪个指标、期望从多少变到多少。',
    '从发布节奏、选题方向、标题与封面、内容形式、发布时间、互动转化、涨粉效率等方面分析，按影响从大到小排序。',
    METRIC_RULES,
    JSON_RULE,
    'JSON 结构：{"summary": "一段话总体诊断", "strengths": ["做得好的地方"], "items": [{"area": "发布节奏|选题方向|标题封面|内容形式|互动转化|涨粉效率|其他", "finding": "发现的问题", "evidence": "支撑的数据或作品", "action": "具体改进动作", "priority": "high|medium|low"}]}',
    '给出 4 到 8 条改进项。',
  ].join('\n')
  const input = [
    '## 账号信息', accountBlock(overview.account, platformName),
    `## 近 ${windowDays} 天账号数据`,
    [
      `最新：粉丝 ${fmt(latest?.followers)}，获赞 ${fmt(latest?.likes)}，作品数 ${fmt(latest?.posts)}`,
      `变化：粉丝 ${fmt(overview.deltas.followers)}，获赞 ${fmt(overview.deltas.likes)}，作品数 ${fmt(overview.deltas.posts)}（共 ${overview.series.length} 次采集）`,
      `窗口内作品 ${engagement.postCount} 篇，平均：阅读/播放 ${fmt(engagement.avgViews)}，赞 ${fmt(engagement.avgLikes)}，评 ${fmt(engagement.avgComments)}，藏 ${fmt(engagement.avgCollects)}`,
      `平均互动率（互动/阅读）：${rate}`,
      `发布节奏：${cadenceLine(posts)}`,
      ...[dailyFunnelLine(overview)].filter((line): line is string => line !== undefined),
    ].join('\n'),
    '## 作品数据统计', contentStatsBlock(posts),
    '## 窗口内作品（最新在前）', postLines(posts.slice(0, 30)),
    '## 表现最好的作品', postLines(best),
    '## 表现最差的作品', postLines(worst),
  ].join('\n\n')
  return { system, input }
}

/**
 * Extract the JSON object from a model answer, tolerating code fences and surrounding prose.
 * @param text - model answer.
 * @returns the parsed value.
 * @throws {MediaLlmOutputError} when no JSON object parses.
 */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = fenced?.[1] ?? text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new MediaLlmOutputError('模型没有返回 JSON 对象。')
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch (error) {
    throw new MediaLlmOutputError('模型返回的 JSON 无法解析。', { cause: error })
  }
}

function parseWith<T>(schema: z.ZodType<T>, text: string): T {
  const parsed = schema.safeParse(extractJson(text))
  if (!parsed.success) throw new MediaLlmOutputError(`模型返回的 JSON 不符合要求：${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
  return parsed.data
}

/**
 * Validate a topic answer.
 * @param text - model answer.
 * @returns summary and suggestions.
 * @throws {MediaLlmOutputError} when the answer is not a valid topic JSON.
 */
export function parseTopicOutput(text: string): z.infer<typeof topicOutputSchema> {
  return parseWith(topicOutputSchema, text)
}

/**
 * Validate a diagnosis answer.
 * @param text - model answer.
 * @returns summary, strengths and improvement items.
 * @throws {MediaLlmOutputError} when the answer is not a valid analysis JSON.
 */
export function parseAnalysisOutput(text: string): z.infer<typeof analysisOutputSchema> {
  return parseWith(analysisOutputSchema, text)
}
