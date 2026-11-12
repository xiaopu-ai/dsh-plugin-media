/** 总览 across accounts: 全网 sums, works published on several platforms, and the AI overview's prompt and answer. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { describe, expect, it } from 'vitest'
import { buildBriefPrompt, findSyncedWorks, networkTotals, parseBriefLines, requireBriefItems, titleKey, titleSimilarity } from '../src/network.ts'
import type { MediaAccount, MediaAccountId, MediaKpi, MediaNetworkAccount, MediaPlatformDescriptor, MediaPost } from '../src/types.ts'

function account(id: string, platform: string): MediaAccount {
  return {
    id: brandString<MediaAccountId>(id), platform, role: 'own', name: id, profileUrl: '', niche: '', notes: '',
    monitor: { enabled: true, intervalMinutes: 360 }, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
  }
}
const descriptor = (id: string, displayName: string): MediaPlatformDescriptor => ({
  id, displayName, loginUrl: '', scrape: true, import: true, importHint: '', profileUrlExample: '',
})
const kpi = (key: string, value: number, previous: number | undefined, daily: [string, number][]): MediaKpi => ({
  key, label: key, unit: 'count', value, previous, change: previous === undefined ? undefined : (value - previous) / previous,
  daily: daily.map(([day, item]) => ({ day, value: item })), hint: '',
})
function networkAccount(id: string, platform: string, kpis: MediaKpi[], followers?: number): MediaNetworkAccount {
  return { account: account(id, platform), platform: descriptor(platform, platform), health: { state: 'ok', monitored: true }, followers, kpis, from: '2026-11-05', to: '2026-11-11' }
}
function post(accountId: string, postId: string, title: string, publishedAt: string, views?: number): MediaPost {
  return { accountId: brandString<MediaAccountId>(accountId), postId, title, publishedAt, format: 'video', views, extra: {}, source: 'scrape', updatedAt: publishedAt }
}

describe('全网 totals', () => {
  it('adds every account up without de-duplication, compares only when every account has a previous window, and keeps common days', () => {
    const douyin = networkAccount('dy', 'douyin', [kpi('views', 68084, 14000, [['2026-11-10', 4289], ['2026-11-11', 4000]]), kpi('followers', 5844, 5400, [])], 5844)
    const channels = networkAccount('sph', 'wechat-channels', [kpi('views', 23000, undefined, [['2026-11-10', 809], ['2026-11-11', 693]])], 916)
    const xhs = networkAccount('xhs', 'xiaohongshu', [kpi('views', 112, 124, [['2026-11-10', 14]])], 2237)
    const totals = networkTotals([douyin, channels, xhs])
    const views = totals.find(total => total.key === 'views')
    expect(views).toMatchObject({ value: 68084 + 23000 + 112, previous: undefined, change: undefined })
    expect(views?.parts.map(part => part.value)).toEqual([68084, 23000, 112])
    // 11-11 is missing for 小红书 (it reports a day later), so only 11-10 is common.
    expect(views?.daily).toEqual([{ day: '2026-11-10', total: 4289 + 809 + 14, parts: { dy: 4289, sph: 809, xhs: 14 } }])
    expect(totals.find(total => total.key === 'followers')).toMatchObject({ value: 5844 + 916 + 2237 })
    expect(totals.some(total => total.key === 'comments')).toBe(false)
  })
})

describe('the same work on several platforms', () => {
  it('matches titles once hashtags and punctuation are gone, and needs different platforms within a week', () => {
    expect(titleKey('AI入门｜模型名字怎么读 #抖音精选App知识充电站 #AI入门')).toBe('ai入门模型名字怎么读')
    expect(titleKey('#ai入门 #ai #模型')).toBe('ai入门ai模型')
    expect(titleSimilarity(titleKey('AI入门｜模型名字怎么读 #AI入门'), titleKey('AI入门：模型名字怎么读？'))).toBe(1)
    expect(titleSimilarity('完全不同的标题内容', '另一个毫无关系的话题')).toBeLessThan(0.3)
    const posts = [
      post('dy', 'd1', 'AI入门｜模型名字怎么读 #抖音精选', '2026-11-07T04:00:00Z', 9448),
      post('sph', 's1', 'AI入门：模型名字怎么读？', '2026-11-07T05:00:00Z', 2361),
      post('xhs', 'x1', 'AI入门 模型名字怎么读', '2026-11-30T05:00:00Z', 50),
      post('dy', 'd2', '完全不同的一条视频', '2026-11-08T04:00:00Z', 100),
    ]
    const platformOf = (id: string): string | undefined => ({ dy: 'douyin', sph: 'wechat-channels', xhs: 'xiaohongshu' })[id]
    const works = findSyncedWorks(posts, platformOf)
    expect(works).toHaveLength(1)
    expect(works[0]?.posts.map(item => item.postId)).toEqual(['d1', 's1'])
    expect(works[0]?.views).toBe(9448 + 2361)
  })
})

describe('今日简报', () => {
  const douyin = networkAccount('dy', 'douyin', [kpi('views', 68084, 14000, [])], 5844)
  const channels = networkAccount('阿青视频号', 'wechat-channels', [kpi('views', 23000, undefined, [])], 916)
  it('names every account in the prompt and asks for one JSON line per item', () => {
    const prompt = buildBriefPrompt({
      accounts: [douyin], totals: networkTotals([douyin]), synced: [],
      posts: [post('dy', 'd1', 'AI入门｜模型名字怎么读', '2026-11-07T04:00:00Z', 9448)], platformName: () => '抖音', today: '2026-11-12',
    })
    expect(prompt.input).toContain('今天是 2026-11-12')
    expect(prompt.input).toContain('平台：douyin；账号名：dy')
    expect(prompt.input).toContain('views：68084（较上期 +386%）')
    expect(prompt.input).toContain('最近一次发布：2026-11-07')
    expect(prompt.system).toContain('每行输出一个 JSON 对象')
  })

  it('shows finished lines while the answer streams, and links a line to the account it names', () => {
    const streaming = '{"kind":"fact","text":"全网播放 9.4 万"}\n{"kind":"alert","text":"小红书 7 天没发","acc'
    expect(parseBriefLines(streaming, false, [douyin, channels])).toEqual([{ kind: 'fact', text: '全网播放 9.4 万' }])
    const done = [
      '```json', '{"kind":"action","text":"视频号补封面","account":"阿青视频号","platform":"视频号"}', 'not json',
      '{"kind":"topic","text":"AI 黑话第二期","platform":"公众号"}', '{"kind":"other","text":"x"}',
    ].join('\n')
    expect(parseBriefLines(done, true, [douyin, channels])).toEqual([
      { kind: 'action', text: '视频号补封面', accountId: '阿青视频号', platform: '视频号' },
      { kind: 'topic', text: 'AI 黑话第二期', platform: '公众号' },
    ])
    expect(() => requireBriefItems([])).toThrow(/逐行/)
  })

  it('keeps the explanation shown when a line is opened, links the work it names and the counter it is about', () => {
    const posts = [post('dy', 'd1', 'AI入门｜模型名字怎么读 #抖音精选', '2026-11-07T04:00:00Z', 9448), post('阿青视频号', 's1', 'AI入门：模型名字怎么读？', '2026-11-07T05:00:00Z', 2361)]
    const line = (value: object): string => JSON.stringify(value)
    const text = [
      line({ kind: 'action', text: '把 9448 播放的那条切条发视频号', detail: ' 抖音这条 7 天 9448 播放，视频号同题只有 2361。剪成 60 秒竖版，今晚 8 点发视频号。 ', account: 'dy', work: 'AI入门｜模型名字怎么读', metric: 'views' }),
      line({ kind: 'topic', text: 'AI 黑话第二期', work: '完全没出现过的标题', metric: 'reach' }),
    ].join('\n')
    expect(parseBriefLines(text, true, [douyin, channels], posts)).toEqual([
      { kind: 'action', text: '把 9448 播放的那条切条发视频号', detail: '抖音这条 7 天 9448 播放，视频号同题只有 2361。剪成 60 秒竖版，今晚 8 点发视频号。', accountId: 'dy', platform: 'douyin', post: { accountId: 'dy', postId: 'd1' }, metric: 'views' },
      { kind: 'topic', text: 'AI 黑话第二期' },
    ])
    expect(buildBriefPrompt({ accounts: [douyin], totals: [], synced: [], posts: [], platformName: () => '抖音', today: '2026-11-12' }).system).toContain('detail 是点开这一行看到的说明')
  })

  it('keeps 90 days for the trend: counts add whoever reported, levels keep the common days', () => {
    const long = (id: string, platform: string, views: [string, number][], followers: [string, number][]): MediaNetworkAccount =>
      networkAccount(id, platform, [kpi('views', 1, undefined, views), kpi('followers', 1, undefined, followers)])
    const history = [
      long('dy', 'douyin', [['2026-10-01', 100], ['2026-11-10', 300]], [['2026-10-01', 5000], ['2026-11-10', 5800]]),
      long('sph', 'wechat-channels', [['2026-11-10', 50]], [['2026-11-10', 900]]),
    ]
    const totals = networkTotals(history, history)
    expect(totals.find(total => total.key === 'views')?.trend).toEqual([
      { day: '2026-10-01', total: 100, parts: { dy: 100 } }, { day: '2026-11-10', total: 350, parts: { dy: 300, sph: 50 } },
    ])
    expect(totals.find(total => total.key === 'followers')?.trend).toEqual([{ day: '2026-11-10', total: 6700, parts: { dy: 5800, sph: 900 } }])
  })
})
