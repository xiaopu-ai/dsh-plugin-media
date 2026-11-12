/** Export files in xlsx and in UTF-8 or GBK CSV map to posts and snapshots through header synonyms. */
import iconv from 'iconv-lite'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { douyinAdapter } from '../src/adapters/douyin.ts'
import { wechatMpAdapter } from '../src/adapters/wechat-mp.ts'
import { xiaohongshuAdapter } from '../src/adapters/xiaohongshu.ts'
import { decodeCsv, MediaImportError, normalizeHeader, parseImportFile } from '../src/import.ts'

const XHS_CSV = [
  '笔记数据导出',
  '笔记标题,首次发布时间,体裁,曝光,观看量,点赞,评论,收藏,分享,涨粉,备注列',
  '春季穿搭,2024-05-01 12:00,图文,1.2万,3400,120,15,88,6,10,x',
  '通勤 vlog,2024-05-03 18:30,视频,800,500,20,2,3,0,1,y',
  '合计,,,,,,,,,,',
].join('\n')

describe('import', () => {
  it('normalizes headers', () => {
    expect(normalizeHeader(' 阅读次数（次） ')).toBe('阅读次数')
    expect(normalizeHeader('Play_Count')).toBe('playcount')
  })

  it('maps a UTF-8 小红书 CSV with a title row above the header', () => {
    const result = parseImportFile('notes.csv', new TextEncoder().encode('\uFEFF' + XHS_CSV), xiaohongshuAdapter.importProfile)
    expect(result.snapshots).toEqual([])
    expect(result.unmappedColumns).toEqual(['备注列'])
    expect(result.posts).toHaveLength(2)
    expect(result.posts[0]).toMatchObject({
      title: '春季穿搭', publishedAt: '2024-05-01T04:00:00.000Z', format: 'image', views: 3400, likes: 120, comments: 15,
      collects: 88, shares: 6, extra: { impressions: 12000, followersGained: 10 },
    })
    expect(result.posts[0]?.postId).toMatch(/^h[0-9a-f]{16}$/)
    expect(result.posts[1]).toMatchObject({ title: '通勤 vlog', format: 'video', views: 500 })
  })

  it('decodes GBK CSV exports', () => {
    const bytes = iconv.encode(XHS_CSV, 'gbk')
    expect(decodeCsv(bytes)).toBe(XHS_CSV)
    expect(parseImportFile('notes.csv', bytes, xiaohongshuAdapter.importProfile).posts[1]?.title).toBe('通勤 vlog')
  })

  it('maps xlsx post and follower sheets', () => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ['作品名称', '发布时间', '播放量', '点赞量', '评论量', '分享量', '完播率', '作品ID'],
      ['一条视频', '2024-06-01 10:00', 5000, 300, 20, 10, '35.5%', '7370000000000000001'],
    ]), '作品数据')
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ['日期', '粉丝总量', '新增粉丝'],
      ['2024-06-01', 1000, 12],
      ['2024-06-02', '1,020', 20],
    ]), '粉丝数据')
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['说明'], ['无数据']]), '说明')
    const bytes = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
    const result = parseImportFile('douyin.xlsx', bytes, douyinAdapter.importProfile)
    expect(result.posts).toEqual([{
      postId: '7370000000000000001', title: '一条视频', url: undefined, publishedAt: '2024-06-01T02:00:00.000Z', format: 'video',
      views: 5000, likes: 300, comments: 20, collects: undefined, shares: 10, extra: { completionRate: 35.5 },
    }])
    expect(result.snapshots).toEqual([
      { capturedAt: '2024-05-31T16:00:00.000Z', fields: { followers: 1000, following: undefined, likes: undefined, extra: { followersGained: 12 } } },
      { capturedAt: '2024-06-01T16:00:00.000Z', fields: { followers: 1020, following: undefined, likes: undefined, extra: { followersGained: 20 } } },
    ])
  })

  it('maps 公众号 article and user exports with platform columns', () => {
    const articles = '文章标题,群发时间,阅读次数,分享次数,在看人数,点赞人数\n一篇文章,2024-07-01,1000,30,5,8\n'
    const posts = parseImportFile('content.csv', new TextEncoder().encode(articles), wechatMpAdapter.importProfile).posts
    expect(posts[0]).toMatchObject({ title: '一篇文章', format: 'article', views: 1000, shares: 30, likes: 8, extra: { wow: 5 } })
    const users = '时间,新关注人数,取消关注人数,净增关注人数,累积关注人数\n2024-07-01,10,2,8,5008\n'
    expect(parseImportFile('users.csv', new TextEncoder().encode(users), wechatMpAdapter.importProfile).snapshots).toEqual([
      { capturedAt: '2024-06-30T16:00:00.000Z', fields: { followers: 5008, following: undefined, likes: undefined, extra: { newFollowers: 10, unfollows: 2, netFollowers: 8 } } },
    ])
  })

  it('refuses files without a recognizable table', () => {
    expect(() => parseImportFile('x.csv', new TextEncoder().encode('a,b\n1,2\n'), douyinAdapter.importProfile)).toThrow(MediaImportError)
    expect(() => parseImportFile('x.xlsx', new Uint8Array([1, 2, 3]), douyinAdapter.importProfile)).toThrow(MediaImportError)
  })
})
