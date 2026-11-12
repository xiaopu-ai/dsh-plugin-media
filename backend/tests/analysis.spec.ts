/** Prompts carry account data and references; model answers are validated JSON with tolerant enums. */
import { describe, expect, it } from 'vitest'
import { brandString } from '@deepseek-ai/dsh-brand'
import {
  buildAnalysisPrompt, buildTopicPrompt, cadenceLine, contentStatsBlock, dailyFunnelLine, extractJson, MediaLlmOutputError,
  parseAnalysisOutput, parseTopicOutput, postLines, rankPosts,
} from '../src/analysis.ts'
import { buildOverview, interactionsOf, postsInWindow } from '../src/overview.ts'
import { dueAccounts, nextRunAt } from '../src/monitor.ts'
import type { MediaAccount, MediaAccountId, MediaPost } from '../src/types.ts'

const id = brandString<MediaAccountId>('acct-1')
const account: MediaAccount = {
  id, platform: 'xiaohongshu', role: 'own', name: '穿搭日记', profileUrl: '', niche: '职场穿搭', notes: '25-30 岁通勤女性',
  monitor: { enabled: true, intervalMinutes: 60 }, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
}
function post(postId: string, likes: number | undefined, publishedAt?: string): MediaPost {
  return { accountId: id, postId, title: `作品${postId}`, format: 'image', likes, views: likes === undefined ? undefined : likes * 10, publishedAt, extra: {}, source: 'scrape', updatedAt: '2024-06-10T00:00:00.000Z' }
}

