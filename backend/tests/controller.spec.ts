/** The Remote controller validates accounts, imports files, records unsupported scrapes and stores AI reports. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import { brandString } from '@deepseek-ai/dsh-brand'
import { afterEach, expect, it, vi } from 'vitest'
import MediaSuite from '../src/index.ts'
import { BrowserManager } from '../src/browser.ts'
import type { MediaPlatformAdapter } from '../src/adapters/types.ts'
import type { Page } from 'playwright-core'
import type { WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web'
import type { MediaAccountDraft, MediaAccountId, MediaBrowserId, MediaRelatedPost, MediaReportId } from '../src/types.ts'

const roots: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => root.fiber.dispose()))
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Research settings that keep a spec off the network and the browser. */
const NO_RESEARCH = { researchKeywords: 0, trendingCount: 0, relatedPerTopic: 0, newsResults: 0, benchmarkRefreshHours: 0 }

async function fixture(config: Partial<Parameters<typeof MediaSuite.Config>[0]> = NO_RESEARCH, llm: object = {}): Promise<MediaSuite> {
  const ctx = new Context()
  roots.push(ctx)
  const dataDir = mkdtempSync(join(tmpdir(), 'media-suite-'))
  dirs.push(dataDir)
  // Reports run through `suite.llm`, which each test replaces; the services only satisfy injection.
  ctx.provide('llm', llm as never)
  ctx.provide('agentDefaultModel', { currentSelection: () => ({ provider: 'p', model: 'm' }) } as never)
  await ctx.plugin(MediaSuite, MediaSuite.Config({ dataDir, ...config }))
  return ctx.mediaSuite
}

const draft: MediaAccountDraft = {
  platform: 'wechat-mp', role: 'own', name: '  我的公众号 ', profileUrl: '', niche: '职场', notes: '',
  monitor: { enabled: true, intervalMinutes: 5 },
}

async function failure(run: () => unknown): Promise<unknown> {
  try {
    await run()
  } catch (error) {
    return remoteErrorOf(error)
  }
  throw new Error('expected a failure')
}

it('holds at most the configured number of own accounts per platform, not counting sample accounts', async () => {
  const suite = await fixture({ ...NO_RESEARCH, maxAccountsPerPlatform: 2 })
  suite.loadDemo()
  suite.saveAccount({ ...draft, name: '号一' })
  const second = suite.saveAccount({ ...draft, name: '号二' })
  expect(await failure(() => suite.saveAccount({ ...draft, name: '号三' }))).toMatchObject({ code: 'media/limit', details: { platform: 'wechat-mp', limit: 2 } })
  // Saving an existing account again, and another platform, are not limited.
  expect(suite.saveAccount({ ...draft, id: second.id, name: '号二改名' }).id).toBe(second.id)
  expect(suite.saveAccount({ ...draft, platform: 'douyin', name: '抖音号' }).platform).toBe('douyin')
  suite.deleteAccount(second.id)
  expect(suite.saveAccount({ ...draft, name: '号三' }).name).toBe('号三')
})

it('registers the built-in platforms and validates account drafts', async () => {
  const suite = await fixture()
  expect(suite.platforms().map(platform => platform.id)).toEqual(['douyin', 'xiaohongshu', 'wechat-mp', 'wechat-channels'])
  const account = suite.saveAccount(draft)
  expect(account).toMatchObject({ name: '我的公众号', monitor: { enabled: true, intervalMinutes: 30 } })
  const updated = suite.saveAccount({ ...draft, id: account.id, name: '新名字', monitor: { enabled: false, intervalMinutes: 0 } })
  expect(updated).toMatchObject({ id: account.id, createdAt: account.createdAt, monitor: { intervalMinutes: 360 } })
  expect(suite.accounts()).toHaveLength(1)
  expect(await failure(() => suite.saveAccount({ ...draft, platform: 'nope' }))).toMatchObject({ code: 'media/invalid', details: { field: 'platform' } })
  expect(await failure(() => suite.saveAccount({ ...draft, name: ' ' }))).toMatchObject({ code: 'media/invalid', details: { field: 'name' } })
  expect(await failure(() => suite.saveAccount({ ...draft, profileUrl: 'javascript:alert(1)' }))).toMatchObject({ code: 'media/invalid', details: { field: 'profileUrl' } })
  const missing = brandString<MediaAccountId>('acct-missing')
  expect(await failure(() => suite.saveAccount({ ...draft, id: missing }))).toMatchObject({ code: 'media/not-found', details: { kind: 'account' } })
  expect(await failure(() => suite.overview(missing, 30))).toMatchObject({ code: 'media/not-found' })
  suite.deleteAccount(account.id)
  expect(suite.accounts()).toEqual([])
  expect(await failure(() =>{  suite.deleteAccount(account.id) })).toMatchObject({ code: 'media/not-found' })
})

