/** Counter, date and platform payload parsing turns displayed platform values into numbers, instants and posts. */
import { describe, expect, it } from 'vitest'
import { parseCount, parseDate, parseDecimal, stablePostId } from '../src/counters.ts'
import { parseDouyinDom, parseDouyinPosts, parseDouyinProfile } from '../src/adapters/douyin.ts'
import { MediaAdapterRegistry } from '../src/adapters/registry.ts'
import { parseWechatHomeText, parseWechatPublishPage, wechatMpAdapter } from '../src/adapters/wechat-mp.ts'
import { parseXhsDom, parseXhsState, toDomCapture, xiaohongshuAdapter } from '../src/adapters/xiaohongshu.ts'
import { douyinAdapter } from '../src/adapters/douyin.ts'

describe('counters', () => {
  it('reads Chinese and abbreviated counters', () => {
    expect(parseCount('1,234')).toBe(1234)
    expect(parseCount('1.2万')).toBe(12000)
    expect(parseCount('3.4w')).toBe(34000)
    expect(parseCount('10万+')).toBe(100000)
    expect(parseCount('1.5亿')).toBe(150000000)
    expect(parseCount('2.5k')).toBe(2500)
    expect(parseCount(' 88 ')).toBe(88)
    expect(parseCount(12.6)).toBe(13)
    expect(parseCount('-')).toBeUndefined()
    expect(parseCount('')).toBeUndefined()
    expect(parseCount('abc')).toBeUndefined()
    expect(parseCount(null)).toBeUndefined()
  })

  it('keeps decimals and percentages', () => {
    expect(parseDecimal('12.5%')).toBe(12.5)
    expect(parseDecimal(0.35)).toBe(0.35)
    expect(parseDecimal('1.2万')).toBe(12000)
  })

  it('reads platform dates as China time', () => {
    expect(parseDate('2024-05-01 12:30')).toBe('2024-05-01T04:30:00.000Z')
    expect(parseDate('2024年5月1日')).toBe('2024-04-30T16:00:00.000Z')
    expect(parseDate('2024/5/1 08:00:00')).toBe('2024-05-01T00:00:00.000Z')
    expect(parseDate(1714536000)).toBe('2024-05-01T04:00:00.000Z')
    expect(parseDate('1714536000000')).toBe('2024-05-01T04:00:00.000Z')
    expect(parseDate(45413.5)).toBe('2024-05-01T04:00:00.000Z')
    expect(parseDate('昨天')).toBeUndefined()
    expect(parseDate(7)).toBeUndefined()
  })

  it('derives stable post ids', () => {
    expect(stablePostId('a', 'b')).toBe(stablePostId('a', 'b'))
    expect(stablePostId('a', 'b')).not.toBe(stablePostId('a', 'c'))
    expect(stablePostId('a')).toMatch(/^h[0-9a-f]{16}$/)
  })
})

describe('小红书', () => {
  const state = {
    user: {
      loggedIn: true,
      userPageData: {
        basicInfo: { nickname: '测试号' },
        interactions: [
          { type: 'follows', name: '关注', count: '12' },
          { type: 'fans', name: '粉丝', count: '1.2万' },
          { type: 'interaction', name: '获赞与收藏', count: '3.4万' },
        ],
      },
      notes: [[
        { id: 'n1', xsecToken: 'tok', noteCard: { noteId: 'n1', displayTitle: '春季穿搭', type: 'normal', interactInfo: { likedCount: '1.1万', sticky: true } } },
        { id: 'n2', noteCard: { displayTitle: '通勤 vlog', type: 'video', interactInfo: { likedCount: '230' } } },
        { noteCard: {} },
      ], []],
    },
  }

  it('reads counters and notes from the initial state', () => {
    const result = parseXhsState(state, 10)
    expect(result?.snapshot).toEqual({ followers: 12000, following: 12, likes: 34000, extra: {} })
    expect(result?.posts).toEqual([
      { postId: 'n1', title: '春季穿搭', url: 'https://www.xiaohongshu.com/explore/n1?xsec_token=tok&xsec_source=pc_user', format: 'image', likes: 11000, extra: { pinned: 1 } },
      { postId: 'n2', title: '通勤 vlog', url: 'https://www.xiaohongshu.com/explore/n2', format: 'video', likes: 230, extra: {} },
    ])
    expect(parseXhsState(state, 1)?.posts).toHaveLength(1)
    expect(parseXhsState({ user: { userPageData: {} } }, 10)).toBeUndefined()
  })

  it('prefers exact like and collect totals and keys visitor notes by title and time', () => {
    const visitor = {
      user: {
        loggedIn: false,
        userPageData: { interactions: [{ type: 'fans', name: '粉丝', count: '1万+' }], liked: 680556, collected: 147698 },
        notes: [[{ id: '', xsecToken: 't', noteCard: { noteId: '', displayTitle: '好喜欢这套', type: 'video', time: 1758014155000, interactInfo: { likedCount: '31' } } }]],
      },
    }
    const result = parseXhsState(visitor, 10)
    expect(result?.snapshot).toEqual({ followers: 10000, following: undefined, likes: 828254, extra: { liked: 680556, collected: 147698 } })
    expect(result?.posts[0]).toMatchObject({ title: '好喜欢这套', url: undefined, publishedAt: '2025-09-16T09:15:55.000Z', format: 'video', likes: 31 })
    expect(result?.posts[0]?.postId).toMatch(/^h[0-9a-f]{16}$/)
  })

  it('falls back to rendered counters', () => {
    const capture = toDomCapture({
      interactionsText: '12关注 1.2万粉丝 3.4万获赞与收藏',
      notes: [{ href: '/explore/abc123', title: ' 标题 ', likes: '99' }, { href: '/other', title: '', likes: '1' }, 5],
    })
    expect(parseXhsDom(capture, 10)).toEqual({
      snapshot: { followers: 12000, following: 12, likes: 34000, extra: {} },
      posts: [{ postId: 'abc123', title: '标题', url: 'https://www.xiaohongshu.com/explore/abc123', format: 'image', likes: 99, extra: {} }],
    })
    expect(parseXhsDom(toDomCapture(null), 10)).toBeUndefined()
  })
})

