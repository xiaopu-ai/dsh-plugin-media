/** Readable text of an HTML page, for a model that reads it: scripts, styles and tags removed, entities decoded. */

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/**
 * Reduce HTML to its visible text, keeping one line per block element.
 * @param html - the page source.
 * @returns the text with runs of blank lines collapsed.
 */
export function htmlText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, name: string) => {
      if (name.startsWith('#x') || name.startsWith('#X')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
      if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
      return ENTITIES[name.toLowerCase()] ?? entity
    })
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim()
}
