/** Logins of platforms that end idle web sessions are visited between updates while DSH runs. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { describe, expect, it } from 'vitest'
import { douyinAdapter } from '../src/adapters/douyin.ts'
import { wechatChannelsAdapter } from '../src/adapters/wechat-channels.ts'
import { wechatMpAdapter } from '../src/adapters/wechat-mp.ts'
import { xiaohongshuAdapter } from '../src/adapters/xiaohongshu.ts'
import { keepAliveDue } from '../src/monitor.ts'
import type { MediaAccountId, MediaRunRecord } from '../src/types.ts'

const now = Date.parse('2026-11-13T08:00:00Z')
const minutesAgo = (minutes: number): string => new Date(now - minutes * 60_000).toISOString()
function run(finishedMinutesAgo: number, ok: boolean): MediaRunRecord {
  return {
    accountId: brandString<MediaAccountId>('acct-1'), kind: 'scrape', ok, postsWritten: 0,
    startedAt: minutesAgo(finishedMinutesAgo + 1), finishedAt: minutesAgo(finishedMinutesAgo),
    ...ok ? {} : { errorCode: 'scrape-failed' as const, message: 'x' },
  } as MediaRunRecord
}

describe('keep-alive visits', () => {
  it('visit 视频号 every 30 minutes and 公众号 daily; 抖音 and 小红书 keep their logins for weeks', () => {
    expect(wechatChannelsAdapter.keepAlive).toEqual({ url: 'https://channels.weixin.qq.com/platform', everyMinutes: 30 })
    expect(wechatMpAdapter.keepAlive?.everyMinutes).toBe(24 * 60)
    expect(douyinAdapter.keepAlive).toBeUndefined()
    expect(xiaohongshuAdapter.keepAlive).toBeUndefined()
  })

  it('is due once the interval has passed since the last successful update or visit, and only while logged in and idle', () => {
    const base = { everyMinutes: 30, loggedIn: true, busy: false, lastVisit: undefined, now }
    expect(keepAliveDue({ ...base, lastRun: run(10, true) })).toBe(false)
    expect(keepAliveDue({ ...base, lastRun: run(31, true) })).toBe(true)
    // A failed update does not count as a visit.
    expect(keepAliveDue({ ...base, lastRun: run(10, false) })).toBe(true)
    expect(keepAliveDue({ ...base, lastRun: run(45, true), lastVisit: now - 5 * 60_000 })).toBe(false)
    expect(keepAliveDue({ ...base, lastRun: undefined })).toBe(true)
    expect(keepAliveDue({ ...base, lastRun: run(45, true), loggedIn: false })).toBe(false)
    expect(keepAliveDue({ ...base, lastRun: run(45, true), busy: true })).toBe(false)
  })
})