describe('抖音', () => {
  it('reads the profile response', () => {
    expect(parseDouyinProfile({ user: { follower_count: 1500, mplatform_followers_count: 1600, following_count: 20, total_favorited: '30000', aweme_count: 42, favoriting_count: 7 } }))
      .toEqual({ followers: 1600, following: 20, likes: 30000, posts: 42, extra: { favoriting: 7 } })
    expect(parseDouyinProfile({ status_code: 8 })).toBeUndefined()
  })

  it('reads videos and image notes from the post list', () => {
    const page = parseDouyinPosts({
      has_more: 1,
      aweme_list: [
        { aweme_id: '111', desc: '第一条视频', create_time: 1714536000, duration: 15000, is_top: 1, statistics: { digg_count: 100, comment_count: 5, collect_count: 8, share_count: 2, play_count: 0 } },
        { aweme_id: '222', desc: '图文', aweme_type: 68, images: [{}], create_time: 1714622400, statistics: { digg_count: 50, play_count: 900 } },
        { desc: 'no id' },
      ],
    })
    expect(page.hasMore).toBe(true)
    expect(page.posts).toEqual([
      { postId: '111', title: '第一条视频', url: 'https://www.douyin.com/video/111', publishedAt: '2024-05-01T04:00:00.000Z', format: 'video', views: undefined, likes: 100, comments: 5, collects: 8, shares: 2, extra: { pinned: 1, durationMs: 15000 } },
      { postId: '222', title: '图文', url: 'https://www.douyin.com/note/222', publishedAt: '2024-05-02T04:00:00.000Z', format: 'image', views: 900, likes: 50, comments: undefined, collects: undefined, shares: undefined, extra: {} },
    ])
    expect(parseDouyinPosts(null)).toEqual({ posts: [], hasMore: false })
  })

  it('reads rendered counters', () => {
    expect(parseDouyinDom(['关注 123', '粉丝1.2万', '获赞 3.4万'])).toEqual({ following: 123, followers: 12000, likes: 34000, extra: {} })
    expect(parseDouyinDom(['', '', ''])).toBeUndefined()
  })
})

describe('微信公众号', () => {
  it('reads the follower total from the home page', () => {
    expect(parseWechatHomeText('新消息\n总用户数\n12,345\n原创内容')).toBe(12345)
    expect(parseWechatHomeText('nothing')).toBeUndefined()
  })

  it('reads articles from nested publish documents', () => {
    const info = {
      appmsgex: [
        { aid: '100_1', title: '头条', link: 'https://mp.weixin.qq.com/s/a', create_time: 1714536000, item_show_type: 0, read_num: 1200, like_num: 30 },
        { aid: '100_2', title: '次条', link: 'https://mp.weixin.qq.com/s/b', create_time: 1714536000, item_show_type: 8 },
        { title: '' },
      ],
      appmsg_info: [{}, { read_num: 300, comment_num: 4, share_num: 9, old_like_num: 2 }],
    }
    const page = parseWechatPublishPage({
      base_resp: { ret: 0 },
      publish_page: JSON.stringify({ total_count: 17, publish_list: [{ publish_type: 101, publish_info: JSON.stringify(info) }, { publish_info: '{bad' }] }),
    })
    expect(page.ret).toBe(0)
    expect(page.total).toBe(17)
    expect(page.posts).toEqual([
      { postId: '100_1', title: '头条', url: 'https://mp.weixin.qq.com/s/a', publishedAt: '2024-05-01T04:00:00.000Z', format: 'article', views: 1200, likes: 30, extra: {} },
      { postId: '100_2', title: '次条', url: 'https://mp.weixin.qq.com/s/b', publishedAt: '2024-05-01T04:00:00.000Z', format: 'image', views: 300, comments: 4, shares: 9, extra: { old_like: 2 } },
    ])
    expect(parseWechatPublishPage({ base_resp: { ret: 200003 } })).toEqual({ ret: 200003, total: 0, posts: [] })
  })
})

describe('adapter registry', () => {
  it('registers built-ins once and removes exactly its own registration', () => {
    const registry = new MediaAdapterRegistry()
    const disposers = [xiaohongshuAdapter, douyinAdapter, wechatMpAdapter].map(adapter => registry.register(adapter))
    expect(registry.descriptors().map(descriptor => descriptor.id)).toEqual(['xiaohongshu', 'douyin', 'wechat-mp'])
    expect(() => registry.register(douyinAdapter)).toThrow(/already registered/)
    expect(() => registry.register({ ...douyinAdapter, descriptor: { ...douyinAdapter.descriptor, id: 'Bad Id' } })).toThrow(/must match/)
    const { scrape: _scrape, ...withoutScrape } = douyinAdapter
    expect(() => registry.register({ ...withoutScrape, descriptor: { ...douyinAdapter.descriptor, id: 'other' } })).toThrow(/implements no scrape/)
    disposers[1]?.()
    expect(registry.get('douyin')).toBeUndefined()
    expect(registry.get('xiaohongshu')).toBe(xiaohongshuAdapter)
  })
})
