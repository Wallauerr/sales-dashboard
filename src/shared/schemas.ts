import { z } from 'zod'

export const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

export const monthSchema = z.enum(MONTHS)
export type Month = z.infer<typeof monthSchema>

export const saleSchema = z.object({
  code: z.string(),
  date: z.string().nullable(),
  quoteApprovedDate: z.string().nullable(),
  orderApprovedDate: z.string().nullable(),
  billingApprovedDate: z.string().nullable(),
  fiscalIssueDate: z.string().nullable(),
  company: z.string(),
  systemStatus: z.string(),
  seller: z.string(),
  category: z.string(),
  status: z.string(),
  origin: z.string(),
  customer: z.string(),
  city: z.string(),
  state: z.string(),
  region: z.string(),
  carrier: z.string(),
  freight: z.number(),
  discount: z.number(),
  commission: z.number(),
  totalValue: z.number(),
  invoice: z.string(),
  month: monthSchema.nullable(),
  year: z.number().nullable(),
})
export type Sale = z.infer<typeof saleSchema>

export const importResultSchema = z.object({
  filePath: z.string(),
  totalRows: z.number(),
  inserted: z.number(),
  updated: z.number(),
  discarded: z.number(),
})
export type ImportResult = z.infer<typeof importResultSchema>

export const importRecordSchema = z.object({
  id: z.number(),
  filePath: z.string(),
  totalRows: z.number(),
  inserted: z.number(),
  updated: z.number(),
  discarded: z.number(),
  importedAt: z.string(),
})
export type ImportRecord = z.infer<typeof importRecordSchema>

export const importCodeEventSchema = z.object({
  importedAt: z.string(),
  op: z.enum(['inserted', 'updated']),
  systemStatus: z.string(),
  totalValue: z.number(),
  date: z.string().nullable(),
  month: monthSchema.nullable(),
  year: z.number().nullable(),
})
export type ImportCodeEvent = z.infer<typeof importCodeEventSchema>

export const codeHistorySchema = z.object({
  code: z.string(),
  sale: saleSchema.nullable(),
  events: z.array(importCodeEventSchema),
})
export type CodeHistory = z.infer<typeof codeHistorySchema>

const moneyValue = z
  .number()
  .nonnegative()
  .refine(
    v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
    'Use até duas casas decimais.',
  )

const percentValue = z
  .number()
  .nonnegative()
  .max(1000)
  .refine(
    v => Math.abs(v - Math.round(v * 10) / 10) < 1e-6,
    'Use até uma casa decimal.',
  )

export const goalSetInputSchema = z.object({
  unit: z.enum(['pct', 'brl']),
  percent: percentValue.nullable().default(null),
  annual: moneyValue.nullable().default(null),
  months: z.object(
    Object.fromEntries(MONTHS.map(month => [month, moneyValue.optional()])),
  ),
})
export type GoalSetInput = z.infer<typeof goalSetInputSchema>

export const sellerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(v => !v.includes('/'), 'Nome de vendedor inválido.')
