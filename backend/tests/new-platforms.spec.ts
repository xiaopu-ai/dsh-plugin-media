/** 人人都是产品经理, 少数派, 优设 and X: what their pages and APIs answer, read into counters and posts. */
import { describe, expect, it } from 'vitest'
import { parseSspaiPosts, parseSspaiUser, sspaiSlugOf } from '../src/adapters/sspai.ts'
import { parseUisdcArticle, parseUisdcAuthorPage, readUisdcSelf, uisdcUidOf } from '../src/adapters/uisdc.ts'
import { parseWoshipmAuthorPage, parseWoshipmProfile, readWoshipmSelf, woshipmUidOf } from '../src/adapters/woshipm.ts'
import { parseXSelf, parseXTimeline, parseXUser, xHandleOf } from '../src/adapters/x.ts'
import { normalizeProfileUrl } from '../src/identity.ts'

describe('人人都是产品经理', () => {
  it('reads the account totals of api2/user/profile', () => {
    const user = parseWoshipmProfile({
      RESULT: {
        userInfoVo: { uid: 101, nickName: '阿青', avartar: 'https://static.woshipm.com/a.jpg' },
        userArticleCountVo: { articalCount: 37, newsViewCountInt: 82345, articalPraiseCount: 410, newsCommentCountInt: 52, newsFavoritesCountInt: 630 },
        userCommonCountVo: { fansCount: 1280, attentionUserCount: 12, praiseCount: 410 },
      },
    })
    expect(user).toEqual({
      name: '阿青', avatarUrl: 'https://static.woshipm.com/a.jpg',
      snapshot: { followers: 1280, following: 12, likes: 410, posts: 37, extra: { totalViews: 82345, totalComments: 52, totalCollects: 630 } },
    })
    expect(parseWoshipmProfile({ RESULT: null })).toBeUndefined()
  })

  it('reads the article cards of an author page and whether a next page exists', () => {
    const card = (id: number, title: string, views: string, collects: string): string => `
      <div class="post--card u-backgroundColorWhite u-shadowed" data-id="${id}">
        <div class="post--card__img"><a href="https://www.woshipm.com/pd/${id}.html"><img src="https://image.woshipm.com/${id}.jpg"></a></div>
        <div class="content">
          <h2 class="post--card__title"><a title="${title}" href="https://www.woshipm.com/pd/${id}.html" target="_blank">${title}</a></h2>
          <div class="stream-list-meta"><time>2026-11-16</time><span class="dot"></span><span>${views} 浏览</span><span class="dot"></span><span>${collects} 收藏</span></div>
        </div>
      </div>`
    const html = `${card(9, '需求评审怎么开 &amp; 怎么收', '1015', '1')}${card(8, '做 B 端的第一年', '1.2w', '0')}
      <a class="next page-numbers" href="https://www.woshipm.com/u/101/page/2">></a>`
    const page = parseWoshipmAuthorPage(html)
    expect(page.hasMore).toBe(true)
    expect(page.posts).toEqual([
      { postId: '9', title: '需求评审怎么开 & 怎么收', url: 'https://www.woshipm.com/pd/9.html', publishedAt: '2026-11-15T16:00:00.000Z', format: 'article', views: 1015, collects: 1, coverUrl: 'https://image.woshipm.com/9.jpg', extra: {} },
      { postId: '8', title: '做 B 端的第一年', url: 'https://www.woshipm.com/pd/8.html', publishedAt: '2026-11-15T16:00:00.000Z', format: 'article', views: 12000, collects: 0, coverUrl: 'https://image.woshipm.com/8.jpg', extra: {} },
    ])
    expect(parseWoshipmAuthorPage(card(7, 'x', '1', '1')).hasMore).toBe(false)
    expect(woshipmUidOf('https://www.woshipm.com/u/101/page/2')).toBe('101')
    expect(woshipmUidOf('https://www.woshipm.com/pd/9.html')).toBeUndefined()
  })
})

