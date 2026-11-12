/**
 * Sample data for testing the page: two 抖音 accounts (one whose login expired), a 小红书, a 公众号 and a 视频号 account.
 * Each has sixty days of the daily values its platform's creator backend reports, posts with drawn covers, and the 抖音
 * account a topic report, a diagnosis report and two drafts. Every value is made up and fixed by a seed, so a test shows
 * the same numbers each time; nothing here calls a platform or a model. The page offers it only in development mode.
 */
import { brandString } from '@deepseek-ai/dsh-brand'
import type {
  MediaAccount, MediaAccountId, MediaAnalysisReport, MediaDraft, MediaDraftId, MediaMetricSnapshot, MediaPlatformId, MediaPost,
  MediaPostFormat, MediaReportId, MediaRunRecord, MediaTopicReport,
} from './types.ts'

/** Everything one demonstration loads. */
export interface MediaDemoData {
  readonly accounts: readonly MediaAccount[]
  readonly snapshots: readonly MediaMetricSnapshot[]
  readonly posts: readonly MediaPost[]
  /** Last runs; the expired 抖音 account's run failed for login. */
  readonly runs: readonly MediaRunRecord[]
  readonly topicReport: MediaTopicReport
  readonly analysisReport: MediaAnalysisReport
  readonly drafts: readonly MediaDraft[]
}

const DAY_MS = 86_400_000
const HISTORY_DAYS = 60

/** A small seeded generator, so the sample numbers are the same on every load. */
function generator(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}

const DOUYIN_TITLES = [
  '200 块钱把 AI 变成你的产品经理：从一句需求到可点击原型', '我用 AI 复盘了自己所有抖音作品，爆款原来只有一个共同点',
  '每周 AI 圈大事件：本周谁在撒钱、谁在抢人', '别再手写 PRD 了，这 3 个提示词够用一年', 'AI 做竞品分析，30 分钟出一份老板能看懂的报告',
  '同一个需求，让 4 个大模型分别做原型，差距有多大', '新人产品经理最容易踩的 5 个坑，AI 帮你提前避开', '把用户访谈录音丢给 AI，它整理出了我没发现的需求',
  'AI 产品经理的一天：真实工作流全公开', '大厂都在用的 AI 原型工具，免费版就够了', '我让 AI 给我的产品打分，结果有点扎心',
  '用 AI 做数据看板，不会 SQL 也能上手', '为什么你的 AI 产品没人用？3 个原因', 'AI 写的需求文档，开发真的看得懂吗',
  '一个人 + AI，一周做完一个小程序', '产品经理转 AI 方向，先学这 4 件事', 'AI 帮我砍掉了一半会议，方法在这', '面试 AI 产品经理，被问到最多的 6 个问题',
]
const DOUYIN_TITLES_2 = [
  'Agent｜一个视频讲透 AI Agent', 'AI 扫盲｜模型名字怎么看', 'RAG｜一个视频讲透 RAG 应用原理', 'AI 黑话｜Token 到底是什么',
  'AI 扫盲｜什么是多模态', '提示词｜三个公式写出好提示词', 'AI 黑话｜微调和 RAG 有什么区别', 'AI 扫盲｜大模型为什么会胡说八道',
]
const XHS_TITLES = [
  '我的 AI 工具清单｜每天都在用的 8 个', '产品经理的桌面整理，AI 帮我省了 2 小时', '用 AI 做小红书封面，3 分钟出一张', '转行 AI 产品经理，我的学习路线',
  'AI 帮我写周报，老板说进步很大', '周末用 AI 做了个记账小程序', '面试被问 AI，我这样回答拿到了 offer', '一张图看懂 AI Agent',
  'AI 读书笔记｜《思考，快与慢》', '我的 AI 提示词收藏夹公开',
]
const MP_TITLES = [
  '万字长文：AI 产品经理的能力模型', '我们为什么放弃了自研大模型', 'AI Agent 落地的 5 个真实案例', '复盘：一个 AI 功能从立项到下线',
  '大模型应用的成本账，算清楚再做', 'AI 原型工具横评（2026 版）', '给产品新人的 AI 工具使用指南', '从需求文档到可点原型，我的 AI 工作流',
]
const CHANNELS_TITLES = ['30 秒看懂 AI 原型工具', '产品经理的一天｜AI 版', '一句话让 AI 做出一个网页', 'AI 会议纪要实测', '我用 AI 做了一个小游戏', '大模型选型，记住这三点']

