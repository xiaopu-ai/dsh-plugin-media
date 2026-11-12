/** Page settings: the JSON file with Chinese keys and the styles next to it, read without ever failing. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { parseUiSettings, readUiSettings } from '../src/ui-settings.ts'

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

it('reads the title, accent, names, hidden views and panel order', () => {
  const settings = parseUiSettings(JSON.stringify({
    页面标题: ' 我的工作台 ', 主色: '#E8590C', 导航名称: { 今天: '首页', 数据: ' 看数据 ', 账号: '' },
    隐藏页面: ['写作', '写作', '账号'], 今天页板块: ['今天可以写', '需要处理', '今天可以写'],
  }), '.x { color: red }')
  expect(settings).toEqual({
    title: '我的工作台', accent: '#E8590C', labels: { today: '首页', data: '看数据' }, hidden: ['studio', 'accounts'],
    today: ['ready', 'todo'], css: '.x { color: red }', problems: [],
  })
})

it('keeps the built-in page for missing files and reports what it could not understand', () => {
  expect(parseUiSettings(undefined, undefined)).toEqual({ labels: {}, hidden: [], css: '', problems: [] })
  expect(parseUiSettings('{ 不是 json', undefined).problems[0]).toMatch(/不是有效的 JSON/)
  const settings = parseUiSettings(JSON.stringify({
    页面标题: 3, 主色: 'red', 导航名称: { 首页: 'x' }, 隐藏页面: ['今天', '设置'], 今天页板块: ['天气'],
  }), 'a'.repeat(50_001))
  expect(settings.problems).toEqual([
    '「页面标题」要写一段文字', '「主色」要写成 #5866d6 这样的颜色', '「导航名称」里没有「首页」这个页面',
    '「隐藏页面」里的「今天」不能隐藏', '「隐藏页面」里的「设置」不能隐藏', '「今天页板块」里没有「天气」这个板块',
    '界面样式太长，只用了前 50000 个字符',
  ])
  expect(settings).toMatchObject({ labels: {}, hidden: [], today: [] })
  expect(settings.title ?? settings.accent).toBeUndefined()
  expect(settings.css).toHaveLength(50_000)
})

it('reads the settings file and the styles next to it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'media-ui-'))
  dirs.push(dir)
  const file = join(dir, '界面设置.json')
  expect(readUiSettings(undefined)).toEqual({ labels: {}, hidden: [], css: '', problems: [] })
  expect(readUiSettings(file)).toEqual({ labels: {}, hidden: [], css: '', problems: [], file })
  writeFileSync(file, JSON.stringify({ 页面标题: '号' }))
  writeFileSync(join(dir, '界面样式.css'), 'h1 { color: red }')
  expect(readUiSettings(file)).toMatchObject({ title: '号', css: 'h1 { color: red }', file })
})
