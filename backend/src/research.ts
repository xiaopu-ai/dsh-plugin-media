/** Pure helpers of topic research: which keywords to search, and how found posts are ranked and filtered. */
import type { MediaAccount, MediaPost, MediaRelatedPost, MediaTopicSuggestion } from './types.ts'

const HASHTAG = /#([^\s#]+)/gu
const CJK = /\p{Script=Han}/u
/** Separators of the free-text niche field. */
const NICHE_SEPARATORS = /[\s,，、/|；;]+/u

/**
 * Pieces of an account name that mark a hashtag as the account's own persona tag, such as `阿青` in `AI产品经理阿青`:
 * every two-character run of Chinese characters, and every Latin word of four letters or more.
 * @param name - the account name.
 * @returns lower-cased fragments.
 */
export function nameFragments(name: string): string[] {
  const fragments = new Set<string>()
  const chars = Array.from(name)
  for (let index = 0; index + 1 < chars.length; index++) {
    const pair = `${chars[index] ?? ''}${chars[index + 1] ?? ''}`
    if (CJK.test(chars[index] ?? '') && CJK.test(chars[index + 1] ?? '')) fragments.add(pair)
  }
  for (const word of name.match(/[A-Za-z]{4,}/g) ?? []) fragments.add(word.toLowerCase())
  return [...fragments]
}

/**
 * Keywords that describe what the account publishes: the niche field first, then the hashtags of its posts weighted by
 * plays (or interactions without plays). Tags naming the account itself are skipped, since searching them returns the
 * account's own posts.
 * @param account - the account.
 * @param posts - its posts.
 * @param count - most keywords to return.
 * @returns distinct keywords, strongest first.
 */
export function researchKeywords(account: MediaAccount, posts: readonly MediaPost[], count: number): string[] {
  if (count <= 0) return []
  const own = nameFragments(account.name)
  const isOwn = (tag: string): boolean => own.some(fragment => tag.toLowerCase().includes(fragment))
  const weights = new Map<string, { readonly label: string; weight: number }>()
  for (const post of posts) {
    const interactions = (post.likes ?? 0) + (post.comments ?? 0) + (post.collects ?? 0) + (post.shares ?? 0)
    const weight = 1 + Math.log10(1 + (post.views ?? interactions))
    for (const match of post.title.matchAll(HASHTAG)) {
      const tag = match[1] ?? ''
      if (tag.length < 2 || isOwn(tag)) continue
      const key = tag.toLowerCase()
      const entry = weights.get(key) ?? { label: tag, weight: 0 }
      entry.weight += weight
      weights.set(key, entry)
    }
  }
  const niche = account.niche.split(NICHE_SEPARATORS).map(part => part.trim()).filter(part => part.length >= 2)
  const tags = [...weights.values()].sort((a, b) => b.weight - a.weight).map(entry => entry.label)
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const keyword of [...niche, ...tags]) {
    const key = keyword.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(keyword)
    if (keywords.length === count) break
  }
  return keywords
}

/**
 * The search text of one suggestion: its first two keywords, or its title when the model gave none.
 * @param suggestion - the suggestion.
 * @returns the text to search.
 */
export function suggestionQuery(suggestion: Pick<MediaTopicSuggestion, 'title' | 'keywords'>): string {
  const keywords = suggestion.keywords.map(keyword => keyword.trim()).filter(keyword => keyword !== '')
  return keywords.length === 0 ? suggestion.title : keywords.slice(0, 2).join(' ')
}

/** Which found posts count as recent: those published within `days` before `now`. */
export interface MediaRecency {
  /** Current time in milliseconds. */
  readonly now: number
  /** Age limit in days; 0 ranks by likes only. */
  readonly days: number
}

/**
 * Keep the most liked found posts, without the account's own posts. With a recency, posts published inside it come
 * before older and undated ones, so a years-old hit does not crowd out what works now.
 * @param found - search results.
 * @param ownPostIds - ids of the account's stored posts.
 * @param ownName - the account name, matched against the author.
 * @param count - most posts to keep.
 * @param recency - the recent window; omitted ranks by likes only.
 * @returns posts, recent ones first and most liked first within each group.
 */
export function topRelated(
  found: readonly MediaRelatedPost[], ownPostIds: ReadonlySet<string>, ownName: string, count: number, recency?: MediaRecency,
): MediaRelatedPost[] {
  const byLikes = (a: MediaRelatedPost, b: MediaRelatedPost): number => (b.likes ?? 0) - (a.likes ?? 0)
  const kept = found.filter(post => !ownPostIds.has(post.postId) && post.author !== ownName)
  if (recency === undefined || recency.days <= 0) return kept.toSorted(byLikes).slice(0, count)
  const since = recency.now - recency.days * 86_400_000
  // An undated post parses to NaN, which is never inside the window.
  const recent = (post: MediaRelatedPost): boolean => Date.parse(post.publishedAt ?? '') >= since
  return [...kept.filter(recent).toSorted(byLikes), ...kept.filter(post => !recent(post)).toSorted(byLikes)].slice(0, count)
}
