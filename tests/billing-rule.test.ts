import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import { getSnapshot } from '../src/main/kpis/index.ts'
import type { KpiSnapshot } from '../src/shared/types.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

function billRow(
  codigo: string,
  status: string,
  categoria: string,
  valor: number,
): unknown[] {
  return [
    codigo,
    '05/01/2026',
    '',
    'X',
    status,
    'V1',
    categoria,
    '',
    '',
    codigo,
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    valor,
    '',
  ]
}

async function snapshotWith(rows: unknown[][]): Promise<KpiSnapshot> {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))
  await importWorkbook(db, writeWorkbook(rows))
  return getSnapshot(db, 2026)
}

describe('regra de faturamento', () => {
  it('conta Pedido, Pedido Faturado e S/F fora de remessa/amostra', async () => {
    const s = await snapshotWith([
      billRow('R1', 'Pedido Faturado', '', 1000),
      billRow('R2', 'Pedido', '', 2000),
      billRow('R3', 'Pedido Aprovado Sem Faturamento', 'Remessa', 5000),
      billRow('R4', 'Pedido Aprovado Sem Faturamento', 'Amostra', 3000),
      billRow(
        'R5',
        'Pedido Aprovado Sem Faturamento',
        'Remessa amostra grátis',
        7000,
      ),
      billRow('R6', 'Pedido Aprovado Sem Faturamento', 'Operacional', 400),
      billRow('R7', 'Pedido Aprovado Sem Faturamento', '', 600),
      billRow('R8', 'pedido', '', 800),
      billRow('R9', 'Pedido Cancelado', '', 9000),
      billRow('R10', 'Orçamento', '', 10000),
    ])
    expect(s.billingByMonth.jan).toBe(4800)
    expect(s.periodTotal).toBe(4800)
    expect(s.quantityByMonth.jan).toBe(5)
  })

  it('funil separa cada status em seu balde', async () => {
    const s = await snapshotWith([
      billRow('R1', 'Pedido Faturado', '', 1000),
      billRow('R2', 'Pedido', '', 2000),
      billRow('R3', 'Pedido Aprovado Sem Faturamento', 'Operacional', 400),
      billRow('R9', 'Pedido Cancelado', '', 9000),
      billRow('R10', 'Orçamento', '', 10000),
    ])
    expect(s.funnelByMonth[0]).toMatchObject({
      quote: 1,
      order: 1,
      approvedWithoutInvoicing: 1,
      invoiced: 1,
      cancelled: 1,
    })
  })

  it('normaliza status minúsculo no ingest', async () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    await importWorkbook(db, writeWorkbook([billRow('R8', 'pedido', '', 800)]))
    const stored = db.raw
      .prepare("SELECT status_sistema AS s FROM vendas WHERE codigo = 'R8'")
      .get() as { s: string }
    expect(stored.s).toBe('Pedido')
  })

  it.each([
    ['Remessa'],
    ['Amostra'],
    ['Remessa amostra grátis'],
  ] as const)('categoria %s não entra no faturamento', async categoria => {
    const s = await snapshotWith([
      billRow('X', 'Pedido Aprovado Sem Faturamento', categoria, 1500),
    ])
    expect(s.billingByMonth.jan).toBe(0)
    expect(s.quantityByMonth.jan).toBe(0)
    expect(s.funnelByMonth[0].approvedWithoutInvoicing).toBe(1)
  })

  it.each([
    ['Orçamento'],
    ['Pedido Cancelado'],
  ] as const)('status %s nunca fatura', async status => {
    const s = await snapshotWith([billRow('X', status, '', 1500)])
    expect(s.billingByMonth.jan).toBe(0)
    expect(s.quantityByMonth.jan).toBe(0)
    expect(s.periodTotal).toBe(0)
  })

  it('categoria vazia em S/F conta como faturamento', async () => {
    const s = await snapshotWith([
      billRow('X', 'Pedido Aprovado Sem Faturamento', '', 600),
    ])
    expect(s.billingByMonth.jan).toBe(600)
    expect(s.quantityByMonth.jan).toBe(1)
  })
})
