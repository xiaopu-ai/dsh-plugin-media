/**
 * Login QR snapshots: an in-page capture of candidate boxes, a pure choice among them, the snapshot step of one poll and
 * the change tracking that decides which `qr` frames a view sends.
 */
import { createHash } from 'node:crypto'
import { asRecord } from './adapters/page.ts'
import type { MediaBrowserFrame } from './types.ts'

/** Region in CSS pixels, in document coordinates. */
export interface QrRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Box of a visible element that may hold the QR code. */
export interface QrBox extends QrRect {
  /**
   * Identity of the displayed image, a hash of its source, when the element is or holds an `img`. A new QR code has a
   * new source, so an unchanged key needs no new snapshot even while overlays on the code animate.
   */
  readonly key?: string | undefined
  /** False while the image is still loading or shows a placeholder smaller than a QR code; such a box is not captured yet. */
  readonly ready: boolean
}

/** A visible image-like element and the texts that may name it a QR code. */
export interface QrCandidate extends QrBox {
  readonly tag: string
  /** Id, class, alt and non-data `src` of the element, then of up to four ancestors, nearest first. */
  readonly texts: readonly string[]
}

/** What the capture script found. */
export interface QrCapture {
  /** Box of the first visible element an adapter selector matched. */
  readonly selected: QrBox | undefined
  readonly candidates: readonly QrCandidate[]
}

/** Accepted QR box size in CSS pixels. */
const MIN_SIZE = 90
const MAX_SIZE = 400
/** Smallest natural width of a loaded QR image; loading placeholders and spinners are smaller. */
const MIN_IMAGE_PIXELS = 64
/** Accepted width-to-height difference, relative to the larger side. */
const SQUARE_TOLERANCE = 0.06

/**
 * Whether a class, id, alt or URL text names a QR code. `qr` must stand alone or begin `qrcode`, `qr_code` or `qr-code`,
 * so generated class names such as `decoration-tShQR1` do not count.
 * @param text - one text.
 * @returns whether it mentions a QR code.
 */
export function mentionsQr(text: string): boolean {
  const lower = text.toLowerCase()
  return /qr[-_]?code/.test(lower) || /(^|[^a-z0-9])qr([^a-z]|$)/.test(lower)
}

function isQrSized(rect: QrRect): boolean {
  const larger = Math.max(rect.width, rect.height)
  return rect.width >= MIN_SIZE && rect.height >= MIN_SIZE && larger <= MAX_SIZE
    && Math.abs(rect.width - rect.height) <= larger * SQUARE_TOLERANCE
}

function boxOf(candidate: QrCandidate): QrBox {
  return { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height, key: candidate.key, ready: candidate.ready }
}

/**
 * Choose the QR box: an adapter selector's match first; otherwise the near-square candidate whose nearest QR mention
 * is closest to it, the larger on ties; otherwise, when allowed, the largest near-square image or canvas.
 * @param capture - what the capture script found.
 * @param largestFallback - allow the last resort. Adapters with selectors disable it: until their QR code renders, the
 * largest square image is usually decoration.
 * @returns the box to snapshot, or undefined when no QR code is visible.
 */
export function pickQrRect(capture: QrCapture, largestFallback: boolean): QrBox | undefined {
  if (capture.selected !== undefined) return capture.selected
  const sized = capture.candidates.filter(isQrSized)
  const area = (rect: QrRect): number => rect.width * rect.height
  const mentioned = sized
    .map(candidate => ({ candidate, depth: candidate.texts.findIndex(mentionsQr) }))
    .filter(entry => entry.depth >= 0)
    .sort((a, b) => a.depth - b.depth || area(b.candidate) - area(a.candidate))
  const chosen = mentioned[0]?.candidate ?? (largestFallback
    ? sized.filter(candidate => candidate.tag === 'img' || candidate.tag === 'canvas').sort((a, b) => area(b) - area(a))[0]
    : undefined)
  return chosen === undefined ? undefined : boxOf(chosen)
}

