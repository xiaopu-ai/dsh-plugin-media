/** Zod schemas for values read back from the media database and from model output. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { z } from 'zod'
import type {
  MediaAccount, MediaAccountId, MediaAnalysisReport, MediaDraft, MediaDraftId, MediaImprovementItem, MediaBrief, MediaMetricSnapshot,
  MediaPost, MediaRelatedPost, MediaReportId,
  MediaRunRecord, MediaTopicReport, MediaTopicResearch, MediaTopicSuggestion,
} from './types.ts'

const accountId = z.string().min(1).transform(value => brandString<MediaAccountId>(value))
const reportId = z.string().min(1).transform(value => brandString<MediaReportId>(value))
const count = z.number().optional()
const extra = z.record(z.string(), z.number())
const format = z.enum(['image', 'video', 'article', 'other'])
const priority = z.enum(['high', 'medium', 'low'])

/** Stored account. */
export const accountSchema: z.ZodType<MediaAccount> = z.object({
  id: accountId,
  platform: z.string().min(1),
  role: z.enum(['own', 'benchmark']),
  name: z.string(),
  profileUrl: z.string(),
  niche: z.string(),
  notes: z.string(),
  monitor: z.object({ enabled: z.boolean(), intervalMinutes: z.number() }),
  createdAt: z.string(),
  updatedAt: z.string(),
  demo: z.literal(true).optional(),
  loginProfile: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
  avatarUrl: z.string().optional(),
})

/** Stored draft. */
export const draftSchema: z.ZodType<MediaDraft> = z.object({
  id: z.string().min(1).transform(value => brandString<MediaDraftId>(value)),
  source: z.string(),
  kind: z.enum(['video', 'article', 'card']),
  title: z.string(),
  file: z.string().optional(),
  folder: z.string().optional(),
  note: z.string().optional(),
  studioProject: z.string().optional(),
  createdAt: z.string(),
  publishedUrl: z.string().optional(),
  publishedAt: z.string().optional(),
  demo: z.literal(true).optional(),
})

/** Stored snapshot. */
export const snapshotSchema: z.ZodType<MediaMetricSnapshot> = z.object({
  accountId,
  capturedAt: z.string(),
  source: z.enum(['scrape', 'import']),
  followers: count,
  following: count,
  likes: count,
  posts: count,
  extra,
})

/** Stored post. */
export const postSchema: z.ZodType<MediaPost> = z.object({
  accountId,
  postId: z.string().min(1),
  title: z.string(),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  format,
  views: count,
  likes: count,
  comments: count,
  collects: count,
  shares: count,
  coverUrl: z.string().optional(),
  extra,
  source: z.enum(['scrape', 'import']),
  updatedAt: z.string(),
})

/** Stored run. */
export const runSchema: z.ZodType<MediaRunRecord> = z.object({
  accountId,
  kind: z.enum(['scrape', 'import']),
  startedAt: z.string(),
  finishedAt: z.string(),
  ok: z.boolean(),
  errorCode: z.string().optional(),
  message: z.string().optional(),
  postsWritten: z.number(),
})

const text = z.string().catch('')
const texts = z.array(z.string()).catch([])

/** One topic suggestion as the model writes it; unknown enum values fall back instead of failing the report. */
export const modelTopicSuggestionSchema = z.object({
  title: z.string().min(1),
  angle: text,
  reason: text,
  format: format.catch('other'),
  headlines: texts,
  references: texts,
  priority: priority.catch('medium'),
  keywords: texts.default([]),
  // A malformed plan drops the plan, not the suggestion.
  video: z.object({ hook: text, outline: texts, seconds: z.number().nonnegative().catch(0), cover: text }).optional().catch(undefined),
})

/** A platform post found outside the configured accounts. */
export const relatedPostSchema: z.ZodType<MediaRelatedPost> = z.object({
  postId: z.string().min(1),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  coverUrl: z.string().optional(),
  publishedAt: z.string().optional(),
  format,
  views: count,
  likes: count,
  comments: count,
  collects: count,
  shares: count,
})

/** Stored topic suggestion; reports written before keywords and related posts existed read as empty lists. */
export const topicSuggestionSchema: z.ZodType<MediaTopicSuggestion> = modelTopicSuggestionSchema.extend({
  related: z.array(relatedPostSchema).default([]),
})

/** Stored research material of a topic report. */
export const topicResearchSchema: z.ZodType<MediaTopicResearch> = z.object({
  searches: z.array(z.object({ keyword: z.string(), posts: z.array(relatedPostSchema) })),
  trending: z.array(z.object({ word: z.string(), heat: count })),
  news: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string(), publishedAt: z.string().optional() })),
  benchmarksRefreshed: z.number(),
  notes: z.array(z.string()),
})

/** One model improvement item. */
export const improvementSchema: z.ZodType<MediaImprovementItem> = z.object({
  area: text,
  finding: z.string().min(1),
  evidence: text,
  action: text,
  priority: priority.catch('medium'),
})

/** Model output requested by the topic prompt. */
export const topicOutputSchema = z.object({
  summary: text,
  suggestions: z.array(modelTopicSuggestionSchema).min(1),
})

/** Model output requested by the analysis prompt. */
export const analysisOutputSchema = z.object({
  summary: text,
  strengths: texts,
  items: z.array(improvementSchema).min(1),
})

/** Stored topic report. */
export const topicReportSchema: z.ZodType<MediaTopicReport> = z.object({
  id: reportId,
  accountId,
  createdAt: z.string(),
  model: z.string(),
  summary: z.string(),
  suggestions: z.array(topicSuggestionSchema),
  research: topicResearchSchema.optional(),
  direction: z.string().optional(),
})

/** Stored analysis report. */
export const analysisReportSchema: z.ZodType<MediaAnalysisReport> = z.object({
  id: reportId,
  accountId,
  createdAt: z.string(),
  model: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  items: z.array(improvementSchema),
})

/** One line the 今日简报 prompt asks for. */
export const briefLineSchema = z.object({
  kind: z.enum(['alert', 'fact', 'action', 'topic']),
  text: z.string().min(1).max(80),
  detail: z.string().max(600).optional(),
  account: z.string().optional(),
  platform: z.string().optional(),
  work: z.string().optional(),
  metric: z.string().optional(),
})

/** Stored 今日简报. */
export const briefSchema: z.ZodType<MediaBrief> = z.object({
  id: reportId,
  day: z.string(),
  createdAt: z.string(),
  model: z.string(),
  dataAt: z.string().optional(),
  items: z.array(z.object({
    kind: z.enum(['alert', 'fact', 'action', 'topic']),
    text: z.string(),
    accountId: accountId.optional(),
    platform: z.string().optional(),
    detail: z.string().optional(),
    post: z.object({ accountId, postId: z.string() }).optional(),
    metric: z.enum(['followers', 'fansNet', 'views', 'likes', 'comments', 'shares', 'posts']).optional(),
  })),
})
