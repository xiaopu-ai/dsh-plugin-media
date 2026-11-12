/** Login pages and session cookies decide the login state; the creator center identifies 抖音 accounts as a fallback. */
import { describe, expect, it } from 'vitest'
import { douyinAdapter, douyinLoginFrom, parseDouyinCreatorInfo } from '../src/adapters/douyin.ts'
import { isTimeoutError } from '../src/adapters/page.ts'
import { xhsLoginFromUrl, xiaohongshuAdapter } from '../src/adapters/xiaohongshu.ts'

describe('小红书 login', () => {
  it('opens the QR login page and reads it as logged out on both domains', () => {
    expect(xiaohongshuAdapter.descriptor.loginUrl).toBe('https://www.xiaohongshu.com/login')
    expect(xhsLoginFromUrl('https://www.xiaohongshu.com/login')).toBe('logged-out')
    expect(xhsLoginFromUrl('https://www.rednote.com/login?redirectPath=%2Fexplore')).toBe('logged-out')
    expect(xhsLoginFromUrl('https://www.rednote.com/explore')).toBeUndefined()
    expect(xhsLoginFromUrl('https://www.xiaohongshu.com/loginfo')).toBeUndefined()
    expect(xhsLoginFromUrl('https://example.com/login')).toBe('unknown')
  })
})

describe('抖音 login', () => {
  const cookie = (name: string, domain: string, value = 'v'): { name: string; domain: string; value: string } => ({ name, domain, value })

  it('opens the creator center and accepts its login', () => {
    expect(douyinAdapter.descriptor.loginUrl).toBe('https://creator.douyin.com/')
    expect(douyinLoginFrom('https://creator.douyin.com/creator-micro/home', [])).toBe('logged-in')
    expect(douyinLoginFrom('https://creator.douyin.com/', [cookie('sessionid', '.creator.douyin.com')])).toBe('logged-in')
    expect(douyinLoginFrom('about:blank', [cookie('sessionid_ss', '.douyin.com')])).toBe('logged-in')
  })

  it('ignores empty, unrelated and look-alike cookies', () => {
    expect(douyinLoginFrom('https://creator.douyin.com/', [])).toBe('logged-out')
    expect(douyinLoginFrom('https://www.douyin.com/', [cookie('sessionid', '.douyin.com', '')])).toBe('logged-out')
    expect(douyinLoginFrom('https://www.douyin.com/', [cookie('ttwid', '.douyin.com')])).toBe('logged-out')
    expect(douyinLoginFrom('https://www.douyin.com/', [cookie('sessionid', '.notdouyin.com')])).toBe('logged-out')
  })

  it('finds the account in nested creator user info', () => {
    expect(parseDouyinCreatorInfo({ status_code: 0, user: { nickname: '创作者', sec_uid: 'MS4wSEC' } }))
      .toEqual({ name: '创作者', profileUrl: 'https://www.douyin.com/user/MS4wSEC' })
    expect(parseDouyinCreatorInfo({ data: { user_info: { nick_name: '深层', secUid: 'MS4wDEEP' } } }))
      .toEqual({ name: '深层', profileUrl: 'https://www.douyin.com/user/MS4wDEEP' })
    expect(parseDouyinCreatorInfo({ data: { sec_user_id: 'MS4wNONAME' } })?.name).toBe('抖音用户 MS4wNONA')
    expect(parseDouyinCreatorInfo({ a: { b: { c: { d: { e: { sec_uid: 'too-deep' } } } } } })).toBeUndefined()
    expect(parseDouyinCreatorInfo(null)).toBeUndefined()
  })
})

describe('navigation', () => {
  it('recognizes Playwright timeouts by name', () => {
    const timeout = new Error('Timeout 60000ms exceeded.')
    timeout.name = 'TimeoutError'
    expect(isTimeoutError(timeout)).toBe(true)
    expect(isTimeoutError(new Error('net::ERR_NAME_NOT_RESOLVED'))).toBe(false)
    expect(isTimeoutError('TimeoutError')).toBe(false)
  })
})
