/** Scheduling of automatic scrapes: which accounts are due and when each runs next. */
import type { MediaAccount, MediaRunRecord } from './types.ts'

/**
 * Effective interval of an account: its own setting, clamped to the configured minimum.
 * @param account - account.
 * @param minMinutes - configured minimum interval.
 * @returns the interval in minutes.
 */
export function intervalOf(account: MediaAccount, minMinutes: number): number {
  return Math.max(minMinutes, account.monitor.intervalMinutes)
}

/** Failures a later run cannot fix without the user: logging in, a valid profile URL, or importing a file instead. */
const NEEDS_USER: ReadonlySet<string> = new Set(['login-required', 'invalid-profile', 'unsupported'])

/**
 * Next automatic scrape of an account. A failed run also counts, so a logged-out platform is not retried every tick.
 * A failure that may pass on its own, such as a slow page or a verification that has since cleared, is tried again
 * after the retry delay when that is sooner than the account's interval; a failure that needs the user waits the
 * whole interval.
 * @param account - account.
 * @param lastScrape - newest scrape run, if any.
 * @param minMinutes - configured minimum interval.
 * @param now - current time in milliseconds.
 * @param retryMinutes - delay after a failure that may pass on its own; omitted waits the whole interval.
 * @returns the ISO instant, or undefined when monitoring is off.
 */
export function nextRunAt(
  account: MediaAccount, lastScrape: MediaRunRecord | undefined, minMinutes: number, now: number, retryMinutes?: number,
): string | undefined {
  if (!account.monitor.enabled) return undefined
  if (lastScrape === undefined) return new Date(now).toISOString()
  const interval = intervalOf(account, minMinutes)
  const retries = retryMinutes !== undefined && !lastScrape.ok && !NEEDS_USER.has(lastScrape.errorCode ?? '')
  return new Date(Date.parse(lastScrape.startedAt) + (retries ? Math.min(interval, retryMinutes) : interval) * 60000).toISOString()
}

/**
 * Accounts due for an automatic scrape, most overdue first.
 * @param accounts - all accounts with monitoring enabled and a scraping platform.
 * @param lastScrape - newest scrape run of an account.
 * @param minMinutes - configured minimum interval.
 * @param now - current time in milliseconds.
 * @param retryMinutes - delay after a failure that may pass on its own; omitted waits the whole interval.
 * @returns the due accounts.
 */
/**
 * Whether a keep-alive visit is due: the login is held, nothing else runs for the account, and `everyMinutes` have
 * passed since its last successful update or visit.
 * @param input - the account's state.
 * @returns whether to visit now.
 */
export function keepAliveDue(input: {
  readonly everyMinutes: number
  readonly loggedIn: boolean
  readonly busy: boolean
  /** The account's last update run, if any. */
  readonly lastRun: MediaRunRecord | undefined
  /** The last successful keep-alive visit in this process, in epoch milliseconds. */
  readonly lastVisit: number | undefined
  readonly now: number
}): boolean {
  if (!input.loggedIn || input.busy) return false
  const run = input.lastRun
  const updated = run?.ok === true ? Date.parse(run.finishedAt) : 0
  const last = Math.max(input.lastVisit ?? 0, Number.isFinite(updated) ? updated : 0)
  return input.now - last >= input.everyMinutes * 60_000
}

export function dueAccounts(
  accounts: readonly MediaAccount[], lastScrape: (account: MediaAccount) => MediaRunRecord | undefined, minMinutes: number, now: number,
  retryMinutes?: number,
): MediaAccount[] {
  return accounts
    .map(account => ({ account, at: nextRunAt(account, lastScrape(account), minMinutes, now, retryMinutes) }))
    .filter((entry): entry is { account: MediaAccount; at: string } => entry.at !== undefined && Date.parse(entry.at) <= now)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(entry => entry.account)
}
