/**
 * Model tools that let a conversation read the suite's accounts, dashboards and posts, and request topic and diagnosis
 * reports. The tools read the same computations as the page, so the conversation and the dashboard agree.
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { counterLabel, POST_COUNTERS } from './dashboard.ts'
import type {
  MediaAccount, MediaAccountHealth, MediaAccountId, MediaAccountOverview, MediaAnalysisReport, MediaDashboard, MediaKpi, MediaPlatformDescriptor,
  MediaPost, MediaPostDetail, MediaTopicReport,
} from './types.ts'

/** Suite operations the tools call. */
export interface MediaToolHost {
  accounts(): MediaAccount[]
  platformName(platform: string): string
  healthOf(account: MediaAccount): MediaAccountHealth
  dashboard(id: MediaAccountId, days: number): MediaDashboard
  posts(id: MediaAccountId, limit: number): MediaPost[]
  postDetail(id: MediaAccountId, postId: string): MediaPostDetail
  generateTopics(id: MediaAccountId, signal: AbortSignal): Promise<MediaTopicReport>
  analyze(id: MediaAccountId, signal: AbortSignal): Promise<MediaAnalysisReport>
}

const HEALTH_TEXT: Readonly<Record<MediaAccountHealth['state'], string>> = {
  'login-required': '登录已失效，需要在自媒体页面重新扫码，现在的数据停在上次更新时',
  failing: '上次自动更新失败，现在的数据停在上次更新时',
  stale: '数据很久没有更新了，数字可能已经过时',
  pending: '还没有抓到数据，等待首次更新',
  ok: '正常',
}

/**
 * Describe an account's health in one line for the model.
 * @param health - the health.
 * @returns Chinese text naming the state, the newest data time and a failure reason.
 */
export function renderHealth(health: MediaAccountHealth): string {
  return [
    `数据状态：${HEALTH_TEXT[health.state]}`,
    health.updatedAt === undefined ? '' : `（最新数据 ${health.updatedAt}）`,
    health.message === undefined ? '' : `；原因：${health.message}`,
  ].join('')
}

/**
 * Format a counter for the model.
 * @param value - the number.
 * @param unit - `percent` prints a percentage.
 * @returns the text, or `-` when unknown.
 */
function figure(value: number | undefined, unit: MediaKpi['unit'] = 'count'): string {
  if (value === undefined) return '-'
  if (unit === 'percent') return `${(value * 100).toFixed(2)}%`
  if (unit === 'seconds') return `${value.toFixed(1)}秒`
  return Math.abs(value) >= 10000 ? `${(value / 10000).toFixed(2)}万` : String(Math.round(value))
}

function changeText(change: number | undefined): string {
  return change === undefined ? '' : `（较上一周期 ${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%）`
}

function kpiLines(kpis: readonly MediaKpi[]): string[] {
  return kpis.map(kpi => `- ${kpi.label}：${figure(kpi.value, kpi.unit)}${changeText(kpi.change)}；口径：${kpi.hint}`)
}

function counters(post: MediaPost, platform: MediaPlatformDescriptor): string {
  return POST_COUNTERS.flatMap(key => {
    const label = counterLabel(platform, key)
    return label === undefined || post[key] === undefined ? [] : [`${label} ${figure(post[key])}`]
  }).join('，')
}

/**
 * Render a dashboard as Markdown for the model.
 * @param dashboard - the dashboard.
 * @returns Markdown with health, works and fans counters with daily values, and top posts.
 */
export function renderDashboard(dashboard: MediaDashboard): string {
  const { account, platform } = dashboard
  const daily = (kpi: MediaKpi): string => kpi.daily.length === 0 ? '' : `\n  每日：${kpi.daily.map(item => `${item.day.slice(5)} ${figure(item.value, kpi.unit)}`).join('，')}`
  return [
    `# ${account.name}（${platform.displayName}）近 ${dashboard.days} 天（${dashboard.from} 至 ${dashboard.to}）`,
    renderHealth(dashboard.health),
    '## 作品数据', ...dashboard.works.map(kpi => kpiLines([kpi])[0] + daily(kpi)),
    '## 粉丝数据', ...dashboard.fans.map(kpi => kpiLines([kpi])[0] + daily(kpi)),
    '## 近 30 天发布、数据最好的作品',
    ...dashboard.top.map((item, index) => `${index + 1}. 《${item.post.title}》 ${item.label} ${figure(item.value)}（id ${item.post.postId}）`),
    dashboard.top.length === 0 ? '暂无' : '',
  ].filter(line => line !== '').join('\n')
}

/**
 * Render a list of posts as Markdown for the model.
 * @param posts - posts in the order to show.
 * @param platform - their platform.
 * @returns one line per post with id, publish time, counters and address.
 */
export function renderPosts(posts: readonly MediaPost[], platform: MediaPlatformDescriptor): string {
  if (posts.length === 0) return '还没有抓到作品。'
  return posts.map((post, index) => `${index + 1}. 《${post.title}》 | id ${post.postId} | 发布 ${post.publishedAt ?? '未知'} | ${counters(post, platform) || '暂无数字'}${post.url === undefined ? '' : ` | ${post.url}`}`).join('\n')
}

