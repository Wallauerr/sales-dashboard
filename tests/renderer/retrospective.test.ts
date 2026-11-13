import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../../src/main/db/database'
import { importWorkbook } from '../../src/main/ingest/index'
import { getSnapshot } from '../../src/main/kpis/index'
import { buildRetrospective } from '../../src/renderer/src/lib/retrospective'
import { makeSaleRow } from '../fixtures/factories'
import { writeWorkbook } from '../fixtures/workbook'

async function retrospective() {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))
  await importWorkbook(
    db,
    writeWorkbook([
      makeSaleRow({
        code: '1',
        year: 2025,
        month: 0,
        seller: 'Ana',
        state: 'SP',
        value: 1000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '2',
        year: 2025,
        month: 1,
        seller: 'Bia',
        state: 'RS',
        value: 3000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '3',
        year: 2026,
        month: 0,
        seller: 'Ana',
        state: 'SP',
        value: 1000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '4',
        year: 2026,
        month: 1,
        seller: 'Bia',
        state: 'RS',
        value: 3000,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '5',
        year: 2026,
        month: 1,
        seller: 'Ana',
        state: 'SP',
        value: 500,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '6',
        year: 2026,
        month: 2,
        seller: '',
        state: '',
        value: 250,
        status: 'Pedido Faturado',
      }),
      makeSaleRow({
        code: '7',
        year: 2026,
        month: 2,
        seller: 'Bia',
        state: 'RS',
        value: 250,
        status: 'Orçamento',
      }),
      makeSaleRow({
        code: '8',
        year: 2026,
        month: 3,
        seller: 'Ana',
        state: 'SP',
        value: 300,
        status: 'Pedido Cancelado',
      }),
      makeSaleRow({
        code: '9',
        year: 2026,
        month: 0,
        seller: 'Carla',
        state: 'PR',
        value: 200,
        status: 'Pedido Faturado',
      }),
    ]),
  )
  return buildRetrospective(getSnapshot(db, 2026))
}

describe('buildRetrospective', () => {
  it('resume o ano com meta, crescimento e ticket', async () => {
    const data = await retrospective()

    expect(data.year).toBe(2026)
    expect(data.total).toBe(4950)
    expect(data.goal).toBe(4600)
    expect(data.goalPct).toBeCloseTo(4950 / 4600)
    expect(data.previousYear).toBe(4000)
    expect(data.growth).toBeCloseTo(0.2375)
    expect(data.quantity).toBe(5)
    expect(data.averageTicket).toBeCloseTo(990)
  })

  it('aponta o melhor mês e os três maiores', async () => {
    const data = await retrospective()

    expect(data.bestMonth).toMatchObject({
      month: 'fev',
      label: 'Fevereiro',
      value: 3500,
    })
    expect(data.topMonths.map(month => month.label)).toEqual([
      'Fevereiro',
      'Janeiro',
      'Março',
    ])
    expect(data.topMonths.map(month => month.value)).toEqual([3500, 1200, 250])
  })

  it('rankeia vendedores sem incluir VENDAS', async () => {
    const data = await retrospective()

    expect(data.topSellers.map(seller => seller.label)).toEqual([
      'Bia',
      'Ana',
      'Carla',
    ])
    expect(data.topSellers[0].value).toBe(3000)
    expect(data.topSellers[0].share).toBeCloseTo(3000 / 4950)
  })

  it('rankeia regiões e estados sem incluir Não informado', async () => {
    const data = await retrospective()

    expect(data.topRegions.map(region => region.label)).toEqual([
      'Sul',
      'Sudeste',
    ])
    expect(data.topRegions[0].value).toBe(3200)
    expect(data.topStates.map(state => state.label)).toEqual(['RS', 'SP', 'PR'])
    expect(data.topStates.map(state => state.value)).toEqual([3000, 1500, 200])
  })

  it('agrega o funil do ano', async () => {
    const data = await retrospective()

    expect(data.funnel).toEqual({
      quotes: 1,
      orders: 0,
      invoiced: 5,
      cancelled: 1,
    })
  })

  it('lida com ano sem vendas', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    const data = buildRetrospective(getSnapshot(db, 2026))

    expect(data.bestMonth).toBeNull()
    expect(data.topMonths).toEqual([])
    expect(data.topSellers).toEqual([])
    expect(data.topRegions).toEqual([])
    expect(data.topStates).toEqual([])
    expect(data.goalPct).toBeNull()
    expect(data.growth).toBeNull()
    expect(data.averageTicket).toBe(0)
    expect(data.funnel).toEqual({
      quotes: 0,
      orders: 0,
      invoiced: 0,
      cancelled: 0,
    })
  })
})
