import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { importResultSchema, saleSchema } from '../../shared/schemas.ts'
import type { ImportResult, Mes, Sale } from '../../shared/types.ts'
import { MESES } from '../../shared/types.ts'
import type { SalesDatabase } from '../db/database.ts'
import {
  canonicalEstado,
  canonicalRegion,
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
  const data = parseDate(raw.Data)
  const dataAprovOrcamento = parseDate(raw['Data Aprov Orçamento'] ?? '')
  const dataAprovPedido = parseDate(raw['Data Aprov Pedido'])
  const dataAprovFaturamento = parseDate(raw['Data Aprov Faturamento'])
  const dataEmissaoFiscal = parseDate(raw['Data Emissão Fiscal'])
  const estado = canonicalEstado(String(raw.Estado ?? ''))
  const regiao = canonicalRegion(estado, String(raw.Região ?? ''))

  const mesCache = String(raw.Mês ?? '').trim() as Mes
  const anoCache = raw.Ano as number
  const cacheValido =
    (MESES as readonly string[]).includes(mesCache) &&
    Number.isInteger(anoCache) &&
    anoCache >= 2000 &&
    anoCache <= 2099
  const dEng = referenceDate(statusRaw(String(raw['Status Sistema'] ?? '')), {
    orcamento: dataAprovOrcamento,
    pedido: dataAprovPedido,
    faturamento: dataAprovFaturamento,
    emissaoFiscal: dataEmissaoFiscal,
    base: data,
  })
  const mes: Mes | null = cacheValido ? mesCache : dEng ? monthKey(dEng) : null
  const ano: number | null = cacheValido
    ? anoCache
    : dEng
      ? dEng.getFullYear()
      : null

  return saleSchema.parse({
    codigo: String(raw.Código).trim(),
    data: data ? toISO(data) : null,
    dataAprovOrcamento: dataAprovOrcamento ? toISO(dataAprovOrcamento) : null,
    dataAprovPedido: dataAprovPedido ? toISO(dataAprovPedido) : null,
    dataAprovFaturamento: dataAprovFaturamento
      ? toISO(dataAprovFaturamento)
      : null,
    dataEmissaoFiscal: dataEmissaoFiscal ? toISO(dataEmissaoFiscal) : null,
    empresa: uppercase(String(raw.Empresa ?? '')),
    statusSistema: statusRaw(String(raw['Status Sistema'] ?? '')),
    vendedor: titleCase(String(raw.Vendedor ?? '')),
    categoria: String(raw.Categoria ?? '').trim(),
    status: String(raw.Status ?? '').trim(),
    origem: String(raw.Origem ?? '').trim(),
    cliente: String(raw.Cliente ?? '').trim(),
    cidade: String(raw.Cidade ?? '').trim(),
    estado,
    regiao,
    transportadora: String(raw.Transportadora ?? '').trim(),
    frete: Number(raw['Frete (R$)']) || 0,
    desconto: Number(raw['Desconto (R$)']) || 0,
    comissao: Number(raw['Comissão (R$)']) || 0,
    valorTotal: Number(raw['Valor Total(R$)']) || 0,
    nfe: String(raw['NF-e/NFS-e'] ?? '').trim(),
    mes,
    ano,
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
    codigo: string
    op: 'inserted' | 'updated'
    statusSistema: string
    valorTotal: number
    data: string | null
    mes: string | null
    ano: number | null
  }[] = []

  db.raw.exec('BEGIN')
  try {
    for (const raw of rows) {
      // Linhas sem código (lixo/artefatos da planilha) não têm como reconciliar:
      // são descartadas para não duplicar a cada reimport.
      if (!String(raw.Código ?? '').trim()) {
        result.discarded += 1
        continue
      }
      // Reconciliação por codigo (número sequencial do orçamento/pedido no SIGE):
      // codigo novo -> insere; existente -> atualiza status/campos. Nada é apagado,
      // então um orçamento que evolui para pedido nunca duplica nas métricas.
      const nr = normalizeRow(raw)
      const op = db.upsertSale(nr)
      if (op === 'inserted') {
        result.inserted += 1
      } else if (op === 'updated') {
        result.updated += 1
      }
      if (op !== 'unchanged') {
        items.push({
          codigo: nr.codigo,
          op,
          statusSistema: nr.statusSistema,
          valorTotal: nr.valorTotal,
          data: nr.data,
          mes: nr.mes,
          ano: nr.ano,
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
