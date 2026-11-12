/** Logged-in accounts are read from platform pages and matched to stored own accounts without duplicates. */
import { describe, expect, it } from 'vitest'
import { brandString } from '@deepseek-ai/dsh-brand'
import { douyinAvatar, parseDouyinSelf } from '../src/adapters/douyin.ts'
import { parseChannelsAccount } from '../src/adapters/wechat-channels.ts'
import { parseWechatName } from '../src/adapters/wechat-mp.ts'
import { parseXhsNickname, parseXhsSelf, xhsAvatar, xhsProfileUrl } from '../src/adapters/xiaohongshu.ts'
import { matchOwnAccount, normalizeProfileUrl } from '../src/identity.ts'
import type { MediaAccount, MediaAccountId } from '../src/types.ts'

function account(id: string, fields: Partial<MediaAccount>): MediaAccount {
  return {
    id: brandString<MediaAccountId>(id), platform: 'douyin', role: 'own', name: id, profileUrl: '', niche: '', notes: '',
    monitor: { enabled: false, intervalMinutes: 360 }, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', ...fields,
  }
}

describe('platform identity parsers', () => {
  it('reads the 小红书 user from page state, then from the sidebar link', () => {
    expect(parseXhsSelf({ user: { loggedIn: true, userInfo: { userId: 'u1', nickname: '小王' } } }, '')).toEqual({ userId: 'u1', nickname: '小王' })
    expect(parseXhsSelf({ user: { loggedIn: true, userInfo: { user_id: 'u2', nick_name: '小李' } } }, '')).toEqual({ userId: 'u2', nickname: '小李' })
    expect(parseXhsSelf({ user: { loggedIn: false, userInfo: { userId: 'guest' } } }, '/user/profile/u3?channel=x')).toEqual({ userId: 'u3', nickname: undefined })
    expect(parseXhsSelf(undefined, '')).toEqual({ userId: undefined, nickname: undefined })
    expect(parseXhsNickname({ user: { userPageData: { basicInfo: { nickname: '小王' } } } })).toBe('小王')
    expect(xhsProfileUrl('u1')).toBe('https://www.xiaohongshu.com/user/profile/u1')
  })

  it('reads the 抖音 self profile response', () => {
    expect(parseDouyinSelf({ user: { sec_uid: 'MS4wLjABAAAA', nickname: '我的抖音' } }))
      .toEqual({ name: '我的抖音', profileUrl: 'https://www.douyin.com/user/MS4wLjABAAAA' })
    expect(parseDouyinSelf({ user: { sec_uid: 'MS4wLjABAAAAxyz' } })?.name).toBe('抖音用户 MS4wLjAB')
    expect(parseDouyinSelf({ status_code: 2 })).toBeUndefined()
  })

  it('reads the 公众号 name from page data, then from the header', () => {
    expect(parseWechatName({ common: '我的公众号', dom: '别的' })).toBe('我的公众号')
    expect(parseWechatName({ common: '', dom: ' 页头名称 ' })).toBe('页头名称')
    expect(parseWechatName({ common: '', dom: '' })).toBeUndefined()
    expect(parseWechatName(null)).toBeUndefined()
  })
})

