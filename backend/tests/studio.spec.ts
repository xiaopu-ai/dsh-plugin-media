/** The creation workbench: topic ideas, project names, and the workbench process started, asked and stopped. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudioError, StudioRunner, studioIdeaFrom, studioProjectName } from '../src/studio.ts'
import type { MediaTopicSuggestion } from '../src/types.ts'

const dirs: string[] = []
const runners: StudioRunner[] = []
afterEach(() => {
  for (const runner of runners.splice(0)) runner.stop()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A stand-in workbench: answers `/api/stamp`, checks the token and refuses the first taken name. */
const FAKE_SERVER = `
import http from 'node:http'
const port = +process.argv[process.argv.indexOf('--port') + 1]
const taken = new Set(['已有选题'])
let stopped = 0
http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
  if (req.url === '/api/stamp') return send(200, {
    stamp: 1, pid: process.pid, frames: process.env.WB_FRAME_ANCESTORS,
    gateway: [process.env.WB_DSH_GATEWAY, process.env.WB_DSH_GATEWAY_KEY],
  })
  if (req.url === '/api/projects' && req.method === 'POST') {
    if (req.headers['x-wb-token'] !== process.env.WB_TOKEN) return send(403, { error: '令牌不对' })
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw)
    if (body.name === '拒绝') return send(500, { error: '磁盘满了' })
    if (body.name === '没有回答') return send(500, 'not an object')
    if (taken.has(body.name)) return send(500, { error: '文件夹已存在：' + body.name })
    return send(200, { id: body.type + ':' + body.name + ':' + body.idea.title })
  }
  if (req.url === '/api/projects/p1/studio/agent' && req.method === 'POST') {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw)
    if (body.message === 'busy') return send(409, { error: '助手还在做上一件事' })
    res.writeHead(200, { 'content-type': 'application/x-ndjson' })
    res.write(JSON.stringify({ type: 'step', text: '读了正文' }) + '\\n')
    if (body.message === 'hang') return
    res.end(JSON.stringify({ type: 'done', reply: body.provider + ':' + body.message, files: ['article.md'] }) + '\\n')
    return
  }
  if (req.url === '/api/projects/p1/studio/agent-stop') { stopped++; return send(200, { stopped }) }
  if (req.url === '/api/stops') return send(200, { stopped })
  send(404, { error: 'not found' })
}).listen(port, '127.0.0.1')
`

function workbench(source = FAKE_SERVER): string {
  const dir = mkdtempSync(join(tmpdir(), 'media-studio-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'server.mjs'), source)
  return dir
}

async function freePort(): Promise<number> {
  return await new Promise((resolve) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => { resolve(typeof address === 'object' && address !== null ? address.port : 0) })
    })
  })
}

async function runner(dir: string, startMs = 10_000): Promise<StudioRunner> {
  const warn = vi.fn()
  const created = new StudioRunner({ dir, port: await freePort(), startMs, frameAncestors: ['dsh-app:'], warn })
  runners.push(created)
  return created
}

const suggestion: MediaTopicSuggestion = {
  title: 'AI 复盘 / 爆款规律', angle: '用真实数据复盘', reason: '收藏率是中位数的 3 倍', format: 'video', headlines: ['标题一', '标题二'],
  references: ['旧作品'], priority: 'high', keywords: ['AI 复盘', '爆款'],
  related: [{ postId: 'v1', title: '同类\n作品', url: 'https://www.douyin.com/video/v1', author: '博主', format: 'video', likes: 10, comments: 2 }, { postId: 'v2', title: '', url: 'https://www.douyin.com/video/v2', author: '', format: 'video' }],
}

