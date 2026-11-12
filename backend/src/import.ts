/** Creator-backend export files (xlsx, xls, csv in UTF-8 or GBK) mapped to snapshots and posts. */
import iconv from 'iconv-lite'
import * as XLSX from 'xlsx'
import * as cptable from 'xlsx/dist/cpexcel.full'
import { parseCount, parseDate, parseDecimal, stablePostId } from './counters.ts'
import type { MediaImportColumn, MediaImportField, MediaImportProfile, MediaPostFields, MediaSnapshotFields } from './adapters/types.ts'
import type { MediaPostFormat } from './types.ts'

XLSX.set_cptable(cptable)

/** Columns every platform shares; adapter columns are matched first. */
export const GENERIC_COLUMNS: readonly MediaImportColumn[] = [
  { field: 'title', synonyms: ['标题', '笔记标题', '作品名称', '作品标题', '文章标题', '内容标题', '视频标题', '作品', '内容'] },
  { field: 'publishedAt', synonyms: ['发布时间', '发表时间', '首次发布时间', '发布日期', '发文时间', '创建时间', '群发时间', '发布于'] },
  { field: 'url', synonyms: ['链接', '作品链接', '笔记链接', '文章链接', '视频链接', 'url', 'link'] },
  { field: 'postId', synonyms: ['笔记id', '作品id', '内容id', '视频id', '文章id', 'id'] },
  { field: 'format', synonyms: ['体裁', '类型', '作品类型', '笔记类型', '内容类型', '内容形式'] },
  { field: 'views', synonyms: ['观看', '观看量', '观看数', '播放', '播放量', '播放次数', '阅读', '阅读数', '阅读量', '阅读次数', '浏览量'] },
  { field: 'likes', synonyms: ['点赞', '点赞数', '点赞量', '点赞次数', '获赞', '喜欢'] },
  { field: 'comments', synonyms: ['评论', '评论数', '评论量', '留言', '留言数'] },
  { field: 'collects', synonyms: ['收藏', '收藏数', '收藏量'] },
  { field: 'shares', synonyms: ['分享', '分享数', '分享量', '分享次数', '转发', '转发数'] },
  { field: 'extra:impressions', synonyms: ['曝光', '曝光量', '曝光数', '展现量'] },
  { field: 'followers', synonyms: ['粉丝', '粉丝数', '粉丝总量', '总粉丝', '总粉丝数', '粉丝总数', '累计粉丝', '累计粉丝数', '粉丝量'] },
  { field: 'extra:newFollowers', synonyms: ['新增粉丝', '新增粉丝数', '新增关注'] },
  { field: 'extra:lostFollowers', synonyms: ['取关粉丝', '流失粉丝', '取消关注'] },
  { field: 'following', synonyms: ['关注数'] },
  { field: 'totalLikes', synonyms: ['获赞与收藏', '总获赞', '累计获赞'] },
  { field: 'date', synonyms: ['日期', '统计日期', '时间'] },
]

const POST_FIELDS: ReadonlySet<MediaImportField> = new Set(['views', 'likes', 'comments', 'collects', 'shares'])
const ACCOUNT_FIELDS: ReadonlySet<MediaImportField> = new Set(['followers', 'following', 'totalLikes'])
const TOTAL_ROW = /^(合计|总计|汇总|total)$/i

/** Snapshot rows of an account-level sheet; `capturedAt` comes from its date column when present. */
export interface ImportedSnapshot {
  readonly capturedAt?: string | undefined
  readonly fields: MediaSnapshotFields
}

/** Everything one export file yielded. */
export interface ParsedImport {
  readonly snapshots: readonly ImportedSnapshot[]
  readonly posts: readonly MediaPostFields[]
  readonly unmappedColumns: readonly string[]
}

/** The file cannot be read or holds no recognizable table. */
export class MediaImportError extends Error {
  override name = 'MediaImportError'
}

