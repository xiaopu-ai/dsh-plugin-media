/** The media database merges posts, cascades account deletion, and refuses newer schema versions. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, expect, it } from 'vitest'
import { brandString } from '@deepseek-ai/dsh-brand'
import { MediaStore, MediaStoreError } from '../src/store.ts'
import type { MediaAccount, MediaAccountId, MediaPost, MediaReportId } from '../src/types.ts'

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'media-store-'))
  dirs.push(dir)
  return join(dir, 'media.db')
}

const id = brandString<MediaAccountId>('acct-1')
const account: MediaAccount = {
  id, platform: 'douyin', role: 'own', name: '我的号', profileUrl: '', niche: '美食', notes: '',
  monitor: { enabled: true, intervalMinutes: 60 }, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
}
function post(fields: Partial<MediaPost>): MediaPost {
  return { accountId: id, postId: 'p1', title: '标题', format: 'video', extra: {}, source: 'scrape', updatedAt: '2024-06-01T00:00:00.000Z', ...fields }
}

it('stores accounts, snapshots, runs, reports and login states', () => {
  const store = new MediaStore(tempDb())
  store.putAccount(account)
  store.putAccount({ ...account, name: '改名' })
  expect(store.accounts()).toEqual([{ ...account, name: '改名' }])
  store.addSnapshot({ accountId: id, capturedAt: '2024-06-01T00:00:00.000Z', source: 'scrape', followers: 10, extra: {} })
  store.addSnapshot({ accountId: id, capturedAt: '2024-06-02T00:00:00.000Z', source: 'import', followers: 12, extra: { x: 1 } })
  expect(store.snapshots(id, '2024-06-02T00:00:00.000Z').map(snapshot => snapshot.followers)).toEqual([12])
  expect(store.latestSnapshot(id)?.followers).toBe(12)
  expect(store.recentSnapshots(id, 1).map(snapshot => snapshot.followers)).toEqual([12])
  expect(store.recentSnapshots(id, 5).map(snapshot => snapshot.followers)).toEqual([12, 10])
  store.addRun({ accountId: id, kind: 'scrape', startedAt: '2024-06-01T00:00:00.000Z', finishedAt: '2024-06-01T00:01:00.000Z', ok: false, errorCode: 'login-required', postsWritten: 0 })
  store.addRun({ accountId: id, kind: 'import', startedAt: '2024-06-02T00:00:00.000Z', finishedAt: '2024-06-02T00:00:01.000Z', ok: true, postsWritten: 3 })
  expect(store.lastRun(id)?.kind).toBe('import')
  expect(store.lastRun(id, 'scrape')?.errorCode).toBe('login-required')
  store.addTopicReport({ id: brandString<MediaReportId>('r1'), accountId: id, createdAt: '2024-06-01T00:00:00.000Z', model: 'p/m', summary: 's', suggestions: [] })
  store.addAnalysisReport({ id: brandString<MediaReportId>('r2'), accountId: id, createdAt: '2024-06-01T00:00:00.000Z', model: 'p/m', summary: 's', strengths: [], items: [] })
  expect(store.topicReports(id, 5).map(report => report.id)).toEqual(['r1'])
  expect(store.analysisReports(id, 5).map(report => report.id)).toEqual(['r2'])
  expect(store.login('douyin')).toBe('unknown')
  store.setLogin('douyin', 'logged-in', '2024-06-01T00:00:00.000Z')
  store.setLogin('douyin', 'unknown', '2024-06-02T00:00:00.000Z')
  expect(store.login('douyin')).toBe('logged-in')
  store.close()
})

it('replaces a snapshot captured at the same instant, so a backfilled day takes the platform\'s newer report', () => {
  const store = new MediaStore(tempDb())
  const noon = '2024-06-01T04:00:00.000Z'
  store.addSnapshot({ accountId: id, capturedAt: '2024-06-01T09:30:00.000Z', source: 'scrape', followers: 10, extra: {} })
  expect(store.replaceSnapshot({ accountId: id, capturedAt: noon, source: 'scrape', extra: { plays: 44 } })).toBe(false)
  expect(store.replaceSnapshot({ accountId: id, capturedAt: noon, source: 'scrape', extra: { plays: 4289 } })).toBe(true)
  expect(store.snapshots(id).map(snapshot => [snapshot.capturedAt, snapshot.extra.plays])).toEqual([[noon, 4289], ['2024-06-01T09:30:00.000Z', undefined]])
  // A longer range that answers only followers keeps the day's other values.
  expect(store.replaceSnapshot({ accountId: id, capturedAt: noon, source: 'scrape', followers: 5292, extra: {} })).toBe(true)
  expect(store.snapshots(id)[0]).toMatchObject({ followers: 5292, extra: { plays: 4289 } })
  store.close()
})

it('merges posts and orders them newest first', () => {
  const store = new MediaStore(tempDb())
  store.upsertPosts([post({ publishedAt: '2024-05-01T00:00:00.000Z', url: 'https://x/1', likes: 5, extra: { a: 1 } })])
  store.upsertPosts([post({ title: '', likes: undefined, views: 100, extra: { b: 2 }, source: 'import', updatedAt: '2024-06-02T00:00:00.000Z' })])
  store.upsertPosts([post({ postId: 'p2', publishedAt: '2024-05-03T00:00:00.000Z' }), post({ postId: 'p3' })])
  const posts = store.posts(id, 10)
  expect(posts.map(item => item.postId)).toEqual(['p3', 'p2', 'p1'])
  expect(posts[2]).toEqual({
    accountId: id, postId: 'p1', title: '标题', url: 'https://x/1', publishedAt: '2024-05-01T00:00:00.000Z', format: 'video',
    views: 100, likes: 5, comments: undefined, collects: undefined, shares: undefined, extra: { a: 1, b: 2 }, source: 'import', updatedAt: '2024-06-02T00:00:00.000Z',
  })
  expect(store.posts(id, 1)).toHaveLength(1)
  store.close()
})

it('deletes an account with everything it owns', () => {
  const store = new MediaStore(tempDb())
  store.putAccount(account)
  store.addSnapshot({ accountId: id, capturedAt: '2024-06-01T00:00:00.000Z', source: 'scrape', extra: {} })
  store.upsertPosts([post({})])
  expect(store.deleteAccount(id)).toBe(true)
  expect(store.deleteAccount(id)).toBe(false)
  expect(store.account(id)).toBeUndefined()
  expect(store.posts(id, 10)).toEqual([])
  expect(store.snapshots(id)).toEqual([])
  store.close()
})

it('reopens its own file and refuses a newer schema or an invalid row', () => {
  const path = tempDb()
  new MediaStore(path).close()
  const reopened = new MediaStore(path)
  reopened.putAccount(account)
  reopened.close()
  const raw = new DatabaseSync(path)
  raw.exec('UPDATE accounts SET doc = \'{"id":"acct-1"}\'')
  raw.close()
  const broken = new MediaStore(path)
  expect(() => broken.accounts()).toThrow(MediaStoreError)
  broken.close()
  const newer = new DatabaseSync(path)
  newer.exec('PRAGMA user_version = 99')
  newer.close()
  expect(() => new MediaStore(path)).toThrow(/schema version 99/)
})

it('keeps login states per browser profile and forgets a deleted profile', () => {
  const store = new MediaStore(tempDb())
  store.setLogin('douyin', 'logged-in', '2024-06-01T00:00:00.000Z')
  store.setLogin('douyin--00000000-0000-4000-8000-000000000000', 'logged-out', '2024-06-01T00:00:00.000Z')
  expect(store.login('douyin')).toBe('logged-in')
  expect(store.login('douyin--00000000-0000-4000-8000-000000000000')).toBe('logged-out')
  store.forgetLogin('douyin--00000000-0000-4000-8000-000000000000')
  expect(store.login('douyin--00000000-0000-4000-8000-000000000000')).toBe('unknown')
  expect(store.login('douyin')).toBe('logged-in')
  store.close()
})