function boxFrom(value: unknown): QrBox | undefined {
  const record = asRecord(value)
  const [x, y, width, height] = [record?.x, record?.y, record?.width, record?.height]
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') return undefined
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return undefined
  return { x, y, width, height, key: typeof record?.key === 'string' ? record.key : undefined, ready: record?.ready !== false }
}

/**
 * Validate the untrusted value the capture script returned.
 * @param value - page result.
 * @returns the capture; malformed parts are dropped, and a box without a `ready` flag counts as ready.
 */
export function parseQrCapture(value: unknown): QrCapture {
  const record = asRecord(value)
  const candidates: QrCandidate[] = []
  for (const item of Array.isArray(record?.candidates) ? record.candidates : []) {
    const box = boxFrom(item)
    const entry = asRecord(item)
    if (box === undefined || typeof entry?.tag !== 'string') continue
    const texts = Array.isArray(entry.texts) ? entry.texts.filter((text): text is string => typeof text === 'string') : []
    candidates.push({ ...box, tag: entry.tag, texts })
  }
  return { selected: boxFrom(record?.selected), candidates }
}

/**
 * Move every box of a capture made inside a child frame into the page's document coordinates.
 * @param value - untrusted capture result of the frame.
 * @param dx - horizontal offset of the frame's document in the page's document.
 * @param dy - vertical offset.
 * @returns the parsed capture with shifted boxes.
 */
export function offsetQrCapture(value: unknown, dx: number, dy: number): QrCapture {
  const capture = parseQrCapture(value)
  const move = <T extends QrRect>(box: T): T => ({ ...box, x: box.x + dx, y: box.y + dy })
  return { selected: capture.selected === undefined ? undefined : move(capture.selected), candidates: capture.candidates.map(move) }
}

/**
 * Build the in-page capture script. Each box carries a hash of its image source as `key` and whether that image has
 * loaded as `ready`.
 * @param selectors - adapter selectors tried first, in order.
 * @returns a JavaScript expression evaluating to a {@link QrCapture}-shaped value.
 */
export function qrCaptureScript(selectors: readonly string[]): string {
  return `(() => {
    const place = el => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return undefined
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return undefined
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }
    }
    const hash = text => {
      let h = 0x811c9dc5
      for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
      return text.length + ':' + (h >>> 0).toString(16)
    }
    const visible = el => {
      const box = place(el)
      if (!box) return undefined
      const img = el.tagName === 'IMG' ? el : el.querySelector('img')
      if (!img) return { ...box, ready: true }
      return { ...box, key: hash(img.currentSrc || img.src || ''), ready: img.complete && img.naturalWidth >= ${MIN_IMAGE_PIXELS} }
    }
    let selected
    for (const selector of ${JSON.stringify(selectors)}) {
      for (const el of document.querySelectorAll(selector)) {
        selected = visible(el)
        if (selected) break
      }
      if (selected) break
    }
    const texts = el => {
      const out = []
      for (let node = el, depth = 0; node && depth < 5; node = node.parentElement, depth++) {
        const src = node.getAttribute('src') || ''
        out.push([node.id, typeof node.className === 'string' ? node.className : (node.getAttribute('class') || ''), node.getAttribute('alt') || '', src.startsWith('data:') ? '' : src].join(' '))
      }
      return out
    }
    const candidates = []
    for (const el of document.querySelectorAll('img, canvas, svg')) {
      const box = visible(el)
      if (box) candidates.push({ ...box, tag: el.tagName.toLowerCase(), texts: texts(el) })
    }
    return { selected, candidates }
  })()`
}

/** A `qr` frame of the browser stream. */
export type MediaQrFrame = Extract<MediaBrowserFrame, { kind: 'qr' }>