describe('prompts', () => {
  const posts = [post('a', 500, '2024-06-09T00:00:00.000Z'), post('b', 5, '2024-06-05T00:00:00.000Z'), post('c', 50, '2024-06-01T00:00:00.000Z'), post('d', undefined)]

  it('ranks posts by interactions', () => {
    expect(interactionsOf(post('x', undefined))).toBeUndefined()
    const { best, worst } = rankPosts(posts, 1, 5)
    expect(best.map(item => item.postId)).toEqual(['a'])
    expect(worst.map(item => item.postId)).toEqual(['b', 'c'])
  })

  it('describes cadence', () => {
    expect(cadenceLine(posts)).toContain('共 3 篇')
    expect(cadenceLine([post('x', 1)])).toContain('不足以计算')
  })

  it('includes account data and benchmark posts in the topic prompt', () => {
    const benchmark = { ...account, id: brandString<MediaAccountId>('acct-2'), role: 'benchmark' as const, name: '对标号' }
    const prompt = buildTopicPrompt(account, '小红书', posts, [{ account: benchmark, posts: [{ ...post('z', 9000), title: '爆款穿搭公式' }] }], 6)
    expect(prompt.system).toContain('给出 6 个选题')
    expect(prompt.input).toContain('职场穿搭')
    expect(prompt.input).toContain('### 对标号')
    expect(prompt.input).toContain('爆款穿搭公式')
    expect(buildTopicPrompt(account, '小红书', [], [], 3).input).toContain('未配置对标账号')
  })

  it('adds the requested direction and the titles earlier reports gave to the topic prompt', () => {
    const plain = buildTopicPrompt(account, '小红书', posts, [], 3).input
    expect(plain).not.toContain('这次想做的方向')
    expect(plain).not.toContain('最近已经给过的选题')
    const steered = buildTopicPrompt(account, '小红书', posts, [], 3, undefined, { direction: '  双十一好物  ', previous: ['通勤穿搭', '面试穿什么'] })
    expect(steered.input).toContain('## 这次想做的方向\n\n双十一好物')
    expect(steered.input).toContain('## 最近已经给过的选题\n\n- 通勤穿搭\n- 面试穿什么')
    expect(buildTopicPrompt(account, '小红书', posts, [], 3, undefined, { direction: ' ' }).input).not.toContain('这次想做的方向')
  })

  it('includes window metrics in the analysis prompt', () => {
    const overview = buildOverview({
      account,
      snapshots: [
        { accountId: id, capturedAt: '2024-06-01T00:00:00.000Z', source: 'scrape', followers: 100, extra: {} },
        { accountId: id, capturedAt: '2024-06-10T00:00:00.000Z', source: 'scrape', followers: 130, likes: 900, extra: {} },
      ],
      latest: undefined, posts, since: '2024-06-02T00:00:00.000Z', lastRun: undefined, login: 'logged-in', nextRunAt: undefined,
    })
    expect(overview.deltas).toEqual({ followers: 30, likes: 0, posts: undefined })
    expect(overview.engagement).toEqual({ postCount: 3, avgLikes: 252.5, avgComments: undefined, avgCollects: undefined, avgViews: 2525 })
    const prompt = buildAnalysisPrompt(overview, '小红书', postsInWindow(posts, '2024-06-02T00:00:00.000Z'), 30)
    expect(prompt.input).toContain('粉丝 30')
    expect(prompt.input).toContain('平均互动率（互动/阅读）：10.00%')
    expect(prompt.input).toContain('## 作品数据统计')
    expect(prompt.system).toContain('以账号自己的中位数为基准')
    expect(prompt.system).toContain('期望从多少变到多少')
    expect(prompt.input).not.toContain('创作者后台日数据')
  })

  it('pre-computes medians, rates and splits by format and publish time', () => {
    expect(contentStatsBlock([])).toBe('（暂无作品数据）')
    const mixed: MediaPost[] = [
      { ...post('v1', 10, '2024-06-01T12:00:00.000Z'), format: 'video', collects: 2, shares: 1, comments: 1, title: '视频 #AI #效率' },
      { ...post('v2', 30, '2024-06-02T12:00:00.000Z'), format: 'video' },
      { ...post('i1', 1000, '2024-06-03T02:00:00.000Z'), title: '爆款' },
      post('n1', undefined),
    ]
    const block = contentStatsBlock(mixed)
    expect(block).toContain('样本 4 篇，其中 3 篇有阅读/播放数据。')
    // Plays 100, 300 and 10,000: the median ignores the outlier.
    expect(block).toContain('中位数 300，平均 3467，最高 10000（中位数的 33.3 倍）')
    expect(block).toContain('按形式：图文 2 篇')
    expect(block).toContain('视频 2 篇，播放中位数 200')
    // 12:00 UTC is 20:00 in China, 02:00 UTC is 10:00.
    expect(block).toContain('晚间 18–24 点 2 篇')
    expect(block).toContain('早间 6–12 点 1 篇')
    expect(block).toContain('平均每篇话题标签 0.5 个')
    expect(contentStatsBlock([post('z', undefined)])).not.toContain('阅读/播放：')
    expect(postLines([mixed[0] as MediaPost])).toContain('[2024-06-01 20:00 周六]')
    expect(postLines([mixed[0] as MediaPost])).toContain('互动率 14.0% | 收藏率 2.0%')
    expect(postLines([post('q', undefined)])).toContain('[日期未知]')
  })

  it('summarizes the creator funnel when the platform reports daily data', () => {
    const base = buildOverview({
      account, snapshots: [], latest: undefined, posts: [], since: '2024-06-01T00:00:00.000Z', lastRun: undefined, login: 'logged-in', nextRunAt: undefined,
    })
    expect(dailyFunnelLine(base)).toBeUndefined()
    const series = [{ at: '2024-06-01T04:00:00.000Z', plays: 100, profileViews: 40, fansNet: 2 }, { at: '2024-06-02T04:00:00.000Z', plays: 50, profileViews: 10, fansNet: 3 }]
    expect(dailyFunnelLine({ ...base, series })).toBe('创作者后台日数据合计：播放 150，主页访问 50，净增粉丝 5，主页访问转粉率（净增粉丝 ÷ 主页访问）10.0%。')
    expect(dailyFunnelLine({ ...base, series: [{ at: '2024-06-01T04:00:00.000Z', plays: 9 }] })).toBe('创作者后台日数据合计：播放 9，主页访问 -，净增粉丝 -。')
    const prompt = buildAnalysisPrompt({ ...base, series }, '抖音', [], 30)
    expect(prompt.input).toContain('主页访问转粉率')
    const topics = buildTopicPrompt(account, '抖音', [post('a', 1)], [], 3)
    expect(topics.input).toContain('## 作品数据统计')
    expect(topics.system).toContain('小红书不超过 20 个字')
  })
})

