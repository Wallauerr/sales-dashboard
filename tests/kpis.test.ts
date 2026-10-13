import { DatabaseSync } from 'node:sqlite'
import { beforeAll, describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import {
  getGoalConfig,
  getSnapshot,
  setGoalConfig,
} from '../src/main/kpis/index.ts'
import type { ImportResult } from '../src/shared/types.ts'
import { NO_SELLER_LABEL } from '../src/shared/types.ts'
import { makeSaleRows } from './fixtures/factories.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

const ROWS: unknown[][] = [
  [
    '1',
    '05/01/2025',
    '',
    'X',
    'Pedido Faturado',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'A',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '2',
    '10/02/2025',
    '',
    'X',
    'Pedido Faturado',
    'Rosemeri',
    'Neodimio',
    '',
    '',
    'B',
    'Porto',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '10',
    '15/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'C1',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '11',
    '16/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Rosemeri',
    'Neodimio',
    '',
    '',
    'C2',
    'Porto',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    2000,
    '',
  ],
  [
    '12',
    '17/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Stephani Strack da Silva',
    'Follow-Up',
    '',
    '',
    'C3',
    'Lins',
    'SP',
    'Sudeste',
    '',
    0,
    0,
    0,
    3000,
    '',
  ],
  [
    '13',
    '20/01/2026',
    '20/01/2026',
    'X',
    'Orçamento',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'C4',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    500,
    '',
  ],
  [
    '14',
    '05/02/2026',
    '',
    'X',
    'Pedido',
    'Ursula',
    'Neodimio',
    '',
    '',
    'C5',
    'Curitiba',
    'PR',
    'Sul',
    '',
    0,
    0,
    0,
    4000,
    '',
  ],
]

function labelRow(
  codigo: string,
  estado: string,
  regiao: string,
  vendedor: string,
  valor: number,
): unknown[] {
  return [
    codigo,
    '05/01/2026',
    '',
    'X',
    'Pedido Faturado',
    vendedor,
    'Equipamentos',
    '',
    '',
    codigo,
    'Cidade',
    estado,
    regiao,
    '',
    0,
    0,
    0,
    valor,
    '',
  ]
}

describe('snapshot de kpis e metas', () => {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))
  let result: ImportResult

  beforeAll(async () => {
    result = await importWorkbook(db, writeWorkbook(ROWS))
  })

  it('importa a base e calcula o snapshot 2026', () => {
    expect(result.inserted).toBe(ROWS.length)
    expect(db.listYears()).toEqual([2025, 2026])

    const s = getSnapshot(db, 2026)
    expect(s.periodTotal).toBe(10000)
    expect(s.historyTotal).toBe(12000)
    expect(s.annualGoal).toBe(2300)
    expect(s.quantityByMonth.jan).toBe(3)
    expect(s.quantityByMonth.fev).toBe(1)
    expect(s.billingByMonth.jan).toBe(6000)
    expect(s.billingByMonth.fev).toBe(4000)
    expect(s.funnelByMonth[0]).toMatchObject({ quote: 1, invoiced: 3 })
    expect(s.closingCounts.jan).toEqual({ quote: 1, order: 3 })
    expect(
      s.averageTickets.find(t => t.product === 'Equipamentos')?.ticket,
    ).toBe(1000)
    expect(s.averageTickets.find(t => t.product === 'Follow-Up')?.ticket).toBe(
      3000,
    )
    const sorted = [...s.bySeller].sort((a, b) => b.value - a.value)
    expect(sorted[0]).toEqual({ seller: 'Ursula', value: 4000, share: 0.4 })
  })

  it('metas personalizadas anual, mensal e restauração', () => {
    db.setAnnualGoal(2026, 4600)
    const sAnual = getSnapshot(db, 2026)
    expect(sAnual).toMatchObject({
      annualGoal: 4600,
      annualGoalAuto: 2300,
      customGoal: true,
    })

    const cfg = getGoalConfig(db, 2026)
    expect(cfg).toMatchObject({
      annualCustom: 4600,
      annualGoal: 4600,
      annualGoalAuto: 2300,
      baseYear: 2000,
      factor: 1.15,
    })
    expect(cfg.effectiveGoals.jan).toBe(2300)
    expect(cfg.effectiveGoals.fev).toBe(2300)
    expect(cfg.autoGoals.jan).toBe(1150)

    setGoalConfig(db, 2026, {
      unit: 'brl',
      percent: null,
      annual: null,
      months: { jan: 3000 },
    })
    const sMes = getSnapshot(db, 2026)
    expect(sMes.annualGoal).toBe(4150)
    expect(sMes.monthlyGoals[0].goal).toBe(3000)
    expect(sMes.monthlyGoals[1].goal).toBe(1150)
    expect(getGoalConfig(db, 2026).unit).toBe('brl')
    expect(getGoalConfig(db, 2026).percent).toBeNull()

    setGoalConfig(db, 2026, {
      unit: 'brl',
      percent: null,
      annual: null,
      months: {},
    })
    const sRestaurada = getSnapshot(db, 2026)
    expect(sRestaurada).toMatchObject({
      annualGoal: 2300,
      customGoal: false,
    })
    expect(sRestaurada.monthlyGoals[0].goal).toBe(1150)
    expect(sRestaurada.goalUnit).toBeNull()
    expect(db.getMeta('metas_mes:2026')).toBeNull()
    expect(db.getMeta('meta_anual:2026')).toBeNull()
    expect(db.getGoalUnit(2026)).toBeNull()
  })

  it('meta em percentual único aplica a base de cada mês', () => {
    setGoalConfig(db, 2026, {
      unit: 'pct',
      percent: 120,
      annual: null,
      months: {},
    })
    const sPct = getSnapshot(db, 2026)
    expect(sPct.factor).toBe(1.2)
    expect(sPct.goalUnit).toBe('pct')
    expect(sPct.customGoal).toBe(true)
    expect(sPct.annualGoal).toBe(2400)
    expect(sPct.monthlyGoals[0].goal).toBe(1200)
    expect(sPct.monthlyGoals[1].goal).toBe(1200)
    expect(db.getMeta('meta_anual:2026')).toBeNull()
    expect(db.getMeta('metas_mes:2026')).toBeNull()

    const cfg = getGoalConfig(db, 2026)
    expect(cfg).toMatchObject({
      unit: 'pct',
      percent: 120,
      factor: 1.2,
      annualCustom: null,
      monthsCustom: {},
      annualGoal: 2400,
    })
    expect(cfg.effectiveGoals.jan).toBe(1200)

    setGoalConfig(db, 2026, {
      unit: 'pct',
      percent: null,
      annual: null,
      months: {},
    })
    const sAuto = getSnapshot(db, 2026)
    expect(sAuto).toMatchObject({ annualGoal: 2300, customGoal: false })
    expect(db.getFactor(2026)).toBe(1.15)
    expect(db.getGoalUnit(2026)).toBeNull()
  })

  it('filtros de escopo por meses e vendedores', () => {
    const sUrsula = getSnapshot(db, 2026, { sellers: ['Ursula'] })
    expect(sUrsula.periodTotal).toBe(4000)
    expect(sUrsula.bySeller.some(v => v.seller === 'Ursula')).toBe(true)

    const sFev = getSnapshot(db, 2026, { months: ['fev'] })
    expect(sFev.periodTotal).toBe(4000)
    expect(Object.values(sFev.billingByMonth).filter(v => v > 0)).toHaveLength(
      1,
    )

    const sUrsulaFev = getSnapshot(db, 2026, {
      months: ['fev'],
      sellers: ['Ursula'],
    })
    expect(sUrsulaFev.periodTotal).toBe(4000)

    const sJanFev = getSnapshot(db, 2026, { months: ['jan', 'fev'] })
    expect(sJanFev.periodTotal).toBe(10000)
    expect(
      Object.values(sJanFev.billingByMonth).filter(v => v > 0),
    ).toHaveLength(2)

    const sDuas = getSnapshot(db, 2026, { sellers: ['Ursula', 'Rosemeri'] })
    expect(sDuas.periodTotal).toBe(6000)

    const sDuasMeses = getSnapshot(db, 2026, {
      months: ['jan', 'fev'],
      sellers: ['Ursula', 'Stephani Strack da Silva'],
    })
    expect(sDuasMeses.periodTotal).toBe(7000)
  })
})

