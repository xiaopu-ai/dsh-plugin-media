/**
 * Local media database: accounts, metric snapshots, posts, runs, AI reports and the last known login state per
 * platform, in one `node:sqlite` file. Rows hold JSON documents validated on read; one transaction deletes an
 * account with everything it owns.
 */
import { DatabaseSync } from 'node:sqlite'
import type { ZodType } from 'zod'
import { brandString } from '@deepseek-ai/dsh-brand'
import {
  accountSchema, analysisReportSchema, briefSchema, draftSchema, postSchema, runSchema, snapshotSchema, topicReportSchema,
} from './schemas.ts'
import type {
  MediaAccount, MediaAccountId, MediaAnalysisReport, MediaBrief, MediaDraft, MediaDraftId, MediaLoginState, MediaMetricSnapshot,
  MediaPost, MediaPostSnapshot,
  MediaReportId, MediaRunRecord, MediaTopicReport,
} from './types.ts'

/** `account_id` of reports about all accounts together, such as the 今日简报. */
const NETWORK_ACCOUNT = '*network*'

/** Version stamped in `PRAGMA user_version`; a newer file is refused rather than misread. */
export const MEDIA_SCHEMA_VERSION = 3

/** A post's counters are recorded again after this long even when they did not change, so a trend has a point per day. */
const POST_SNAPSHOT_REPEAT_MS = 12 * 3_600_000

