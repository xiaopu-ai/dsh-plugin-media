/** Panel input is range-checked, and a held button turns moves into stepped drags that slider captchas follow. */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyPointer, BrowserManager, InputQueue, isAccountProfileKey, loginStatusOf, MediaBrowserInputError, newAccountProfile, validateInput,
  type PointerMouse, type PointerState,
} from '../src/browser.ts'
import type { MediaBrowserInput } from '../src/types.ts'

const viewport = { width: 1280, height: 800 }

function recorder(): { readonly mouse: PointerMouse; readonly calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    mouse: {
      move: (x, y, options) => { calls.push(`move ${x},${y} steps=${options?.steps ?? 1}`); return Promise.resolve() },
      down: (options) => { calls.push(`down ${options?.button ?? 'left'}`); return Promise.resolve() },
      up: (options) => { calls.push(`up ${options?.button ?? 'left'}`); return Promise.resolve() },
      click: (x, y, options) => { calls.push(`click ${x},${y} ${options?.button ?? 'left'}`); return Promise.resolve() },
    },
  }
}

describe('validateInput', () => {
  it('accepts in-range pointer input including down and up', () => {
    for (const input of [
      { kind: 'down', x: 0, y: 0, button: 'left' },
      { kind: 'up', x: 1280, y: 800, button: 'right' },
      { kind: 'move', x: 640, y: 400 },
      { kind: 'click', x: 1, y: 1, button: 'left' },
      { kind: 'key', key: 'Control+a' },
      { kind: 'navigate', url: 'https://www.douyin.com/' },
    ] as const) expect(() => { validateInput(input, viewport) }).not.toThrow()
  })

  it('refuses points outside the view and invalid keys, wheels and URLs', () => {
    for (const input of [
      { kind: 'down', x: -1, y: 0, button: 'left' },
      { kind: 'up', x: 10, y: 801, button: 'left' },
      { kind: 'move', x: Number.NaN, y: 1 },
      { kind: 'wheel', x: 1, y: 1, deltaX: 0, deltaY: 20000 },
      { kind: 'key', key: 'Enter; rm' },
      { kind: 'text', text: 'x'.repeat(2001) },
      { kind: 'navigate', url: 'file:///etc/passwd' },
      { kind: 'navigate', url: 'not a url' },
    ] as const) expect(() => { validateInput(input, viewport) }).toThrow(MediaBrowserInputError)
  })
})

describe('applyPointer', () => {
  it('drags in steps while a button is held and moves directly otherwise', async () => {
    const { mouse, calls } = recorder()
    const state: PointerState = { x: 0, y: 0, pressed: undefined }
    await applyPointer(mouse, state, { kind: 'move', x: 100, y: 500 }, 8)
    await applyPointer(mouse, state, { kind: 'down', x: 100, y: 500, button: 'left' }, 8)
    expect(state.pressed).toBe('left')
    await applyPointer(mouse, state, { kind: 'move', x: 180, y: 500 }, 8)
    await applyPointer(mouse, state, { kind: 'move', x: 181, y: 501 }, 8)
    await applyPointer(mouse, state, { kind: 'up', x: 300, y: 500, button: 'left' }, 8)
    expect(state).toEqual({ x: 300, y: 500, pressed: undefined })
    await applyPointer(mouse, state, { kind: 'move', x: 1000, y: 500 }, 8)
    expect(calls).toEqual([
      'move 100,500 steps=1',
      'move 100,500 steps=1',
      'down left',
      'move 180,500 steps=10',
      'move 181,501 steps=1',
      'move 300,500 steps=15',
      'up left',
      'move 1000,500 steps=1',
    ])
  })

  it('caps steps, releases a held button before a new press, and tracks clicks', async () => {
    const { mouse, calls } = recorder()
    const state: PointerState = { x: 0, y: 0, pressed: 'left' }
    await applyPointer(mouse, state, { kind: 'move', x: 1280, y: 800 }, 1)
    await applyPointer(mouse, state, { kind: 'down', x: 10, y: 10, button: 'right' }, 8)
    await applyPointer(mouse, state, { kind: 'click', x: 20, y: 30, button: 'left' }, 8)
    expect(calls).toEqual(['move 1280,800 steps=100', 'up left', 'move 10,10 steps=1', 'down right', 'click 20,30 left'])
    expect(state).toEqual({ x: 20, y: 30, pressed: 'right' })
  })
})