/**
 * Normalize a header for matching: lower case, no spaces, no bracketed units.
 * @param header - raw header cell.
 * @returns the comparable form.
 */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[(（[【][^)）\]】]*[)）\]】]/g, '').replace(/[\s_:：*]/g, '')
}

/**
 * Decode a CSV file, preferring UTF-8 and falling back to GB18030 when the bytes are not valid UTF-8.
 * @param bytes - file content.
 * @returns the decoded text without a byte-order mark.
 */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    // Not UTF-8: Chinese creator backends export GBK, which GB18030 decodes as a superset.
    return iconv.decode(Buffer.from(bytes), 'gb18030')
  }
}

type Cell = string | number | boolean | Date | null | undefined

function readRows(fileName: string, bytes: Uint8Array): { readonly name: string; readonly rows: Cell[][] }[] {
  const lower = fileName.toLowerCase()
  const isText = lower.endsWith('.csv') || lower.endsWith('.txt') || lower.endsWith('.tsv')
  let workbook: XLSX.WorkBook
  try {
    workbook = isText
      ? XLSX.read(decodeCsv(bytes), { type: 'string', raw: true, ...lower.endsWith('.tsv') ? { FS: '\t' } : {} })
      : XLSX.read(bytes, { type: 'array' })
  } catch (error) {
    throw new MediaImportError(`无法读取文件：${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const rows = sheet === undefined
      ? []
      : XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false })
    return { name, rows }
  })
}

function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return ''
  return cell instanceof Date ? cell.toISOString() : String(cell).trim()
}

/** Map header cells to fields: exact synonyms first, then the longest synonym a header contains. */
function mapHeader(headers: readonly string[], columns: readonly MediaImportColumn[]): Map<number, MediaImportField> {
  const mapping = new Map<number, MediaImportField>()
  const used = new Set<MediaImportField>()
  const synonyms = columns.flatMap(column => column.synonyms.map(synonym => ({ field: column.field, synonym: normalizeHeader(synonym) })))
  const assign = (match: (header: string, synonym: string) => boolean, ordered: typeof synonyms): void => {
    headers.forEach((raw, index) => {
      const header = normalizeHeader(raw)
      if (header === '' || mapping.has(index)) return
      const hit = ordered.find(entry => !used.has(entry.field) && match(header, entry.synonym))
      if (hit === undefined) return
      mapping.set(index, hit.field)
      used.add(hit.field)
    })
  }
  assign((header, synonym) => header === synonym, synonyms)
  const longestFirst = [...synonyms].sort((a, b) => b.synonym.length - a.synonym.length)
  assign((header, synonym) => synonym.length >= 2 && header.includes(synonym), longestFirst)
  return mapping
}

function formatOf(text: string, fallback: MediaPostFormat): MediaPostFormat {
  if (/视频|video/i.test(text)) return 'video'
  if (/图文|笔记|图集|image/i.test(text)) return 'image'
  if (/文章|article/i.test(text)) return 'article'
  return fallback
}

interface Table {
  readonly headers: readonly string[]
  readonly mapping: Map<number, MediaImportField>
  readonly body: readonly Cell[][]
}

/** The header row is the first of the first ten rows that maps at least two columns. */
function findTable(rows: readonly Cell[][], columns: readonly MediaImportColumn[]): Table | undefined {
  for (let index = 0; index < Math.min(rows.length, 10); index++) {
    const headers = (rows[index] ?? []).map(cellText)
    const mapping = mapHeader(headers, columns)
    if (mapping.size >= 2) return { headers, mapping, body: rows.slice(index + 1) }
  }
  return undefined
}

function rowValues(table: Table, row: readonly Cell[]): Map<MediaImportField, Cell> {
  const values = new Map<MediaImportField, Cell>()
  for (const [index, field] of table.mapping) values.set(field, row[index])
  return values
}

function extrasOf(values: Map<MediaImportField, Cell>): Record<string, number> {
  const extra: Record<string, number> = {}
  for (const [field, cell] of values) {
    if (!field.startsWith('extra:')) continue
    const value = parseDecimal(cell)
    if (value !== undefined) extra[field.slice('extra:'.length)] = value
  }
  return extra
}

function postOf(values: Map<MediaImportField, Cell>, profile: MediaImportProfile): MediaPostFields | undefined {
  const title = cellText(values.get('title'))
  if (title === '' || TOTAL_ROW.test(title)) return undefined
  const url = cellText(values.get('url')) || undefined
  const publishedAt = parseDate(values.get('publishedAt') ?? values.get('date'))
  const count = (field: MediaImportField): number | undefined => parseCount(values.get(field))
  return {
    postId: cellText(values.get('postId')) || stablePostId(url, title, publishedAt),
    title,
    url: url !== undefined && /^https?:\/\//.test(url) ? url : undefined,
    publishedAt,
    format: formatOf(cellText(values.get('format')), profile.defaultFormat),
    views: count('views'),
    likes: count('likes'),
    comments: count('comments'),
    collects: count('collects'),
    shares: count('shares'),
    extra: extrasOf(values),
  }
}

function snapshotOf(values: Map<MediaImportField, Cell>): ImportedSnapshot | undefined {
  const dateCell = values.get('date')
  if (TOTAL_ROW.test(cellText(dateCell))) return undefined
  const fields: MediaSnapshotFields = {
    followers: parseCount(values.get('followers')),
    following: parseCount(values.get('following')),
    likes: parseCount(values.get('totalLikes')),
    extra: extrasOf(values),
  }
  const empty = fields.followers === undefined && fields.following === undefined && fields.likes === undefined
  if (empty && Object.keys(fields.extra).length === 0) return undefined
  return { capturedAt: parseDate(dateCell), fields }
}

/**
 * Parse one export file. Sheets with a title column yield posts; sheets with account counters yield one snapshot per row.
 * @param fileName - original file name; its extension selects CSV decoding.
 * @param bytes - file content.
 * @param profile - the platform's columns and default format.
 * @returns snapshots, posts and the headers no column matched.
 * @throws {MediaImportError} when the file is unreadable or no sheet maps two known columns.
 */
export function parseImportFile(fileName: string, bytes: Uint8Array, profile: MediaImportProfile): ParsedImport {
  const columns = [...profile.columns, ...GENERIC_COLUMNS]
  const snapshots: ImportedSnapshot[] = []
  const posts: MediaPostFields[] = []
  const unmapped = new Set<string>()
  let tables = 0
  for (const sheet of readRows(fileName, bytes)) {
    const table = findTable(sheet.rows, columns)
    if (table === undefined) continue
    const fields = new Set(table.mapping.values())
    const isPosts = fields.has('title') && [...fields].some(field => POST_FIELDS.has(field) || field.startsWith('extra:'))
    const isAccount = !fields.has('title') && [...fields].some(field => ACCOUNT_FIELDS.has(field) || field.startsWith('extra:'))
    if (!isPosts && !isAccount) continue
    tables++
    table.headers.forEach((header, index) => { if (header !== '' && !table.mapping.has(index)) unmapped.add(header) })
    for (const row of table.body) {
      const values = rowValues(table, row)
      if (isPosts) {
        const post = postOf(values, profile)
        if (post !== undefined) posts.push(post)
      } else {
        const snapshot = snapshotOf(values)
        if (snapshot !== undefined) snapshots.push(snapshot)
      }
    }
  }
  if (tables === 0) throw new MediaImportError('文件中没有找到可识别的数据表：请确认它是创作者后台导出的作品数据或粉丝数据表格。')
  const unique = new Map(posts.map(post => [post.postId, post]))
  return { snapshots, posts: [...unique.values()], unmappedColumns: [...unmapped] }
}
