/** The login QR code is located by adapter selectors or heuristics, captured sharply, and sent only when it changes. */
import { describe, expect, it } from 'vitest'
import { replayFrames } from '../src/browser.ts'
import {
  mentionsQr, offsetQrCapture, parseQrCapture, pickQrRect, qrCaptureScript, QrTracker, snapshotQr, type QrBox, type QrCandidate, type QrPage, type QrRect,
} from '../src/qr.ts'

function candidate(tag: string, size: number, texts: readonly string[] = [], x = 0): QrCandidate {
  return { x, y: 0, width: size, height: size, tag, texts, ready: true }
}

describe('mentionsQr', () => {
  it('accepts QR class, id and URL spellings', () => {
    for (const text of ['qrcode', 'login-qr', 'scan_qr_code', 'QR-Code', 'img qr', 'https://x/qrcode?id=1']) expect(mentionsQr(text)).toBe(true)
  })

  it('rejects generated names that merely contain the letters', () => {
    for (const text of ['decoration-tShQR1', 'aqrb', 'square', '']) expect(mentionsQr(text)).toBe(false)
  })
})

describe('pickQrRect', () => {
  it('prefers the box an adapter selector matched', () => {
    const selected: QrBox = { x: 5, y: 6, width: 10, height: 10, key: 'k', ready: true }
    expect(pickQrRect({ selected, candidates: [candidate('img', 160, ['qrcode'])] }, true)).toEqual(selected)
  })

  it('chooses the near-square candidate whose QR mention is nearest, the larger on ties', () => {
    const capture = {
      selected: undefined,
      candidates: [
        candidate('img', 200, ['', 'login-qr'], 1),
        candidate('img', 150, ['qrcode'], 2),
        candidate('canvas', 180, ['qr-code'], 3),
      ],
    }
    expect(pickQrRect(capture, false)).toEqual({ x: 3, y: 0, width: 180, height: 180, key: undefined, ready: true })
  })

  it('takes the 抖音 QR image, not decorations whose ancestor class merely contains QR', () => {
    const capture = {
      selected: undefined,
      candidates: [
        candidate('img', 284, ['', 'orb-float-ksuNu1', 'orb-gheJDN', 'decoration-tShQR1'], 1),
        candidate('img', 178, ['RhjdbXj8', 'douyin_login_comp_scan_code_qrcode XI37I0dP'], 2),
      ],
    }
    expect(pickQrRect(capture, false)?.x).toBe(2)
  })

  it('falls back to the largest near-square image or canvas only when allowed', () => {
    const capture = {
      selected: undefined,
      candidates: [candidate('svg', 300), candidate('img', 120, [], 1), candidate('canvas', 140, [], 2)],
    }
    expect(pickQrRect(capture, true)).toEqual({ x: 2, y: 0, width: 140, height: 140, key: undefined, ready: true })
    expect(pickQrRect(capture, false)).toBeUndefined()
  })

  it('ignores boxes that are too small, too large or not square', () => {
    const capture = {
      selected: undefined,
      candidates: [
        candidate('img', 60, ['qrcode']),
        candidate('img', 500, ['qrcode']),
        { x: 0, y: 0, width: 200, height: 120, tag: 'img', texts: ['qrcode'], ready: true },
      ],
    }
    expect(pickQrRect(capture, true)).toBeUndefined()
  })
})

describe('parseQrCapture', () => {
  it('keeps well-formed boxes with their image key and readiness, and drops malformed parts', () => {
    const capture = parseQrCapture({
      selected: { x: 1, y: 2, width: 0, height: 3 },
      candidates: [
        { x: 1, y: 2, width: 100, height: 100, tag: 'img', texts: ['qrcode', 7], key: '512:abc', ready: false },
        { x: 1, y: 2, width: 100, height: 100, tag: 'canvas', key: 5 },
        { x: 1, y: 2, width: 100, height: 100 },
        { x: Number.NaN, y: 2, width: 100, height: 100, tag: 'img' },
        'nonsense',
      ],
    })
    expect(capture).toEqual({
      selected: undefined,
      candidates: [
        { x: 1, y: 2, width: 100, height: 100, tag: 'img', texts: ['qrcode'], key: '512:abc', ready: false },
        { x: 1, y: 2, width: 100, height: 100, tag: 'canvas', texts: [], key: undefined, ready: true },
      ],
    })
    expect(parseQrCapture(null)).toEqual({ selected: undefined, candidates: [] })
  })
})

describe('qrCaptureScript', () => {
  it('embeds the adapter selectors as JSON', () => {
    const script = qrCaptureScript(['img.qrcode', 'div[data-x="1"]'])
    expect(script).toContain(JSON.stringify(['img.qrcode', 'div[data-x="1"]']))
    expect(script.trim().startsWith('(() =>')).toBe(true)
  })
})

function fakePage(result: unknown, shot: unknown): { readonly page: QrPage; readonly clips: QrRect[]; readonly scripts: string[] } {
  const clips: QrRect[] = []
  const scripts: string[] = []
  return {
    clips,
    scripts,
    page: {
      evaluate: (script) => { scripts.push(script); return Promise.resolve(result) },
      capture: (clip) => { clips.push(clip); return Promise.resolve(shot) },
    },
  }
}