it('imports export files into the overview and records runs', async () => {
  const suite = await fixture()
  const account = suite.saveAccount(draft)
  const csv = '文章标题,群发时间,阅读次数,点赞人数\n' + `新文章,${new Date().toISOString().slice(0, 10)},1000,8\n`
  const result = await suite.importFile(account.id, 'a.csv', Buffer.from(csv).toString('base64'))
  expect(result).toEqual({ snapshotWritten: false, postsWritten: 1, unmappedColumns: [] })
  const users = '时间,累积关注人数\n2024-07-01,5008\n'
  expect(await suite.importFile(account.id, 'u.csv', Buffer.from(users).toString('base64'))).toMatchObject({ snapshotWritten: true })
  const overview = suite.overview(account.id, 30)
  expect(overview).toMatchObject({ latest: { followers: 5008, source: 'import' }, engagement: { postCount: 1, avgViews: 1000 }, lastRun: { kind: 'import', ok: true }, login: 'unknown' })
  expect(suite.posts(account.id, 10).map(post => post.title)).toEqual(['新文章'])
  expect(await failure(() => suite.importFile(account.id, 'bad.csv', Buffer.from('x,y\n1,2').toString('base64')))).toMatchObject({ code: 'media/import-failed', details: { fileName: 'bad.csv' } })
  expect(suite.overview(account.id, 30).lastRun).toMatchObject({ ok: false, errorCode: 'parse-failed' })
  expect(await failure(() => suite.importFile(account.id, 'x.csv', '###'))).toMatchObject({ code: 'media/invalid', details: { field: 'base64' } })
})

it('records an unsupported scrape for an import-only role without launching a browser', async () => {
  const suite = await fixture()
  const benchmark = suite.saveAccount({ ...draft, role: 'benchmark', name: '对标公众号' })
  const run = await suite.refresh(benchmark.id, new AbortController().signal)
  expect(run).toMatchObject({ kind: 'scrape', ok: false, errorCode: 'unsupported' })
  expect(suite.overview(benchmark.id, 30).nextRunAt).toBeUndefined()
  expect(await failure(() => suite.analyze(benchmark.id, new AbortController().signal))).toMatchObject({ code: 'media/invalid', details: { field: 'role' } })
})

it('steers topics by a direction, tells the model what earlier reports gave, and asks again after a garbled answer', async () => {
  const suite = await fixture()
  const own = suite.saveAccount({ ...draft, platform: 'douyin' })
  const answer = (title: string): string => `{"summary":"s","suggestions":[{"title":"${title}","reason":"r"}]}`
  const llm = vi.fn<(request: { readonly input: string }) => Promise<{ model: string; text: string }>>()
    .mockResolvedValueOnce({ model: 'm', text: answer('通勤穿搭') })
    .mockResolvedValueOnce({ model: 'm', text: '抱歉，我想了想' })
    .mockResolvedValueOnce({ model: 'm', text: answer('双十一清单') })
  suite.llm = llm
  const first = await suite.generateTopics(own.id, new AbortController().signal)
  expect(first.direction).toBeUndefined()
  expect(llm.mock.calls[0]?.[0].input).not.toContain('最近已经给过的选题')
  const second = await suite.generateTopicsAbout(own.id, '  双十一\n好物 ', new AbortController().signal)
  expect(second).toMatchObject({ direction: '双十一 好物', suggestions: [{ title: '双十一清单' }] })
  expect(llm).toHaveBeenCalledTimes(3)
  expect(llm.mock.calls[2]?.[0].input).toContain('## 这次想做的方向\n\n双十一 好物')
  expect(llm.mock.calls[2]?.[0].input).toContain('## 最近已经给过的选题\n\n- 通勤穿搭')
  expect(suite.topicReports(own.id).map(report => report.direction)).toEqual(['双十一 好物', undefined])
  // A blank direction is no direction; an overlong one is refused before any model call.
  llm.mockResolvedValueOnce({ model: 'm', text: answer('周末探店') })
  expect((await suite.generateTopicsAbout(own.id, '   ', new AbortController().signal)).direction).toBeUndefined()
  expect(await failure(() => suite.generateTopicsAbout(own.id, '长'.repeat(501), new AbortController().signal))).toMatchObject({ code: 'media/invalid', details: { field: 'direction' } })
  expect(llm).toHaveBeenCalledTimes(4)
  const strict = await fixture({ ...NO_RESEARCH, topicHistoryReports: 0, llmParseRetries: 0 })
  const other = strict.saveAccount({ ...draft, platform: 'douyin' })
  const once = vi.fn<(request: { readonly input: string }) => Promise<{ model: string; text: string }>>()
    .mockResolvedValueOnce({ model: 'm', text: answer('第一次') })
    .mockResolvedValueOnce({ model: 'm', text: answer('第二次') })
    .mockResolvedValueOnce({ model: 'm', text: '不是 JSON' })
  strict.llm = once
  await strict.generateTopics(other.id, new AbortController().signal)
  await strict.generateTopics(other.id, new AbortController().signal)
  expect(once.mock.calls[1]?.[0].input).not.toContain('最近已经给过的选题')
  expect(await failure(() => strict.generateTopics(other.id, new AbortController().signal))).toMatchObject({ code: 'media/llm-failed' })
  expect(once).toHaveBeenCalledTimes(3)
})