describe('vendedores desativados', () => {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))

  beforeAll(async () => {
    await importWorkbook(db, writeWorkbook(ROWS))
  })

  it('caem no VENDAS sem mudar totais', () => {
    expect(db.listDisabledSellers()).toEqual([])
    db.setSellerDisabled('Bruno Keller', true)
    db.setSellerDisabled('Bruno Keller', true)
    expect(db.listDisabledSellers()).toEqual(['Bruno Keller'])
    expect(db.listSellers().includes('Bruno Keller')).toBe(false)
    expect(db.listSellers().includes('Ursula')).toBe(true)

    const s = getSnapshot(db, 2026)
    expect(s.periodTotal).toBe(10000)
    expect(s.bySeller.some(v => v.seller === 'Bruno Keller')).toBe(false)
    expect(s.bySeller.find(v => v.seller === NO_SELLER_LABEL)?.value).toBe(1000)

    const sVendas = getSnapshot(db, 2026, { sellers: [NO_SELLER_LABEL] })
    expect(sVendas.periodTotal).toBe(1000)
    expect(sVendas.bySeller.some(v => v.seller === 'Ursula')).toBe(true)

    db.setSellerDisabled('Bruno Keller', false)
    expect(
      getSnapshot(db, 2026).bySeller.some(v => v.seller === 'Bruno Keller'),
    ).toBe(true)
    const nomes = db.listSellers()
    expect(nomes.includes('VENDAS')).toBe(false)
    expect(nomes.includes('Rosemeri')).toBe(true)
  })
})