describe('model output', () => {
  it('extracts JSON from fences and prose', () => {
    expect(extractJson('好的：\n```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(extractJson('结果 {"a": {"b": 2}} 完')).toEqual({ a: { b: 2 } })
    expect(() => extractJson('没有')).toThrow(MediaLlmOutputError)
    expect(() => extractJson('{oops}')).toThrow(MediaLlmOutputError)
  })

  it('accepts topics with unknown enums and rejects empty suggestions', () => {
    const output = parseTopicOutput(JSON.stringify({
      summary: '围绕通勤场景',
      suggestions: [{ title: '一周通勤穿搭', angle: '5 套搭配', reason: '高赞作品均为合集', format: '图文', headlines: ['A', 7], priority: 'urgent' }],
    }))
    expect(output.suggestions[0]).toEqual({ title: '一周通勤穿搭', angle: '5 套搭配', reason: '高赞作品均为合集', format: 'other', headlines: [], references: [], priority: 'medium', keywords: [] })
    expect(() => parseTopicOutput('{"summary": "x", "suggestions": []}')).toThrow(MediaLlmOutputError)
  })

  it('validates analysis items', () => {
    expect(parseAnalysisOutput('{"summary":"s","items":[{"area":"发布节奏","finding":"断更","evidence":"10 天","action":"固定周三","priority":"high"}]}'))
      .toEqual({ summary: 's', strengths: [], items: [{ area: '发布节奏', finding: '断更', evidence: '10 天', action: '固定周三', priority: 'high' }] })
    expect(() => parseAnalysisOutput('{"summary":"s","items":[{"area":"x"}]}')).toThrow(MediaLlmOutputError)
  })
})

describe('monitor', () => {
  it('schedules from the last scrape, clamped to the minimum interval', () => {
    const now = Date.parse('2024-06-10T12:00:00.000Z')
    const run = { accountId: id, kind: 'scrape' as const, startedAt: '2024-06-10T11:40:00.000Z', finishedAt: '2024-06-10T11:41:00.000Z', ok: false, postsWritten: 0 }
    const fast = { ...account, monitor: { enabled: true, intervalMinutes: 5 } }
    expect(nextRunAt(fast, run, 30, now)).toBe('2024-06-10T12:10:00.000Z')
    expect(nextRunAt(fast, undefined, 30, now)).toBe('2024-06-10T12:00:00.000Z')
    expect(nextRunAt({ ...account, monitor: { enabled: false, intervalMinutes: 60 } }, run, 30, now)).toBeUndefined()
    const fresh = { ...account, id: brandString<MediaAccountId>('acct-new') }
    expect(dueAccounts([fast, fresh], item => item.id === id ? run : undefined, 30, now).map(item => item.id)).toEqual(['acct-new'])
    expect(dueAccounts([fast], () => run, 15, now).map(item => item.id)).toEqual([id])
  })

  it('tries again sooner after a failure that may pass on its own, and waits the interval for one that needs the user', () => {
    const now = Date.parse('2024-06-10T12:00:00.000Z')
    const slow = { ...account, monitor: { enabled: true, intervalMinutes: 360 } }
    const run = { accountId: id, kind: 'scrape' as const, startedAt: '2024-06-10T11:00:00.000Z', finishedAt: '2024-06-10T11:03:00.000Z', postsWritten: 0 }
    const failed = { ...run, ok: false, errorCode: 'scrape-failed' }
    expect(nextRunAt(slow, failed, 30, now, 30)).toBe('2024-06-10T11:30:00.000Z')
    expect(nextRunAt(slow, failed, 30, now)).toBe('2024-06-10T17:00:00.000Z')
    expect(nextRunAt(slow, { ...run, ok: false }, 30, now, 30)).toBe('2024-06-10T11:30:00.000Z')
    expect(nextRunAt(slow, { ...run, ok: false, errorCode: 'login-required' }, 30, now, 30)).toBe('2024-06-10T17:00:00.000Z')
    expect(nextRunAt(slow, { ...run, ok: true }, 30, now, 30)).toBe('2024-06-10T17:00:00.000Z')
    expect(nextRunAt({ ...account, monitor: { enabled: true, intervalMinutes: 10 } }, failed, 5, now, 30)).toBe('2024-06-10T11:10:00.000Z')
    expect(dueAccounts([slow], () => failed, 30, now, 30).map(item => item.id)).toEqual([id])
    expect(dueAccounts([slow], () => failed, 30, now)).toEqual([])
  })
})