/** A sharp PNG of the visible QR code. */
export interface QrSnapshot {
  /** Base64 PNG, captured at twice the CSS size. */
  readonly data: string
  /** CSS-pixel size of the QR element. */
  readonly width: number
  readonly height: number
  /** Identity of the code, from its image key and size; undefined when only the PNG bytes identify it. */
  readonly key?: string | undefined
}

/**
 * Result of one poll: no QR code visible; a QR code that needs no new frame yet, because it is still loading,
 * is unchanged, or its capture came back empty; or a new snapshot.
 */
export type QrPoll =
  | { readonly kind: 'none' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'snapshot'; readonly snapshot: QrSnapshot }

/** Page operations one poll needs; the Browser manager binds them to the view's page and CDP session. */
export interface QrPage {
  /**
   * Evaluate the capture script.
   * @param script - expression from {@link qrCaptureScript}.
   * @returns the untrusted page result.
   */
  evaluate(script: string): Promise<unknown>
  /**
   * Screenshot one region of the document.
   * @param clip - region in CSS pixels, document coordinates.
   * @returns the untrusted CDP `Page.captureScreenshot` result.
   */
  capture(clip: QrRect): Promise<unknown>
}

function shotData(shot: unknown): string | undefined {
  const data = asRecord(shot)?.data
  return typeof data === 'string' && data !== '' ? data : undefined
}

/**
 * Take one QR snapshot: locate the QR box, then capture it unless its image is still loading or its identity equals
 * the one already sent.
 * @param page - the view's page operations.
 * @param selectors - adapter selectors tried before the generic heuristics; with none, the largest-image fallback applies.
 * @param sentKey - identity of the QR code already sent, from {@link QrTracker.key}.
 * @returns the poll result.
 */
export async function snapshotQr(page: QrPage, selectors: readonly string[], sentKey: string | undefined): Promise<QrPoll> {
  const box = pickQrRect(parseQrCapture(await page.evaluate(qrCaptureScript(selectors))), selectors.length === 0)
  if (box === undefined) return { kind: 'none' }
  if (!box.ready) return { kind: 'pending' }
  const width = Math.round(box.width)
  const height = Math.round(box.height)
  const key = box.key === undefined ? undefined : `${box.key}@${width}x${height}`
  if (key !== undefined && key === sentKey) return { kind: 'pending' }
  const data = shotData(await page.capture({ x: box.x, y: box.y, width: box.width, height: box.height }))
  return data === undefined ? { kind: 'pending' } : { kind: 'snapshot', snapshot: { data, width, height, key } }
}

/**
 * QR frames of one view: a frame per changed snapshot, and one empty frame when a shown QR code disappears or the view
 * logs in. The latest frame is replayed to new subscribers.
 */
export class QrTracker {
  private sent: string | undefined
  private last: MediaQrFrame | undefined

  /** Latest frame sent, or undefined before the first one. */
  get latest(): MediaQrFrame | undefined {
    return this.last
  }

  /** Identity of the QR code currently shown to subscribers, or undefined when none is shown. */
  get key(): string | undefined {
    return this.sent
  }

  /**
   * Record the result of one poll.
   * @param poll - the poll result; pass `none` while the view is logged in.
   * @returns the frame to send, or undefined when subscribers already have the current state.
   */
  update(poll: QrPoll): MediaQrFrame | undefined {
    switch (poll.kind) {
      case 'pending':
        return undefined
      case 'none':
        if (this.sent === undefined) return undefined
        this.sent = undefined
        this.last = { kind: 'qr', data: undefined, width: 0, height: 0 }
        return this.last
      case 'snapshot': {
        const { snapshot } = poll
        const identity = snapshot.key ?? createHash('sha256').update(snapshot.data).digest('hex')
        if (identity === this.sent) return undefined
        this.sent = identity
        this.last = { kind: 'qr', data: snapshot.data, width: snapshot.width, height: snapshot.height }
        return this.last
      }
      default: {
        const never: never = poll
        throw new Error(`Unknown QR poll ${JSON.stringify(never)}`)
      }
    }
  }
}
