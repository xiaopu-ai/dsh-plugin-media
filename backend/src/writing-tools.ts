/**
 * Model tools that let a conversation write in the creation workbench: list and create article or card projects, read
 * and save an article's Markdown, hand an instruction to the workbench's own writing assistant, and run its style
 * check. Every tool goes through the workbench's HTTP API, so projects written from a conversation are the same ones
 * the 写作 view and the workbench show.
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { studioProjectName, type StudioIdea, type StudioProjectType, type StudioTurn } from './studio.ts'

/** Workbench operations the tools call; implemented by the suite's `StudioRunner`. */
export interface WritingStudio {
  request(method: 'GET' | 'POST' | 'PUT', path: string, body: unknown, signal: AbortSignal): Promise<unknown>
  create(type: StudioProjectType, name: string, idea: StudioIdea, signal: AbortSignal): Promise<string>
  assist(id: string, message: string, provider: string | undefined, signal: AbortSignal): Promise<StudioTurn>
}

/** One project as the tools read it from the workbench list. */
export interface WritingProject {
  readonly id: string
  readonly title: string
  readonly type: 'article' | 'card'
  /** True for a video script, which the workbench keeps as an article whose Markdown is the script. */
  readonly script: boolean
  readonly status: string
  readonly updated: string
  readonly tags: readonly string[]
}

/** Projects listed by `writing_projects` at most. */
const LISTED_PROJECTS = 50
/** Style-check findings listed at most. */
const LISTED_ISSUES = 12

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** A number, string or boolean as text; anything else reads as a dash. */
function scalar(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? String(value) : '-'
}

/**
 * Read the workbench's project list, skipping entries without an id or a known type.
 * @param value - the `/api/projects` answer.
 * @returns the projects in the workbench's order.
 */
export function parseProjects(value: unknown): WritingProject[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const item = record(entry)
    const id = text(item.id)
    const type = item.type === 'article' || item.type === 'card' ? item.type : undefined
    if (id === '' || type === undefined) return []
    const tags = Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : []
    return [{ id, title: text(item.title) || id, type, script: type === 'article' && item.form === 'script', status: text(item.status), updated: text(item.updated), tags }]
  })
}

/**
 * Find a project by id, exact title, or a title containing the reference.
 * @param projects - the workbench projects.
 * @param ref - id or title.
 * @returns the project.
 * @throws {Error} naming close projects when none or several match.
 */
export function resolveProject(projects: readonly WritingProject[], ref: string): WritingProject {
  const wanted = ref.trim()
  const exact = projects.find(project => project.id === wanted) ?? projects.find(project => project.title === wanted)
  if (exact !== undefined) return exact
  const partial = projects.filter(project => project.title.includes(wanted))
  if (partial.length === 1 && partial[0] !== undefined) return partial[0]
  if (partial.length > 1) {
    throw new Error(`Several workbench projects match "${ref}": ${partial.slice(0, 8).map(project => `${project.title} (${project.id})`).join(', ')}. Pass the id.`)
  }
  throw new Error(`No workbench project "${ref}". Call writing_projects to list them.`)
}

function typeName(type: StudioProjectType): string {
  return type === 'article' ? '文章' : type === 'script' ? '视频脚本' : '小红书卡片'
}

function kindOf(project: WritingProject): StudioProjectType {
  return project.script ? 'script' : project.type
}

function projectLine(project: WritingProject): string {
  const tags = project.tags.length === 0 ? '' : ` | 标签 ${project.tags.join('、')}`
  return `- ${project.title} | id ${project.id} | ${typeName(kindOf(project))} | ${project.status || '-'} | 更新 ${project.updated || '-'}${tags}`
}

/**
 * Render the outcome of one writing-assistant turn with what still waits for the author.
 * @param turn - the turn outcome.
 * @param decisions - the project's decisions; unanswered ones wait for the author.
 * @param jobs - the project's image jobs; pending ones wait for the author's confirmation.
 * @returns Markdown text.
 */