/** Cover colors: a gradient per post, picked by index. */
const COVER_COLORS = [['#FF7A59', '#FE2C55'], ['#4E7BFF', '#7B5CFF'], ['#16C2A3', '#1E8BFF'], ['#FFB020', '#FF6A3D'], ['#7B5CFF', '#E14EFF'], ['#22B573', '#0FA3B1']] as const

/**
 * A drawn cover: a 3:4 gradient with the title in large white type, as a `data:` URL.
 * @param title - post title.
 * @param index - picks the colors.
 * @returns the image URL.
 */
export function demoCover(title: string, index: number): string {
  const [from, to] = COVER_COLORS[index % COVER_COLORS.length] ?? COVER_COLORS[0]
  const text = title.replace(/[｜|：:，,？?！!（）()《》]/g, ' ').replace(/\s+/g, ' ').trim()
  const lines: string[] = []
  for (let at = 0; at < text.length && lines.length < 4; at += 6) lines.push(text.slice(at, at + 6))
  const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="240" height="320" fill="url(#g)"/><rect x="18" y="22" width="44" height="6" rx="3" fill="#fff" opacity=".7"/>${lines.map((line, row) => `<text x="18" y="${92 + row * 44}" font-family="PingFang SC,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#fff">${escape(line)}</text>`).join('')}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** One account to generate. */
interface AccountPlan {
  readonly account: MediaAccount
  readonly titles: readonly string[]
  readonly format: MediaPostFormat
  /** Base views per post; 0 for a platform without views. */
  readonly views: number
  /** Base likes per post when there are no views. */
  readonly likes: number
  /** Followers sixty days ago. */
  readonly followers: number
  /** Account likes total sixty days ago; undefined for a platform without one. */
  readonly totalLikes?: number | undefined
  /** Days between posts. */
  readonly every: number
  /** Indices of hit posts. */
  readonly hits: readonly number[]
  /** Daily values the platform's creator backend reports, as snapshot `extra` keys. */
  readonly reports: readonly string[]
  /** Days since the last capture; the account's data stops then. */
  readonly stoppedDaysAgo: number
  readonly urlOf: (index: number) => string
}

function account(id: string, platform: MediaPlatformId, name: string, niche: string, created: string): MediaAccount {
  return {
    id: brandString<MediaAccountId>(id), platform, role: 'own', name, profileUrl: '', niche,
    notes: '演示数据，可以一键清除。', monitor: { enabled: false, intervalMinutes: 360 }, createdAt: created, updatedAt: created, demo: true,
  }
}

/** Capture instant on a day `ago` days back: 22:00 China time, or an hour ago for today. */
function capturedAt(now: number, ago: number): string {
  if (ago === 0) return new Date(now - 3_600_000).toISOString()
  const day = new Date(now + 8 * 3_600_000 - ago * DAY_MS).toISOString().slice(0, 10)
  return new Date(`${day}T22:00:00+08:00`).toISOString()
}

/** Share of a post's views that arrive on its `age`-th day: most in the first days, a long tail for a hit. */
function dayShare(age: number, hit: boolean): number {
  const tau = hit ? 2.6 : 1.2
  return Math.exp(-age / tau) * (1 - Math.exp(-1 / tau))
}

function buildPlan(plan: AccountPlan, now: number, random: () => number): { snapshots: MediaMetricSnapshot[]; posts: MediaPost[] } {
  const { account: acct } = plan
  const stop = plan.stoppedDaysAgo
  const posts: MediaPost[] = []
  /** Views and likes the posts drew on each day back. */
  const dayViews = new Map<number, number>()
  const dayLikes = new Map<number, number>()
  plan.titles.forEach((title, index) => {
    const publishedAgo = index * plan.every + 0.4 + stop
    const hit = plan.hits.includes(index)
    const boost = hit ? 7 + random() * 6 : index % 5 === 3 ? 0.3 : 0.6 + random() * 1.1
    const views = plan.views === 0 ? undefined : Math.round(plan.views * boost)
    const likes = views === undefined ? Math.round(plan.likes * boost) : Math.round(views * (0.03 + random() * 0.03))
    for (let age = 0; age <= Math.floor(publishedAgo) - stop; age++) {
      const ago = Math.floor(publishedAgo) - age
      dayViews.set(ago, (dayViews.get(ago) ?? 0) + (views ?? 0) * dayShare(age, hit))
      dayLikes.set(ago, (dayLikes.get(ago) ?? 0) + likes * dayShare(age, hit))
    }
    posts.push({
      accountId: acct.id, postId: `demo-${acct.id}-${String(index)}`, title, url: plan.urlOf(index), coverUrl: demoCover(title, index + acct.id.length),
      publishedAt: new Date(now - publishedAgo * DAY_MS).toISOString(), format: plan.format, views, likes,
      comments: Math.round(likes * (0.08 + random() * 0.08)), collects: Math.round(likes * (0.25 + random() * 0.3)),
      shares: Math.round(likes * (0.05 + random() * 0.1)), extra: {}, source: 'scrape', updatedAt: capturedAt(now, stop),
    })
  })
  const snapshots: MediaMetricSnapshot[] = []
  let followers = plan.followers
  let likesTotal = plan.totalLikes
  const reports = new Set(plan.reports)
  for (let ago = HISTORY_DAYS - 1; ago >= stop; ago--) {
    // Older posts outside the list keep drawing a little every day.
    const views = Math.round((dayViews.get(ago) ?? 0) + plan.views * 0.25 * (0.6 + random() * 0.8))
    const likes = Math.round((dayLikes.get(ago) ?? 0) + Math.max(plan.likes, plan.views * 0.04) * 0.25 * (0.6 + random() * 0.8))
    const gained = Math.round((plan.views === 0 ? likes * 0.09 : views * 0.007) + 2 + random() * 6)
    const lost = Math.round(1 + random() * Math.max(2, gained * 0.15))
    followers += gained - lost
    if (likesTotal !== undefined) likesTotal += likes
    const values: Record<string, number> = {
      plays: views, postLikes: likes, postComments: Math.round(likes * (0.09 + random() * 0.05)),
      postShares: Math.round(likes * (0.07 + random() * 0.05)), postCollects: Math.round(likes * (0.3 + random() * 0.2)),
      profileViews: Math.round(views * (0.03 + random() * 0.015)), fansNet: gained - lost, newFollowers: gained, unfollows: lost,
      returningFans: Math.round(followers * (0.02 + random() * 0.01)),
      completionRate5s: 0.46 + random() * 0.12, completionRate: 0.12 + random() * 0.08, bounceRate2s: 0.38 + random() * 0.1,
      coverCtr: 0.05 + random() * 0.03, avgPlaySeconds: 28 + random() * 18,
    }
    const extra = Object.fromEntries(Object.entries(values).filter(([key]) => reports.has(key)))
    // A day the account posted nothing has no plays to weigh its rates with on a quiet account; keep rates anyway.
    snapshots.push({ accountId: acct.id, capturedAt: capturedAt(now, ago), source: 'scrape', followers, likes: likesTotal, posts: plan.titles.length + 40 - Math.floor(ago / plan.every), extra })
  }
  return { snapshots, posts }
}

const DOUYIN_REPORTS = ['plays', 'postLikes', 'postShares', 'postComments', 'completionRate5s', 'bounceRate2s', 'coverCtr', 'avgPlaySeconds', 'profileViews', 'fansNet', 'newFollowers', 'unfollows', 'returningFans']

/**
 * Build the sample data relative to a moment.
 * @param now - the moment the newest counters were taken.
 * @returns the accounts, counters, posts, runs, reports and drafts.
 */
export function demoData(now: number): MediaDemoData {
  const random = generator(20_261_111)
  const created = new Date(now - 70 * DAY_MS).toISOString()
  const plans: AccountPlan[] = [
    {
      account: account('acct-demo-douyin', 'douyin', '演示 · 科技号', 'AI 产品与工具', created),
      titles: DOUYIN_TITLES, format: 'video', views: 2600, likes: 0, followers: 11_600, totalLikes: 82_000, every: 2.4,
      hits: [1, 6], reports: DOUYIN_REPORTS, stoppedDaysAgo: 0, urlOf: index => `https://www.douyin.com/video/demo${String(7_400_000 + index)}`,
    },
    {
      account: account('acct-demo-douyin-2', 'douyin', '演示 · 阿青', 'AI 科普', created),
      titles: DOUYIN_TITLES_2, format: 'video', views: 5200, likes: 0, followers: 4_900, totalLikes: 31_000, every: 3,
      hits: [0], reports: DOUYIN_REPORTS, stoppedDaysAgo: 2, urlOf: index => `https://www.douyin.com/video/demo${String(7_500_000 + index)}`,
    },
    {
      account: account('acct-demo-xhs', 'xiaohongshu', '演示 · 效率笔记', 'AI 工具与效率', created),
      titles: XHS_TITLES, format: 'image', views: 0, likes: 180, followers: 3_200, totalLikes: 21_000, every: 3,
      hits: [0, 7], reports: ['postLikes', 'postCollects', 'postComments', 'postShares', 'fansNet', 'newFollowers', 'unfollows'],
      stoppedDaysAgo: 0, urlOf: index => `https://www.xiaohongshu.com/explore/demo${String(index)}`,
    },
    {
      account: account('acct-demo-mp', 'wechat-mp', '演示 · AI 产品手记', 'AI 产品深度', created),
      titles: MP_TITLES, format: 'article', views: 1400, likes: 0, followers: 8_400, every: 4,
      hits: [2], reports: ['plays', 'postLikes', 'postShares', 'postComments', 'fansNet', 'newFollowers', 'unfollows'],
      stoppedDaysAgo: 0, urlOf: index => `https://mp.weixin.qq.com/s/demo${String(index)}`,
    },
    {
      account: account('acct-demo-channels', 'wechat-channels', '演示 · 科技视频号', 'AI 产品与工具', created),
      titles: CHANNELS_TITLES, format: 'video', views: 900, likes: 0, followers: 1_500, every: 3.5,
      hits: [2], reports: ['plays', 'postLikes', 'postComments', 'postShares', 'completionRate', 'avgPlaySeconds', 'fansNet'],
      stoppedDaysAgo: 0, urlOf: index => `https://channels.weixin.qq.com/demo/${String(index)}`,
    },
  ]
  const built = plans.map(plan => buildPlan(plan, now, random))
  const [main] = plans
  const mainPosts = built[0]?.posts ?? []
  if (main === undefined) throw new Error('demo data has no accounts')
  const ownId = main.account.id
  const expired = plans[1]?.account
  const runs: MediaRunRecord[] = expired === undefined ? [] : [{
    accountId: expired.id, kind: 'scrape', startedAt: new Date(now - 3 * 3_600_000).toISOString(), finishedAt: new Date(now - 3 * 3_600_000 + 20_000).toISOString(),
    ok: false, errorCode: 'login-required', message: '抖音登录已过期，请重新扫码登录。', postsWritten: 0,
  }]
  const reportTime = new Date(now - 2 * 3_600_000).toISOString()
  const title = (index: number): string => mainPosts[index]?.title ?? ''
  const topicReport: MediaTopicReport = {
    id: brandString<MediaReportId>('report-demo-topics'), accountId: ownId, createdAt: reportTime, model: '演示数据',
    summary: '账号的爆款都来自“真实工作流 + 具体数字”。建议本周优先做两条实测类视频，标题里放具体数字。',
    suggestions: [
      {
        title: '我测了 6 个 AI 原型工具，从一句需求到能点的页面', angle: '同一个需求交给 6 个工具，录屏对比耗时和成品', priority: 'high', format: 'video',
        reason: '你自己的原型类视频收藏率最高，实测类内容在同领域搜索里热度高。', headlines: ['6 个 AI 原型工具实测，第 1 名是免费的'],
        references: [title(0), title(5)], keywords: ['原型工具', 'AI 实测'], related: [],
      },
    ],
    research: { searches: [], trending: ['AI 原型', 'AI Agent'].map(word => ({ word })), news: [], benchmarksRefreshed: 0, notes: ['演示数据：没有真的去搜索和读取新闻。'] },
  }
  const analysisReport: MediaAnalysisReport = {
    id: brandString<MediaReportId>('report-demo-analysis'), accountId: ownId, createdAt: reportTime, model: '演示数据',
    summary: '账号的内容方向是对的，问题在节奏和开头。', strengths: ['工作流实录类内容收藏率高'],
    items: [{ area: '开头', finding: '低播放作品的开头都在自我介绍', evidence: '播放最低的 5 条，前 3 秒都是“大家好我是阿青”', action: '开头直接抛结论或结果画面', priority: 'high' }],
  }
  const published = mainPosts[1]
  const drafts: MediaDraft[] = [
    {
      id: brandString<MediaDraftId>('draft-demo-video'), source: '宣传片工坊', kind: 'video', title: '演示：新品 32 秒宣传片', note: '9:16 · 32 秒 · 6 个镜头',
      createdAt: new Date(now - 30 * 60_000).toISOString(), demo: true,
    },
    {
      id: brandString<MediaDraftId>('draft-demo-article'), source: '写作', kind: 'article', title: published?.title ?? '演示文章',
      createdAt: new Date(now - 5 * DAY_MS).toISOString(), publishedUrl: published?.url, publishedAt: published?.publishedAt, demo: true,
    },
  ]
  return {
    accounts: plans.map(plan => plan.account),
    snapshots: built.flatMap(data => data.snapshots),
    posts: built.flatMap(data => data.posts),
    runs, topicReport, analysisReport, drafts,
  }
}