it('stores AI reports and reports model failures', async () => {
  const suite = await fixture()
  const own = suite.saveAccount({ ...draft, platform: 'douyin' })
  suite.saveAccount({ ...draft, platform: 'douyin', role: 'benchmark', name: '对标' })
  const llm = vi.fn(async (request: { readonly system: string; readonly input: string }) => {
    if (request.system.includes('内容策划')) {
      return { model: 'fake/model', text: '```json\n{"summary":"思路","suggestions":[{"title":"选题一","angle":"角度","reason":"理由","format":"video","headlines":["标题"],"references":[],"priority":"high"}]}\n```' }
    }
    return { model: 'fake/model', text: '{"summary":"诊断","strengths":["稳定"],"items":[{"area":"发布节奏","finding":"断更","evidence":"无","action":"固定更新","priority":"high"}]}' }
  })
  suite.llm = llm
  const topics = await suite.generateTopics(own.id, new AbortController().signal)
  expect(topics).toMatchObject({ accountId: own.id, model: 'fake/model', summary: '思路', suggestions: [{ title: '选题一' }] })
  expect(llm.mock.calls[0]?.[0].input).toContain('### 对标')
  const analysis = await suite.analyze(own.id, new AbortController().signal)
  expect(analysis.items).toHaveLength(1)
  expect(suite.topicReports(own.id).map(report => report.id)).toEqual([topics.id])
  expect(suite.analysisReports(own.id).map(report => report.id)).toEqual([analysis.id])
  const garbled = vi.fn(() => Promise.resolve({ model: 'fake/model', text: 'not json' }))
  suite.llm = garbled
  expect(await failure(() => suite.generateTopics(own.id, new AbortController().signal))).toMatchObject({ code: 'media/llm-failed', details: { accountId: own.id } })
  // The answer that was not JSON was asked for once more before giving up.
  expect(garbled).toHaveBeenCalledTimes(2)
  suite.llm = () => Promise.reject(new Error('quota'))
  expect(await failure(() => suite.analyze(own.id, new AbortController().signal))).toMatchObject({ code: 'media/llm-failed', details: { reason: 'quota' } })
  let release!: () => void
  // The answer released later is a valid one, so the pending report is not asked for again.
  suite.llm = () => new Promise((resolve) => { release = () => { resolve({ model: 'm', text: '{"summary":"s","suggestions":[{"title":"t"}]}' }) } })
  const pending = suite.generateTopics(own.id, new AbortController().signal).catch((error: unknown) => error)
  expect(await failure(() => suite.generateTopics(own.id, new AbortController().signal))).toMatchObject({ code: 'media/busy' })
  release()
  await pending
})

function related(id: string, likes: number, author = '别人'): MediaRelatedPost {
  return { postId: id, title: `同类${id}`, url: `https://example.com/${id}`, author, format: 'video', likes }
}