export function renderTurn(turn: StudioTurn, decisions: unknown, jobs: unknown): string {
  const open = Array.isArray(decisions) ? decisions.filter(item => record(item).answer === null || record(item).answer === undefined).length
    : 0
  const pending = Array.isArray(jobs) ? jobs.filter(item => record(item).status === 'pending').length : 0
  return [
    turn.reply === '' ? '写作助手没有回复文字。' : turn.reply,
    ...turn.steps.length === 0 ? [] : [`做了这些步骤：\n${turn.steps.map(step => `- ${step}`).join('\n')}`],
    turn.files.length === 0 ? '没有改动文件。' : `改了：${turn.files.join('、')}（在写作页的助手面板里可以整轮撤销）`,
    ...open === 0 ? [] : [`有 ${String(open)} 件事等作者在「自媒体 → 写作」里拍板。`],
    ...pending === 0 ? [] : [`有 ${String(pending)} 张配图等作者在写作页确认后才会生成（生图要花钱）。`],
  ].join('\n\n')
}

function issueLine(issue: Record<string, unknown>): string {
  return `- [${text(issue.label)}] 「${text(issue.quote)}」：${text(issue.tip)}`
}

/**
 * Render a style-check result.
 * @param value - the workbench's check answer.
 * @returns Markdown text.
 */
export function renderCheck(value: unknown): string {
  const result = record(value)
  const stats = record(result.stats)
  const metrics = Array.isArray(result.metrics) ? result.metrics.map(record) : []
  const issues = Array.isArray(result.issues) ? result.issues.map(record) : []
  const bad = metrics.filter(metric => metric.bad === true)
  return [
    `字数 ${scalar(stats.chars)}，约 ${scalar(stats.minutes)} 分钟读完，${scalar(stats.paras)} 段，${scalar(stats.images)} 张图。`,
    ...result.detector === false ? ['没有找到 AI 味检测脚本，只给出了基本统计。'] : [],
    ...bad.length === 0 ? [] : [`偏离真人写作的指标：\n${bad.map(metric => `- ${text(metric.desc) || text(metric.key)}：${scalar(metric.value)}（真人约 ${scalar(metric.human)}）`).join('\n')}`],
    issues.length === 0
      ? '没有发现明显的 AI 味句子。'
      : `需要改的句子（共 ${String(issues.length)} 处）：\n${issues.slice(0, LISTED_ISSUES).map(issueLine).join('\n')}`,
  ].join('\n\n')
}

const PROJECT_PARAM = { type: 'string', required: true, description: 'Workbench project id, or its title (exact or a unique part).' } as const
const TEXT_OUTPUT = { schema: { type: 'string' }, render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }] } as const

/**
 * Register the writing tools for the caller's lifetime.
 * @param ctx - context holding `tools`.
 * @param studio - the workbench.
 * @param provider - the workbench provider the assistant runs on: the client's default model when the gateway is up.
 */