const POST_COUNTERS = ['views', 'likes', 'comments', 'collects', 'shares'] as const

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE accounts (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
   CREATE TABLE snapshots (account_id TEXT NOT NULL, captured_at TEXT NOT NULL, doc TEXT NOT NULL);
   CREATE INDEX snapshots_by_account ON snapshots (account_id, captured_at);
   CREATE TABLE posts (account_id TEXT NOT NULL, post_id TEXT NOT NULL, published_at TEXT, updated_at TEXT NOT NULL, doc TEXT NOT NULL,
     PRIMARY KEY (account_id, post_id));
   CREATE TABLE runs (account_id TEXT NOT NULL, kind TEXT NOT NULL, started_at TEXT NOT NULL, doc TEXT NOT NULL);
   CREATE INDEX runs_by_account ON runs (account_id, started_at);
   CREATE TABLE reports (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, doc TEXT NOT NULL);
   CREATE INDEX reports_by_account ON reports (account_id, kind, created_at);
   CREATE TABLE logins (platform TEXT PRIMARY KEY, state TEXT NOT NULL, checked_at TEXT NOT NULL);`,
  'CREATE TABLE drafts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, doc TEXT NOT NULL);',
  `CREATE TABLE post_snapshots (account_id TEXT NOT NULL, post_id TEXT NOT NULL, captured_at TEXT NOT NULL,
     views INTEGER, likes INTEGER, comments INTEGER, collects INTEGER, shares INTEGER);
   CREATE INDEX post_snapshots_by_post ON post_snapshots (account_id, post_id, captured_at);
   CREATE INDEX post_snapshots_by_time ON post_snapshots (account_id, captured_at);`,
]

/** The database file is newer than this build or a row failed validation. */
export class MediaStoreError extends Error {
  override name = 'MediaStoreError'
}

type Row = Record<string, unknown>

/** Synchronous store over one database file; the owner closes it. */
export class MediaStore {
  private readonly db: DatabaseSync

  /**
   * Open or create the database and apply pending migrations.
   * @param path - database file path, or `:memory:`.
   * @throws {MediaStoreError} when the file has a newer schema version.
   */
  constructor(readonly path: string) {
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    const row: Row | undefined = this.db.prepare('PRAGMA user_version').get()
    const version = Number(row?.user_version ?? 0)
    if (version > MEDIA_SCHEMA_VERSION) {
      this.db.close()
      throw new MediaStoreError(`media database "${path}" has schema version ${version}, newer than this build (${MEDIA_SCHEMA_VERSION}); upgrade DeepSeek Harness or move the file aside.`)
    }
    for (let next = version; next < MEDIA_SCHEMA_VERSION; next++) {
      this.transaction(() => {
        this.db.exec(MIGRATIONS[next] ?? '')
        this.db.exec(`PRAGMA user_version = ${next + 1}`)
      })
    }
  }

  /** Close the database. */
  close(): void {
    if (this.db.isOpen) this.db.close()
  }

  private transaction<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = run()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  private decode<T>(schema: ZodType<T>, doc: unknown, table: string): T {
    let value: unknown
    try {
      value = JSON.parse(String(doc))
    } catch (error) {
      throw new MediaStoreError(`media database "${this.path}" holds malformed JSON in ${table}`, { cause: error })
    }
    const parsed = schema.safeParse(value)
    if (!parsed.success) throw new MediaStoreError(`media database "${this.path}" holds an invalid ${table} row: ${parsed.error.message}`)
    return parsed.data
  }

  private docs<T>(schema: ZodType<T>, table: string, sql: string, ...params: (string | number | null)[]): T[] {
    return this.db.prepare(sql).all(...params).map((row: Row) => this.decode(schema, row.doc, table))
  }

  /**
   * List accounts.
   * @returns accounts ordered by creation time.
   */
  accounts(): MediaAccount[] {
    return this.docs(accountSchema, 'accounts', 'SELECT doc FROM accounts').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  /**
   * Read one account.
   * @param id - account id.
   * @returns the account, or undefined.
   */
  account(id: MediaAccountId): MediaAccount | undefined {
    return this.docs(accountSchema, 'accounts', 'SELECT doc FROM accounts WHERE id = ?', id)[0]
  }

  /**
   * Insert or replace one account.
   * @param account - complete account.
   */
  putAccount(account: MediaAccount): void {
    this.db.prepare('INSERT INTO accounts (id, doc) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET doc = excluded.doc').run(account.id, JSON.stringify(account))
  }

  /**
   * Delete an account with its snapshots, posts, runs and reports.
   * @param id - account id.
   * @returns whether the account existed.
   */
  deleteAccount(id: MediaAccountId): boolean {
    return this.transaction(() => {
      for (const table of ['snapshots', 'posts', 'post_snapshots', 'runs', 'reports']) this.db.prepare(`DELETE FROM ${table} WHERE account_id = ?`).run(id)
      return Number(this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes) > 0
    })
  }

  /**
   * List drafts, newest first.
   * @returns the drafts.
   */
  drafts(): MediaDraft[] {
    return this.docs(draftSchema, 'drafts', 'SELECT doc FROM drafts ORDER BY created_at DESC, rowid DESC')
  }

  /**
   * Insert or replace a draft.
   * @param draft - the draft.
   */
  putDraft(draft: MediaDraft): void {
    this.db.prepare('INSERT INTO drafts (id, created_at, doc) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET doc = excluded.doc')
      .run(draft.id, draft.createdAt, JSON.stringify(draft))
  }

  /**
   * Delete a draft.
   * @param id - draft id.
   * @returns whether the draft existed.
   */
  deleteDraft(id: MediaDraftId): boolean {
    return Number(this.db.prepare('DELETE FROM drafts WHERE id = ?').run(id).changes) > 0
  }

  /**
   * Append a snapshot.
   * @param snapshot - captured counters.
   */
  addSnapshot(snapshot: MediaMetricSnapshot): void {
    this.db.prepare('INSERT INTO snapshots (account_id, captured_at, doc) VALUES (?, ?, ?)').run(snapshot.accountId, snapshot.capturedAt, JSON.stringify(snapshot))
  }

  /**
   * Store a snapshot in place of every snapshot of the same account captured at the same instant. Backfilled days use a
   * fixed instant per day (noon China time), so the platform's newer report of a day replaces the older one value by
   * value; a value the newer report lacks is kept (a longer range may answer fewer metrics than a shorter one did).
   * @param snapshot - snapshot to store.
   * @returns whether an earlier snapshot was replaced.
   */
  replaceSnapshot(snapshot: MediaMetricSnapshot): boolean {
    let replaced = false
    this.transaction(() => {
      const earlier = this.docs(snapshotSchema, 'snapshots', 'SELECT doc FROM snapshots WHERE account_id = ? AND captured_at = ? ORDER BY rowid', snapshot.accountId, snapshot.capturedAt)
      replaced = Number(this.db.prepare('DELETE FROM snapshots WHERE account_id = ? AND captured_at = ?').run(snapshot.accountId, snapshot.capturedAt).changes) > 0
      let merged = snapshot
      // Newest first, so a value comes from the latest report that has it.
      for (const old of [...earlier].reverse()) {
        merged = {
          ...merged,
          followers: merged.followers ?? old.followers, following: merged.following ?? old.following,
          likes: merged.likes ?? old.likes, posts: merged.posts ?? old.posts,
          extra: { ...old.extra, ...merged.extra },
        }
      }
      this.addSnapshot(merged)
    })
    return replaced
  }

  /**
   * Read snapshots captured at or after an instant.
   * @param id - account id.
   * @param since - ISO instant; undefined reads all.
   * @returns snapshots, oldest first.
   */
  snapshots(id: MediaAccountId, since?: string): MediaMetricSnapshot[] {
    return this.docs(snapshotSchema, 'snapshots', 'SELECT doc FROM snapshots WHERE account_id = ? AND captured_at >= ? ORDER BY captured_at, rowid', id, since ?? '')
  }

  /**
   * Read the newest snapshots.
   * @param id - account id.
   * @param limit - maximum number of snapshots.
   * @returns snapshots, newest first.
   */
  recentSnapshots(id: MediaAccountId, limit: number): MediaMetricSnapshot[] {
    return this.docs(
      snapshotSchema, 'snapshots', 'SELECT doc FROM snapshots WHERE account_id = ? ORDER BY captured_at DESC, rowid DESC LIMIT ?', id, limit,
    )
  }

  /**
   * Read the newest snapshot.
   * @param id - account id.
   * @returns the snapshot, or undefined.
   */
  latestSnapshot(id: MediaAccountId): MediaMetricSnapshot | undefined {
    return this.docs(snapshotSchema, 'snapshots', 'SELECT doc FROM snapshots WHERE account_id = ? ORDER BY captured_at DESC, rowid DESC LIMIT 1', id)[0]
  }

  /**
   * Insert or merge posts by `(accountId, postId)`: fields the new row leaves undefined keep their stored values. Each
   * written post also gets a counter snapshot, unless its counters are unchanged since a snapshot taken less than
   * twelve hours before.
   * @param posts - posts of any accounts.
   * @returns the number of posts written.
   */
  upsertPosts(posts: readonly MediaPost[]): number {
    const select = this.db.prepare('SELECT doc FROM posts WHERE account_id = ? AND post_id = ?')
    const write = this.db.prepare(`INSERT INTO posts (account_id, post_id, published_at, updated_at, doc) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (account_id, post_id) DO UPDATE SET published_at = excluded.published_at, updated_at = excluded.updated_at, doc = excluded.doc`)
    const last = this.db.prepare(`SELECT captured_at, views, likes, comments, collects, shares FROM post_snapshots
      WHERE account_id = ? AND post_id = ? ORDER BY captured_at DESC, rowid DESC LIMIT 1`)
    return this.transaction(() => {
      for (const post of posts) {
        const row: Row | undefined = select.get(post.accountId, post.postId)
        const stored = row === undefined ? undefined : this.decode(postSchema, row.doc, 'posts')
        const merged: MediaPost = stored === undefined ? post : mergePost(stored, post)
        write.run(merged.accountId, merged.postId, merged.publishedAt ?? null, merged.updatedAt, JSON.stringify(merged))
        const previous: Row | undefined = last.get(merged.accountId, merged.postId)
        const unchanged = previous !== undefined && POST_COUNTERS.every(key => nullable(previous[key]) === (merged[key] ?? null))
        const recent = previous !== undefined && Date.parse(merged.updatedAt) - Date.parse(String(previous.captured_at)) < POST_SNAPSHOT_REPEAT_MS
        if (!(unchanged && recent) && POST_COUNTERS.some(key => merged[key] !== undefined)) {
          this.insertPostSnapshot({ ...pickCounters(merged), accountId: merged.accountId, postId: merged.postId, capturedAt: merged.updatedAt })
        }
      }
      return posts.length
    })
  }

  private insertPostSnapshot(snapshot: MediaPostSnapshot): void {
    this.db.prepare('INSERT INTO post_snapshots (account_id, post_id, captured_at, views, likes, comments, collects, shares) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(snapshot.accountId, snapshot.postId, snapshot.capturedAt, ...POST_COUNTERS.map(key => snapshot[key] ?? null))
  }

  /**
   * Append post snapshots as they are, for sample data that carries its own history.
   * @param snapshots - snapshots of any posts.
   */
  addPostSnapshots(snapshots: readonly MediaPostSnapshot[]): void {
    this.transaction(() => { for (const snapshot of snapshots) this.insertPostSnapshot(snapshot) })
  }

  /**
   * Read an account's post snapshots captured at or after an instant.
   * @param id - account id.
   * @param since - ISO instant; undefined reads all.
   * @param postId - restrict to one post.
   * @returns snapshots, oldest first.
   */
  postSnapshots(id: MediaAccountId, since?: string, postId?: string): MediaPostSnapshot[] {
    const rows: Row[] = postId === undefined
      ? this.db.prepare('SELECT * FROM post_snapshots WHERE account_id = ? AND captured_at >= ? ORDER BY captured_at, rowid').all(id, since ?? '')
      : this.db.prepare('SELECT * FROM post_snapshots WHERE account_id = ? AND post_id = ? AND captured_at >= ? ORDER BY captured_at, rowid').all(id, postId, since ?? '')
    return rows.map(row => ({
      accountId: id, postId: String(row.post_id), capturedAt: String(row.captured_at),
      views: optional(row.views), likes: optional(row.likes), comments: optional(row.comments), collects: optional(row.collects), shares: optional(row.shares),
    }))
  }

  /**
   * Read one post.
   * @param id - account id.
   * @param postId - platform post id.
   * @returns the post, or undefined.
   */
  post(id: MediaAccountId, postId: string): MediaPost | undefined {
    return this.docs(postSchema, 'posts', 'SELECT doc FROM posts WHERE account_id = ? AND post_id = ?', id, postId)[0]
  }

  /**
   * Read the newest posts: by publish time when known, otherwise by write time.
   * @param id - account id.
   * @param limit - maximum rows.
   * @returns posts, newest first.
   */
  posts(id: MediaAccountId, limit: number): MediaPost[] {
    return this.docs(postSchema, 'posts', 'SELECT doc FROM posts WHERE account_id = ? ORDER BY COALESCE(published_at, updated_at) DESC LIMIT ?', id, Math.max(0, Math.floor(limit)))
  }

  /**
   * Append a run.
   * @param run - finished run.
   */
  addRun(run: MediaRunRecord): void {
    this.db.prepare('INSERT INTO runs (account_id, kind, started_at, doc) VALUES (?, ?, ?, ?)').run(run.accountId, run.kind, run.startedAt, JSON.stringify(run))
  }

  /**
   * Read the newest run.
   * @param id - account id.
   * @param kind - restrict to one kind; undefined reads either.
   * @returns the run, or undefined.
   */
  lastRun(id: MediaAccountId, kind?: MediaRunRecord['kind']): MediaRunRecord | undefined {
    return kind === undefined
      ? this.docs(runSchema, 'runs', 'SELECT doc FROM runs WHERE account_id = ? ORDER BY started_at DESC, rowid DESC LIMIT 1', id)[0]
      : this.docs(runSchema, 'runs', 'SELECT doc FROM runs WHERE account_id = ? AND kind = ? ORDER BY started_at DESC, rowid DESC LIMIT 1', id, kind)[0]
  }

  /**
   * Store a topic report.
   * @param report - generated report.
   */
  /**
   * Store a 今日简报.
   * @param brief - written brief.
   */
  addBrief(brief: MediaBrief): void {
    this.addReport(brief.id, brandString<MediaAccountId>(NETWORK_ACCOUNT), 'brief', brief.createdAt, brief)
  }

  /**
   * Read the newest 今日简报.
   * @returns it, or undefined before the first one.
   */
  latestBrief(): MediaBrief | undefined {
    return this.docs(briefSchema, 'reports', "SELECT doc FROM reports WHERE account_id = ? AND kind = 'brief' ORDER BY created_at DESC LIMIT 1", NETWORK_ACCOUNT)[0]
  }

  addTopicReport(report: MediaTopicReport): void {
    this.addReport(report.id, report.accountId, 'topics', report.createdAt, report)
  }

  /**
   * Store an analysis report.
   * @param report - generated report.
   */
  addAnalysisReport(report: MediaAnalysisReport): void {
    this.addReport(report.id, report.accountId, 'analysis', report.createdAt, report)
  }

  private addReport(id: string, accountId: MediaAccountId, kind: string, createdAt: string, doc: object): void {
    this.db.prepare('INSERT INTO reports (id, account_id, kind, created_at, doc) VALUES (?, ?, ?, ?, ?)').run(id, accountId, kind, createdAt, JSON.stringify(doc))
  }

  /**
   * List topic reports.
   * @param id - account id.
   * @param limit - maximum rows.
   * @returns reports, newest first.
   */
  topicReports(id: MediaAccountId, limit: number): MediaTopicReport[] {
    return this.docs(topicReportSchema, 'reports', "SELECT doc FROM reports WHERE account_id = ? AND kind = 'topics' ORDER BY created_at DESC LIMIT ?", id, limit)
  }

  /**
   * Read one topic report.
   * @param id - report id.
   * @returns the report, or undefined when none has the id.
   */
  topicReport(id: MediaReportId): MediaTopicReport | undefined {
    return this.docs(topicReportSchema, 'reports', "SELECT doc FROM reports WHERE id = ? AND kind = 'topics'", id)[0]
  }

  /**
   * Replace a stored topic report, keeping its id, account and creation time.
   * @param report - the updated report.
   */
  replaceTopicReport(report: MediaTopicReport): void {
    this.db.prepare("UPDATE reports SET doc = ? WHERE id = ? AND kind = 'topics'").run(JSON.stringify(report), report.id)
  }

  /**
   * List analysis reports.
   * @param id - account id.
   * @param limit - maximum rows.
   * @returns reports, newest first.
   */
  analysisReports(id: MediaAccountId, limit: number): MediaAnalysisReport[] {
    return this.docs(analysisReportSchema, 'reports', "SELECT doc FROM reports WHERE account_id = ? AND kind = 'analysis' ORDER BY created_at DESC LIMIT ?", id, limit)
  }

  /**
   * Remember a browser profile's detected login state.
   * @param profile - profile key: the platform id for its shared profile, or an account profile key. The column is
   * named `platform` because every profile was a platform's before accounts had their own.
   * @param state - detected state; `unknown` leaves the stored state unchanged.
   * @param at - ISO detection instant.
   */
  setLogin(profile: string, state: MediaLoginState, at: string): void {
    if (state === 'unknown') return
    this.db.prepare('INSERT INTO logins (platform, state, checked_at) VALUES (?, ?, ?) ON CONFLICT (platform) DO UPDATE SET state = excluded.state, checked_at = excluded.checked_at').run(profile, state, at)
  }

  /**
   * Read a browser profile's last detected login state.
   * @param profile - profile key, as in {@link MediaStore.setLogin}.
   * @returns the state, or `unknown` when never detected.
   */
  login(profile: string): MediaLoginState {
    const row: Row | undefined = this.db.prepare('SELECT state FROM logins WHERE platform = ?').get(profile)
    return row?.state === 'logged-in' || row?.state === 'logged-out' ? row.state : 'unknown'
  }

  /**
   * Forget a browser profile's login state, after the profile was deleted.
   * @param profile - profile key.
   */
  forgetLogin(profile: string): void {
    this.db.prepare('DELETE FROM logins WHERE platform = ?').run(profile)
  }
}

/**
 * Merge a newly read post into the stored one: defined new fields win, extras merge, and an existing publish time or URL
 * is kept when the new row lacks it.
 * @param stored - stored post.
 * @param next - new row for the same post.
 * @returns the merged post.
 */
export function mergePost(stored: MediaPost, next: MediaPost): MediaPost {
  return {
    accountId: stored.accountId,
    postId: stored.postId,
    title: next.title === '' ? stored.title : next.title,
    url: next.url ?? stored.url,
    publishedAt: next.publishedAt ?? stored.publishedAt,
    format: next.format,
    views: next.views ?? stored.views,
    likes: next.likes ?? stored.likes,
    comments: next.comments ?? stored.comments,
    collects: next.collects ?? stored.collects,
    shares: next.shares ?? stored.shares,
    coverUrl: next.coverUrl ?? stored.coverUrl,
    extra: { ...stored.extra, ...next.extra },
    source: next.source,
    updatedAt: next.updatedAt,
  }
}

function nullable(value: unknown): number | null {
  return typeof value === 'number' || typeof value === 'bigint' ? Number(value) : null
}

function optional(value: unknown): number | undefined {
  return nullable(value) ?? undefined
}

function pickCounters(post: MediaPost): Pick<MediaPostSnapshot, typeof POST_COUNTERS[number]> {
  return { views: post.views, likes: post.likes, comments: post.comments, collects: post.collects, shares: post.shares }
}