it('researches trending topics, keyword searches and news before topics, and attaches related posts to each topic', async () => {
  const suite = await fixture({
    researchKeywords: 2, researchPostsPerKeyword: 2, relatedPerTopic: 2, trendingCount: 1, newsResults: 2, benchmarkRefreshHours: 24,
  })
  vi.spyOn(BrowserManager.prototype, 'withPage').mockImplementation((_platform, _signal, run) => run({} as Page))
  const searched: string[] = []
  const adapter: MediaPlatformAdapter = {
    descriptor: { id: 'fakeplat', displayName: '测试平台', loginUrl: 'https://example.com', scrape: true, import: false, importHint: '', profileUrlExample: '' },
    importProfile: { columns: [], defaultFormat: 'video' },
    detectLogin: () => Promise.resolve('logged-in'),
    scrape: () => Promise.reject(new Error('blocked')),
    trending: () => Promise.resolve([{ word: '立冬', heat: 9 }, { word: '第二条', heat: 1 }]),
    search: (_page, keyword) => {
      searched.push(keyword)
      return Promise.resolve([related('a', 5), related('b', 50), related('mine', 99, '我的号'), related('c', 1)])
    },
  }
  suite.registerAdapter(adapter)
  const own = suite.saveAccount({ ...draft, platform: 'fakeplat', name: '我的号', niche: '职场' })
  suite.saveAccount({ ...draft, platform: 'fakeplat', role: 'benchmark', name: '对标号' })
  const llm = vi.fn((request: { readonly system: string; readonly input: string }) => Promise.resolve({
    model: 'fake/model',
    text: JSON.stringify({ summary: request.input.includes('测试平台实时热榜') ? '有热榜' : '无热榜', suggestions: [
      { title: '选题一', angle: '', reason: '', format: 'video', headlines: [], references: [], keywords: ['面试', '求职'], priority: 'high' },
      { title: '选题二', angle: '', reason: '', format: 'video', headlines: [], references: [], priority: 'low' },
    ] }),
  }))
  suite.llm = llm
  const report = await suite.generateTopics(own.id, new AbortController().signal)
  const input = llm.mock.calls[0]?.[0].input ?? ''
  expect(input).toContain('1. 立冬（热度 9）')
  expect(input).not.toContain('第二条')
  expect(input).toContain('## 测试平台搜索“职场”的高赞作品')
  expect(report.summary).toBe('有热榜')
  // The niche is the only keyword; each topic then searches its first two keywords, or its title.
  expect(searched).toEqual(['职场', '面试 求职', '选题二'])
  expect(report.suggestions.map(suggestion => suggestion.related.map(post => post.postId))).toEqual([['b', 'a'], ['b', 'a']])
  expect(report.suggestions[1]?.keywords).toEqual([])
  expect(report.research).toMatchObject({
    trending: [{ word: '立冬' }], searches: [{ keyword: '职场', posts: [{ postId: 'b' }, { postId: 'a' }] }], news: [], benchmarksRefreshed: 0,
  })
  expect(report.research?.notes).toEqual([
    '对标账号「对标号」更新失败：抓取失败：blocked',
    '未启用联网搜索，没有查询相关新闻',
  ])
  expect(suite.topicReports(own.id)[0]).toEqual(report)

  // Searching again replaces the related posts and keeps the stored report's id and notes.
  searched.length = 0
  const again = await suite.findRelated(report.id, new AbortController().signal)
  expect(searched).toEqual(['面试 求职', '选题二'])
  expect(again).toMatchObject({ id: report.id, research: { notes: report.research?.notes } })
  expect(suite.topicReports(own.id)).toEqual([again])
  vi.restoreAllMocks()
})

it('starts the creation workbench and creates an article from a stored topic suggestion', async () => {
  expect(await (await fixture()).studioOpen(new AbortController().signal)).toBeUndefined()
  const studioDir = mkdtempSync(join(tmpdir(), 'media-studio-'))
  dirs.push(studioDir)
  writeFileSync(join(studioDir, 'server.mjs'), `
import http from 'node:http'
const port = +process.argv[process.argv.indexOf('--port') + 1]
http.createServer(async (req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  if (req.url !== '/api/projects') return res.end('{}')
  let raw = ''; for await (const chunk of req) raw += chunk
  const body = JSON.parse(raw)
  res.end(JSON.stringify(body.name === '坏' ? { error: '坏了' } : { id: body.name + '|' + body.idea.why + (body.type === 'script' ? '|script|' + body.idea.script.hook : '') }))
}).listen(port, '127.0.0.1')`)
  const suite = await fixture({ ...NO_RESEARCH, studioDir, studioPort: 5297 })
  const own = suite.saveAccount(draft)
  suite.llm = () => Promise.resolve({ model: 'm', text: '{"summary":"s","suggestions":[{"title":"选题/一","reason":"理由"},{"title":"坏"},{"title":"视频题","reason":"理","format":"video","video":{"hook":"钩","outline":["一"],"seconds":60,"cover":"封"}},{"title":"坏方案","format":"video","video":"不是对象"}]}' })
  const report = await suite.generateTopics(own.id, new AbortController().signal)
  expect(report.suggestions[2]?.video).toEqual({ hook: '钩', outline: ['一'], seconds: 60, cover: '封' })
  expect(report.suggestions[3]).toMatchObject({ title: '坏方案', format: 'video', video: undefined })
  expect(await suite.studioOpen(new AbortController().signal)).toBe('http://127.0.0.1:5297/?embed=dsh')
  expect(await suite.studioWriteArticle(report.id, 0, new AbortController().signal)).toBe(`http://127.0.0.1:5297/?embed=dsh#/p/${encodeURIComponent('选题-一|理由')}/research`)
  expect(await suite.studioWriteArticle(report.id, 2, new AbortController().signal)).toBe(`http://127.0.0.1:5297/?embed=dsh#/p/${encodeURIComponent('视频题|理|script|钩')}/write`)
  expect(await failure(() => suite.studioWriteArticle(report.id, 1, new AbortController().signal)))
    .toMatchObject({ code: 'media/studio-failed', details: { reason: '创作工作台没能新建项目：坏了' } })
  expect(await failure(() => suite.studioWriteArticle(report.id, 5, new AbortController().signal))).toMatchObject({ code: 'media/invalid', details: { field: 'index' } })
  expect(await failure(() => suite.studioWriteArticle(brandString<MediaReportId>('report-missing'), 0, new AbortController().signal)))
    .toMatchObject({ code: 'media/not-found', details: { kind: 'report' } })
  const plain = await fixture()
  const other = plain.saveAccount(draft)
  plain.llm = suite.llm
  const otherReport = await plain.generateTopics(other.id, new AbortController().signal)
  expect(await failure(() => plain.studioWriteArticle(otherReport.id, 0, new AbortController().signal))).toMatchObject({ code: 'media/invalid', details: { field: 'studioDir' } })
  const broken = await fixture({ ...NO_RESEARCH, studioDir: join(studioDir, 'missing') })
  expect(await failure(() => broken.studioOpen(new AbortController().signal))).toMatchObject({ code: 'media/studio-failed' })
})

