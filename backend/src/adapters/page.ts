/** Page-driving helpers shared by the built-in adapters; extraction stays in each adapter's pure parsers. */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Page, Response } from 'playwright-core'

/** Folder of the development capture, from `DSH_MEDIA_CAPTURE_DIR`; undefined when capturing is off. */
export function captureDir(): string | undefined {
  const dir = process.env.DSH_MEDIA_CAPTURE_DIR
  return dir === undefined || dir === '' ? undefined : dir
}

/**
 * Development aid: with the environment variable `DSH_MEDIA_CAPTURE_DIR` set, save every JSON answer the page receives
 * from an accepted URL into that folder (URL, method, request body and response), to read the field names of data not
 * yet mapped. The files hold the account's real data. Off when the variable is unset.
 * @param page - page to watch.
 * @param accept - which response URLs to keep.
 * @returns a function that stops capturing, or undefined when capturing is off.
 */
export function captureJson(page: Page, accept: (url: string) => boolean): (() => void) | undefined {
  const dir = captureDir()
  if (dir === undefined) return undefined
  let count = 0
  const onResponse = (response: Response): void => {
    const url = response.url()
    // Some platforms send JSON as text/plain, so any accepted answer is tried; one that does not parse is skipped.
    if (!accept(url) || !['xhr', 'fetch', 'document', 'other'].includes(response.request().resourceType())) return
    count++
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${String(count).padStart(3, '0')}${new URL(url).pathname.replace(/[^a-z0-9]+/gi, '_').slice(0, 90)}.json`
    const request = response.request()
    response.json().then(async (body: unknown) => {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, name), JSON.stringify({ url, method: request.method(), postData: request.postData(), body }, null, 2))
    }).catch(() => {
      // A body that is not JSON is not worth keeping.
    })
  }
  page.on('response', onResponse)
  return () => { page.off('response', onResponse) }
}

/**
 * Wait without blocking cancellation.
 * @param ms - delay.
 * @param signal - aborts the wait with the signal's reason.
 * @returns after the delay.
 */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason)))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Whether an error is Playwright's timeout, recognized by name because the module is loaded lazily.
 * @param error - caught value.
 * @returns whether it is a `TimeoutError`.
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError'
}

/**
 * Navigate and abandon the navigation when the signal aborts. A navigation that exceeds the page's navigation timeout
 * is not a failure: slow sites keep loading, and callers wait for the data they need with their own bounds.
 * @param page - page to navigate; its default navigation timeout bounds the wait.
 * @param url - absolute URL.
 * @param signal - cancellation.
 * @returns after `domcontentloaded`, or after the navigation timeout.
 */
export async function gotoPage(page: Page, url: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  const stop = (): void => { void page.close().catch(() => undefined) }
  signal.addEventListener('abort', stop, { once: true })
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
  } catch (error) {
    signal.throwIfAborted()
    if (!isTimeoutError(error)) throw error
  } finally {
    signal.removeEventListener('abort', stop)
  }
  signal.throwIfAborted()
}

/**
 * Copy a page global into a JSON value: Vue refs are unwrapped, functions and cycles dropped, depth and arrays bounded.
 * @param page - page holding the global.
 * @param globalName - property of `window`, such as `__INITIAL_STATE__`.
 * @returns the cloned value, or undefined when the global is absent.
 */
export async function readPageGlobal(page: Page, globalName: string): Promise<unknown> {
  return await evaluateScript(page, `(() => {
    const seen = new WeakSet()
    const unwrap = value => {
      let current = value
      for (let i = 0; i < 4 && current !== null && typeof current === 'object'; i++) {
        if ('_rawValue' in current) current = current._rawValue
        else if ('__v_isRef' in current && 'value' in current) current = current.value
        else if ('_value' in current && Object.keys(current).some(key => key.startsWith('__v_'))) current = current._value
        else break
      }
      return current
    }
    const clone = (input, depth) => {
      const value = unwrap(input)
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
      if (typeof value !== 'object' || depth > 12 || seen.has(value)) return undefined
      seen.add(value)
      if (Array.isArray(value)) return value.slice(0, 300).map(item => { const cloned = clone(item, depth + 1); return cloned === undefined ? null : cloned })
      const out = {}
      for (const key of Object.keys(value)) {
        if (key.startsWith('__v_') || key === 'dep') continue
        const item = clone(value[key], depth + 1)
        if (item !== undefined) out[key] = item
      }
      return out
    }
    return clone(window[${JSON.stringify(globalName)}], 0)
  })()`)
}

/**
 * Run an in-page script given as source text, so no transpiler helper leaks into the page; the result is untrusted page data.
 * @param page - page to run in.
 * @param source - a JavaScript expression.
 * @returns the expression's JSON-serializable value.
 */
export async function evaluateScript(page: Page, source: string): Promise<unknown> {
  const value: unknown = await page.evaluate(source)
  return value
}

/**
 * Whether a page's browser profile holds a non-empty cookie of one of the names for the URL.
 * @param page - page of the profile.
 * @param url - site whose cookies are read.
 * @param names - cookie names that indicate a session.
 * @returns whether any such cookie exists.
 */
export async function hasCookie(page: Page, url: string, names: readonly string[]): Promise<boolean> {
  const cookies = await page.context().cookies(url)
  return cookies.some(cookie => names.includes(cookie.name) && cookie.value !== '')
}

/**
 * Narrow a JSON value to an object record.
 * @param value - any value.
 * @returns the record, or undefined.
 */
/**
 * Script for an adapter's `qrExpired`: the center of the page's refresh control when a visible short text matching
 * `notice` (the platform's "QR code expired" line) is shown. The control is the nearest ancestor, up to four levels,
 * whose text also offers a refresh, else the notice itself.
 * @param notice - pattern of the expired notice, such as `/二维码已?(失效|过期)/`.
 * @returns a JavaScript expression evaluating to `{ x, y }` or null.
 */
export function expiredQrScript(notice: RegExp): string {
  return `(() => {
    const notice = ${notice.toString()}
    // Rendered text only: a mask kept in the page but hidden must not count, or a live code would be refreshed.
    const text = el => (el.innerText || '').trim()
    const shown = (el) => {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return false
      return typeof el.checkVisibility === 'function' ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true
    }
    const matches = [...document.querySelectorAll('body *')].filter(el => text(el).length <= 24 && notice.test(text(el)))
    // The innermost elements holding the notice (it may share one with a <br> and 「点击刷新」), then only a visible one:
    // checking the outer boxes would let a mask faded to transparent count through its container.
    const hit = matches.filter(el => ![...el.children].some(child => matches.includes(child))).find(shown)
    if (!hit) return null
    let target = hit
    for (let el = hit, depth = 0; el && depth < 4; el = el.parentElement, depth++) {
      if (/刷新|refresh/i.test(text(el))) { target = el; break }
    }
    const box = target.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  })()`
}

export function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

/**
 * Read a string field.
 * @param record - object or undefined.
 * @param key - field name.
 * @returns a non-empty string, or undefined.
 */
export function stringField(record: Readonly<Record<string, unknown>> | undefined, key: string): string | undefined {
  const value = record?.[key]
  if (typeof value === 'number') return String(value)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}