describe('input queue', () => {
  it('lets a waiting hover move take the newer point, so a click never waits behind stale moves; drag moves all run', async () => {
    const queue = new InputQueue()
    const applied: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const dispatch = async (input: MediaBrowserInput): Promise<void> => {
      if (applied.length === 0) await gate
      applied.push('x' in input ? `${input.kind} ${input.x},${input.y}` : input.kind)
    }
    const runs = [
      queue.push({ kind: 'click', button: 'left', x: 1, y: 1 }, dispatch),
      ...[10, 20, 30, 40].map(x => queue.push({ kind: 'move', x, y: 5 }, dispatch)),
      queue.push({ kind: 'click', button: 'left', x: 50, y: 5 }, dispatch),
      queue.push({ kind: 'down', button: 'left', x: 60, y: 5 }, dispatch),
      ...[70, 80].map(x => queue.push({ kind: 'move', x, y: 5 }, dispatch)),
      queue.push({ kind: 'up', button: 'left', x: 80, y: 5 }, dispatch),
      queue.push({ kind: 'move', x: 90, y: 5 }, dispatch),
    ]
    release()
    await Promise.all(runs)
    expect(applied).toEqual(['click 1,1', 'move 40,5', 'click 50,5', 'down 60,5', 'move 70,5', 'move 80,5', 'up 80,5', 'move 90,5'])
    let done = false
    await queue.task(async () => { done = true })
    expect(done).toBe(true)
  })
})

describe('account profiles', () => {
  const dirs: string[] = []
  afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

  function manager(profilesDir: string, warnings: string[] = []): BrowserManager {
    return new BrowserManager({
      profilesDir, executablePath: undefined, viewport, frameQuality: 60, idleMs: 1, detachedViewMs: 1, loginPollMs: 1, dragStepPixels: 1,
      adapter: () => undefined, closeTimeoutMs: 1, qrPollMs: 1, navigationTimeoutMs: 1, identifyTimeoutMs: 1,
      identify: () => Promise.resolve(undefined), onLogin: () => undefined, warn: (message) => { warnings.push(message) },
    })
  }

  it('names a new profile after its platform and recognizes only such names', () => {
    const profile = newAccountProfile('douyin')
    expect(profile.platform).toBe('douyin')
    expect(profile.key).toMatch(/^douyin--[0-9a-f-]{36}$/)
    expect(isAccountProfileKey(profile.key)).toBe(true)
    expect(newAccountProfile('douyin').key).not.toBe(profile.key)
    for (const key of ['douyin', 'douyin--', '../douyin--00000000-0000-4000-8000-000000000000', 'douyin--00000000-0000-4000-8000-00000000000/']) {
      expect(isAccountProfileKey(key)).toBe(false)
    }
  })

  it('deletes unused account profiles and never a shared one', async () => {
    const root = mkdtempSync(join(tmpdir(), 'media-profiles-'))
    dirs.push(root)
    const used = newAccountProfile('douyin').key
    const unused = newAccountProfile('douyin').key
    for (const name of ['douyin', used, unused]) {
      mkdirSync(join(root, name))
      writeFileSync(join(root, name, 'Cookies'), 'x')
    }
    // The remembered user agent sits beside the profiles and is never swept.
    writeFileSync(join(root, '.user-agent.json'), '{"userAgent":"x"}')
    const browser = manager(root)
    expect(await browser.discard('douyin')).toBe(false)
    expect(await browser.sweep(new Set([used]))).toEqual([unused])
    expect(['douyin', used, unused, '.user-agent.json'].map(name => existsSync(join(root, name)))).toEqual([true, true, false, true])
    expect(await browser.discard(used)).toBe(true)
    expect(existsSync(join(root, used))).toBe(false)
    // Before the first launch there is no profiles directory at all.
    expect(await manager(join(root, 'missing')).sweep(new Set())).toEqual([])
    await browser.dispose()
  })
})

describe('login trace', () => {
  it('keeps only the status of a QR-polling answer', () => {
    expect(loginStatusOf("window.wx_errcode=404;window.wx_code='';")).toBe('wx_errcode=404')
    expect(loginStatusOf('{"data":{"status":"2","token":"secret"},"error_code":0}')).toBe('error_code=0 data.status=2')
    expect(loginStatusOf('<html>')).toBeUndefined()
  })
})