describe('who is signed in', () => {
  it('人人都是产品经理: the page global PURE first, the header as fallback', () => {
    expect(readWoshipmSelf({ pureLoggedIn: true, pureUid: '101', href: '', name: '', avatar: '', loginOffered: false })).toMatchObject({ uid: '101', loggedIn: true })
    expect(readWoshipmSelf({ pureLoggedIn: false, pureUid: '0', href: '', name: '', avatar: '', loginOffered: true })).toMatchObject({ uid: undefined, loggedIn: false })
    expect(readWoshipmSelf({ pureLoggedIn: null, pureUid: '', href: 'https://www.woshipm.com/u/7', name: '阿青', avatar: '', loginOffered: false })).toMatchObject({ uid: '7', loggedIn: true })
    expect(readWoshipmSelf({ pureLoggedIn: null, pureUid: '', href: '', name: '', avatar: '', loginOffered: false }).loggedIn).toBeUndefined()
  })

  it('优设: the token and /api/v1/user/mine', () => {
    expect(readUisdcSelf({ token: true, notLogin: false, mine: { data: { id: 14, nickname: '阿青', avatar: 'https://image.uisdc.com/a.webp' } } }))
      .toEqual({ state: 'logged-in', uid: '14', name: '阿青', avatarUrl: 'https://image.uisdc.com/a.webp' })
    expect(readUisdcSelf({ token: true, notLogin: false, mine: null })).toEqual({ state: 'logged-in' })
    expect(readUisdcSelf({ token: false, notLogin: true })).toEqual({ state: 'logged-out' })
  })
})

describe('少数派', () => {
  it('reads the user totals and treats the hidden read count 0 as unknown', () => {
    expect(parseSspaiUser({
      error: 0,
      data: { slug: 'aqing', nickname: '阿青', avatar: '2023/02/24/a.png', followed_count: 149, following_count: 10, liked_count: 797, released_article_count: 37, article_view_count: 682227, articles_word_count: 341301 },
    })).toEqual({
      slug: 'aqing', name: '阿青', avatarUrl: 'https://cdnfile.sspai.com/2023/02/24/a.png',
      snapshot: { followers: 149, following: 10, likes: 797, posts: 37, extra: { totalViews: 682227, words: 341301 } },
    })
    expect(parseSspaiUser({ error: 40001, data: {} })).toBeUndefined()
    const page = parseSspaiPosts({
      error: 0, total: 2,
      data: [
        { id: 119039, title: '徒步旅行指南', banner: '2026/11/14/b.jpg', like_count: 7, comment_count: 1, view_count: 0, released_time: 1795057088 },
        { id: 118000, title: '写给自己的年度清单', like_count: 30, comment_count: 4, view_count: 5210, released_time: 1790000000 },
      ],
    })
    expect(page.total).toBe(2)
    expect(page.posts[0]).toEqual({
      postId: '119039', title: '徒步旅行指南', url: 'https://sspai.com/post/119039', publishedAt: new Date(1795057088 * 1000).toISOString(),
      format: 'article', likes: 7, comments: 1, coverUrl: 'https://cdnfile.sspai.com/2026/11/14/b.jpg', extra: {},
    })
    expect(page.posts[1]?.views).toBe(5210)
    expect(sspaiSlugOf('https://sspai.com/u/aqing/posts')).toBe('aqing')
  })
})

describe('优设', () => {
  it('reads the author page list and header', () => {
    const html = `<title>阿青 - 设计师主页 - 优设网</title>
      <h5 class="author-data items"><span class="item data-item data-views"><strong>256.7w</strong><i>人气</i></span>
      <span class="item data-item data-count"><strong>58</strong><i>文章</i></span></h5>
      <div class="item-wrap"><div class="item-thumb"><a href="https://www.uisdc.com/reverse-design-workflow" class="a_scale"><i class="thumb " style="background-image: url(&quot;https://image.uisdc.com/a.webp&quot;);"></i></a></div>
        <div class="item-main"><h2 class="item-title"><a href="https://www.uisdc.com/reverse-design-workflow" target="_blank">16个AI设计资源网站</a></h2>
        <div class="item-meta"><span class="meta-item meta-time">2026/10/13</span></div></div></div>`
    const page = parseUisdcAuthorPage(html)
    expect(page.name).toBe('阿青')
    expect(page.snapshot).toEqual({ followers: undefined, posts: 58, extra: { totalViews: 2567000 } })
    expect(page.posts).toEqual([{
      postId: 'reverse-design-workflow', title: '16个AI设计资源网站', url: 'https://www.uisdc.com/reverse-design-workflow',
      publishedAt: '2026-10-12T16:00:00.000Z', format: 'article', coverUrl: 'https://image.uisdc.com/a.webp', extra: {},
    }])
    expect(uisdcUidOf('https://www.uisdc.com/u/14/publish/all')).toBe('14')
  })

  it('reads an article page: rounded reads, likes and collects from the buttons, comments from the comment header', () => {
    const html = `<span class="meta-item meta-views">阅读 6.1w</span>
      <span class="btn btn-orange2 btn-fav btn-has-sub" data-count="99" data-original-count="99" data-component="fav"><em class="count">99</em></span>
      <span class="btn btn-orange2 btn-zan" data-count="137" data-original-count="137" data-component="zan"><em class="count">137</em></span>
      <h2 class="comment-title"> 发表评论 <span class="info">为下方 <em class="count">8</em> 条评论点赞</span></h2>`
    expect(parseUisdcArticle(html)).toEqual({ views: 61000, likes: 137, collects: 99, comments: 8 })
    expect(parseUisdcArticle('<span class="meta-item meta-views">阅读 856</span>').views).toBe(856)
  })
})