describe('topic ideas', () => {
  it('turns a suggestion into a workbench idea with a brief and evidence', () => {
    const idea = studioIdeaFrom(suggestion, '阿青Coding', '抖音')
    expect(idea).toMatchObject({ title: suggestion.title, angle: '用真实数据复盘', why: '收藏率是中位数的 3 倍', hook: '标题一' })
    expect(idea.brief).toContain('来自「自媒体 · 选题」：账号 阿青Coding（抖音）')
    expect(idea.brief).toContain('## 候选标题\n- 标题一\n- 标题二')
    expect(idea.brief).toContain('## 关键词\nAI 复盘、爆款')
    expect(idea.brief).toContain('- [抖音 @博主] [同类 作品](https://www.douyin.com/video/v1)（赞 10 · 评 2）')
    expect(idea.brief).toContain('- [抖音 @未知作者] [（无标题）](https://www.douyin.com/video/v2)')
    expect(idea.evidence).toEqual([
      { sourceName: '抖音 @博主', title: '同类 作品', url: 'https://www.douyin.com/video/v1' },
      { sourceName: '抖音 @未知作者', title: '（无标题）', url: 'https://www.douyin.com/video/v2' },
    ])
    expect(idea.sources).toEqual(['https://www.douyin.com/video/v1', 'https://www.douyin.com/video/v2'])
    const bare = studioIdeaFrom({ ...suggestion, angle: '', reason: '', headlines: [], keywords: [], references: [], related: [] }, '号', '小红书')
    expect(bare).toMatchObject({ angle: undefined, why: undefined, hook: undefined, brief: '来自「自媒体 · 选题」：账号 号（小红书）', evidence: [] })
  })

  it('carries a video topic\'s filming plan into the brief and the script fields', () => {
    const video = { hook: '两百块，我雇了个 AI 产品经理。', outline: ['先看结果', '再看过程'], seconds: 90, cover: '200 块雇个 PM' }
    const idea = studioIdeaFrom({ ...suggestion, video }, '号', '抖音')
    expect(idea.script).toEqual(video)
    expect(idea.headlines).toEqual(['标题一', '标题二'])
    expect(idea.brief).toContain('## 视频方案\n- 开口第一句：两百块，我雇了个 AI 产品经理。\n- 第 1 段：先看结果\n- 第 2 段：再看过程\n- 建议时长：90 秒\n- 封面字：200 块雇个 PM')
    const sparse = studioIdeaFrom({ ...suggestion, video: { hook: '', outline: [], seconds: 0, cover: '' } }, '号', '抖音')
    expect(sparse.brief).toContain('## 视频方案')
    expect(sparse.brief).not.toContain('开口第一句')
    expect(studioIdeaFrom(suggestion, '号', '抖音').script).toBeUndefined()
  })

  it('makes folder-safe project names', () => {
    expect(studioProjectName('AI 复盘 / 爆款规律: 一个\\共同点')).toBe('AI 复盘 - 爆款规律- 一个-共同点')
    expect(studioProjectName('长'.repeat(50))).toBe('长'.repeat(40))
    expect(studioProjectName(' / ')).toBe('-')
    expect(studioProjectName('  ')).toBe('新选题')
  })
})

