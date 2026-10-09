import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import {
  canonicalRegion,
  canonicalState,
  monthKey,
  parseDate,
  referenceDate,
  statusRaw,
  titleCase,
} from '../src/main/ingest/normalize.ts'
import { makeSaleRow } from './fixtures/factories.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

async function openDb(): Promise<SalesDatabase> {
  return SalesDatabase.open(new DatabaseSync(':memory:'))
}

const DAY_A = [
  [
    '900',
    '10/05/2026',
    '10/05/2026',
    '',
    'Orçamento',
    'V1',
    'Equipamentos',
    '',
    '',
    'CA',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    5000,
    '',
    '',
    '',
    '',
  ],
  [
    '901',
    '01/01/2026',
    '',
    '',
    'Pedido Faturado',
    'V2',
    'Neodimio',
    '',
    '',
    'CB',
    'Porto',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    2000,
    '',
    '',
    '',
    '',
  ],
]

const DAY_B = [
  [
    '900',
    '12/07/2026',
    '10/05/2026',
    '',
    'Pedido Faturado',
    'V1',
    'Equipamentos',
    '',
    '',
    'CA',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    5000,
    '',
    '',
    '12/07/2026',
    '',
  ],
  [
    '902',
    '11/07/2026',
    '11/07/2026',
    '',
    'Orçamento',
    'V3',
    'Follow-Up',
    '',
    '',
    'CC',
    'Lins',
    'SP',
    'Sudeste',
    '',
    0,
    0,
    0,
    400,
    '',
    '',
    '',
    '',
  ],
]

describe('normalização de dados do SIGE', () => {
  it('titleCase respeita conectivos e nomes em caixa alta', () => {
    expect(titleCase('BRUNO KELLER')).toBe('Bruno Keller')
    expect(titleCase('maria da silva')).toBe('Maria da Silva')
    expect(titleCase('STEPHANI STRACK DA SILVA')).toBe(
      'Stephani Strack da Silva',
    )
  })

  it('parseDate aceita dd/mm/aaaa e ISO', () => {
    expect(monthKey(parseDate('15/01/2026') as Date)).toBe('jan')
    expect(monthKey(parseDate('2026-12-01') as Date)).toBe('dez')
    expect(parseDate('')).toBeNull()
    expect(parseDate(undefined)).toBeNull()
  })

  it('statusRaw normaliza acento e minúscula para o cânone', () => {
    expect(statusRaw('pedido')).toBe('Pedido')
    expect(statusRaw('ORÇAMENTO')).toBe('Orçamento')
    expect(statusRaw('pedido nao faturado')).toBe('Pedido Nao Faturado')
  })

  it('canonicalState e canonicalRegion derivam a região do estado', () => {
    expect(canonicalState(' rs ')).toBe('RS')
    expect(canonicalState('')).toBe('')
    expect(canonicalRegion('RS', '')).toBe('Sul')
    expect(canonicalRegion('', 'SUDESTE')).toBe('Sudeste')
  })

  it('referenceDate usa a data em que a venda chegou no funil', () => {
    const quote = parseDate('10/05/2026')
    const order = parseDate('12/07/2026')
    const billing = parseDate('14/05/2026')
    expect(
      monthKey(
        referenceDate('Pedido Faturado', {
          quote,
          order,
          billing,
          fiscalIssue: null,
          base: null,
        }) as Date,
      ),
    ).toBe('mai')
    expect(
      monthKey(
        referenceDate('Pedido', {
          quote,
          order,
          billing: null,
          fiscalIssue: null,
          base: null,
        }) as Date,
      ),
    ).toBe('jul')
  })
})

describe('ingestão da planilha', () => {
  it('normaliza a linha e deriva mês/ano quando não há cache', async () => {
    const db = await openDb()
    const rows = [
      makeSaleRow({
        code: '900',
        status: 'Orçamento',
        seller: 'vendedor',
        state: 'rs',
        value: 500,
        month: 4,
        year: 2026,
      }),
    ]
    await importWorkbook(db, writeWorkbook(rows))
    expect(db.getCodeHistory('900').sale).toMatchObject({
      systemStatus: 'Orçamento',
      seller: 'Vendedor',
      state: 'RS',
      region: 'Sul',
      month: 'mai',
      year: 2026,
      totalValue: 500,
    })
  })

  it('descarta linhas sem código e conta como discard', async () => {
    const db = await openDb()
    const rows = [
      makeSaleRow({ code: '900', value: 100 }),
      makeSaleRow({ code: '', value: 200 }),
    ]
    const result = await importWorkbook(db, writeWorkbook(rows))
    expect(result).toMatchObject({ totalRows: 2, inserted: 1, discarded: 1 })
  })
})

describe('reconciliação diária por código e histórico', () => {
  it('orçamento evolui para pedido sem duplicar linha', async () => {
    const db = await openDb()
    const dayA = writeWorkbook(DAY_A)
    const dayB = writeWorkbook(DAY_B)

    const rA = await importWorkbook(db, dayA)
    expect(rA.inserted).toBe(2)
    const rB = await importWorkbook(db, dayB)
    expect(rB).toMatchObject({ inserted: 1, updated: 1 })
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM vendas').get() as {
      n: number
    }
    expect(count.n).toBe(3)

    const code = db.getCodeHistory('900').sale
    expect(code).toMatchObject({
      systemStatus: 'Pedido Faturado',
      totalValue: 5000,
      billingApprovedDate: expect.any(String),
    })
  })

  it('registra log de imports em ordem e evolução do código', async () => {
    const db = await openDb()
    await importWorkbook(db, writeWorkbook(DAY_A))
    await importWorkbook(db, writeWorkbook(DAY_B))

    const imports = db.listImports()
    expect(imports).toHaveLength(2)
    expect(imports[1]).toMatchObject({
      totalRows: 2,
      inserted: 2,
      updated: 0,
      discarded: 0,
    })
    expect(imports[0]).toMatchObject({ totalRows: 2, inserted: 1, updated: 1 })

    const h900 = db.getCodeHistory('900')
    expect(h900.events.map(e => `${e.op}:${e.systemStatus}`)).toEqual([
      'inserted:Orçamento',
      'updated:Pedido Faturado',
    ])
    expect(h900.events[0]).toMatchObject({
      totalValue: 5000,
      month: 'mai',
      year: 2026,
    })
    expect(db.getCodeHistory('901').events).toHaveLength(1)
    expect(db.getCodeHistory('999').sale).toBeNull()
    expect(db.getCodeHistory('999').events).toHaveLength(0)
  })
})