describe('X', () => {
  const user = {
    data: { user: { result: {
      __typename: 'User', rest_id: '42', core: { name: 'Aqing', screen_name: 'aqing_dev' },
      avatar: { image_url: 'https://pbs.twimg.com/profile_images/1/a_normal.jpg' },
      legacy: { followers_count: 3021, friends_count: 180, statuses_count: 912, listed_count: 7 },
    } } },
  }

  it('reads UserByScreenName with names under core', () => {
    expect(parseXUser(user)).toEqual({
      id: '42', handle: 'aqing_dev', name: 'Aqing', avatarUrl: 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg',
      snapshot: { followers: 3021, following: 180, posts: 912, extra: { listed: 7 } },
    })
  })

  it('keeps only the account own posts from a UserTweets timeline, wherever they are nested', () => {
    const tweet = (id: string, userId: string, extra: Record<string, unknown> = {}): unknown => ({
      __typename: 'Tweet', rest_id: id, views: { count: '1530', state: 'EnabledWithCount' },
      legacy: {
        user_id_str: userId, full_text: `post ${id} https://t.co/abc`, created_at: 'Wed Nov 18 08:00:00 +0000 2026',
        favorite_count: 12, reply_count: 3, retweet_count: 2, quote_count: 1, bookmark_count: 4, ...extra,
      },
    })
    const timeline = {
      data: { user: { result: { timeline: { timeline: { instructions: [
        { type: 'TimelinePinEntry', entry: { content: { itemContent: { tweet_results: { result: tweet('1', '42') } } } } },
        { type: 'TimelineAddEntries', entries: [
          { content: { entryType: 'TimelineTimelineItem', itemContent: { tweet_results: { result: { __typename: 'TweetWithVisibilityResults', tweet: tweet('2', '42', { extended_entities: { media: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/p.jpg' }] } }) } } } } },
          { content: { entryType: 'TimelineTimelineItem', itemContent: { tweet_results: { result: tweet('3', '42', { retweeted_status_result: { result: tweet('9', '7') } }) } } } },
          { content: { entryType: 'TimelineTimelineModule', items: [{ item: { itemContent: { tweet_results: { result: tweet('4', '7') } } } }] } },
          { content: { entryType: 'TimelineTimelineCursor', cursorType: 'Bottom', value: 'x' } },
        ] },
      ] } } } } },
    }
    const parsed = parseXTimeline(timeline, '42', 'aqing_dev')
    expect(parsed.hasMore).toBe(true)
    expect(parsed.posts.map(post => post.postId)).toEqual(['1', '2'])
    expect(parsed.posts[1]).toEqual({
      postId: '2', title: 'post 2', url: 'https://x.com/aqing_dev/status/2', publishedAt: '2026-11-18T08:00:00.000Z', format: 'image',
      views: 1530, likes: 12, comments: 3, shares: 2, collects: 4, coverUrl: 'https://pbs.twimg.com/media/p.jpg', extra: { quotes: 1 },
    })
  })

  it('finds the signed-in handle in the side bar, and matches handles regardless of case and twitter.com', () => {
    expect(parseXSelf({ href: '/aqing_dev', name: 'Aqing', avatar: 'https://pbs.twimg.com/profile_images/1/a_normal.jpg' }))
      .toEqual({ name: 'Aqing', profileUrl: 'https://x.com/aqing_dev', avatarUrl: 'https://pbs.twimg.com/profile_images/1/a_200x200.jpg' })
    expect(parseXSelf({ href: '/home' })).toBeUndefined()
    expect(xHandleOf('https://twitter.com/Aqing_Dev/')).toBe('Aqing_Dev')
    expect(xHandleOf('https://x.com/i/flow/login')).toBeUndefined()
    expect(normalizeProfileUrl('https://twitter.com/Aqing_Dev/')).toBe(normalizeProfileUrl('https://x.com/aqing_dev'))
  })
})
