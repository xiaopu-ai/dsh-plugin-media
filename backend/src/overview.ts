/** Pure dashboard computations: series, deltas, engagement and per-post interaction totals. */
import type { MediaAccount, MediaAccountOverview, MediaLoginState, MediaMetricSnapshot, MediaPost, MediaRunRecord, MediaSeriesPoint } from './types.ts'

/** Inputs the controller reads from the store for one overview. */
export interface OverviewInput {
  readonly account: MediaAccount
  /** Snapshots captured inside the window, oldest first. */
  readonly snapshots: readonly MediaMetricSnapshot[]
  readonly latest: MediaMetricSnapshot | undefined
  /** Recent posts, newest first. */
  readonly posts: readonly MediaPost[]
  /** ISO start of the window. */
  readonly since: string
  readonly lastRun: MediaRunRecord | undefined
  readonly login: MediaLoginState
  readonly nextRunAt: string | undefined
}

/**
 * Sum of a post's interactions: likes, comments, collects and shares.
 * @param post - post.
 * @returns the total, or undefined when no counter is known.
 */
export function interactionsOf(post: MediaPost): number | undefined {
  const parts = [post.likes, post.comments, post.collects, post.shares].filter((value): value is number => value !== undefined)
  return parts.length === 0 ? undefined : parts.reduce((sum, value) => sum + value, 0)
}

/**
 * Posts inside a window: published at or after `since`, or, for posts without a publish time, last read inside it.
 * @param posts - posts.
 * @param since - ISO start of the window.
 * @returns the posts in the window.
 */
export function postsInWindow(posts: readonly MediaPost[], since: string): MediaPost[] {
  return posts.filter(post => (post.publishedAt ?? post.updatedAt) >= since)
}

function average(posts: readonly MediaPost[], pick: (post: MediaPost) => number | undefined): number | undefined {
  const values = posts.map(pick).filter((value): value is number => value !== undefined)
  return values.length === 0 ? undefined : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10
}

function delta(first: number | undefined, last: number | undefined): number | undefined {
  return first === undefined || last === undefined ? undefined : last - first
}

/** First defined value of one counter, scanning in order. */
function firstDefined(
  snapshots: readonly MediaMetricSnapshot[], pick: (snapshot: MediaMetricSnapshot) => number | undefined,
): number | undefined {
  for (const snapshot of snapshots) {
    const value = pick(snapshot)
    if (value !== undefined) return value
  }
  return undefined
}

/**
 * Newest snapshot with each missing account counter filled from the most recent earlier snapshot that reports it, so a
 * scrape that misses one counter does not blank it on the dashboard.
 * @param newestFirst - snapshots of one account, newest first.
 * @returns the completed newest snapshot, or undefined when there is none.
 */
export function latestKnown(newestFirst: readonly MediaMetricSnapshot[]): MediaMetricSnapshot | undefined {
  const [newest] = newestFirst
  if (newest === undefined) return undefined
  return {
    ...newest,
    followers: newest.followers ?? firstDefined(newestFirst, snapshot => snapshot.followers),
    following: newest.following ?? firstDefined(newestFirst, snapshot => snapshot.following),
    likes: newest.likes ?? firstDefined(newestFirst, snapshot => snapshot.likes),
    posts: newest.posts ?? firstDefined(newestFirst, snapshot => snapshot.posts),
  }
}

/**
 * Build the dashboard summary of one account.
 * @param input - stored values for the window.
 * @returns the overview.
 */
export function buildOverview(input: OverviewInput): MediaAccountOverview {
  const series: MediaSeriesPoint[] = input.snapshots.map(snapshot => ({
    at: snapshot.capturedAt, followers: snapshot.followers, likes: snapshot.likes, posts: snapshot.posts,
    plays: snapshot.extra.plays, profileViews: snapshot.extra.profileViews,
    fansNet: snapshot.extra.fansNet, postLikes: snapshot.extra.postLikes,
  }))
  const reversed = [...input.snapshots].reverse()
  const counters = ['followers', 'likes', 'posts'] as const
  const deltas = Object.fromEntries(counters.map(key => [key, delta(
    firstDefined(input.snapshots, snapshot => snapshot[key]),
    firstDefined(reversed, snapshot => snapshot[key]),
  )]))
  const windowPosts = postsInWindow(input.posts, input.since)
  return {
    account: input.account,
    latest: input.latest,
    series,
    deltas: { followers: deltas.followers, likes: deltas.likes, posts: deltas.posts },
    engagement: {
      postCount: windowPosts.length,
      avgLikes: average(windowPosts, post => post.likes),
      avgComments: average(windowPosts, post => post.comments),
      avgCollects: average(windowPosts, post => post.collects),
      avgViews: average(windowPosts, post => post.views),
    },
    lastRun: input.lastRun,
    login: input.login,
    nextRunAt: input.nextRunAt,
  }
}
