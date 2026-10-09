import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { importResultSchema, saleSchema } from '../../shared/schemas.ts'
import type { ImportResult, Month, Sale } from '../../shared/types.ts'
import { MONTHS } from '../../shared/types.ts'
import type { SalesDatabase } from '../db/database.ts'
import {
  canonicalRegion,
  canonicalState,
  monthKey,
  parseDate,
  referenceDate,
  statusRaw,
  titleCase,
  toISO,
  uppercase,
} from './normalize.ts'

interface RawBaseRow {
  Código: string
  Data?: string
  'Data Aprov Orçamento'?: string
  'Data Aprov Pedido'?: string
  'Data Aprov Faturamento'?: string
  'Data Emissão Fiscal'?: string
  Empresa?: string
  'Status Sistema'?: string
  Vendedor?: string
  Categoria?: string
  Status?: string
  Origem?: string
  Cliente?: string
  Cidade?: string
  Estado?: string
  Região?: string
  Transportadora?: string
  'Frete (R$)'?: number
  'Desconto (R$)'?: number
  'Comissão (R$)'?: number
  'Valor Total(R$)'?: number
  'NF-e/NFS-e'?: string
  Mês?: string
  Ano?: number
  Quantidade?: number
}

function readBaseSheet(
  ws: XLSX.WorkSheet,
  filePath: string,
  requireHeader: boolean,
): RawBaseRow[] | null {
  const rows = XLSX.utils.sheet_to_json<RawBaseRow>(ws, { defval: '' })
  if (requireHeader && rows.length > 0 && !('Código' in rows[0])) return null
  if (rows.length === 0) {
    const head = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      defval: '',
      header: 1,
    })
    const first = head[0]
    if (first && String(first[0] ?? '').trim() === 'Código') {
      throw new Error(`Planilha "Base" vazia em ${filePath}`)
    }
    return null
  }
  return rows
}

function readSigeReport(ws: XLSX.WorkSheet): RawBaseRow[] | null {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  const headerIdx = aoa.findIndex(
    row => String(row[0] ?? '').trim() === 'Código',
  )
  if (headerIdx < 0) return null
  const header = aoa[headerIdx]
  const idx: Record<string, number> = {}
  header.forEach((name, i) => {
    const key = String(name ?? '').trim()
    if (key) idx[key] = i
  })
  const rows: RawBaseRow[] = []
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const cells = aoa[r]
    const codigo = String(cells[0] ?? '').trim()
    if (!codigo) continue
    const raw = { Código: codigo } as unknown as Record<string, unknown>
    for (const [name, i] of Object.entries(idx)) {
      if (name === 'Código') continue
      raw[name] = cells[i]
    }
    rows.push(raw as unknown as RawBaseRow)
  }
  return rows
}

function readWorkbook(filePath: string): RawBaseRow[] {
  const wb = XLSX.read(readFileSync(filePath), {
    type: 'buffer',
    cellDates: false,
  })
  if (wb.Sheets.Base) {
    const rows = readBaseSheet(wb.Sheets.Base, filePath, true)
    if (rows) return rows
  }
  for (const name of wb.SheetNames) {
    const rows = readSigeReport(wb.Sheets[name])
    if (rows) return rows
  }
  throw new Error(
    `Formato não reconhecido em ${filePath}. Esperado a aba "Base" ou um relatório de pedidos do SIGE (colunas Código/Data).`,
  )
}

function normalizeRow(raw: RawBaseRow): Sale {
  const date = parseDate(raw.Data)
  const quoteApproved = parseDate(raw['Data Aprov Orçamento'] ?? '')
  const orderApproved = parseDate(raw['Data Aprov Pedido'])
  const billingApproved = parseDate(raw['Data Aprov Faturamento'])
  const fiscalIssue = parseDate(raw['Data Emissão Fiscal'])
  const state = canonicalState(String(raw.Estado ?? ''))
  const region = canonicalRegion(state, String(raw.Região ?? ''))

  const monthCache = String(raw.Mês ?? '').trim() as Month
  const yearCache = raw.Ano as number
  const cacheValid =
    (MONTHS as readonly string[]).includes(monthCache) &&
    Number.isInteger(yearCache) &&
    yearCache >= 2000 &&
    yearCache <= 2099
  const refDate = referenceDate(
    statusRaw(String(raw['Status Sistema'] ?? '')),
    {
      quote: quoteApproved,
      order: orderApproved,
      billing: billingApproved,
      fiscalIssue,
      base: date,
    },
  )
  const month: Month | null = cacheValid
    ? monthCache
    : refDate
      ? monthKey(refDate)
      : null
  const year: number | null = cacheValid
    ? yearCache
    : refDate
      ? refDate.getFullYear()
      : null

  return saleSchema.parse({
    code: String(raw.Código).trim(),
    date: date ? toISO(date) : null,
    quoteApprovedDate: quoteApproved ? toISO(quoteApproved) : null,
    orderApprovedDate: orderApproved ? toISO(orderApproved) : null,
    billingApprovedDate: billingApproved ? toISO(billingApproved) : null,
    fiscalIssueDate: fiscalIssue ? toISO(fiscalIssue) : null,
    company: uppercase(String(raw.Empresa ?? '')),
    systemStatus: statusRaw(String(raw['Status Sistema'] ?? '')),
    seller: titleCase(String(raw.Vendedor ?? '')),
    category: String(raw.Categoria ?? '').trim(),
    status: String(raw.Status ?? '').trim(),
    origin: String(raw.Origem ?? '').trim(),
    customer: String(raw.Cliente ?? '').trim(),
    city: String(raw.Cidade ?? '').trim(),
    state,
    region,
    carrier: String(raw.Transportadora ?? '').trim(),
    freight: Number(raw['Frete (R$)']) || 0,
    discount: Number(raw['Desconto (R$)']) || 0,
    commission: Number(raw['Comissão (R$)']) || 0,
    totalValue: Number(raw['Valor Total(R$)']) || 0,
    invoice: String(raw['NF-e/NFS-e'] ?? '').trim(),
    month,
    year,
  })
}

export async function importWorkbook(
  db: SalesDatabase,
  filePath: string,
): Promise<ImportResult> {
  const rows = readWorkbook(filePath)
  const result: ImportResult = {
    filePath,
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    discarded: 0,
  }
  const items: {
    code: string
    op: 'inserted' | 'updated'
    systemStatus: string
    totalValue: number
    date: string | null
    month: string | null
    year: number | null
  }[] = []

  db.raw.exec('BEGIN')
  try {
    for (const raw of rows) {
      if (!String(raw.Código ?? '').trim()) {
        result.discarded += 1
        continue
      }
      // O código do SIGE é sequencial e não muda quando o orçamento vira
      // pedido, então a reconciliação nunca apaga linha.
      const nr = normalizeRow(raw)
      const op = db.upsertSale(nr)
      if (op === 'inserted') {
        result.inserted += 1
      } else if (op === 'updated') {
        result.updated += 1
      }
      if (op !== 'unchanged') {
        items.push({
          code: nr.code,
          op,
          systemStatus: nr.systemStatus,
          totalValue: nr.totalValue,
          date: nr.date,
          month: nr.month,
          year: nr.year,
        })
      }
    }
    const importId = db.logImport(result)
    for (const item of items) db.insertImportItem({ importId, ...item })
    db.raw.exec('COMMIT')
  } catch (err) {
    db.raw.exec('ROLLBACK')
    throw err
  }

  return importResultSchema.parse(result)
}
