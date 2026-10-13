import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../../src/main/db/database'
import { importWorkbook } from '../../src/main/ingest/index'
import { getSnapshot } from '../../src/main/kpis/index'
import {
  buildKpis,
  periodLabel,
} from '../../src/renderer/src/components/kpi/build-kpis'
import { makeSaleRow } from '../fixtures/factories'
import { writeWorkbook } from '../fixtures/workbook'

function goalSnapshot() {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))
  return importWorkbook(
    db,
    writeWorkbook([
      makeSaleRow({
        code: '1',
        year: 2025,
        month: 0,
        seller: 'Ana',
        value: 1000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '2',
        year: 2025,
        month: 1,
        seller: 'Bia',
        value: 3000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '3',
        year: 2026,
        month: 0,
        seller: 'Ana',
        value: 2000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '4',
        year: 2026,
        month: 0,
        seller: 'Bia',
        value: 500,
        status: 'Pedido',
      }),
      makeSaleRow({
        code: '5',
        year: 2026,
        month: 4,
        seller: 'Ana',
        value: 400,
        status: 'Orçamento',
      }),
    ]),
  ).then(() => db)
}

describe('periodLabel', () => {
  it('rotula 1 mês, até 3 meses e período maior', () => {
    expect(periodLabel([])).toBe('')
    expect(periodLabel(['jan'])).toBe('Jan')
    expect(periodLabel(['jan', 'fev'])).toBe('Jan·Fev')
    expect(periodLabel(['jan', 'fev', 'mar'])).toBe('Jan·Fev·Mar')
    expect(periodLabel(['jan', 'fev', 'mar', 'abr'])).toBe('4 meses')
  })
})

describe('buildKpis', () => {
  it('ano inteiro sem filtros', async () => {
    const db = await goalSnapshot()
    const snap = getSnapshot(db, 2026)
    const { kpis, gridClass } = buildKpis({
      year: 2026,
      months: [],
      sellers: [],
      snap,
    })

    expect(gridClass).toBe('lg:grid-cols-7')
    expect(kpis.map(k => k.title)).toEqual([
      'Faturamento 2026',
      'Meta anual',
      '% da meta',
      'Restante p/ meta',
      'Projeção (run-rate)',
      'Quantidade',
      'Participação',
    ])
    expect(kpis[0].value).toBe('R$\u00A02.500')
    expect(kpis[0].hint).toBe('vs 2025 (Jan–Jan): R$\u00A01\u00A0mil · +150%')
    expect(kpis[1].value).toBe('R$\u00A04.600')
    expect(kpis[1].hint).toBe('base 2025 × 115%')
    expect(kpis[2].value).toBe('54,3%')
    expect(kpis[3].value).toBe('R$\u00A02.100')
    expect(kpis[3].hint).toBe('no acumulado de dez')
    expect(kpis[4].value).toBe('R$\u00A030.000')
    expect(kpis[5].value).toBe('2')
    expect(kpis[5].hint).toBe('vendas no ano')
  })

  it('hint da meta anual acompanha a origem manual', async () => {
    const db = await goalSnapshot()
    db.setAnnualGoal(2026, 4600)
    const snap = getSnapshot(db, 2026)
    const { kpis } = buildKpis({ year: 2026, months: [], sellers: [], snap })

    expect(snap.customGoal).toBe(true)
    expect(kpis[1].title).toBe('Meta anual')
    expect(kpis[1].value).toBe('R$\u00A04.600')
    expect(kpis[1].hint).toBe('base 2025 · meta manual R$\u00A04.600')
  })

  it('meses selecionados trocam meta e hint', async () => {
    const db = await goalSnapshot()
    const snap = getSnapshot(db, 2026)
    const { kpis, gridClass } = buildKpis({
      year: 2026,
      months: ['jan', 'fev'],
      sellers: [],
      snap,
    })

    expect(gridClass).toBe('lg:grid-cols-6')
    expect(kpis.map(k => k.title)).toEqual([
      'Faturamento Jan·Fev 2026',
      'Meta Jan·Fev',
      '% da meta',
      'Restante p/ meta do período',
      'Quantidade',
      'Participação',
    ])
    expect(kpis[0].value).toBe('R$\u00A02.500')
    expect(kpis[0].hint).toBe('Jan·Fev 2025: R$\u00A04\u00A0mil · -37,5%')
    expect(kpis[1].value).toBe('R$\u00A04.600')
    expect(kpis[1].hint).toBe('meta do período (empresa)')
    expect(kpis[2].value).toBe('54,3%')
    expect(kpis[3].value).toBe('R$\u00A02.100')
    expect(kpis[3].hint).toBe('no período')
  })

  it('filtro por vendedor remove meta e run-rate', async () => {
    const db = await goalSnapshot()
    const snap = getSnapshot(db, 2026, { sellers: ['Ana'] })
    const { kpis, gridClass } = buildKpis({
      year: 2026,
      months: [],
      sellers: ['Ana'],
      snap,
    })

    expect(gridClass).toBe('lg:grid-cols-3')
    expect(kpis.map(k => k.title)).toEqual([
      'Faturamento Ana',
      'Quantidade',
      'Participação',
    ])
    expect(kpis[0].value).toBe('R$\u00A02.000')
    expect(kpis[0].hint).toBe('part. 80% do 2026')
    expect(kpis[1].value).toBe('1')
    expect(kpis[1].hint).toBe('vendas de Ana')
  })

  it('sem snapshot devolve só a grade', () => {
    const { kpis, gridClass } = buildKpis({
      year: 2026,
      months: [],
      sellers: [],
      snap: null,
    })
    expect(kpis).toEqual([])
    expect(gridClass).toBe('lg:grid-cols-7')
  })
})