it('lends the workbench every client model, the client default, images and web access through the gateway', async () => {
  const studioDir = mkdtempSync(join(tmpdir(), 'media-studio-'))
  dirs.push(studioDir)
  writeFileSync(join(studioDir, 'server.mjs'), `
import http from 'node:http'
const port = +process.argv[process.argv.indexOf('--port') + 1]
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ gateway: process.env.WB_DSH_GATEWAY, key: process.env.WB_DSH_GATEWAY_KEY }))
}).listen(port, '127.0.0.1')`)
  const stream = vi.fn(async function* (_request: Record<string, unknown>) {
    yield await Promise.resolve({ type: 'block-start', index: 0, blockType: 'text' })
    yield { type: 'text-delta', index: 0, text: '好' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: '好' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  })
  const prepareCall = vi.fn(() => Promise.resolve({ config: { maxTokens: 7 }, stream }))
  const llm = {
    listProviders: () => [{ id: 'anthropic', name: 'Anthropic' }, { id: 'broken', name: 'Broken' }, { id: 'deepseek-official', name: 'DeepSeek' }],
    listModels: (provider: string) => provider === 'broken' ? Promise.reject(new Error('offline'))
      : Promise.resolve(provider === 'anthropic' ? [{ provider, id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' }] : [{ provider, id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' }]),
    prepareCall,
  }
  const suite = await fixture({ ...NO_RESEARCH, studioDir, studioPort: 5296 }, llm)
  const search = vi.fn(() => Promise.resolve({ sources: [{ url: 'https://n.example', title: '新闻', summary: '摘要' }], truncated: false }))
  const fetchPage = vi.fn((request: { readonly url: string }) => Promise.resolve(request.url.endsWith('html')
    ? { url: request.url, statusCode: 200, body: { kind: 'html', content: '<p>正文</p>' }, truncated: false }
    : { url: request.url, statusCode: 200, body: { kind: 'text', content: '纯文本' }, truncated: false }))
  roots.at(-1)?.provide('web', { search, fetch: fetchPage } as never)
  const url = await suite.studioOpen(new AbortController().signal)
  const env = await (await fetch(new URL('/api/stamp', String(url)))).json() as { gateway: string; key: string }
  const call = (path: string, body?: unknown) => fetch(`${env.gateway}${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'x-api-key': env.key }, ...body === undefined ? {} : { body: JSON.stringify(body) },
  })
  // Without an attachment store, images are described instead of sent.
  await call('/v1/messages', { messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA' } }] }] })
  expect(stream.mock.calls.at(-1)?.[0]).toMatchObject({ messages: [{ content: [{ type: 'text', text: '［这里有一张图片，当前环境无法把它交给模型］' }] }] })
  const saveImages = vi.fn(() => Promise.resolve([{ id: 'img' }]))
  roots.at(-1)?.provide('attachments', { saveImages } as never)
  // The fixture's default model, `p/m`, is listed first although no provider lists it.
  expect(await (await call('/models')).json()).toEqual({
    default: 'p/m',
    models: [
      { id: 'p/m', name: 'm' },
      { id: 'anthropic/claude-sonnet-5-5', name: 'Claude Sonnet 5.5 · Anthropic' },
      { id: 'deepseek-official/deepseek-v4-pro', name: 'DeepSeek V4 Pro · DeepSeek' },
    ],
  })
  const reply = await (await call('/v1/messages', {
    model: 'anthropic/claude-sonnet-5-5', max_tokens: 99,
    messages: [{ role: 'user', content: [{ type: 'text', text: '看图' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }, { type: 'image', source: { type: 'base64', media_type: 'image/bmp', data: 'AAAA' } }] }],
    tools: [{ name: 't', description: 'd', input_schema: { type: 'object' } }],
  })).json() as { content: unknown }
  expect(reply.content).toEqual([{ type: 'text', text: '好' }])
  expect(prepareCall).toHaveBeenCalledWith({ provider: 'anthropic', model: 'claude-sonnet-5-5', maxTokens: 99 }, expect.any(AbortSignal))
  expect(stream).toHaveBeenCalledWith(expect.objectContaining({
    maxTokens: 7, system: '', purpose: 'media-suite', tools: [{ name: 't', description: 'd', parameters: { type: 'object' } }],
    messages: [{ role: 'user', content: [{ type: 'text', text: '看图' }, { type: 'image', attachment: { id: 'img' } }, { type: 'text', text: '［这里有一张图片，当前环境无法把它交给模型］' }] }],
  }))
  await call('/v1/messages', { messages: [] })
  expect(prepareCall).toHaveBeenLastCalledWith({ provider: 'p', model: 'm', maxTokens: 16000 }, expect.any(AbortSignal))
  expect(stream.mock.calls.at(-1)?.[0]).not.toHaveProperty('tools')
  expect(await (await call('/web/search', { query: 'AI' })).json()).toEqual({ results: [{ url: 'https://n.example', title: '新闻', snippet: '摘要' }] })
  expect(await (await call('/web/fetch', { url: 'https://n.example/a.html' })).json()).toMatchObject({ text: '正文' })
  expect(await (await call('/web/fetch', { url: 'https://n.example/a.txt' })).json()).toMatchObject({ text: '纯文本' })
})

it('refuses related-post searches for unknown reports and platforms without search', async () => {
  const suite = await fixture()
  expect(await failure(() => suite.findRelated(brandString<MediaReportId>('report-missing'), new AbortController().signal)))
    .toMatchObject({ code: 'media/not-found', details: { kind: 'report' } })
  const own = suite.saveAccount(draft)
  suite.llm = () => Promise.resolve({ model: 'm', text: '{"summary":"s","suggestions":[{"title":"t"}]}' })
  const report = await suite.generateTopics(own.id, new AbortController().signal)
  expect(report.suggestions[0]).toMatchObject({ keywords: [], related: [] })
  expect(await failure(() => suite.findRelated(report.id, new AbortController().signal))).toMatchObject({ code: 'media/invalid', details: { field: 'platform' } })
  expect(suite.platforms().find(platform => platform.id === 'douyin')?.search).toBe(true)
  expect(suite.platforms().find(platform => platform.id === 'wechat-mp')?.search).toBe(false)
})

it('notes research sources that fail without failing the report', async () => {
  const suite = await fixture({ researchKeywords: 1, relatedPerTopic: 1, trendingCount: 5, newsResults: 3, benchmarkRefreshHours: 0 })
  vi.spyOn(BrowserManager.prototype, 'withPage').mockImplementation((_platform, _signal, run) => run({} as Page))
  suite.registerAdapter({
    descriptor: { id: 'fakeplat', displayName: '测试平台', loginUrl: 'https://example.com', scrape: true, import: false, importHint: '', profileUrlExample: '' },
    importProfile: { columns: [], defaultFormat: 'video' },
    detectLogin: () => Promise.resolve('logged-in'),
    scrape: () => Promise.reject(new Error('unused')),
    trending: () => Promise.resolve([]),
    search: () => Promise.reject(new Error('验证码')),
  })
  const own = suite.saveAccount({ ...draft, platform: 'fakeplat', niche: '职场' })
  suite.llm = () => Promise.resolve({ model: 'm', text: '{"summary":"s","suggestions":[{"title":"t","keywords":["k"]}]}' })
  const search = vi.fn<(request: WebSearchRequest, signal?: AbortSignal) => Promise<WebSearchResult>>(() => Promise.reject(new Error('quota')))
  roots.at(-1)?.provide('web', { search } as never)
  const report = await suite.generateTopics(own.id, new AbortController().signal)
  expect(search).toHaveBeenCalledWith({ query: '职场 职场 最新消息', maxResults: 3 }, expect.any(AbortSignal))
  expect(report.suggestions[0]?.related).toEqual([])
  expect(report.research?.notes).toEqual([
    '没有读到测试平台热榜',
    '测试平台热榜和搜索未完成：验证码',
    '联网搜索新闻失败：quota',
    '部分选题没有搜到同类作品：验证码',
  ])
  search.mockImplementation(() => Promise.resolve({ sources: [{ url: 'https://n.example/1', title: '新闻', snippet: '摘要', publishedAt: '2026-11-06' }, { url: 'https://n.example/2' }], truncated: false }))
  const next = await suite.generateTopics(own.id, new AbortController().signal)
  // A failing search keeps the suggestion's previous related posts and adds a note.
  const kept = await suite.findRelated(report.id, new AbortController().signal)
  expect(kept.suggestions[0]?.related).toEqual([])
  expect(kept.research?.notes.at(-1)).toBe('部分选题没有搜到同类作品：验证码')
  expect(next.research?.news).toEqual([
    { title: '新闻', url: 'https://n.example/1', snippet: '摘要', publishedAt: '2026-11-06' },
    { title: 'https://n.example/2', url: 'https://n.example/2', snippet: '' },
  ])
  vi.restoreAllMocks()
})

it('refuses browser operations for unknown platforms and views', async () => {
  const suite = await fixture()
  expect(suite.loginState('douyin')).toBe('unknown')
  expect(await failure(() => suite.loginState('nope'))).toMatchObject({ code: 'media/not-found', details: { kind: 'platform' } })
  expect(await failure(() => suite.browserOpen('nope'))).toMatchObject({ code: 'media/not-found' })
  expect(await failure(() => suite.browserOpen('douyin', 'file:///etc/passwd'))).toMatchObject({ code: 'media/invalid', details: { field: 'url' } })
  const view = brandString<MediaBrowserId>('browser-missing')
  expect(await failure(() => suite.browserInput(view, { kind: 'back' }))).toMatchObject({ code: 'media/not-found', details: { kind: 'browser' } })
  expect(await failure(async () => { for await (const _ of suite.browserFrames(view, new AbortController().signal)) break })).toMatchObject({ code: 'media/not-found' })
  await suite.browserClose(view)
})

it('lets another plugin register a platform for its lifetime', async () => {
  const suite = await fixture()
  const douyin = suite.platforms().find(platform => platform.id === 'douyin')
  if (douyin === undefined) throw new Error('douyin missing')
  const dispose = suite.registerAdapter({
    descriptor: { ...douyin, id: 'bilibili', displayName: 'B站', scrape: false },
    importProfile: { columns: [], defaultFormat: 'video' },
    detectLogin: () => Promise.resolve('unknown'),
  })
  expect(suite.platformName('bilibili')).toBe('B站')
  const account = suite.saveAccount({ ...draft, platform: 'bilibili' })
  expect(await suite.refresh(account.id, new AbortController().signal)).toMatchObject({ ok: false, errorCode: 'unsupported' })
  dispose()
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(suite.platformName('bilibili')).toBe('bilibili')
})

it('updates the matching own account instead of adding a duplicate', async () => {
  const suite = await fixture()
  const first = suite.saveAccount({ ...draft, platform: 'douyin', name: '旧名', profileUrl: 'https://www.douyin.com/user/SEC?from=tab' })
  const again = suite.saveAccount({ ...draft, platform: 'douyin', name: '新名', profileUrl: 'https://www.douyin.com/user/SEC/' })
  expect(again).toMatchObject({ id: first.id, createdAt: first.createdAt, name: '新名', profileUrl: 'https://www.douyin.com/user/SEC/' })
  const benchmark = suite.saveAccount({ ...draft, platform: 'douyin', role: 'benchmark', profileUrl: 'https://www.douyin.com/user/SEC' })
  expect(benchmark.id).not.toBe(first.id)
  const manual = suite.saveAccount({ ...draft, name: '手动公众号' })
  const scanned = suite.saveAccount({ ...draft, name: '扫码公众号', profileUrl: 'https://mp.weixin.qq.com/' })
  expect(scanned.id).not.toBe(manual.id)
  expect(suite.saveAccount({ ...draft, name: '扫码公众号', notes: '再次扫码', profileUrl: 'https://mp.weixin.qq.com/' })).toMatchObject({ id: scanned.id, notes: '再次扫码' })
  const second = suite.saveAccount({ ...draft, name: '第二个公众号', profileUrl: 'https://mp.weixin.qq.com/' })
  expect(second.id).not.toBe(scanned.id)
  expect(suite.saveAccount({ ...draft, name: '第二个公众号', profileUrl: 'https://mp.weixin.qq.com/' }).id).toBe(second.id)
  expect(suite.accounts()).toHaveLength(5)
})

it('refuses to identify in an unknown view', async () => {
  const suite = await fixture()
  const view = brandString<MediaBrowserId>('browser-missing')
  expect(await failure(() => suite.identify(view, new AbortController().signal))).toMatchObject({ code: 'media/not-found', details: { kind: 'browser' } })
})

it('keeps the login of an account scanned in a fresh view in its own browser profile', async () => {
  const suite = await fixture()
  const opened: { key: string; url: string }[] = []
  vi.spyOn(BrowserManager.prototype, 'open').mockImplementation((profile, url) => {
    opened.push({ key: profile.key, url })
    return Promise.resolve({ id: brandString<MediaBrowserId>(`browser-${opened.length}`), platform: profile.platform, width: 1, height: 1 })
  })
  vi.spyOn(BrowserManager.prototype, 'profileOf').mockImplementation((id) => {
    const key = opened[Number(id.slice('browser-'.length)) - 1]?.key
    return key === undefined ? undefined : { platform: 'douyin', key }
  })
  const discarded: string[] = []
  vi.spyOn(BrowserManager.prototype, 'discard').mockImplementation((key) => { discarded.push(key); return Promise.resolve(true) })
  const own: MediaAccountDraft = { ...draft, platform: 'douyin', name: '一号', profileUrl: 'https://www.douyin.com/user/a' }

  // An account saved without a view, as by the page of an earlier release, shares the platform's profile.
  const shared = suite.saveAccount(own)
  expect(shared.loginProfile).toBeUndefined()
  await suite.browserOpen('douyin', undefined, shared.id)
  expect(opened.at(-1)?.key).toBe('douyin')
  expect(opened.at(-1)?.url).toMatch(/^https:/)
  // Saving it from a view of the shared profile changes nothing.
  expect(suite.saveAccount({ ...own, id: shared.id }, brandString<MediaBrowserId>('browser-1')).loginProfile).toBeUndefined()

  // A second account of the platform, scanned in a fresh view, keeps its own login.
  const fresh = await suite.browserOpen('douyin', undefined, undefined, true)
  const key = opened.at(-1)?.key ?? ''
  expect(key).toMatch(/^douyin--[0-9a-f-]{36}$/)
  const second = suite.saveAccount({ ...own, name: '二号', profileUrl: 'https://www.douyin.com/user/b' }, fresh.id)
  expect(second.loginProfile).toBe(key)
  expect(suite.accounts().find(account => account.id === second.id)?.loginProfile).toBe(key)
  await suite.browserOpen('douyin', 'https://www.douyin.com/video/1', second.id)
  expect(opened.at(-1)).toEqual({ key, url: 'https://www.douyin.com/video/1' })
  // Editing the account without a view keeps its profile; a benchmark draft never gets one.
  expect(suite.saveAccount({ ...own, id: second.id, name: '二号改名', profileUrl: 'https://www.douyin.com/user/b' }).loginProfile).toBe(key)
  const benchmark = suite.saveAccount({ ...own, role: 'benchmark', name: '对标', profileUrl: 'https://www.douyin.com/user/c' }, fresh.id)
  expect(benchmark.loginProfile).toBeUndefined()

  // Login states are per profile, and a benchmark account is read with a logged-in own account's login.
  expect(suite.loginState('douyin', second.id)).toBe('unknown')
  expect(suite.overview(benchmark.id, 7).login).toBe('unknown')
  suite['store'].setLogin(key, 'logged-in', new Date().toISOString())
  expect(suite.loginState('douyin', second.id)).toBe('logged-in')
  expect(suite.loginState('douyin', shared.id)).toBe('unknown')
  expect(suite.loginState('douyin')).toBe('unknown')
  expect(suite.overview(benchmark.id, 7).login).toBe('logged-in')
  await suite.browserOpen('douyin', undefined, benchmark.id)
  expect(opened.at(-1)?.key).toBe(key)

  // Scanning the same account again moves it to the new profile and deletes the old one.
  const again = await suite.browserOpen('douyin', undefined, undefined, true)
  const moved = suite.saveAccount({ ...own, id: second.id, name: '二号', profileUrl: 'https://www.douyin.com/user/b' }, again.id)
  expect(moved.loginProfile).toBe(opened.at(-1)?.key)
  expect(discarded).toEqual([key])
  expect(suite['store'].login(key)).toBe('unknown')

  expect(await failure(() => suite.browserOpen('xiaohongshu', undefined, second.id))).toMatchObject({ code: 'media/invalid', details: { field: 'account' } })
  expect(await failure(() => suite.loginState('douyin', brandString<MediaAccountId>('acct-missing')))).toMatchObject({ code: 'media/not-found' })
  suite.deleteAccount(second.id)
  expect(discarded).toEqual([key, moved.loginProfile])
  suite.deleteAccount(shared.id)
  expect(discarded).toHaveLength(2)
  vi.restoreAllMocks()
})

it('deletes account profiles left by unfinished scans when it starts', async () => {
  const kept = new Promise<ReadonlySet<string>>((resolve) => {
    vi.spyOn(BrowserManager.prototype, 'sweep').mockImplementation((keep) => { resolve(keep); return Promise.resolve(['douyin--00000000-0000-4000-8000-000000000000']) })
  })
  const suite = await fixture()
  expect([...await kept]).toEqual([])
  expect(suite['store'].login('douyin--00000000-0000-4000-8000-000000000000')).toBe('unknown')
  vi.restoreAllMocks()
})
