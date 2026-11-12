/** The dashboard keeps the last known value of a counter that the newest snapshot lacks. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { expect, it } from 'vitest'
import { latestKnown } from '../src/overview.ts'
import type { MediaAccountId, MediaMetricSnapshot } from '../src/types.ts'

const accountId = brandString<MediaAccountId>('a1')

function snapshot(capturedAt: string, fields: Partial<MediaMetricSnapshot>): MediaMetricSnapshot {
  return { accountId, capturedAt, source: 'scrape', extra: {}, ...fields }
}

it('fills counters the newest snapshot lacks from the most recent earlier snapshot', () => {
  const newest = snapshot('2026-11-07T10:00:00.000Z', { followers: 728, likes: 2486, extra: { plays: 3 } })
  const latest = latestKnown([
    newest,
    snapshot('2026-11-07T09:00:00.000Z', { followers: 727, posts: 31, following: 681 }),
    snapshot('2026-11-06T09:00:00.000Z', { posts: 30, likes: 1 }),
  ])
  expect(latest).toEqual({ ...newest, followers: 728, likes: 2486, posts: 31, following: 681 })
})

it('keeps a counter undefined when no snapshot reports it and returns undefined without snapshots', () => {
  expect(latestKnown([snapshot('2026-11-07T10:00:00.000Z', { followers: 1 })])?.posts).toBeUndefined()
  expect(latestKnown([])).toBeUndefined()
})