describe('snapshotQr', () => {
  const qrImage = { x: 10.4, y: 20, width: 160.4, height: 159.6, tag: 'img', texts: ['qrcode'], key: '900:beef', ready: true }

  it('captures only the chosen region and reports its CSS size and identity', async () => {
    const { page, clips, scripts } = fakePage({ candidates: [qrImage] }, { data: 'UE5H' })
    expect(await snapshotQr(page, ['img.qrcode'], undefined))
      .toEqual({ kind: 'snapshot', snapshot: { data: 'UE5H', width: 160, height: 160, key: '900:beef@160x160' } })
    expect(clips).toEqual([{ x: 10.4, y: 20, width: 160.4, height: 159.6 }])
    expect(scripts[0]).toContain('img.qrcode')
  })

  it('skips the capture while the image loads or when its identity was already sent', async () => {
    const loading = fakePage({ candidates: [{ ...qrImage, ready: false }] }, { data: 'UE5H' })
    expect(await snapshotQr(loading.page, [], undefined)).toEqual({ kind: 'pending' })
    const same = fakePage({ candidates: [qrImage] }, { data: 'UE5H' })
    expect(await snapshotQr(same.page, [], '900:beef@160x160')).toEqual({ kind: 'pending' })
    expect([...loading.clips, ...same.clips]).toEqual([])
  })

  it('reports no QR code, and treats an empty capture as pending', async () => {
    const { page, clips } = fakePage({ candidates: [] }, { data: 'UE5H' })
    expect(await snapshotQr(page, [], undefined)).toEqual({ kind: 'none' })
    expect(clips).toEqual([])
    for (const shot of [{ data: '' }, {}, null]) {
      const empty = fakePage({ selected: { x: 0, y: 0, width: 100, height: 100 }, candidates: [] }, shot)
      expect(await snapshotQr(empty.page, [], undefined)).toEqual({ kind: 'pending' })
    }
  })
})

describe('QrTracker', () => {
  const shot = (data: string, key?: string) => ({ kind: 'snapshot', snapshot: { data, width: 160, height: 160, key } }) as const

  it('sends a frame per changed snapshot and nothing for a repeated or pending one', () => {
    const tracker = new QrTracker()
    expect(tracker.latest).toBeUndefined()
    expect(tracker.update(shot('AAAA'))).toEqual({ kind: 'qr', data: 'AAAA', width: 160, height: 160 })
    expect(tracker.update(shot('AAAA'))).toBeUndefined()
    expect(tracker.update({ kind: 'pending' })).toBeUndefined()
    expect(tracker.update(shot('BBBB'))).toEqual({ kind: 'qr', data: 'BBBB', width: 160, height: 160 })
    expect(tracker.latest).toEqual({ kind: 'qr', data: 'BBBB', width: 160, height: 160 })
  })

  it('identifies keyed snapshots by key, so animated pixels of the same code send nothing', () => {
    const tracker = new QrTracker()
    expect(tracker.update(shot('AAAA', 'k@160x160'))).toBeDefined()
    expect(tracker.key).toBe('k@160x160')
    expect(tracker.update(shot('AAAB', 'k@160x160'))).toBeUndefined()
    expect(tracker.update(shot('CCCC', 'k2@160x160'))).toEqual({ kind: 'qr', data: 'CCCC', width: 160, height: 160 })
  })

  it('sends one empty frame when a shown QR code disappears, such as after login', () => {
    const tracker = new QrTracker()
    expect(tracker.update({ kind: 'none' })).toBeUndefined()
    tracker.update(shot('AAAA'))
    const gone = { kind: 'qr', data: undefined, width: 0, height: 0 }
    expect(tracker.update({ kind: 'none' })).toEqual(gone)
    expect(tracker.key).toBeUndefined()
    expect(tracker.update({ kind: 'none' })).toBeUndefined()
    expect(tracker.latest).toEqual(gone)
    expect(tracker.update(shot('AAAA'))).toEqual({ kind: 'qr', data: 'AAAA', width: 160, height: 160 })
  })
})

describe('replayFrames', () => {
  it('replays the latest screencast frame, then the latest QR frame, then the login state', () => {
    const frame = { kind: 'frame', data: 'JPEG', width: 1280, height: 800, url: 'https://www.xiaohongshu.com/login', title: '' } as const
    const lastQr = { kind: 'qr', data: 'PNG', width: 160, height: 160 } as const
    expect(replayFrames({ lastFrame: frame, lastQr, login: 'logged-out' })).toEqual([frame, lastQr, { kind: 'login', state: 'logged-out' }])
    expect(replayFrames({ lastFrame: undefined, lastQr: undefined, login: 'unknown' })).toEqual([{ kind: 'login', state: 'unknown' }])
  })
})

describe('QR codes in frames', () => {
  it('shifts a capture made inside an iframe into the page\'s document coordinates', () => {
    const capture = offsetQrCapture({ selected: undefined, candidates: [{ x: 10, y: 20, width: 160, height: 160, tag: 'img', texts: ['qrcode'], ready: true }] }, 700, 380)
    expect(capture.candidates[0]).toMatchObject({ x: 710, y: 400, width: 160, height: 160 })
    expect(pickQrRect(capture, false)).toMatchObject({ x: 710, y: 400 })
  })
})
