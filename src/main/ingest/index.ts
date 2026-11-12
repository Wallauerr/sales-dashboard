import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { isBillingSale } from '../../shared/billing.ts'
import { importResultSchema, saleSchema } from '../../shared/schemas.ts'
import { canonicalRegion, canonicalState } from '../../shared/states.ts'
import type {
  ImportPreview,
  ImportResult,
  Month,
  PendingAddress,
  Sale,
} from '../../shared/types.ts'
import { MONTHS } from '../../shared/types.ts'
import type { SalesDatabase } from '../db/database.ts'
import {
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
  let data: Buffer
  try {
    data = readFileSync(filePath)
  } catch {
    throw new Error(
      'Não foi possível abrir a planilha. Verifique se o arquivo existe e se não está aberto no Excel.',
    )
  }
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(data, { type: 'buffer', cellDates: false })
  } catch {
    throw new Error(
      'Não foi possível ler a planilha. O arquivo pode estar corrompido ou não ser um .xlsx.',
    )
  }
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

export function previewImport(
  db: SalesDatabase,
  filePath: string,
): ImportPreview {
  const rows = readWorkbook(filePath)
  const existing = new Set(
    (
      db.raw.prepare('SELECT codigo FROM vendas').all() as unknown as {
        codigo: string
      }[]
    ).map(r => r.codigo),
  )
  const overrides = db.getAddressOverrides()
  const pending = new Map<string, PendingAddress>()
  const seen = new Set<string>()
  let newCount = 0
  let existingCount = 0
  let discarded = 0

  for (const raw of rows) {
    if (!String(raw.Código ?? '').trim()) {
      discarded += 1
      continue
    }
    let sale = normalizeRow(raw)
    const override = overrides.get(sale.code)
    if (override) {
      sale = { ...sale, state: override.state, region: override.region }
    }
    if (!seen.has(sale.code)) {
      seen.add(sale.code)
      if (existing.has(sale.code)) existingCount += 1
      else newCount += 1
    }
    if (isBillingSale(sale) && (!sale.state || !sale.region)) {
      pending.set(sale.code, {
        code: sale.code,
        customer: sale.customer,
        city: sale.city,
        state: sale.state,
        region: sale.region,
        totalValue: sale.totalValue,
        date: sale.date,
        systemStatus: sale.systemStatus,
      })
    }
  }

  return {
    filePath,
    totalRows: rows.length,
    newCount,
    existingCount,
    discarded,
    pending: [...pending.values()],
  }
}

export async function importWorkbook(
  db: SalesDatabase,
  filePath: string,
): Promise<ImportResult> {
  const rows = readWorkbook(filePath)
  const overrides = db.getAddressOverrides()
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
      let sale = normalizeRow(raw)
      const override = overrides.get(sale.code)
      if (override) {
        db.refreshAddressOverrideOriginals(sale.code, sale.state, sale.region)
        sale = { ...sale, state: override.state, region: override.region }
      }
      const op = db.upsertSale(sale)
      if (op === 'inserted') {
        result.inserted += 1
      } else if (op === 'updated') {
        result.updated += 1
      }
      if (op !== 'unchanged') {
        items.push({
          code: sale.code,
          op,
          systemStatus: sale.systemStatus,
          totalValue: sale.totalValue,
          date: sale.date,
          month: sale.month,
          year: sale.year,
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
