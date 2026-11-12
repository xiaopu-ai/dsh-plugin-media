/** Topic research: 抖音 search and trending parsing, research keywords, related-post ranking, prompt sections and stored-report defaults. */
import { describe, expect, it } from 'vitest'
import { parseDouyinAweme, parseDouyinSearch, parseDouyinTrending } from '../src/adapters/douyin-discover.ts'
import { buildTopicPrompt, relatedLines, researchSections } from '../src/analysis.ts'
import { nameFragments, researchKeywords, suggestionQuery, topRelated } from '../src/research.ts'
import { topicReportSchema } from '../src/schemas.ts'
import type { MediaAccount, MediaAccountId, MediaPost, MediaRelatedPost } from '../src/types.ts'

const id = 'acct-1' as MediaAccountId
const account: MediaAccount = {
  id, platform: 'douyin', role: 'own', name: '阿青Coding', profileUrl: '', niche: '', notes: '',
  monitor: { enabled: false, intervalMinutes: 60 }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}

function post(postId: string, title: string, views?: number): MediaPost {
  return { accountId: id, postId, title, format: 'video', views, likes: 3, extra: {}, source: 'scrape', updatedAt: '2026-11-01T00:00:00.000Z' }
}

function related(postId: string, likes?: number, author = '作者'): MediaRelatedPost {
  return { postId, title: `作品${postId}`, url: `https://www.douyin.com/video/${postId}`, author, format: 'video', likes }
}

const aweme = {
  aweme_id: '7001', desc: '零基础学 Claude Code', create_time: 1_761_000_000, author: { nickname: '技术博主' },
  video: { cover: { url_list: ['https://p3.example/cover.jpeg'] } },
  statistics: { digg_count: 45_102, comment_count: 1200, collect_count: 9000, share_count: 800, play_count: 0 },
}

describe('抖音 discovery parsing', () => {
  it('reads videos and image notes with author, cover and counters', () => {
    const parsed = parseDouyinAweme(aweme)
    expect(parsed).toMatchObject({
      postId: '7001', title: '零基础学 Claude Code', url: 'https://www.douyin.com/video/7001', author: '技术博主',
      coverUrl: 'https://p3.example/cover.jpeg', format: 'video', likes: 45_102, comments: 1200, collects: 9000, shares: 800,
    })
    expect(parsed?.views).toBeUndefined()
    expect(parsed?.publishedAt?.startsWith('2025-10-20')).toBe(true)
    expect(parseDouyinAweme({ aweme_id: '7002', images: [{ url_list: ['https://p3.example/img.jpeg'] }], statistics: {} }))
      .toMatchObject({ url: 'https://www.douyin.com/note/7002', format: 'image', coverUrl: 'https://p3.example/img.jpeg', author: '', title: '' })
    expect(parseDouyinAweme({ aweme_id: '7003', aweme_type: 68, video: { origin_cover: { url_list: [1] } }, statistics: { play_count: 50 } }))
      .toMatchObject({ format: 'image', coverUrl: undefined, views: 50 })
    expect(parseDouyinAweme({ desc: 'no id' })).toBeUndefined()
  })

  it('collects posts wherever a search response nests them, once each', () => {
    const body = {
      status_code: 0,
      data: [
        { type: 1, aweme_info: aweme },
        { type: 2, card: { aweme_list: [{ ...aweme, aweme_id: '7004' }, aweme] } },
        { type: 3, user: { nickname: '不是作品' } },
      ],
    }
    expect(parseDouyinSearch(body).map(item => item.postId)).toEqual(['7001', '7004'])
    expect(parseDouyinSearch({ aweme_list: [aweme] }).map(item => item.postId)).toEqual(['7001'])
    expect(parseDouyinSearch({ status_code: 2483, data: [{ aweme_info: aweme }] })).toEqual([])
    expect(parseDouyinSearch('captcha')).toEqual([])
  })

  it('reads the trending list in order', () => {
    expect(parseDouyinTrending({ data: { word_list: [{ word: '立冬', hot_value: 11_257_868 }, { word: ' ' }, { word: '进博会' }] } }))
      .toEqual([{ word: '立冬', heat: 11_257_868 }, { word: '进博会', heat: undefined }])
    expect(parseDouyinTrending({})).toEqual([])
  })
})

