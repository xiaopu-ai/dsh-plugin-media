/** Dashboard computations: health, platform-reported counters only, windows of whole days, radar axes, top posts and the post detail. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { describe, expect, it } from 'vitest'
import { accountHealth, addDays, buildDashboard, buildPostDetail } from '../src/dashboard.ts'
import type { MediaAccount, MediaAccountId, MediaMetricSnapshot, MediaPlatformDescriptor, MediaPost, MediaRunRecord } from '../src/types.ts'

const id = brandString<MediaAccountId>('acct-1')
/** 2026-11-11 noon China time: the windows end on 2026-11-10. */
const NOW = Date.parse('2026-11-11T12:00:00+08:00')
const account: MediaAccount = {
  id, platform: 'douyin', role: 'own', name: '号', profileUrl: '', niche: '', notes: '', monitor: { enabled: true, intervalMinutes: 360 },
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
}
const douyin: MediaPlatformDescriptor = {
  id: 'douyin', displayName: '抖音', loginUrl: '', scrape: true, import: true, importHint: '', profileUrlExample: '',
  metrics: { views: '播放', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' }, noun: '作品',
}
const mp: MediaPlatformDescriptor = { ...douyin, id: 'wechat-mp', displayName: '公众号', metrics: { views: '阅读', likes: '点赞', comments: '留言' }, noun: '文章' }
const xhs: MediaPlatformDescriptor = { ...douyin, id: 'xiaohongshu', displayName: '小红书', metrics: { likes: '点赞', collects: '收藏' }, noun: '笔记' }

/** 22:00 China time on the day `ago` days before 2026-11-11. */
function at(ago: number): string {
  return new Date(`${addDays('2026-11-11', -ago)}T22:00:00+08:00`).toISOString()
}

function snapshot(ago: number, fields: Partial<MediaMetricSnapshot> = {}): MediaMetricSnapshot {
  return { accountId: id, capturedAt: at(ago), source: 'scrape', extra: {}, ...fields }
}

function post(postId: string, publishedAgo: number, fields: Partial<MediaPost> = {}): MediaPost {
  return { accountId: id, postId, title: postId, publishedAt: at(publishedAgo), format: 'video', extra: {}, source: 'scrape', updatedAt: at(0), ...fields }
}

const run = (fields: Partial<MediaRunRecord>): MediaRunRecord => ({ accountId: id, kind: 'scrape', startedAt: at(0), finishedAt: at(0), ok: true, postsWritten: 0, ...fields })

describe('account health', () => {
  const base = { lastRun: undefined, login: 'unknown', nextRunAt: undefined, monitored: true, now: NOW, staleHours: 30 } as const
  it('ranks an expired login above other failures, then stale and missing data', () => {
    const fresh = snapshot(0, { capturedAt: new Date(NOW - 3_600_000).toISOString() })
    expect(accountHealth({ ...base, latest: fresh }).state).toBe('ok')
    expect(accountHealth({ ...base, latest: undefined }).state).toBe('pending')
    expect(accountHealth({ ...base, latest: snapshot(3) }).state).toBe('stale')
    expect(accountHealth({ ...base, latest: fresh, lastRun: run({ ok: false, errorCode: 'scrape-failed', message: '超时' }) })).toMatchObject({ state: 'failing', message: '超时' })
    expect(accountHealth({ ...base, latest: fresh, lastRun: run({ ok: false, errorCode: 'login-required' }) }).state).toBe('login-required')
    expect(accountHealth({ ...base, latest: fresh, login: 'logged-out' }).state).toBe('login-required')
    // Logged in again after the failure: waiting for the next update rather than asking for another scan.
    expect(accountHealth({ ...base, latest: fresh, login: 'logged-in', lastRun: run({ ok: false, errorCode: 'login-required' }) }).state).toBe('pending')
  })
})

describe('dashboard', () => {
  it('sums the platform\'s daily values over whole days ending yesterday, and compares with the window before', () => {
    const snapshots = [
      snapshot(9, { extra: { plays: 50 } }), snapshot(8, { extra: { plays: 50 } }),
      snapshot(2, { extra: { plays: 100, postLikes: 5, postComments: 1, postShares: 1 } }),
      snapshot(1, { extra: { plays: 300, postLikes: 15, postComments: 2, postShares: 1 } }),
      // Today's values are not in a window yet: the platforms report whole days.
      snapshot(0, { extra: { plays: 999 } }),
    ]
    const dashboard = buildDashboard({ account, platform: douyin, snapshots, latest: undefined, posts: [], now: NOW }, 7)
    expect([dashboard.from, dashboard.to]).toEqual(['2026-11-04', '2026-11-10'])
    expect(dashboard.works.find(kpi => kpi.key === 'views')).toMatchObject({ label: '播放量', value: 400, previous: 100, change: 3 })
    expect(dashboard.works.find(kpi => kpi.key === 'engagement')?.value).toBeCloseTo((20 + 3 + 2) / 400)
    expect(dashboard.works.find(kpi => kpi.key === 'views')?.daily).toEqual([{ day: '2026-11-09', value: 100 }, { day: '2026-11-10', value: 300 }])
    const yesterday = buildDashboard({ account, platform: douyin, snapshots, latest: undefined, posts: [], now: NOW }, 1)
    expect(yesterday.works.find(kpi => kpi.key === 'views')).toMatchObject({ value: 300, previous: 100 })
  })

  it('ends the window on the platform\'s last reported day while yesterday is not reported yet', () => {
    const snapshots = [snapshot(3, { extra: { plays: 10 } }), snapshot(2, { extra: { plays: 20 } })]
    const dashboard = buildDashboard({ account, platform: douyin, snapshots, latest: undefined, posts: [], now: NOW }, 7)
    expect([dashboard.from, dashboard.to]).toEqual(['2026-11-03', '2026-11-09'])
    expect(dashboard.works.find(kpi => kpi.key === 'views')?.value).toBe(30)
    // A report older than two days before yesterday no longer holds the window back.
    const stale = buildDashboard({ account, platform: douyin, snapshots: [snapshot(5, { extra: { plays: 10 } })], latest: undefined, posts: [], now: NOW }, 7)
    expect(stale.to).toBe('2026-11-10')
  })

  it('leaves 互动率 out when the platform reports no daily likes', () => {
    const snapshots = [snapshot(2, { extra: { plays: 100, postShares: 5 } }), snapshot(1, { extra: { plays: 300, postShares: 26 } })]
    const withShares = { ...mp, metrics: { ...mp.metrics, shares: '分享' } }
    const dashboard = buildDashboard({ account, platform: withShares, snapshots, latest: undefined, posts: [], now: NOW }, 7)
    expect(dashboard.works.some(kpi => kpi.key === 'engagement')).toBe(false)
    expect(dashboard.works.find(kpi => kpi.key === 'shares')?.value).toBe(31)
  })

  it('leaves out every counter the platform does not report, and never estimates one from post captures', () => {
    const posts = [post('n1', 2, { likes: 50, collects: 9 })]
    const dashboard = buildDashboard({ account, platform: xhs, snapshots: [], latest: undefined, posts, now: NOW }, 7)
    expect(dashboard.works.map(kpi => kpi.key)).toEqual(['posts'])
    expect(dashboard.works[0]).toMatchObject({ label: '发布笔记数', value: 1 })
    expect(dashboard.fans).toEqual([])
  })

  it('averages rates and durations with each day\'s plays as the weight', () => {
    const snapshots = [snapshot(2, { extra: { plays: 100, completionRate5s: 0.2, avgPlaySeconds: 10 } }), snapshot(1, { extra: { plays: 300, completionRate5s: 0.6, avgPlaySeconds: 30 } })]
    const dashboard = buildDashboard({ account, platform: douyin, snapshots, latest: undefined, posts: [], now: NOW }, 7)
    expect(dashboard.works.find(kpi => kpi.key === 'completion5s')).toMatchObject({ label: '5秒完播率', unit: 'percent' })
    expect(dashboard.works.find(kpi => kpi.key === 'completion5s')?.value).toBeCloseTo(0.5)
    expect(dashboard.works.find(kpi => kpi.key === 'avgPlay')).toMatchObject({ unit: 'seconds', value: 25 })
  })

  it('shows the platform\'s own period figure of a rate when it reported one, comparing like with like', () => {
    const snapshots = [
      // The previous window ends 2026-11-03 (8 days before NOW's day).
      snapshot(8, { extra: { plays: 100, coverCtr: 0.5, 'p7:coverCtr': 0.4 } }),
      snapshot(2, { extra: { plays: 100, coverCtr: 0.2 } }),
      snapshot(1, { extra: { plays: 300, coverCtr: 0.6, 'p7:coverCtr': 0.48 } }),
    ]
    const ctr = buildDashboard({ account, platform: douyin, snapshots, latest: undefined, posts: [], now: NOW }, 7).works.find(kpi => kpi.key === 'coverCtr')
    expect(ctr).toMatchObject({ value: 0.48, previous: 0.4 })
    expect(ctr?.change).toBeCloseTo(0.2)
    // Without the previous period's own figure, the change uses the weighted means of both periods.
    const fresh = buildDashboard({ account, platform: douyin, snapshots: snapshots.slice(1), latest: undefined, posts: [], now: NOW }, 7).works.find(kpi => kpi.key === 'coverCtr')
    expect(fresh?.value).toBe(0.48)
    expect(fresh?.change).toBeUndefined()
  })

  it('names counters in the platform\'s words, reads followers from the platform total, and picks up to five radar axes', () => {
    const snapshots = [
      snapshot(10, { followers: 900 }), snapshot(6, { followers: 1000, extra: { fansNet: 100, plays: 40, newFollowers: 110, unfollows: 10 } }),
      snapshot(1, { followers: 1100, extra: { fansNet: 100, plays: 70 } }),
    ]
    const latest = snapshot(0, { followers: 1120 })
    const dashboard = buildDashboard({ account, platform: mp, snapshots, latest, posts: [post('a1', 3)], now: NOW }, 7)
    expect(dashboard.works.find(kpi => kpi.key === 'views')?.label).toBe('阅读量')
    expect(dashboard.fans.map(kpi => [kpi.key, kpi.label])).toEqual([['followers', '粉丝总数'], ['fansNet', '粉丝净增'], ['newFollowers', '新增关注'], ['unfollows', '取消关注']])
    expect(dashboard.fans[0]).toMatchObject({ value: 1120, previous: 900 })
    expect(dashboard.headline.map(kpi => kpi.key)).toEqual(['views', 'posts', 'fansNet'])
  })

  it('ranks the posts of the last 30 days by the platform\'s totals', () => {
    const posts = [post('new', 1, { views: 300 }), post('hit', 10, { views: 5000 }), post('old', 40, { views: 90000 }), post('mid', 5, { views: 800 })]
    const dashboard = buildDashboard({ account, platform: douyin, snapshots: [], latest: undefined, posts, now: NOW }, 7)
    expect(dashboard.top.map(item => [item.post.postId, item.label, item.value])).toEqual([['hit', '播放量', 5000], ['mid', '播放量', 800], ['new', '播放量', 300]])
  })
})

describe('post detail', () => {
  it('gives the platform\'s counters against the medians of other posts, rates and rank', () => {
    const target = post('t', 2, { views: 1000, likes: 80, comments: 10 })
    const others = [post('o1', 5, { views: 100, likes: 5 }), post('o2', 6, { views: 300, likes: 9 }), post('o3', 7, { views: 200, likes: 8 })]
    const detail = buildPostDetail({ account, platform: douyin, post: target, recent: [target, ...others] })
    expect(detail.metrics.find(metric => metric.key === 'views')).toEqual({ key: 'views', label: '播放', value: 1000, median: 200 })
    expect(detail.metrics.find(metric => metric.key === 'comments')?.median).toBeUndefined()
    expect(detail.metrics.some(metric => metric.key === 'shares')).toBe(false)
    expect(detail.rates.find(rate => rate.key === 'likeRate')).toMatchObject({ label: '点赞率', value: 0.08 })
    expect(detail.rank).toEqual({ by: '播放', position: 1, of: 4 })
    expect(detail.baselinePosts).toBe(3)
  })
})