export function registerWritingTools(ctx: Context, studio: WritingStudio, provider: string | undefined): void {
  const projects = async (signal: AbortSignal): Promise<WritingProject[]> => parseProjects(await studio.request('GET', 'projects', undefined, signal))
  const project = async (ref: string, signal: AbortSignal): Promise<WritingProject> => resolveProject(await projects(signal), ref)
  const path = (item: WritingProject, rest: string): string => `projects/${encodeURIComponent(item.id)}/${rest}`
  const article = (item: WritingProject): WritingProject => {
    if (item.type !== 'article') throw new Error(`"${item.title}" is a 小红书 card project; it has no article Markdown. Use writing_assistant to change it.`)
    return item
  }

  ctx.tools.register(defineTool({
    name: 'writing_projects',
    description: 'List the author\'s writing projects in the creation workbench (公众号 articles, video scripts and 小红书 card sets), newest first.',
    parameters: {
      query: { type: 'string', description: 'Only projects whose title contains this text.' },
      type: { type: 'string', enum: ['article', 'script', 'card'], description: 'Only articles, only video scripts or only card sets.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      const query = args.query?.trim() ?? ''
      const found = (await projects(exec.signal))
        .filter(item => (args.type === undefined || kindOf(item) === args.type) && item.title.includes(query))
      if (found.length === 0) return 'No matching projects.'
      const shown = found.slice(0, LISTED_PROJECTS).map(projectLine).join('\n')
      return found.length > LISTED_PROJECTS ? `${shown}\n…and ${String(found.length - LISTED_PROJECTS)} more; narrow with query.` : shown
    },
  }))
  ctx.tools.register(defineTool({
    name: 'writing_create',
    description: 'Create a new project in the creation workbench: a 公众号 article (default), a short-video script (spoken lines with shot notes, cover text and titles) or a 小红书 card set. The brief is filed under the project\'s research notes for later writing.',
    parameters: {
      title: { type: 'string', required: true, description: 'Working title; it also names the project folder.' },
      type: { type: 'string', enum: ['article', 'script', 'card'], description: 'article (default), script for a video script, or card.' },
      brief: { type: 'string', description: 'What to write: angle, audience, key points and sources.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      const title = args.title.trim()
      if (title === '') throw new Error('title must not be empty.')
      const type = args.type ?? 'article'
      const brief = args.brief?.trim()
      const idea: StudioIdea = { title, brief: brief === '' ? undefined : brief, evidence: [], sources: [] }
      const id = await studio.create(type, studioProjectName(title), idea, exec.signal)
      return `已新建${typeName(type)}「${title}」（id ${id}），作者在「自媒体 → 写作」里能打开它。${type === 'card' ? '用 writing_assistant 让写作助手做卡片。' : type === 'script' ? '口播稿的骨架已经在 article.md 里：先 writing_read 看骨架，再用 writing_save 写，或用 writing_assistant 让写作助手动手。' : '用 writing_save 写正文，或用 writing_assistant 让写作助手动手。'}`
    },
  }))
  ctx.tools.register(defineTool({
    name: 'writing_read',
    description: 'Read an article project\'s Markdown (article.md) and its version stamp, which writing_save takes to avoid overwriting newer edits.',
    parameters: { project: PROJECT_PARAM },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      const item = article(await project(args.project, exec.signal))
      const source = record(await studio.request('GET', path(item, 'source'), undefined, exec.signal))
      return `# ${item.title}（id ${item.id}，${item.status || '-'}）\nversion: ${scalar(source.mtime)}\n\n${text(source.text)}`
    },
  }))
  ctx.tools.register(defineTool({
    name: 'writing_save',
    description: 'Replace an article project\'s whole Markdown (article.md). The workbench keeps the previous text as a version the author can restore. Pass the version from writing_read so edits made since are not overwritten.',
    parameters: {
      project: PROJECT_PARAM,
      text: { type: 'string', required: true, description: 'The complete new Markdown, title line included.' },
      version: { type: 'number', description: 'version from writing_read.' },
      note: { type: 'string', description: 'Short label for the saved version, such as 初稿 or 改开头.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      if (args.text.trim() === '') throw new Error('text must not be empty.')
      const item = article(await project(args.project, exec.signal))
      const label = args.note?.trim() || 'DeepSeek Harness 对话'
      const saved = record(await studio.request('PUT', path(item, 'source'), { text: args.text, mtime: args.version, label }, exec.signal))
      return `已保存「${item.title}」，${String(args.text.length)} 个字符。新的 version: ${scalar(saved.mtime)}。作者可以在写作页里看、改，或恢复旧版本。`
    },
  }))
  ctx.tools.register(defineTool({
    name: 'writing_assistant',
    description: 'Hand an instruction to the workbench\'s own writing assistant for one project and wait until it finishes. It edits the text, layout and styles, applies templates, finds, saves and inserts images, remembers the author\'s preferences and asks the author for decisions. Image generation waits for the author\'s confirmation in the 写作 view. Takes up to several minutes.',
    parameters: {
      project: PROJECT_PARAM,
      instruction: { type: 'string', required: true, description: 'What the assistant should do, in the author\'s words.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      if (args.instruction.trim() === '') throw new Error('instruction must not be empty.')
      const item = await project(args.project, exec.signal)
      const turn = await studio.assist(item.id, args.instruction, provider, exec.signal)
      const [decisions, jobs] = await Promise.all([
        studio.request('GET', path(item, 'studio/decisions'), undefined, exec.signal),
        studio.request('GET', path(item, 'studio/imgjobs'), undefined, exec.signal),
      ])
      return `「${item.title}」\n\n${renderTurn(turn, decisions, jobs)}`
    },
  }))
  ctx.tools.register(defineTool({
    name: 'writing_check',
    description: 'Run the workbench\'s style check on an article: length, reading time, metrics that drift from human writing, and sentences with an AI flavor to rewrite.',
    parameters: { project: PROJECT_PARAM },
    output: TEXT_OUTPUT,
    execute: async (args, exec) => {
      const item = article(await project(args.project, exec.signal))
      return `「${item.title}」体检结果\n\n${renderCheck(await studio.request('POST', path(item, 'studio/check'), {}, exec.signal))}`
    },
  }))
}
