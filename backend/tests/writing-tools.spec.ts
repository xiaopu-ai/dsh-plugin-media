/** Writing tools: a conversation lists, creates, reads, saves and checks workbench projects and hands work to its assistant. */
import { Context, Service } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { executeToolFixture } from '@deepseek-ai/dsh-tool-testkit'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { StudioError, readTurn, type StudioTurn } from '../src/studio.ts'
import {
  parseProjects, registerWritingTools, renderCheck, renderTurn, resolveProject, type WritingStudio,
} from '../src/writing-tools.ts'

const LIST = [
  { id: 'kimi', title: 'Kimi 的游戏方案', type: 'article', status: '草稿', updated: '2026-11-07T10:00:00Z', tags: ['Kimi'] },
  { id: 'cards', title: 'AI 工具卡片', type: 'card', status: '待发', updated: '2026-11-06T10:00:00Z', tags: [] },
  { id: 'kimi-2', title: 'Kimi 复盘', type: 'article', status: '灵感', updated: '2026-11-05T10:00:00Z', tags: [] },
  { title: 'no id', type: 'article' },
  { id: 'odd', type: 'other' },
]

function studio(overrides: Partial<WritingStudio> = {}) {
  const request = vi.fn((method: string, path: string, body: unknown): Promise<unknown> => {
    if (path === 'projects') return Promise.resolve(LIST)
    if (path === 'projects/kimi/source' && method === 'GET') return Promise.resolve({ text: '# 标题\n\n正文', mtime: 111 })
    if (path === 'projects/kimi/source' && method === 'PUT') return Promise.resolve({ ok: true, mtime: 222, body })
    if (path === 'projects/kimi/studio/decisions') return Promise.resolve([{ id: 'd1', answer: null }, { id: 'd2', answer: '好' }])
    if (path === 'projects/kimi/studio/imgjobs') return Promise.resolve([{ id: 'j1', status: 'pending' }, { id: 'j2', status: 'done' }])
    if (path === 'projects/kimi/studio/check') {
      return Promise.resolve({
        stats: { chars: 1200, minutes: 3, paras: 10, images: 2 }, detector: true,
        metrics: [{ key: '句长CV', desc: '句子长短的变化', value: 0.3, human: 0.54, bad: true }, { key: 'x', value: 1, human: 1, bad: false }],
        issues: [{ label: '不是而是', quote: '这不是工具，而是伙伴', tip: '直接说结论' }],
      })
    }
    return Promise.reject(new StudioError(`unexpected ${method} ${path}`))
  })
  const create = vi.fn(() => Promise.resolve('new-id'))
  const assist = vi.fn((): Promise<StudioTurn> => Promise.resolve({ reply: '改好了开头。', files: ['article.md'], steps: ['读了正文', '改了开头'] }))
  const fake: WritingStudio = { request, create, assist, ...overrides }
  return { fake, request, create, assist }
}

/** The tool runtime only registers its prompt contribution with this service; the tests read no prompt. */
class PromptStub extends Service {
  constructor(ctx: Context) { super(ctx, 'systemPrompt') }
  tools(): () => void { return () => {} }
}

async function tools(fake: WritingStudio, provider: string | undefined = 'dsh') {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(PromptStub)
  await ctx.plugin(ToolRuntime)
  await new Promise<void>((resolve) => {
    ctx.inject(['tools'], (child) => {
      registerWritingTools(child, fake, provider)
      resolve()
    })
  })
  return async (name: string, args: Record<string, unknown>) => {
    const result = await executeToolFixture(ctx, { name, arguments: args, callId: ToolCallId(`call-${name}`), signal: new AbortController().signal })
    return { error: result.isError, text: typeof result.value === 'string' ? result.value : JSON.stringify(result.content) }
  }
}

describe('workbench projects', () => {
  it('keeps listed projects with an id and a known type', () => {
    expect(parseProjects(LIST).map(project => project.id)).toEqual(['kimi', 'cards', 'kimi-2'])
    expect(parseProjects({ not: 'a list' })).toEqual([])
    expect(parseProjects([{ id: 's', type: 'article', form: 'script' }, { id: 'c', type: 'card', form: 'script' }]).map(project => project.script)).toEqual([true, false])
  })

  it('finds a project by id, exact title or a unique part of the title', () => {
    const projects = parseProjects(LIST)
    expect(resolveProject(projects, 'cards').title).toBe('AI 工具卡片')
    expect(resolveProject(projects, ' Kimi 复盘 ').id).toBe('kimi-2')
    expect(resolveProject(projects, '游戏').id).toBe('kimi')
    expect(() => resolveProject(projects, 'Kimi')).toThrow(/Several workbench projects match "Kimi"/)
    expect(() => resolveProject(projects, '没有')).toThrow(/writing_projects/)
  })
})

