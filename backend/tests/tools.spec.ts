/** What the conversation tools tell the model about the limits of the numbers. */
import { describe, expect, it } from 'vitest'
import { renderBounds } from '../src/tools.ts'
import type { MediaPlatformDescriptor } from '../src/types.ts'

const sspai: MediaPlatformDescriptor = {
  id: 'sspai', displayName: '少数派', loginUrl: '', scrape: true, import: false, importHint: '', profileUrlExample: '',
  metrics: { views: '阅读', likes: '充电', comments: '评论' }, noun: '文章', marks: '首页推荐和 Matrix 精选由平台标在文章上。',
}

describe('data bounds', () => {
  it('says when the posts read are fewer than the platform\'s count, and keeps guesses apart from facts', () => {
    const text = renderBounds(sspai, { read: 30, total: 47 }).join('\n')
    expect(text).toContain('插件读到 30 条文章，平台显示账号共 47 条')
    expect(text).toContain('阅读、充电、评论')
    expect(text).toContain('读不到流量来源、推荐曝光、观众画像')
    expect(text).toContain('「全账号」「已经失效」')
    expect(renderBounds(sspai, { read: 47, total: 47 }).join('\n')).toContain('插件读到 47 条文章（平台显示共 47 条）')
    expect(renderBounds({ ...sspai, marks: undefined }, undefined).join('\n')).toContain('这个平台没有接入推荐和榜单标记')
  })
})
