/** Drafts handed over by other tools, the sample data for demonstrations, and the database upgrade that stores drafts. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Context } from '@deepseek-ai/cordis'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import { afterEach, describe, expect, it } from 'vitest'
import MediaSuite from '../src/index.ts'
import { demoData } from '../src/demo.ts'
import { MediaStore } from '../src/store.ts'
import type { MediaDraftId } from '../src/types.ts'

const roots: Context[] = []
const dirs: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await root.fiber.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'media-drafts-'))
  dirs.push(dir)
  return dir
}

async function suite(): Promise<MediaSuite> {
  const ctx = new Context()
  roots.push(ctx)
  ctx.provide('llm', {} as never)
  ctx.provide('agentDefaultModel', { currentSelection: () => ({ provider: 'p', model: 'm' }) } as never)
  await ctx.plugin(MediaSuite, MediaSuite.Config({ dataDir: tempDir(), researchKeywords: 0, trendingCount: 0, newsResults: 0 }))
  return ctx.mediaSuite
}

function failure(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return remoteErrorOf(error)
  }
  throw new Error('expected a failure')
}

describe('drafts', () => {
  it('stores content another tool hands over, records where it was published, and removes it', async () => {
    const media = await suite()
    const folder = tempDir()
    const { id } = media.addDraft({ source: ' 宣传片工坊 ', kind: 'video', title: ' 新品宣传片 ', folder, note: ' 9:16 · 32 秒 ' })
    expect(media.drafts()).toMatchObject([{ id, source: '宣传片工坊', kind: 'video', title: '新品宣传片', folder, note: '9:16 · 32 秒' }])
    const published = media.markDraftPublished(id, ' https://www.douyin.com/video/1 ')
    expect(published.publishedUrl).toBe('https://www.douyin.com/video/1')
    expect(published.publishedAt).toEqual(expect.any(String))
    expect(media.markDraftPublished(id, '').publishedUrl).toBeUndefined()
    media.removeDraft(id)
    expect(media.drafts()).toEqual([])
  })

  it('refuses an empty title, a relative path, a bad address and an unknown draft', async () => {
    const media = await suite()
    expect(failure(() => media.addDraft({ source: 'x', kind: 'video', title: '  ' }))).toMatchObject({ code: 'media/invalid', details: { field: 'title' } })
    expect(failure(() => media.addDraft({ source: 'x', kind: 'video', title: 't', file: 'out/a.mp4' }))).toMatchObject({ details: { field: 'file' } })
    const { id } = media.addDraft({ source: '', kind: 'article', title: 't' })
    expect(media.drafts()[0]?.source).toBe('其他')
    expect(failure(() => media.markDraftPublished(id, 'douyin.com/video/1'))).toMatchObject({ details: { field: 'url' } })
    const missing = 'draft-missing' as MediaDraftId
    expect(failure(() => { media.removeDraft(missing) })).toMatchObject({ code: 'media/not-found', details: { kind: 'draft' } })
    expect(failure(() => { media.revealDraft(missing) })).toMatchObject({ code: 'media/not-found' })
    expect(failure(() => { media.revealDraft(id) })).toMatchObject({ details: { field: 'file' } })
  })
})

describe('sample data', () => {
  it('loads sample accounts with counters, posts, reports and drafts, replaces them on reload, and clears them', async () => {
    const media = await suite()
    const own = media.loadDemo()
    expect(own).toMatchObject({ role: 'own', demo: true })
    expect(media.accounts().filter(account => account.demo === true).map(account => account.platform))
      .toEqual(['douyin', 'douyin', 'xiaohongshu', 'wechat-mp', 'wechat-channels'])
    const overview = media.overview(own.id, 7)
    expect(overview.latest?.followers).toBeGreaterThan(11_600)
    expect(overview.series.length).toBeGreaterThan(5)
    expect(media.posts(own.id, 50)).toHaveLength(18)
    // One sample account's login expired; the others are current.
    expect(media.summary().accounts.map(item => item.health.state)).toEqual(['ok', 'login-required', 'ok', 'ok', 'ok'])
    expect(media.topicReports(own.id)).toHaveLength(1)
    expect(media.analysisReports(own.id)).toHaveLength(1)
    expect(media.drafts().filter(draft => draft.demo === true)).toHaveLength(2)
    media.loadDemo()
    expect(media.accounts()).toHaveLength(5)
    expect(media.drafts()).toHaveLength(2)
    const kept = media.addDraft({ source: 'x', kind: 'video', title: '真实成片' })
    expect(media.clearDemo()).toBe(5)
    expect(media.accounts()).toEqual([])
    expect(media.drafts().map(draft => draft.id)).toEqual([kept.id])
  })

  it('never fetches or imports into a sample account', async () => {
    const media = await suite()
    const own = media.loadDemo()
    await expect(media.refresh(own.id, new AbortController().signal)).rejects.toMatchObject({ code: 'media/invalid' })
    await expect(media.importFile(own.id, 'a.csv', 'YQ==')).rejects.toMatchObject({ code: 'media/invalid' })
  })

  it('is the same on every load and links the published sample article to a sample post', () => {
    const first = demoData(Date.parse('2026-11-08T10:00:00Z'))
    const second = demoData(Date.parse('2026-11-08T10:00:00Z'))
    expect(second).toEqual(first)
    const article = first.drafts.find(draft => draft.kind === 'article')
    expect(first.posts.some(post => post.url === article?.publishedUrl)).toBe(true)
  })
})

describe('database upgrade', () => {
  it('adds the drafts table to a version 1 database and keeps its accounts', () => {
    const path = join(tempDir(), 'media.db')
    const old = new DatabaseSync(path)
    old.exec(`CREATE TABLE accounts (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
      CREATE TABLE snapshots (account_id TEXT NOT NULL, captured_at TEXT NOT NULL, doc TEXT NOT NULL);
      CREATE TABLE posts (account_id TEXT NOT NULL, post_id TEXT NOT NULL, published_at TEXT, updated_at TEXT NOT NULL, doc TEXT NOT NULL,
        PRIMARY KEY (account_id, post_id));
      CREATE TABLE runs (account_id TEXT NOT NULL, kind TEXT NOT NULL, started_at TEXT NOT NULL, doc TEXT NOT NULL);
      CREATE TABLE reports (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, doc TEXT NOT NULL);
      CREATE TABLE logins (platform TEXT PRIMARY KEY, state TEXT NOT NULL, checked_at TEXT NOT NULL);
      PRAGMA user_version = 1;`)
    old.prepare('INSERT INTO accounts (id, doc) VALUES (?, ?)').run('a', JSON.stringify({
      id: 'a', platform: 'douyin', role: 'own', name: '号', profileUrl: '', niche: '', notes: '',
      monitor: { enabled: false, intervalMinutes: 60 }, createdAt: 't', updatedAt: 't',
    }))
    old.close()
    const store = new MediaStore(path)
    try {
      expect(store.accounts().map(account => account.name)).toEqual(['号'])
      expect(store.drafts()).toEqual([])
    } finally {
      store.close()
    }
  })
})
