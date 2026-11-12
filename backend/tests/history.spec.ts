/** Past daily counters become one snapshot per China day, and 抖音's data overview trends are read into such days. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { describe, expect, it } from 'vitest'
import {
  douyinDay, douyinHistoryDays, douyinOverviewScript, mergeDouyinDays, parseDouyinDashboard, recentDaysOf, type DouyinDailyValues,
} from '../src/adapters/douyin.ts'
import { parseChannelsPosts, parseChannelsTrend, trendStartOf } from '../src/adapters/wechat-channels.ts'
import { parseWechatArticleReads, parseWechatReadTrend, parseWechatUserTrend, wechatAvatarOf } from '../src/adapters/wechat-mp.ts'
import { parseXhsAccountBase, xhsDay } from '../src/adapters/xiaohongshu.ts'
import { chinaDay, chinaNoon, historySnapshots, type MediaHistoryDay } from '../src/history.ts'
import { buildOverview } from '../src/overview.ts'
import type { MediaAccount, MediaAccountId } from '../src/types.ts'

const accountId = brandString<MediaAccountId>('acct-1')

describe('China days', () => {
  it('reads instants in China time and places backfilled snapshots at China noon', () => {
    expect(chinaDay('2026-11-06T15:59:59.000Z')).toBe('2026-11-06')
    expect(chinaDay('2026-11-06T16:00:00.000Z')).toBe('2026-11-07')
    expect(chinaNoon('2026-11-06')).toBe('2026-11-06T04:00:00.000Z')
  })
})

describe('historySnapshots', () => {
  const day = (date: string, fields: Partial<MediaHistoryDay> = {}): MediaHistoryDay => ({ day: date, extra: {}, ...fields })

  it('rebuilds follower totals backwards from the latest total and later net changes', () => {
    const snapshots = historySnapshots({
      accountId, latestFollowers: 728, today: '2026-11-07', existingDays: new Set(),
      days: [
        day('2026-11-04', { followersNet: 2, extra: { plays: 300 } }),
        day('2026-11-06', { followersNet: 3, extra: { plays: 131, profileViews: 17 } }),
        day('2026-11-05', { followersNet: -1 }),
      ],
    })
    expect(snapshots).toEqual([
      { accountId, capturedAt: '2026-11-04T04:00:00.000Z', source: 'scrape', followers: 726, extra: { plays: 300, fansNet: 2 } },
      { accountId, capturedAt: '2026-11-05T04:00:00.000Z', source: 'scrape', followers: 725, extra: { fansNet: -1 } },
      { accountId, capturedAt: '2026-11-06T04:00:00.000Z', source: 'scrape', followers: 728, extra: { plays: 131, profileViews: 17, fansNet: 3 } },
    ])
  })

  it('prefers reported totals and leaves totals before a gap in net changes unknown', () => {
    const snapshots = historySnapshots({
      accountId, latestFollowers: 100, today: '2026-11-07', existingDays: new Set(),
      days: [day('2026-11-03', { followersNet: 1 }), day('2026-11-04'), day('2026-11-05', { followers: 90, followersNet: 5 })],
    })
    expect(snapshots.map(snapshot => snapshot.followers)).toEqual([undefined, 85, 90])
  })

  it('skips today, later days, malformed days and days that already hold a snapshot', () => {
    const snapshots = historySnapshots({
      accountId, latestFollowers: undefined, today: '2026-11-07', existingDays: new Set(['2026-11-05']),
      days: [day('2026-11-07'), day('2026-11-08'), day('11-04'), day('2026-11-05'), day('2026-11-06'), day('2026-11-06', { extra: { plays: 9 } })],
    })
    expect(snapshots).toEqual([{ accountId, capturedAt: '2026-11-06T04:00:00.000Z', source: 'scrape', followers: undefined, extra: { plays: 9 } }])
  })
})

describe('douyinDay', () => {
  it('reads full, compact, slashed, short and Unix dates', () => {
    expect(douyinDay('2026-11-06', '2026-11-07')).toBe('2026-11-06')
    expect(douyinDay('2026-11-06 00:00:00', '2026-11-07')).toBe('2026-11-06')
    expect(douyinDay('2026/11/6', '2026-11-07')).toBe('2026-11-06')
    expect(douyinDay('20261106', '2026-11-07')).toBe('2026-11-06')
    expect(douyinDay('11-06', '2026-11-07')).toBe('2026-11-06')
    expect(douyinDay('12-31', '2026-01-02')).toBe('2025-12-31')
    expect(douyinDay(1762358400, '2026-11-07')).toBe('2025-11-06')
    expect(douyinDay('1762358400000', '2026-11-07')).toBe('2025-11-06')
  })

  it('rejects other values', () => {
    for (const value of ['', 'yesterday', '2026', undefined, null, {}]) expect(douyinDay(value, '2026-11-07')).toBeUndefined()
  })
})

const dashboard = {
  status_code: 0,
  metrics: [
    { english_metric_name: 'play_cnt', metric_name: '播放量', metric_value: 131, trends: [{ date_time: '2026-11-05', value: 120 }, { date_time: '2026-11-06', value: '131' }] },
    { english_metric_name: 'homepage_view_cnt', metric_name: '主页访问量', trends: [{ date_time: '2026-11-06', value: 17 }] },
    { english_metric_name: 'digg_cnt', trends: [{ date_time: '2026-11-06', value: 4 }] },
    { english_metric_name: 'PlayFinishRatio', metric_name: '完播率', trends: [{ date_time: '2026-11-06', value: 0.3 }] },
    { metric_name: '粉丝净增', trends: [{ date_time: '11-06', value: '-2' }, { date_time: 'bad', value: 1 }, { date_time: '2026-11-04' }] },
    'nonsense',
  ],
}

describe('parseDouyinDashboard', () => {
  it('reads daily trends by English metric name, falling back to the Chinese label', () => {
    expect(Object.fromEntries(parseDouyinDashboard(dashboard, '2026-11-07'))).toEqual({
      '2026-11-05': { plays: 120 },
      '2026-11-06': { plays: 131, profileViews: 17, postLikes: 4, fansNet: -2 },
    })
  })

  it('reads every metric of the 2026-11 data center by English name, keeping ratios and seconds unrounded', () => {
    // Shape and names as returned for a real account. 平均播放时长 used to fall back to the label 「播放」 and overwrite the plays.
    const real = {
      status_code: 0,
      metrics: [
        { english_metric_name: 'play_cnt', metric_name: '播放量', metric_value: 68084, trends: [{ date_time: '20261110', douyin_value: 4243, value: 4289, yumme_value: 46 }] },
        { english_metric_name: 'digg_cnt', metric_name: '作品点赞', trends: [{ date_time: '20261110', value: 113 }] },
        { english_metric_name: 'share_count', metric_name: '作品分享', trends: [{ date_time: '20261110', value: 21 }] },
        { english_metric_name: 'comment_cnt', metric_name: '作品评论', trends: [{ date_time: '20261110', value: 1 }] },
        { english_metric_name: 'cover_click_ratio', metric_name: '封面点击率', trends: [{ date_time: '20261110', value: 0.59 }] },
        { english_metric_name: 'homepage_view_cnt', metric_name: '主页访问', trends: [{ date_time: '20261110', value: 135 }] },
        { english_metric_name: 'publish_cnt', metric_name: '投稿量', trends: [{ date_time: '20261110', value: 0 }] },
        { english_metric_name: 'completion_rate_5s', metric_name: '5秒完播率', trends: [{ date_time: '20261110', value: 0.511168384879725 }] },
        { english_metric_name: 'bounce_rate_2s', metric_name: '2秒跳出率', trends: [{ date_time: '20261110', value: 0.43943298969072164 }] },
        { english_metric_name: 'avg_view_second', metric_name: '平均播放时长', trends: [{ date_time: '20261110', value: 44.257517182130584 }] },
        { english_metric_name: 'home_view_fans_cnt', metric_name: '回访粉丝量', trends: [{ date_time: '20261110', value: 40 }] },
        { english_metric_name: 'some_new_metric', metric_name: '播放量', trends: [{ date_time: '20261110', value: 1 }] },
      ],
    }
    expect(parseDouyinDashboard(real, '2026-11-12').get('2026-11-10')).toEqual({
      plays: 4289, postLikes: 113, postShares: 21, postComments: 1, coverCtr: 0.59, profileViews: 135,
      completionRate5s: 0.511168384879725, bounceRate2s: 0.43943298969072164, avgPlaySeconds: 44.257517182130584, returningFans: 40,
    })
  })

  it('keeps the platform\'s own period figure of a ratio or duration on the range\'s last day', () => {
    const body = {
      status_code: 0,
      metrics: [
        { english_metric_name: 'cover_click_ratio', metric_value: 0.48, trends: [{ date_time: '20261109', value: 0.26 }, { date_time: '20261110', value: 0.59 }] },
        { english_metric_name: 'play_cnt', metric_value: 68084, trends: [{ date_time: '20261110', value: 4289 }] },
      ],
    }
    expect(Object.fromEntries(parseDouyinDashboard(body, '2026-11-12', 7))).toEqual({
      '2026-11-09': { coverCtr: 0.26 },
      '2026-11-10': { coverCtr: 0.59, 'p7:coverCtr': 0.48, plays: 4289 },
    })
    expect(recentDaysOf('https://creator.douyin.com/janus/douyin/creator/data/overview/dashboard', '{"recent_days":7}')).toBe(7)
    expect(recentDaysOf('https://creator.douyin.com/janus/douyin/creator/data/overview/dashboard/fans?recent_days=30', null)).toBe(30)
    expect(recentDaysOf('https://creator.douyin.com/janus/douyin/creator/data/overview/dashboard', 'not json')).toBeUndefined()
  })

  it('reads the fans overview totals and net changes', () => {
    const fans = {
      status_code: 0,
      metrics: [
        { english_metric_name: 'total_fans_cnt', trends: [{ date_time: '2026-11-06', value: 728 }] },
        { english_metric_name: 'net_follow_fans', trends: [{ date_time: '2026-11-06', value: 3 }] },
      ],
    }
    expect(Object.fromEntries(parseDouyinDashboard(fans, '2026-11-07'))).toEqual({ '2026-11-06': { fansTotal: 728, fansNet: 3 } })
  })

  it('returns nothing for failed or unknown bodies', () => {
    for (const body of [{ status_code: 8, metrics: dashboard.metrics }, { status_code: '0' }, null, []]) {
      expect(parseDouyinDashboard(body, '2026-11-07').size).toBe(0)
    }
  })
})

describe('douyin history days', () => {
  it('merges overview reads and maps them to history days, oldest first', () => {
    const days = new Map<string, DouyinDailyValues>()
    mergeDouyinDays(days, parseDouyinDashboard(dashboard, '2026-11-07'))
    mergeDouyinDays(days, new Map([['2026-11-06', { fansTotal: 728, plays: 140 }]]))
    expect(douyinHistoryDays(days)).toEqual([
      { day: '2026-11-05', followers: undefined, followersNet: undefined, extra: { plays: 120 } },
      { day: '2026-11-06', followers: 728, followersNet: -2, extra: { plays: 140, profileViews: 17, postLikes: 4 } },
    ])
  })

  it('requests the longer range from inside the page with credentials', () => {
    const script = douyinOverviewScript(30)
    expect(script).toContain('"/janus/douyin/creator/data/overview/dashboard"')
    expect(script).toContain('recent_days: 30')
    expect(script).toContain("credentials: 'include'")
    expect(script).toContain('"/janus/douyin/creator/data/overview/dashboard/fans?recent_days=" + 30')
  })
})

describe('overview series', () => {
  it('carries daily plays and profile visits of backfilled snapshots', () => {
    const account: MediaAccount = {
      id: accountId, platform: 'douyin', role: 'own', name: 'x', profileUrl: '', niche: '', notes: '',
      monitor: { enabled: false, intervalMinutes: 360 }, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
    }
    const snapshot = { accountId, capturedAt: '2026-11-06T04:00:00.000Z', source: 'scrape', followers: 728, extra: { plays: 131, profileViews: 17 } } as const
    const overview = buildOverview({
      account, snapshots: [snapshot], latest: snapshot, posts: [], since: '2026-10-08T00:00:00.000Z',
      lastRun: undefined, login: 'logged-in', nextRunAt: undefined,
    })
    expect(overview.series).toEqual([{ at: '2026-11-06T04:00:00.000Z', followers: 728, likes: undefined, posts: undefined, plays: 131, profileViews: 17, fansNet: undefined, postLikes: undefined }])
  })
})

describe('视频号 data center', () => {
  // 2026-11-05 00:00 China time.
  const start = 1793854800
  it('reads the daily series of 视频数据 and 关注者数据 from the request\'s start day', () => {
    const posts = { errCode: 0, data: { totalData: { browse: ['7796', '693'], fav: ['3', '9'], like: ['1', '1'], comment: ['0', '0'], forward: ['27', '12'], follow: ['7', '9'] } } }
    const fans = { errCode: 0, data: { add: [93, 9], reduce: [0, 0], netAdd: [93, 9], total: [679, 916] } }
    expect(Object.fromEntries(parseChannelsTrend(posts, start))).toEqual({
      '2026-11-05': { plays: 7796, postLikes: 3, postCollects: 1, postComments: 0, postShares: 27 },
      '2026-11-06': { plays: 693, postLikes: 9, postCollects: 1, postComments: 0, postShares: 12 },
    })
    expect(parseChannelsTrend(fans, start).get('2026-11-06')).toEqual({ newFollowers: 9, unfollows: 0, fansNet: 9, fansTotal: 916 })
    expect(parseChannelsTrend(fans, undefined).size).toBe(0)
    expect(parseChannelsTrend({ errCode: 300333, data: {} }, start).size).toBe(0)
    expect(trendStartOf('{"startTs":"1793854800","endTs":"1794373200","interval":3}')).toBe(start)
    expect(trendStartOf('not json')).toBeUndefined()
  })

  it('reads 视频管理\'s list: 👍 favCount is 点赞, ♡ likeCount is 喜欢, with cover and the platform\'s rates', () => {
    const list = { errCode: 0, data: { list: [{
      objectId: 'export/abc', createTime: 1792517252, likeCount: 170, commentCount: 17, readCount: 50972, forwardCount: 976, favCount: 619,
      fullPlayRate: 0.1348, avgPlayTimeSec: 71.05,
      desc: { description: 'DeepSeek 一条更新公告', media: [{ coverUrl: 'https://finder.video.qq.com/251/20304/stodownload?x=1', thumbUrl: 'https://t' }] },
    }] } }
    expect(parseChannelsPosts(list)).toEqual([{
      postId: 'export/abc', title: 'DeepSeek 一条更新公告', publishedAt: new Date(1792517252 * 1000).toISOString(), format: 'video',
      views: 50972, likes: 619, comments: 17, shares: 976, collects: 170,
      coverUrl: 'https://finder.video.qq.com/251/20304/stodownload?x=1', extra: { completionRate: 0.1348, avgPlaySeconds: 71.05 },
    }])
  })
})

describe('小红书 创作服务平台', () => {
  // 2026-11-11 00:00 China time ends 11-10; 11-05 00:00 ends 11-04.
  const end = Date.parse('2026-11-11T00:00:00+08:00')
  const start = Date.parse('2026-11-05T00:00:00+08:00')
  it('reads the account overview into days ending at the stamped midnight, with the period\'s own rates', () => {
    const body = { code: 0, data: { seven: {
      begin_time: start, end_time: end, cover_click_rate: 13.2, video_full_view_rate: 11.7, avg_view_time: 40, impl_count: 803,
      impl_count_list: [{ date: end, count: 189, count_with_double: 0 }, { date: start, count: 116, count_with_double: 0 }],
      view_list: [{ date: end, count: 14, count_with_double: 0 }],
      net_rise_fans_count_list: [{ date: end, count: -1, count_with_double: 0 }],
      cover_click_rate_list: [{ date: end, count: 9, count_with_double: 9.4 }],
    } } }
    const days = parseXhsAccountBase(body)
    expect(xhsDay(end)).toBe('2026-11-10')
    expect(days.get('2026-11-10')).toEqual({ impressions: 189, plays: 14, fansNet: -1, coverCtr: 0.094, 'p7:coverCtr': 0.132, 'p7:completionRate': 0.117, 'p7:avgPlaySeconds': 40 })
    expect(days.get('2026-11-04')).toEqual({ impressions: 116 })
    expect(parseXhsAccountBase({ code: -1 }).size).toBe(0)
  })
})

describe('公众号 数据分析', () => {
  it('reads daily 阅读 / 分享 (scene 9999) and followers, per-article reads and the avatar', () => {
    const day = Date.parse('2026-11-11T00:00:00+08:00') / 1000
    const reads = { base_resp: { ret: 0 }, all_article_stat_tendency: { list: [
      { date: day, scene: 6, read_uv: 6, share_uv: 0 }, { date: day, scene: 9999, read_uv: 14, share_uv: 2 },
    ] } }
    expect(Object.fromEntries(parseWechatReadTrend(reads))).toEqual({ '2026-11-11': { plays: 14, postShares: 2 } })
    const users = {
      user_info: { nick_name: '阿青公众号', head_img: 'http://wx.qlogo.cn/mmopen/abc/0' },
      category_list: [{ user_source: 99999999, list: [{ date: '2026-11-11', new_user: 2, cancel_user: 0, netgain_user: 2, cumulate_user: 1700 }] }],
    }
    expect(Object.fromEntries(parseWechatUserTrend(users))).toEqual({ '2026-11-11': { newFollowers: 2, unfollows: 0, fansNet: 2, fansTotal: 1700 } })
    expect(wechatAvatarOf(users)).toBe('https://wx.qlogo.cn/mmopen/abc/0')
    const list = { article_list: [{ msg_id: 2247484787, item_idx: 1, total_read_uv: 336, title: '深度拆解 DeepSeek Super-Agent' }] }
    expect(parseWechatArticleReads(list).get('2247484787_1')).toBe(336)
  })
})