describe('research keywords and related posts', () => {
  it('derives name fragments that mark persona tags', () => {
    expect(nameFragments('阿青Coding')).toEqual(['阿青', 'coding'])
    expect(nameFragments('AI产品经理')).toEqual(['产品', '品经', '经理'])
  })

  it('ranks hashtags by plays after the niche, skipping persona tags', () => {
    const posts = [
      post('1', '爆款 #AI #ClaudeCode #AI产品经理阿青', 80_000),
      post('2', '日常 #claudecode #Grok', 300),
      post('3', '短 #A', 100),
      { ...post('4', '无播放 #Grok'), views: undefined },
    ]
    // ClaudeCode appears in two posts, case-insensitively, so it outweighs AI.
    expect(researchKeywords(account, posts, 3)).toEqual(['ClaudeCode', 'AI', 'Grok'])
    expect(researchKeywords({ ...account, niche: '职场、AI 效率' }, posts, 3)).toEqual(['职场', 'AI', '效率'])
    expect(researchKeywords(account, posts, 0)).toEqual([])
  })

  it('searches a suggestion by its keywords or title, and keeps the most liked posts of others', () => {
    expect(suggestionQuery({ title: '选题', keywords: [' 面试 ', '求职', '简历'] })).toBe('面试 求职')
    expect(suggestionQuery({ title: '选题', keywords: [' '] })).toBe('选题')
    const found = [related('a', 5), related('b'), related('own', 900), related('me', 800, '阿青Coding'), related('c', 50)]
    expect(topRelated(found, new Set(['own']), '阿青Coding', 2).map(item => item.postId)).toEqual(['c', 'a'])
  })

  it('ranks recently published posts before older and undated ones', () => {
    const now = Date.parse('2026-11-11T00:00:00.000Z')
    const dated = (postId: string, likes: number, publishedAt?: string): MediaRelatedPost => ({ ...related(postId, likes), publishedAt })
    const found = [dated('old', 9000, '2025-01-01T00:00:00.000Z'), dated('new', 10, '2026-11-01T00:00:00.000Z'), dated('undated', 500), dated('fresh', 80, '2026-10-20T00:00:00.000Z')]
    expect(topRelated(found, new Set(), '', 3, { now, days: 30 }).map(item => item.postId)).toEqual(['fresh', 'new', 'old'])
    expect(topRelated(found, new Set(), '', 2, { now, days: 0 }).map(item => item.postId)).toEqual(['old', 'undated'])
  })
})

describe('research in the topic prompt', () => {
  const research = {
    trending: [{ word: '立冬', heat: 5 }, { word: '进博会' }],
    searches: [{ keyword: 'AI', posts: [{ ...related('a', 10), publishedAt: '2026-11-01T00:00:00.000Z', title: '多行\n标题' }, { ...related('b'), title: '', author: '' }] }],
    news: [{ title: '新模型发布', url: 'https://n.example', snippet: '摘要  内容', publishedAt: '2026-11-06T08:00:00Z' }, { title: '无日期', url: 'https://m.example', snippet: '' }],
    benchmarksRefreshed: 0,
  }

  it('renders trending entries, searches and news', () => {
    expect(relatedLines([])).toBe('（没有搜到）')
    const sections = researchSections(research, '抖音')
    expect(sections).toContain('1. 立冬（热度 5）\n2. 进博会')
    expect(sections).toContain('## 抖音搜索“AI”的高赞作品')
    expect(sections.join('\n')).toContain('- [2026-11-01] 多行 标题 | @作者 | 视频 | 赞 10')
    expect(sections.join('\n')).toContain('- [日期未知] （无标题） | @未知作者')
    expect(sections.join('\n')).toContain('- 新模型发布（2026-11-06）：摘要 内容')
    expect(researchSections({ ...research, trending: [], searches: [], news: [] }, '抖音')).toEqual([])
  })

  it('asks for search keywords and carries the research into the input', () => {
    const prompt = buildTopicPrompt(account, '抖音', [], [], 4, research)
    expect(prompt.system).toContain('keywords 给 2 到 3 个用于在抖音搜索同类作品的短关键词')
    expect(prompt.input).toContain('## 抖音实时热榜')
    expect(buildTopicPrompt(account, '抖音', [], [], 4).input).not.toContain('实时热榜')
  })
})

it('reads reports stored before keywords, related posts and research existed', () => {
  const stored = topicReportSchema.parse({
    id: 'r1', accountId: 'acct-1', createdAt: '2026-11-07T00:00:00.000Z', model: 'm', summary: 's',
    suggestions: [{ title: '旧选题', angle: '', reason: '', format: 'video', headlines: [], references: [], priority: 'high' }],
  })
  expect(stored.suggestions[0]).toMatchObject({ keywords: [], related: [] })
  expect(stored.research).toBeUndefined()
})
