import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as XLSX from 'xlsx'

export const HEADERS = [
  'Código',
  'Data',
  'Data Aprov Orçamento',
  'Empresa',
  'Status Sistema',
  'Vendedor',
  'Categoria',
  'Status',
  'Origem',
  'Cliente',
  'Cidade',
  'Estado',
  'Região',
  'Transportadora',
  'Frete (R$)',
  'Desconto (R$)',
  'Comissão (R$)',
  'Valor Total(R$)',
  'NF-e/NFS-e',
  'Data Aprov Pedido',
  'Data Aprov Faturamento',
  'Data Emissão Fiscal',
]

export function writeWorkbook(rows: unknown[][]): string {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Base')
  const filePath = join(
    tmpdir(),
    `test-base-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`,
  )
  writeFileSync(filePath, XLSX.write(wb, { type: 'buffer' }))
  return filePath
}
