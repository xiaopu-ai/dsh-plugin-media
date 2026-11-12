/** Parsing of the counters, percentages and dates that Chinese creator platforms print. */
import { createHash } from 'node:crypto'

const UNITS: Readonly<Record<string, number>> = {
  '': 1, 'k': 1e3, 'K': 1e3, '千': 1e3, 'w': 1e4, 'W': 1e4, '万': 1e4, '亿': 1e8, 'm': 1e6, 'M': 1e6,
}

const COUNTER = /^([+-]?\d+(?:\.\d+)?)\s*([kKwW千万亿mM]?)\s*\+?$/

/**
 * Parse a displayed counter such as `1,234`, `1.2万`, `3.4w`, `10万+` or `1.5亿`.
 * @param value - number or displayed text; blanks and dashes mean unknown.
 * @returns the rounded count, or undefined when the text is not a counter.
 */
export function parseCount(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : undefined
  if (typeof value !== 'string') return undefined
  const text = value.replace(/[,，\s]/g, '').replace(/^约/, '')
  const match = COUNTER.exec(text)
  if (match === null) return undefined
  const unit = UNITS[match[2] ?? '']
  return unit === undefined ? undefined : Math.round(Number(match[1]) * unit)
}

/**
 * Parse a numeric cell that may be a percentage (`12.5%`) or a plain decimal such as an average duration.
 * @param value - number or displayed text.
 * @returns the number, keeping decimals, or undefined.
 */
export function parseDecimal(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const text = value.replace(/[,，\s%]/g, '')
  if (text === '' || !/^[+-]?\d+(?:\.\d+)?$/.test(text)) return parseCount(value)
  return Number(text)
}

/** Offset assumed for platform times printed without a zone: the platforms covered here report China time. */
const CHINA_OFFSET = '+08:00'

/**
 * Parse a platform date into an ISO-8601 instant. Accepts `Date`, Unix seconds or milliseconds, Excel serial
 * days, `2024-05-01 12:30`, `2024/5/1`, and `2024年5月1日 12:30`; zone-less text is read as China time.
 * @param value - cell or JSON value.
 * @returns the ISO instant, or undefined when the value is not a date.
 */
export function parseDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1e11) return new Date(value).toISOString()
    if (value > 1e8) return new Date(value * 1000).toISOString()
    // Excel serial day numbers count from 1899-12-30 in local calendar days.
    if (value > 20000 && value < 80000) {
      const ms = Math.round((value - 25569) * 86400000)
      return parseDate(new Date(ms).toISOString().slice(0, 19).replace('T', ' '))
    }
    return undefined
  }
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (/^\d{10}$|^\d{13}$/.test(text)) return parseDate(Number(text))
  const match = /^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})日?(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(text)
  if (match === null) return undefined
  const [, y, mo, d, h = '0', mi = '0', s = '0', zone] = match
  const pad = (part: string): string => part.padStart(2, '0')
  const iso = `${y}-${pad(mo ?? '1')}-${pad(d ?? '1')}T${pad(h)}:${pad(mi)}:${pad(s)}${zone ?? CHINA_OFFSET}`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Derive a stable post id for platforms or files that expose none.
 * @param parts - identifying fields such as the URL, title and publish time.
 * @returns a 16-hex-digit hash prefixed with `h`.
 */
export function stablePostId(...parts: readonly (string | undefined)[]): string {
  return 'h' + createHash('sha256').update(parts.map(part => part ?? '').join('\u0000')).digest('hex').slice(0, 16)
}
