/**
 * History backfill: turn the daily counters a platform reports for past days into one snapshot per China calendar
 * day, without touching days that already hold a snapshot.
 */
import type { MediaAccountId, MediaMetricSnapshot } from './types.ts'

/** Daily account counters a platform reports for one past day. */
export interface MediaHistoryDay {
  /** China calendar day, `YYYY-MM-DD`. */
  readonly day: string
  /** Follower total at the end of the day, when the platform reports it. */
  readonly followers?: number | undefined
  /** Net follower change during the day, when the platform reports it. */
  readonly followersNet?: number | undefined
  /** Daily values such as `plays`, `profileViews` and `postLikes`. */
  readonly extra: Readonly<Record<string, number>>
}

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * China calendar day of an instant.
 * @param iso - ISO-8601 instant.
 * @returns the day as `YYYY-MM-DD`.
 */
export function chinaDay(iso: string): string {
  return new Date(Date.parse(iso) + CHINA_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * Noon of a China calendar day, the capture instant of a backfilled snapshot.
 * @param day - `YYYY-MM-DD`.
 * @returns the ISO instant of 12:00 China time on that day.
 */
export function chinaNoon(day: string): string {
  return new Date(`${day}T12:00:00+08:00`).toISOString()
}

/** Inputs of one backfill. */
export interface HistoryBackfill {
  readonly accountId: MediaAccountId
  /** Reported days, in any order; duplicate days keep the later entry. */
  readonly days: readonly MediaHistoryDay[]
  /** Follower total of the newest real snapshot, used to rebuild totals from net changes. */
  readonly latestFollowers: number | undefined
  /** China day of the newest real snapshot; it and later days are skipped, because that snapshot is newer data. */
  readonly today: string
  /** China days that already hold a snapshot; they are never overwritten. */
  readonly existingDays: ReadonlySet<string>
}

/**
 * Build the snapshots of a backfill. A day's follower total is the reported total, or else the latest total minus the
 * net changes of every later reported day up to today; a gap in later net changes leaves earlier totals unknown.
 * Daily values go to `extra`, with the net change as `fansNet`.
 * @param input - reported days and what the store already holds.
 * @returns new snapshots, oldest first, with source `scrape`.
 */
export function historySnapshots(input: HistoryBackfill): MediaMetricSnapshot[] {
  const byDay = new Map<string, MediaHistoryDay>()
  for (const day of input.days) if (DAY.test(day.day) && day.day < input.today) byDay.set(day.day, day)
  const newestFirst = [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day))
  const totals = new Map<string, number>()
  let running = input.latestFollowers
  for (const day of newestFirst) {
    const total = day.followers ?? running
    if (total !== undefined) totals.set(day.day, total)
    // Totals of earlier days follow from this day's total and net change.
    running = total === undefined || day.followersNet === undefined ? undefined : total - day.followersNet
  }
  return newestFirst.reverse().filter(day => !input.existingDays.has(day.day)).map((day): MediaMetricSnapshot => {
    const extra: Record<string, number> = { ...day.extra }
    if (day.followersNet !== undefined) extra.fansNet = day.followersNet
    return { accountId: input.accountId, capturedAt: chinaNoon(day.day), source: 'scrape', followers: totals.get(day.day), extra }
  })
}
