import { z } from "zod";

export const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export const mesSchema = z.enum(MESES);
export type Mes = z.infer<typeof mesSchema>;

export const saleSchema = z.object({
  codigo: z.string(),
  data: z.string().nullable(),
  dataAprovOrcamento: z.string().nullable(),
  dataAprovPedido: z.string().nullable(),
  dataAprovFaturamento: z.string().nullable(),
  dataEmissaoFiscal: z.string().nullable(),
  empresa: z.string(),
  statusSistema: z.string(),
  vendedor: z.string(),
  categoria: z.string(),
  status: z.string(),
  origem: z.string(),
  cliente: z.string(),
  cidade: z.string(),
  estado: z.string(),
  regiao: z.string(),
  transportadora: z.string(),
  frete: z.number(),
  desconto: z.number(),
  comissao: z.number(),
  valorTotal: z.number(),
  nfe: z.string(),
  mes: mesSchema.nullable(),
  ano: z.number().nullable(),
});
export type Sale = z.infer<typeof saleSchema>;

export const importResultSchema = z.object({
  filePath: z.string(),
  totalRows: z.number(),
  inserted: z.number(),
  updated: z.number(),
  discarded: z.number(),
});
export type ImportResult = z.infer<typeof importResultSchema>;

export const importRecordSchema = z.object({
  id: z.number(),
  filePath: z.string(),
  totalRows: z.number(),
  inserted: z.number(),
  updated: z.number(),
  discarded: z.number(),
  importedAt: z.string(),
});
export type ImportRecord = z.infer<typeof importRecordSchema>;

export const importCodeEventSchema = z.object({
  importedAt: z.string(),
  op: z.enum(["inserted", "updated"]),
  statusSistema: z.string(),
  valorTotal: z.number(),
  data: z.string().nullable(),
  mes: mesSchema.nullable(),
  ano: z.number().nullable(),
});
export type ImportCodeEvent = z.infer<typeof importCodeEventSchema>;

export const codigoHistorySchema = z.object({
  codigo: z.string(),
  venda: saleSchema.nullable(),
  events: z.array(importCodeEventSchema),
});
export type CodigoHistory = z.infer<typeof codigoHistorySchema>;