/** 抖音 discovery: keyword search and the trending search list, captured from the JSON the web pages request. */
import type { Page, Response } from 'playwright-core'
import { parseCount, parseDate } from '../counters.ts'
import type { MediaRelatedPost, MediaTrendingTopic } from '../types.ts'
import { asRecord, evaluateScript, gotoPage, sleep, stringField } from './page.ts'
import type { MediaSearchLimits } from './types.ts'

/** Search APIs the search page calls: the video tab and the combined tab. */
const SEARCH_APIS = ['/aweme/v1/web/search/item/', '/aweme/v1/web/general/search/']
const TRENDING_API = '/aweme/v1/web/hot/search/list/'
/** Nesting depth searched for post records inside a search response. */
const MAX_DEPTH = 5
/** Seconds the search page may take to return its first results. */
const SEARCH_WAIT_SECONDS = 12
/** Scrolls that load further result pages. */
const SEARCH_SCROLLS = 2
/** Seconds the trending page may take to return the list. */
const TRENDING_WAIT_SECONDS = 10

function firstUrl(value: unknown): string | undefined {
  const list = asRecord(value)?.url_list
  return Array.isArray(list) && typeof list[0] === 'string' ? list[0] : undefined
}

/**
 * Read one post record (`aweme_info` or an `aweme_list` item) into a related post.
 * @param aweme - the record.
 * @returns the post, or undefined without an `aweme_id`.
 */
export function parseDouyinAweme(aweme: Readonly<Record<string, unknown>>): MediaRelatedPost | undefined {
  const id = stringField(aweme, 'aweme_id')
  if (id === undefined) return undefined
  const images = Array.isArray(aweme.images) ? aweme.images : []
  const isNote = images.length > 0 || aweme.aweme_type === 68
  const video = asRecord(aweme.video)
  const stats = asRecord(aweme.statistics)
  const plays = parseCount(stats?.play_count)
  return {
    postId: id,
    title: (stringField(aweme, 'desc') ?? '').slice(0, 200),
    url: `https://www.douyin.com/${isNote ? 'note' : 'video'}/${id}`,
    author: stringField(asRecord(aweme.author), 'nickname') ?? '',
    coverUrl: (isNote ? firstUrl(images[0]) : undefined) ?? firstUrl(video?.cover) ?? firstUrl(video?.origin_cover),
    publishedAt: parseDate(aweme.create_time),
    format: isNote ? 'image' : 'video',
    views: plays !== undefined && plays > 0 ? plays : undefined,
    likes: parseCount(stats?.digg_count),
    comments: parseCount(stats?.comment_count),
    collects: parseCount(stats?.collect_count),
    shares: parseCount(stats?.share_count),
  }
}

/**
 * Collect the posts of a search response, wherever the response nests them (`data[].aweme_info`, mixed cards, lists).
 * @param json - response body.
 * @returns posts in response order, without duplicates; empty for a failed response.
 */
export function parseDouyinSearch(json: unknown): MediaRelatedPost[] {
  const body = asRecord(json)
  if (body === undefined || (body.status_code !== undefined && body.status_code !== 0)) return []
  const found = new Map<string, MediaRelatedPost>()
  const queue: { readonly value: unknown; readonly depth: number }[] = [{ value: body.data ?? body.aweme_list, depth: 0 }]
  for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
    if (Array.isArray(item.value)) {
      for (const value of item.value) queue.push({ value, depth: item.depth + 1 })
      continue
    }
    const record = asRecord(item.value)
    if (record === undefined) continue
    // A post record carries its id and counters; anything else is a container to search.
    if (stringField(record, 'aweme_id') !== undefined && record.statistics !== undefined) {
      const post = parseDouyinAweme(record)
      if (post !== undefined && !found.has(post.postId)) found.set(post.postId, post)
      continue
    }
    if (item.depth < MAX_DEPTH) for (const value of Object.values(record)) queue.push({ value, depth: item.depth + 1 })
  }
  return [...found.values()]
}

/**
 * Read the trending search list from a `/aweme/v1/web/hot/search/list/` response.
 * @param json - response body.
 * @returns entries in list order; empty for an unknown body.
 */
export function parseDouyinTrending(json: unknown): MediaTrendingTopic[] {
  const data = asRecord(asRecord(json)?.data)
  const list = Array.isArray(data?.word_list) ? data.word_list : []
  return list.flatMap((entry) => {
    const item = asRecord(entry)
    const word = stringField(item, 'word')
    return word === undefined ? [] : [{ word, heat: parseCount(item?.hot_value) }]
  })
}

/**
 * Search 抖音 for a keyword on the web search page and capture the results it requests, scrolling for more until the
 * limit is met.
 * @param page - a blank page of the logged-in profile.
 * @param keyword - the search text.
 * @param limits - most posts to return and cancellation.
 * @returns matching posts in the platform's order.
 */
export async function searchDouyin(page: Page, keyword: string, limits: MediaSearchLimits): Promise<MediaRelatedPost[]> {
  const found = new Map<string, MediaRelatedPost>()
  const onResponse = (response: Response): void => {
    const target = response.url()
    if (!SEARCH_APIS.some(api => target.includes(api))) return
    response.json().then((json: unknown) => {
      for (const post of parseDouyinSearch(json)) if (!found.has(post.postId)) found.set(post.postId, post)
    }).catch(() => {
      // A non-JSON body (verification page, redirect) carries no results; the wait below ends with what was found.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, `https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=video`, limits.signal)
    for (let waited = 0; waited < SEARCH_WAIT_SECONDS && found.size === 0; waited++) await sleep(1000, limits.signal)
    for (let round = 0; round < SEARCH_SCROLLS && found.size > 0 && found.size < limits.maxPosts; round++) {
      await page.mouse.wheel(0, 4000)
      await sleep(1500, limits.signal)
    }
  } finally {
    page.off('response', onResponse)
  }
  return [...found.values()].slice(0, limits.maxPosts)
}

/** In-page request of the trending list, used when the page did not request it while loading. */
const TRENDING_SCRIPT = `(async () => {
  try {
    const response = await fetch(${JSON.stringify(`${TRENDING_API}?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1`)}, { credentials: 'include' })
    return await response.json()
  } catch { return null }
})()`

/**
 * Read 抖音's trending search list from the trending page, requesting it from inside the page when the page did not.
 * @param page - a blank page of the logged-in profile.
 * @param signal - cancellation.
 * @returns entries in trending order.
 */
export async function trendingDouyin(page: Page, signal: AbortSignal): Promise<MediaTrendingTopic[]> {
  let list: MediaTrendingTopic[] = []
  const onResponse = (response: Response): void => {
    if (!response.url().includes(TRENDING_API)) return
    response.json().then((json: unknown) => {
      const parsed = parseDouyinTrending(json)
      if (parsed.length > 0) list = parsed
    }).catch(() => {
      // A non-JSON body carries no list; the in-page request below is tried instead.
    })
  }
  page.on('response', onResponse)
  try {
    await gotoPage(page, 'https://www.douyin.com/hot', signal)
    for (let waited = 0; waited < TRENDING_WAIT_SECONDS && list.length === 0; waited++) await sleep(1000, signal)
  } finally {
    page.off('response', onResponse)
  }
  if (list.length > 0) return list
  return parseDouyinTrending(await evaluateScript(page, TRENDING_SCRIPT))
}
