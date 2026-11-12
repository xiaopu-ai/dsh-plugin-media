/**
 * Page settings a user edits by hand or with an agent: a JSON file with Chinese keys for the page title, accent color,
 * navigation names, hidden views and the order of the 今天 panels, and an optional CSS file beside it. Reading never
 * fails: a missing file gives the defaults, and every part that cannot be understood is reported and skipped.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { MediaTodaySection, MediaUiSettings, MediaView } from './types.ts'

/** View names as the settings file writes them. */
export const VIEW_NAMES: Readonly<Record<string, MediaView>> = { 今天: 'today', 找选题: 'topics', 写作: 'studio', 数据: 'data', 账号: 'accounts' }

/** 今天 panel names as the settings file writes them. */
export const SECTION_NAMES: Readonly<Record<string, MediaTodaySection>> = {
  需要处理: 'todo', 账号数据: 'numbers', 今天可以写: 'ready', 待发布: 'drafts', 我的最近作品: 'own', 同行近期爆款: 'peers',
}

/** File name of the free-form styles read next to the settings file. */
export const STYLE_FILE = '界面样式.css'

/** Most characters of free-form styles applied. */
const MAX_CSS = 50_000

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function readText(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  } catch (_error: unknown) {
    // A missing file means the defaults.
    return undefined
  }
}

/**
 * Parse settings text.
 * @param text - the JSON text, or undefined when there is no file.
 * @param css - the free-form styles, or undefined when there is no style file.
 * @returns the settings with every problem found.
 */
export function parseUiSettings(text: string | undefined, css: string | undefined): MediaUiSettings {
  const problems: string[] = []
  const settings: {
    title?: string
    accent?: string
    labels: Partial<Record<MediaView, string>>
    hidden: MediaView[]
    today?: MediaTodaySection[]
  } = { labels: {}, hidden: [] }
  let parsed: unknown = {}
  if (text !== undefined && text.trim() !== '') {
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      problems.push(`界面设置不是有效的 JSON：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const root = record(parsed) ?? {}
  const title = root.页面标题
  if (typeof title === 'string' && title.trim() !== '') settings.title = title.trim().slice(0, 40)
  else if (title !== undefined) problems.push('「页面标题」要写一段文字')
  const accent = root.主色
  if (typeof accent === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent.trim())) settings.accent = accent.trim()
  else if (accent !== undefined) problems.push('「主色」要写成 #5866d6 这样的颜色')
  const labels = record(root.导航名称)
  for (const [name, label] of Object.entries(labels ?? {})) {
    const view = VIEW_NAMES[name]
    if (view === undefined) problems.push(`「导航名称」里没有「${name}」这个页面`)
    else if (typeof label === 'string' && label.trim() !== '') settings.labels[view] = label.trim().slice(0, 12)
  }
  const hidden = root.隐藏页面
  for (const name of Array.isArray(hidden) ? hidden : []) {
    const view = typeof name === 'string' ? VIEW_NAMES[name] : undefined
    if (view === undefined || view === 'today') problems.push(`「隐藏页面」里的「${String(name)}」不能隐藏`)
    else if (!settings.hidden.includes(view)) settings.hidden.push(view)
  }
  const today = root.今天页板块
  if (Array.isArray(today)) {
    settings.today = []
    for (const name of today) {
      const section = typeof name === 'string' ? SECTION_NAMES[name] : undefined
      if (section === undefined) problems.push(`「今天页板块」里没有「${String(name)}」这个板块`)
      else if (!settings.today.includes(section)) settings.today.push(section)
    }
  }
  const styles = css === undefined ? '' : css.slice(0, MAX_CSS)
  if (css !== undefined && css.length > MAX_CSS) problems.push(`界面样式太长，只用了前 ${String(MAX_CSS)} 个字符`)
  return { ...settings, css: styles, problems }
}

/**
 * Read the settings file and the styles next to it.
 * @param file - absolute path of the settings file, or undefined when none is configured.
 * @returns the settings; the defaults when nothing is configured or the files are missing.
 */
export function readUiSettings(file: string | undefined): MediaUiSettings {
  if (file === undefined) return parseUiSettings(undefined, undefined)
  return { ...parseUiSettings(readText(file), readText(join(dirname(file), STYLE_FILE))), file }
}
