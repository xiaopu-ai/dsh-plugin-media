/** Contract every platform adapter implements; built-in and third-party adapters register through `ctx.mediaSuite.registerAdapter`. */
import type { Page } from 'playwright-core'
import type { MediaHistoryDay } from '../history.ts'
import type {
  MediaAccount, MediaAccountRole, MediaLoginState, MediaMetricSnapshot, MediaPlatformDescriptor, MediaPost, MediaPostFormat,
  MediaRelatedPost, MediaTrendingTopic,
} from '../types.ts'

/** Account counters an adapter or import produced, before the store adds account, time and source. */
export type MediaSnapshotFields = Omit<MediaMetricSnapshot, 'accountId' | 'capturedAt' | 'source'>

/** Post fields an adapter or import produced, before the store adds account, source and write time. */
export type MediaPostFields = Omit<MediaPost, 'accountId' | 'source' | 'updatedAt'>

/** Account an adapter identified in a logged-in profile. */
export interface MediaIdentityFields {
  /** Platform nickname. */
  readonly name: string
  /** Canonical profile URL. */
  readonly profileUrl: string
  /** Avatar image URL (https), when the platform showed one. */
  readonly avatarUrl?: string | undefined
}

/** Result of scraping one account. */
export interface MediaScrapeResult {
  readonly snapshot: MediaSnapshotFields
  readonly posts: readonly MediaPostFields[]
  /** The account's current avatar image URL (https), when the page showed one. */
  readonly avatarUrl?: string | undefined
}

/** Bounds the controller passes to one scrape. */
export interface MediaScrapeLimits {
  /** Maximum posts to collect. */
  readonly maxPosts: number
  /** Cancellation and the configured scrape deadline. */
  readonly signal: AbortSignal
}

/** Bounds of one platform search. */
export interface MediaSearchLimits {
  readonly maxPosts: number
  readonly signal: AbortSignal
}

/** Bounds the controller passes to one history read. */
export interface MediaHistoryLimits {
  /** Days of history requested; adapters round down to a range their platform offers. */
  readonly days: number
  /** Cancellation and the configured history deadline. */
  readonly signal: AbortSignal
}

/** Import field a column can map to: a post field, an account counter, a date, or a platform-specific extra counter. */
export type MediaImportField =
  | 'title' | 'publishedAt' | 'url' | 'postId' | 'format'
  | 'views' | 'likes' | 'comments' | 'collects' | 'shares'
  | 'followers' | 'following' | 'totalLikes' | 'date'
  | `extra:${string}`

/** Header synonyms for one import field; matching ignores case, spaces and bracketed units. */
export interface MediaImportColumn {
  readonly field: MediaImportField
  readonly synonyms: readonly string[]
}

/** How an adapter reads its platform's export files. */
export interface MediaImportProfile {
  /** Platform-specific columns, matched before the generic ones. */
  readonly columns: readonly MediaImportColumn[]
  /** Format assumed for post rows without a format column. */
  readonly defaultFormat: MediaPostFormat
}

/** One platform: its descriptor, login detection, optional scraper and import columns. */
export interface MediaPlatformAdapter {
  readonly descriptor: MediaPlatformDescriptor
  readonly importProfile: MediaImportProfile
  /** Roles `scrape` supports; omitted means every role. Other roles are import-only and skipped by monitoring. */
  readonly scrapableRoles?: readonly MediaAccountRole[]
  /**
   * Inspect the platform's persistent browser profile.
   * @param page - a page of that profile, possibly showing any site.
   * @returns the detected login state.
   */
  readonly detectLogin: (page: Page) => Promise<MediaLoginState>
  /**
   * Scrape one account through a fresh page of the platform's logged-in profile. Present when `descriptor.scrape` is true.
   * @param page - a blank page the adapter navigates.
   * @param account - account to read.
   * @param limits - bounds and cancellation.
   * @returns counters and recent posts.
   * @throws {MediaScrapeError} for login, profile URL, unsupported-role and parse failures.
   */
  readonly scrape?: (page: Page, account: MediaAccount, limits: MediaScrapeLimits) => Promise<MediaScrapeResult>
  /**
   * Identify the account logged in to the profile, for adding it as an own account.
   * @param page - a blank page of the logged-in profile; the adapter navigates it.
   * @param signal - cancellation and deadline.
   * @returns nickname and canonical profile URL, or undefined when the account cannot be read.
   */
  readonly identify?: (page: Page, signal: AbortSignal) => Promise<MediaIdentityFields | undefined>
  /**
   * How an identified or newly saved own account matches a stored one: `profile-url` (the default) compares
   * normalized profile URLs; `platform` matches the only own account of the platform, for platforms whose
   * profile URL does not distinguish accounts.
   */
  readonly identityMatch?: 'profile-url' | 'platform'
  /**
   * Read the daily counters the platform reports for an own account's past days, after a successful scrape. The
   * controller writes one snapshot per day that holds none yet; a failure never fails the scrape.
   * @param page - a blank page of the logged-in profile; the adapter navigates it.
   * @param account - own account that was just scraped.
   * @param limits - requested range and cancellation.
   * @returns reported days; empty when the platform reported none.
   */
  readonly history?: (page: Page, account: MediaAccount, limits: MediaHistoryLimits) => Promise<readonly MediaHistoryDay[]>
  /**
   * Search the platform for posts matching a keyword, as the logged-in user sees them.
   * @param page - a blank page of the logged-in profile; the adapter navigates it.
   * @param keyword - the search text.
   * @param limits - most posts to return and cancellation.
   * @returns matching posts in the platform's order; empty when the platform returned none.
   * @throws {MediaScrapeError} `login-required` when the profile is logged out.
   */
  readonly search?: (page: Page, keyword: string, limits: MediaSearchLimits) => Promise<readonly MediaRelatedPost[]>
  /**
   * Read the platform's current trending search list.
   * @param page - a blank page of the logged-in profile; the adapter navigates it.
   * @param signal - cancellation.
   * @returns entries in trending order; empty when the platform returned none.
   */
  readonly trending?: (page: Page, signal: AbortSignal) => Promise<readonly MediaTrendingTopic[]>
  /** CSS selectors of the login QR code, tried before the generic search for a QR-like image. */
  readonly qrSelectors?: readonly string[]
  /**
   * JavaScript expression evaluated in the login page while it is not logged in, usually built with `expiredQrScript` of `page.ts`: the
   * CSS-pixel point of the page's own refresh control when the QR code shown has expired, else null. The login view
   * clicks it, so the code a user scans is always live: an expired code stays readable under the platform's mask, and
   * a phone that scans it only says the code has expired.
   */
  readonly qrExpired?: string
}