describe('rótulos e volume', () => {
  it('rótulos de dados ausentes de UF, região e vendedor', async () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    await importWorkbook(
      db,
      writeWorkbook([
        labelRow('L1', '', '', '', 1200),
        labelRow('L2', 'SP', 'Sudeste', 'Ana', 800),
      ]),
    )
    const s = getSnapshot(db, 2026)
    expect(s.byState.find(e => e.state === 'Não informado')).toEqual({
      state: 'Não informado',
      value: 1200,
      share: 0.6,
    })
    expect(s.byRegion.find(r => r.region === 'Não informado')).toEqual({
      region: 'Não informado',
      value: 1200,
      share: 0.6,
      x: 0,
      y: 0,
    })
    expect(s.bySeller.find(v => v.seller === 'VENDAS')).toEqual({
      seller: 'VENDAS',
      value: 1200,
      share: 0.6,
    })
  })

  it('lote gerado com faker mantém consistência dos agregados', async () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    const rows = makeSaleRows(250, { seed: 20260101 })
    await importWorkbook(db, writeWorkbook(rows))

    const billed = rows.filter(r => {
      const status = String(r[4])
      return (
        status === 'Pedido' ||
        status === 'Pedido Faturado' ||
        status === 'Pedido Aprovado Sem Faturamento'
      )
    })
    const expectedTotal =
      Math.round(billed.reduce((a, r) => a + Number(r[17]), 0) * 100) / 100

    const s = getSnapshot(db, new Date().getFullYear())
    expect(s.periodTotal).toBeCloseTo(expectedTotal, 2)
    expect(
      Object.values(s.billingByMonth).reduce((a, b) => a + b, 0),
    ).toBeCloseTo(s.periodTotal, 2)
    const somaPor = (entradas: { value: number }[]): number =>
      entradas.reduce((a, e) => a + e.value, 0)
    expect(somaPor(s.bySeller)).toBeCloseTo(s.periodTotal, 2)
    expect(somaPor(s.byState)).toBeCloseTo(s.periodTotal, 2)
    expect(somaPor(s.byRegion)).toBeCloseTo(s.periodTotal, 2)
    expect(Object.values(s.quantityByMonth).reduce((a, b) => a + b, 0)).toBe(
      billed.length,
    )
    expect(
      s.funnelByMonth.reduce(
        (a, m) =>
          a +
          m.quote +
          m.order +
          m.approvedWithoutInvoicing +
          m.cancelled +
          m.invoiced +
          m.notInvoiced,
        0,
      ),
    ).toBe(rows.length)
  })
})