/**
 * Render one post's detail as Markdown for the model.
 * @param detail - the detail.
 * @returns Markdown with counters against the account median, daily gains, rates and rank.
 */
export function renderPostDetail(detail: MediaPostDetail): string {
  const { post } = detail
  const versus = (value: number | undefined, median: number | undefined, unit: MediaKpi['unit'] = 'count'): string => {
    if (value === undefined || median === undefined || median === 0) return ''
    const ratio = value / median
    return `，是账号近期中位数 ${figure(median, unit)} 的 ${ratio.toFixed(1)} 倍`
  }
  return [
    `# 《${post.title}》`,
    `账号 ${detail.account.name}（${detail.platform.displayName}）；发布 ${post.publishedAt ?? '未知'}；数据更新于 ${post.updatedAt}${post.url === undefined ? '' : `；${post.url}`}`,
    '## 数据',
    ...detail.metrics.map(metric => `- ${metric.label}：${figure(metric.value)}${versus(metric.value, metric.median)}`),
    ...detail.rates.length === 0 ? [] : ['## 比率', ...detail.rates.map(rate => `- ${rate.label}：${figure(rate.value, 'percent')}${versus(rate.value, rate.median, 'percent')}`)],
    detail.rank === undefined ? '' : `按${detail.rank.by}在近期 ${detail.rank.of} 条作品里排第 ${detail.rank.position}。`,
    `对比基准：同账号最近 ${detail.baselinePosts} 条其他作品。`,
  ].filter(line => line !== '').join('\n')
}

/**
 * Find a post of an account by id, `latest`, or a title fragment.
 * @param host - suite.
 * @param account - the account.
 * @param ref - post id, `latest`/`最新`, or part of the title.
 * @returns the post.
 * @throws {Error} listing recent titles when nothing matches.
 */
export function resolvePost(host: MediaToolHost, account: MediaAccount, ref: string): MediaPost {
  const recent = host.posts(account.id, 100)
  const wanted = ref.trim()
  const found = wanted === '' || wanted === 'latest' || wanted === '最新' ? recent[0]
    : recent.find(post => post.postId === wanted) ?? recent.find(post => post.title.includes(wanted))
  if (found === undefined) {
    throw new Error(`No post "${ref}" in ${account.name}. Recent posts: ${recent.slice(0, 8).map(post => `《${post.title}》(${post.postId})`).join('; ') || 'none'}.`)
  }
  return found
}

/**
 * Find an account by id or exact name.
 * @param host - suite.
 * @param ref - id or display name.
 * @returns the account.
 * @throws {Error} naming the configured accounts when none matches.
 */
export function resolveAccount(host: MediaToolHost, ref: string): MediaAccount {
  const accounts = host.accounts()
  const found = accounts.find(account => account.id === ref) ?? accounts.find(account => account.name === ref.trim())
  if (found === undefined) {
    throw new Error(`No media account "${ref}". Configured accounts: ${accounts.map(account => `${account.name} (${account.id})`).join(', ') || 'none; add one in the media suite panel'}.`)
  }
  return found
}

function line(label: string, value: number | undefined): string {
  return `${label} ${value ?? '-'}`
}

/**
 * Render an overview as Markdown.
 * @param overview - dashboard summary.
 * @param platform - platform display name.
 * @param days - window length.
 * @returns Markdown text.
 */
export function renderOverview(overview: MediaAccountOverview, platform: string, days: number): string {
  const { account, latest, deltas, engagement, lastRun } = overview
  return [
    `# ${account.name}（${platform}，${account.role === 'own' ? '自有' : '对标'}）`,
    `最新：${line('粉丝', latest?.followers)}，${line('获赞', latest?.likes)}，${line('作品', latest?.posts)}${latest === undefined ? '' : `（${latest.capturedAt}）`}`,
    `近 ${days} 天变化：${line('粉丝', deltas.followers)}，${line('获赞', deltas.likes)}，${line('作品', deltas.posts)}`,
    `近 ${days} 天作品 ${engagement.postCount} 篇，平均 ${line('阅读/播放', engagement.avgViews)}，${line('赞', engagement.avgLikes)}，${line('评', engagement.avgComments)}，${line('藏', engagement.avgCollects)}`,
    `登录状态：${overview.login}；上次采集：${lastRun === undefined ? '无' : `${lastRun.finishedAt} ${lastRun.ok ? '成功' : `失败（${lastRun.errorCode ?? ''} ${lastRun.message ?? ''}）`}`}`,
  ].join('\n')
}

/**
 * Render a topic report as Markdown.
 * @param report - report.
 * @returns Markdown text.
 */
export function renderTopics(report: MediaTopicReport): string {
  return [report.summary, ...report.suggestions.map((item, index) => [
    `## ${index + 1}. ${item.title}（${item.priority}，${item.format}）`,
    `角度：${item.angle}`, `理由：${item.reason}`, `候选标题：${item.headlines.join(' / ')}`,
    ...item.references.length === 0 ? [] : [`参考：${item.references.join('；')}`],
  ].join('\n'))].join('\n\n')
}