describe('account matching', () => {
  it('normalizes profile URLs', () => {
    expect(normalizeProfileUrl(' https://WWW.rednote.com/user/profile/abc/?xsec_token=1#x ')).toBe('https://www.xiaohongshu.com/user/profile/abc')
    expect(normalizeProfileUrl('https://www.douyin.com/user/MS4w?from=tab')).toBe('https://www.douyin.com/user/MS4w')
    expect(normalizeProfileUrl('https://mp.weixin.qq.com/')).toBe('https://mp.weixin.qq.com')
    expect(normalizeProfileUrl('  ')).toBe('')
    expect(normalizeProfileUrl('Not A URL')).toBe('not a url')
  })

  it('matches own accounts by normalized URL, or by name where URLs name no account', () => {
    const accounts = [
      account('a', { profileUrl: 'https://www.douyin.com/user/X?from=1' }),
      account('b', { profileUrl: 'https://www.douyin.com/user/X', role: 'benchmark' }),
      account('c', { platform: 'wechat-mp', profileUrl: '' }),
    ]
    const query = { platform: 'douyin', profileUrl: 'https://www.douyin.com/user/X/', name: 'n', mode: 'profile-url', forSave: false } as const
    expect(matchOwnAccount(accounts, query)?.id).toBe('a')
    expect(matchOwnAccount(accounts, { ...query, profileUrl: 'https://www.douyin.com/user/Y' })).toBeUndefined()
    expect(matchOwnAccount(accounts, { ...query, profileUrl: '' })).toBeUndefined()
    const wechat = { platform: 'wechat-mp', profileUrl: 'https://mp.weixin.qq.com/', name: '号一', mode: 'platform', forSave: false } as const
    // A second 公众号 with another name is a new account, not the platform's only one.
    expect(matchOwnAccount(accounts, wechat)).toBeUndefined()
    // An identity whose name could not be read still finds the platform's only own account.
    expect(matchOwnAccount(accounts, { ...wechat, name: '微信公众号', nameUnknown: true })?.id).toBe('c')
    expect(matchOwnAccount(accounts, { ...wechat, forSave: true })).toBeUndefined()
    const scanned = [...accounts, account('d', { platform: 'wechat-mp', name: '号一', profileUrl: 'https://mp.weixin.qq.com/' })]
    expect(matchOwnAccount(scanned, wechat)?.id).toBe('d')
    expect(matchOwnAccount(scanned, { ...wechat, forSave: true })?.id).toBe('d')
    expect(matchOwnAccount(scanned, { ...wechat, name: '另一个号', forSave: true })).toBeUndefined()
    const two = [...scanned, account('e', { platform: 'wechat-mp', name: '号二', profileUrl: 'https://mp.weixin.qq.com' })]
    expect(matchOwnAccount(two, { ...wechat, name: '号二' })?.id).toBe('e')
    expect(matchOwnAccount(two, { ...wechat, name: '号三' })).toBeUndefined()
  })
})

describe('account avatars', () => {
  it('reads the avatar from Douyin and 小红书 user records, https only', () => {
    expect(douyinAvatar({ avatar_thumb: { url_list: ['http://p3.douyinpic.com/a.jpeg', 'https://p26.douyinpic.com/a.jpeg'] } })).toBe('https://p26.douyinpic.com/a.jpeg')
    expect(douyinAvatar({ avatar_url: 'https://p11.douyinpic.com/b.jpeg' })).toBe('https://p11.douyinpic.com/b.jpeg')
    expect(douyinAvatar({ nickname: '阿青' })).toBeUndefined()
    expect(xhsAvatar({ imageb: 'http://sns-avatar-qc.xhscdn.com/avatar/1' })).toBe('https://sns-avatar-qc.xhscdn.com/avatar/1')
    expect(xhsAvatar({ nickname: '小王' })).toBeUndefined()
  })
})

describe('视频号 account', () => {
  it('reads the 视频号 from auth_data\'s finderUser, not the WeChat admin in userAttr', () => {
    const authData = {
      errCode: 0,
      data: {
        userAttr: { nickname: '管理员微信', encryptedHeadImage: 'https://wx.qlogo.cn/mmhead/admin' },
        finderUser: { nickname: '阿青视频号', headImgUrl: 'https://wx.qlogo.cn/finderhead/abc', feedsCount: 20, fansCount: 916 },
      },
    }
    expect(parseChannelsAccount(authData)).toEqual({ name: '阿青视频号', followers: 916, posts: 20, avatarUrl: 'https://wx.qlogo.cn/finderhead/abc' })
    expect(parseChannelsAccount({ data: { userAttr: { nickname: '管理员微信' } } })).toBeUndefined()
  })
})