describe('writing tools', () => {
  it('lists projects filtered by type and title', async () => {
    const call = await tools(studio().fake)
    expect((await call('writing_projects', {})).text.split('\n')).toHaveLength(3)
    expect((await call('writing_projects', { type: 'card' })).text).toBe('- AI 工具卡片 | id cards | 小红书卡片 | 待发 | 更新 2026-11-06T10:00:00Z')
    expect((await call('writing_projects', { query: '复盘' })).text).toContain('id kimi-2')
    expect((await call('writing_projects', { query: '不存在' })).text).toBe('No matching projects.')
  })

  it('creates an article or a card set from a title and a brief', async () => {
    const fake = studio()
    const call = await tools(fake.fake)
    expect((await call('writing_create', { title: 'AI / 爆款', brief: '  写给产品经理  ' })).text).toContain('已新建文章「AI / 爆款」（id new-id）')
    expect(fake.create).toHaveBeenLastCalledWith('article', 'AI - 爆款', { title: 'AI / 爆款', brief: '写给产品经理', evidence: [], sources: [] }, expect.any(AbortSignal))
    expect((await call('writing_create', { title: '卡片', type: 'card' })).text).toContain('已新建小红书卡片')
    expect((await call('writing_create', { title: '口播', type: 'script' })).text).toMatch(/已新建视频脚本「口播」.*writing_read 看骨架/)
    expect((await call('writing_create', { title: '  ' })).error).toBe(true)
  })

  it('reads and saves an article with its version, and refuses card projects', async () => {
    const fake = studio()
    const call = await tools(fake.fake)
    const read = await call('writing_read', { project: 'kimi' })
    expect(read.text).toBe('# Kimi 的游戏方案（id kimi，草稿）\nversion: 111\n\n# 标题\n\n正文')
    const saved = await call('writing_save', { project: 'kimi', text: '# 新标题\n\n新正文', version: 111, note: '初稿' })
    expect(saved.text).toContain('新的 version: 222')
    expect(fake.request).toHaveBeenCalledWith('PUT', 'projects/kimi/source', { text: '# 新标题\n\n新正文', mtime: 111, label: '初稿' }, expect.any(AbortSignal))
    await call('writing_save', { project: 'kimi', text: '正文' })
    expect(fake.request).toHaveBeenLastCalledWith('PUT', 'projects/kimi/source', { text: '正文', mtime: undefined, label: 'DeepSeek Harness 对话' }, expect.any(AbortSignal))
    expect((await call('writing_save', { project: 'kimi', text: ' ' })).error).toBe(true)
    const card = await call('writing_read', { project: 'cards' })
    expect(card.error).toBe(true)
    expect(card.text).toContain('小红书 card project')
  })

  it('hands an instruction to the workbench assistant on the client model and reports what waits for the author', async () => {
    const fake = studio()
    const call = await tools(fake.fake)
    const result = await call('writing_assistant', { project: '游戏', instruction: '改开头' })
    expect(fake.assist).toHaveBeenCalledWith('kimi', '改开头', 'dsh', expect.any(AbortSignal))
    expect(result.text).toContain('改好了开头。')
    expect(result.text).toContain('有 1 件事等作者')
    expect(result.text).toContain('有 1 张配图等作者')
    const failing = await tools(studio({ assist: () => Promise.reject(new StudioError('助手还在做上一件事')) }).fake, undefined)
    const failed = await failing('writing_assistant', { project: 'kimi', instruction: '再改' })
    expect(failed.error).toBe(true)
    expect(failed.text).toContain('助手还在做上一件事')
  })

  it('runs the style check on an article', async () => {
    const call = await tools(studio().fake)
    const result = await call('writing_check', { project: 'kimi' })
    expect(result.text).toContain('字数 1200，约 3 分钟读完，10 段，2 张图。')
    expect(result.text).toContain('- 句子长短的变化：0.3（真人约 0.54）')
    expect(result.text).toContain('- [不是而是] 「这不是工具，而是伙伴」：直接说结论')
  })
})

describe('rendering', () => {
  it('renders a turn without pending work and a check without a detector', () => {
    expect(renderTurn({ reply: '', files: [], steps: [] }, undefined, undefined)).toBe('写作助手没有回复文字。\n\n没有改动文件。')
    expect(renderCheck({ stats: {}, detector: false, metrics: [], issues: [] })).toBe(
      '字数 -，约 - 分钟读完，- 段，- 张图。\n\n没有找到 AI 味检测脚本，只给出了基本统计。\n\n没有发现明显的 AI 味句子。',
    )
  })

  it('folds the assistant stream into its outcome and reports errors and early ends', async () => {
    const stream = (...lines: string[]) => new Response(lines.join('')).body ?? new ReadableStream<Uint8Array>()
    await expect(readTurn(stream('{"type":"step","text":"读正文"}\n', 'not json\n', '{"type":"text","text":"x"}\n{"type":"done","reply":"好了","files":["a.md",1]}\n')))
      .resolves.toEqual({ reply: '好了', files: ['a.md'], steps: ['读正文'] })
    await expect(readTurn(stream('{"type":"error","error":"密钥不对"}\n'))).rejects.toThrow('密钥不对')
    await expect(readTurn(stream('{"type":"step","text":"x"}\n'))).rejects.toThrow('没有做完就断开了')
  })
})