/**
 * Render an analysis report as Markdown.
 * @param report - report.
 * @returns Markdown text.
 */
export function renderAnalysis(report: MediaAnalysisReport): string {
  return [
    report.summary,
    ...report.strengths.length === 0 ? [] : [`做得好的：\n${report.strengths.map(item => `- ${item}`).join('\n')}`],
    ...report.items.map((item, index) => `## ${index + 1}. [${item.area}] ${item.finding}（${item.priority}）\n证据：${item.evidence}\n建议：${item.action}`),
  ].join('\n\n')
}

const ACCOUNT_PARAM = { type: 'string', required: true, description: 'Account id or exact account name from media_accounts.' } as const
const TEXT_OUTPUT = { schema: { type: 'string' }, render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }] } as const

/**
 * Register the suite's model tools for the caller's lifetime.
 * @param ctx - context holding `tools`.
 * @param host - suite operations.
 */
export function registerMediaTools(ctx: Context, host: MediaToolHost): void {
  ctx.tools.register(defineTool({
    name: 'media_accounts',
    description: 'List the self-media accounts in the media suite (抖音, 小红书, 公众号, 视频号 …) with their platform and whether their data is current.',
    parameters: {},
    output: TEXT_OUTPUT,
    execute: () => Promise.resolve(host.accounts().map(account => `- ${account.name} | id ${account.id} | ${host.platformName(account.platform)} | ${account.role === 'own' ? '自有' : '对标'} | 领域 ${account.niche || '-'} | ${renderHealth(host.healthOf(account))}`).join('\n') || 'No accounts configured; the user adds them in the media suite panel.'),
  }))
  ctx.tools.register(defineTool({
    name: 'media_overview',
    description: 'Read one media account\'s dashboard over a window: whether its data is current, period totals of plays or reads, likes, comments, shares, follower changes with daily values (only numbers the platform reports), and the best recent posts. Use it for questions about how an account is doing.',
    parameters: {
      account: ACCOUNT_PARAM,
      days: { type: 'integer', description: 'Window in days, 1 to 90, default 7.' },
    },
    output: TEXT_OUTPUT,
    execute: (args) => {
      const account = resolveAccount(host, args.account)
      return Promise.resolve(renderDashboard(host.dashboard(account.id, Math.min(90, Math.max(1, args.days ?? 7)))))
    },
  }))
  ctx.tools.register(defineTool({
    name: 'media_posts',
    description: 'List one media account\'s posts with their latest counters (plays or reads, likes, comments, shares, collects), newest first or ranked by a counter. Use it for questions like "my latest video" or "which post did best".',
    parameters: {
      account: ACCOUNT_PARAM,
      limit: { type: 'integer', description: 'How many posts, 1 to 50, default 10.' },
      sort: { type: 'string', enum: ['newest', 'views', 'likes', 'comments', 'shares', 'collects'], description: 'Order: newest first (default) or by a counter, largest first.' },
    },
    output: TEXT_OUTPUT,
    execute: (args) => {
      const account = resolveAccount(host, args.account)
      const limit = Math.min(50, Math.max(1, args.limit ?? 10))
      const sort = args.sort ?? 'newest'
      const posts = host.posts(account.id, 100)
      const ordered = sort === 'newest' ? posts : [...posts].filter(post => post[sort] !== undefined).sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0))
      const dashboard = host.dashboard(account.id, 7)
      return Promise.resolve(`${account.name}（${dashboard.platform.displayName}）${renderHealth(dashboard.health)}\n${renderPosts(ordered.slice(0, limit), dashboard.platform)}`)
    },
  }))
  ctx.tools.register(defineTool({
    name: 'media_post',
    description: 'Read one post in depth: its counters, rates per view, and how it compares with the same account\'s other recent posts.',
    parameters: {
      account: ACCOUNT_PARAM,
      post: { type: 'string', required: true, description: 'Post id from media_posts, part of its title, or "latest" for the newest post.' },
    },
    output: TEXT_OUTPUT,
    execute: (args) => {
      const account = resolveAccount(host, args.account)
      const post = resolvePost(host, account, args.post)
      return Promise.resolve(`${renderPostDetail(host.postDetail(account.id, post.postId))}\n${renderHealth(host.healthOf(account))}`)
    },
  }))
  ctx.tools.register(defineTool({
    name: 'media_topics',
    description: 'Generate and store AI topic recommendations for one media account from its recent posts and data. Takes up to a few minutes.',
    parameters: { account: ACCOUNT_PARAM },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => renderTopics(await host.generateTopics(resolveAccount(host, args.account).id, exec.signal)),
  }))
  ctx.tools.register(defineTool({
    name: 'media_analyze',
    description: 'Generate and store an AI diagnosis of what one own media account should improve, from its recent metrics and posts. Takes up to a few minutes.',
    parameters: { account: ACCOUNT_PARAM },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => renderAnalysis(await host.analyze(resolveAccount(host, args.account).id, exec.signal)),
  }))
}
