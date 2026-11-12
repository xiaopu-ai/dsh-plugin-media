/** Matching of identified or newly saved own accounts to stored ones. */
import type { MediaAccount, MediaPlatformId } from './types.ts'

/**
 * Normalize a profile URL for comparison: lower-case host, `rednote.com` read as `xiaohongshu.com`, no query,
 * fragment or trailing slash.
 * @param url - profile URL as entered or identified.
 * @returns the comparable form, or an empty string for a blank URL.
 */
export function normalizeProfileUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') return ''
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    // Not an absolute URL: compare the text itself.
    return trimmed.toLowerCase()
  }
  const host = parsed.host.toLowerCase().replace(/(^|\.)rednote\.com$/, '$1xiaohongshu.com')
  return `${parsed.protocol}//${host}${parsed.pathname.replace(/\/+$/, '')}`
}

/** What an identity or draft knows about the account it refers to. */
export interface OwnAccountQuery {
  readonly platform: MediaPlatformId
  readonly profileUrl: string
  /** Nickname or account name; separates accounts that share a profile URL in `platform` matching. */
  readonly name: string
  /** `profile-url` compares normalized URLs; `platform` is for platforms whose profile URL names no account. */
  readonly mode: 'profile-url' | 'platform'
  /**
   * A save never takes the platform's only own account by platform alone, so a manually added account with
   * another URL is not overwritten.
   */
  readonly forSave: boolean
  /** The adapter could not read the account's name and gave a placeholder, so the name separates nothing. */
  readonly nameUnknown?: boolean | undefined
}

/**
 * Find the stored own account an identity or draft refers to. In `profile-url` mode that is the own account with the
 * same normalized URL. In `platform` mode it is the one own account with the same normalized URL and the same name,
 * so several accounts of one platform stay apart; an identity whose name is unknown matches the platform's only own
 * account.
 * @param accounts - all stored accounts.
 * @param query - platform, URL, name, mode and purpose.
 * @returns the matching account, or undefined.
 */
export function matchOwnAccount(accounts: readonly MediaAccount[], query: OwnAccountQuery): MediaAccount | undefined {
  const own = accounts.filter(account => account.role === 'own' && account.platform === query.platform && account.demo !== true)
  const target = normalizeProfileUrl(query.profileUrl)
  const sameUrl = target === '' ? [] : own.filter(account => normalizeProfileUrl(account.profileUrl) === target)
  if (query.mode === 'profile-url') return sameUrl[0]
  const named = sameUrl.filter(account => account.name === query.name.trim())
  if (named.length === 1) return named[0]
  if (!query.forSave && query.nameUnknown === true && own.length === 1) return own[0]
  return undefined
}