describe('workbench process', () => {
  it('starts once, creates projects with the token, numbers taken names and stops', async () => {
    const studio = await runner(workbench())
    const page = await studio.ensure(new AbortController().signal)
    const url = studio.url
    expect(page).toBe(`${url}?embed=dsh`)
    expect(studio.pageUrl).toBe(page)
    expect(await studio.ensure(new AbortController().signal)).toBe(page)
    const stamp = await (await fetch(`${url}api/stamp`)).json() as { frames: string }
    expect(stamp.frames).toBe('dsh-app:')
    const idea = studioIdeaFrom(suggestion, '号', '抖音')
    const created = await studio.create('article', '新选题', idea, new AbortController().signal)
    expect(created).toBe(`article:新选题:${suggestion.title}`)
    expect(studio.projectUrl(created, 'article')).toBe(`${page}#/p/${encodeURIComponent(created)}/research`)
    expect(await studio.create('card', '已有选题', idea, new AbortController().signal)).toBe(`card:已有选题 2:${suggestion.title}`)
    expect(studio.projectUrl('c', 'card')).toBe(`${page}#/p/c`)
    expect(studio.projectUrl('s', 'script')).toBe(`${page}#/p/s/write`)
    await expect(studio.create('article', '拒绝', idea, new AbortController().signal)).rejects.toThrow('创作工作台没能新建项目：磁盘满了')
    await expect(studio.create('article', '没有回答', idea, new AbortController().signal)).rejects.toThrow('HTTP 500')
    await expect(studio.request('GET', 'nothing', undefined, new AbortController().signal)).rejects.toThrow('not found')
    studio.stop()
    // A stopped workbench starts again on the next use.
    expect(await studio.ensure(new AbortController().signal)).toBe(page)
  })

  it('runs the writing assistant, reports a refused turn, and stops a cancelled one', async () => {
    const studio = await runner(workbench())
    expect(await studio.assist('p1', '改开头', 'dsh', new AbortController().signal))
      .toEqual({ reply: 'dsh:改开头', files: ['article.md'], steps: ['读了正文'] })
    await expect(studio.assist('p1', 'busy', undefined, new AbortController().signal)).rejects.toThrow('助手还在做上一件事')
    const cancel = new AbortController()
    const hanging = studio.assist('p1', 'hang', undefined, cancel.signal)
    await new Promise((resolve) => { setTimeout(resolve, 200) })
    cancel.abort(new Error('cancelled'))
    await expect(hanging).rejects.toThrow()
    await vi.waitFor(async () => {
      expect(await (await fetch(`${studio.url}api/stops`)).json()).toEqual({ stopped: 1 })
    })
  })

  it('hands the workbench the model gateway address and key', async () => {
    const dir = workbench()
    const start = vi.fn(() => Promise.resolve('http://127.0.0.1:9'))
    const studio = new StudioRunner({
      dir, port: await freePort(), startMs: 10_000, frameAncestors: [], warn: vi.fn(),
      gateway: { start, key: 'k' },
    })
    runners.push(studio)
    await studio.ensure(new AbortController().signal)
    const stamp = await (await fetch(`${studio.url}api/stamp`)).json() as { gateway: string[]; frames: string }
    expect(stamp.gateway).toEqual(['http://127.0.0.1:9', 'k'])
    expect(stamp.frames).toBe('')
    expect(start).toHaveBeenCalledOnce()
  })

  it('starts the workbench again after it is killed', async () => {
    const studio = await runner(workbench())
    const signal = new AbortController().signal
    const first = await studio.request('GET', 'stamp', undefined, signal) as { pid: number }
    process.kill(first.pid, 'SIGTERM')
    await vi.waitFor(() => { expect(() => process.kill(first.pid, 0)).toThrow() })
    await vi.waitFor(async () => {
      const second = await studio.request('GET', 'stamp', undefined, signal) as { pid: number }
      expect(second.pid).not.toBe(first.pid)
    })
  })

  it('reports a missing folder, an exit during startup and a workbench that never answers', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'media-studio-'))
    dirs.push(empty)
    await expect((await runner(empty)).ensure(new AbortController().signal)).rejects.toThrow(StudioError)
    const crash = await runner(workbench('console.error("boom"); process.exit(3)'))
    await expect(crash.ensure(new AbortController().signal)).rejects.toThrow(/启动后退出了（代码 3）：boom/)
    const silent = await runner(workbench('setInterval(() => {}, 1000)'), 600)
    await expect(silent.ensure(new AbortController().signal)).rejects.toThrow('秒内没有响应')
    const aborted = new AbortController()
    const waiting = (await runner(workbench('setInterval(() => {}, 1000)'))).ensure(aborted.signal)
    aborted.abort(new Error('stopped'))
    await expect(waiting).rejects.toThrow('stopped')
  })
})
