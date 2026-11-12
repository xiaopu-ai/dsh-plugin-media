/** Remote failure codes of the media suite and the scrape failure carried between adapters and the controller. */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { MediaAccountId, MediaBrowserId, MediaDraftId, MediaPlatformId, MediaReportId } from './types.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** No stored account, report or open browser view carries that id. */
    'media/not-found': { readonly kind: 'account' | 'platform' | 'browser' | 'report' | 'draft' | 'post'; readonly id: string }
    /** The request is malformed, such as an empty name or an unregistered platform. */
    'media/invalid': { readonly field: string }
    /** The platform already holds the most own accounts allowed. */
    'media/limit': { readonly platform: MediaPlatformId; readonly limit: number }
    /** The same account already has a scrape, import or AI report in progress. */
    'media/busy': { readonly accountId: MediaAccountId }
    /** The platform's embedded browser profile is not logged in. */
    'media/login-required': { readonly platform: MediaPlatformId }
    /** Chrome could not be launched for the embedded browser. */
    'media/browser-unavailable': { readonly platform: MediaPlatformId }
    /** The model call failed or returned output that is not the requested JSON. */
    'media/llm-failed': { readonly accountId: MediaAccountId; readonly reason: string }
    /** The creation workbench did not start, did not answer, or refused to create a project. */
    'media/studio-failed': { readonly reason: string }
    /** The uploaded export file cannot be read or holds no recognizable table. */
    'media/import-failed': { readonly fileName: string; readonly reason: string }
  }
}

/** Failure codes recorded on a {@link import('./types.ts').MediaRunRecord}. */
export type MediaRunErrorCode = 'login-required' | 'scrape-failed' | 'unsupported' | 'invalid-profile' | 'browser-unavailable'

/** A scrape that an adapter or the browser manager could not complete; the controller records it on the run. */
export class MediaScrapeError extends Error {
  override name = 'MediaScrapeError'

  /**
   * @param code - run failure code shown to the user.
   * @param message - actionable explanation.
   * @param options - optional underlying cause.
   */
  constructor(readonly code: MediaRunErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

/**
 * Build the `media/not-found` failure for one id.
 * @param kind - what was looked up.
 * @param id - the missing id.
 * @returns the Remote failure to throw.
 */
export function notFound(
  kind: 'account' | 'platform' | 'browser' | 'report' | 'draft' | 'post', id: MediaAccountId | MediaBrowserId | MediaDraftId | MediaPlatformId | MediaReportId | string,
): RemoteError<'media/not-found'> {
  return new RemoteError('media/not-found', `No ${kind} "${id}" exists.`, { kind, id })
}

/**
 * Build the `media/invalid` failure for one field.
 * @param field - the offending request field.
 * @param message - what the caller must change.
 * @returns the Remote failure to throw.
 */
export function invalid(field: string, message: string): RemoteError<'media/invalid'> {
  return new RemoteError('media/invalid', message, { field })
}

/**
 * Read a printable message from any thrown value.
 * @param error - caught value.
 * @returns its message.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
