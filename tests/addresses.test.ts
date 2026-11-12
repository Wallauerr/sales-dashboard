import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook, previewImport } from '../src/main/ingest/index.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

function openDb(): SalesDatabase {
  return SalesDatabase.open(new DatabaseSync(':memory:'))
}

function row(overrides: {
  code: string
  status?: string
  category?: string
  customer?: string
  city?: string
  state?: string
  region?: string
  value?: number
}): unknown[] {
  const status = overrides.status ?? 'Pedido Faturado'
  const billing = status === 'Pedido Faturado'
  return [
    overrides.code,
    '10/05/2026',
    '',
    'X',
    status,
    'V1',
    overrides.category ?? 'Equipamentos',
    '',
    '',
    overrides.customer ?? `Cliente ${overrides.code}`,
    overrides.city ?? '',
    overrides.state ?? '',
    overrides.region ?? '',
    '',
    0,
    0,
    0,
    overrides.value ?? 1000,
    '',
    billing ? '10/05/2026' : '',
    billing ? '10/05/2026' : '',
    '',
  ]
}

describe('prévia do import', () => {
  it('lista só pedidos faturados sem UF/região', () => {
    const db = openDb()
    const file = writeWorkbook([
      row({ code: '1', customer: 'Alfa' }),
      row({ code: '2', customer: 'Beta', state: 'RS', region: 'Sul' }),
      row({ code: '3', status: 'Orçamento', customer: 'Gama' }),
      row({ code: '4', status: 'Pedido Cancelado', customer: 'Delta' }),
      row({
        code: '5',
        status: 'Pedido Aprovado Sem Faturamento',
        category: 'Remessa',
        customer: 'Epsilon',
      }),
      row({ code: '6', status: 'Pedido', customer: 'Zeta' }),
    ])

    const preview = previewImport(db, file)

    expect(preview.totalRows).toBe(6)
    expect(preview.newCount).toBe(6)
    expect(preview.existingCount).toBe(0)
    expect(preview.pending.map(p => p.code)).toEqual(['1', '6'])
    expect(preview.pending[0]).toMatchObject({
      customer: 'Alfa',
      totalValue: 1000,
      systemStatus: 'Pedido Faturado',
    })
  })

  it('separa pedidos novos de existentes', async () => {
    const db = openDb()
    await importWorkbook(db, writeWorkbook([row({ code: '1' })]))

    const preview = previewImport(
      db,
      writeWorkbook([row({ code: '1' }), row({ code: '2' })]),
    )

    expect(preview.newCount).toBe(1)
    expect(preview.existingCount).toBe(1)
  })

  it('ignora linhas sem código', () => {
    const db = openDb()
    const preview = previewImport(db, writeWorkbook([row({ code: '' })]))

    expect(preview.discarded).toBe(1)
    expect(preview.pending).toHaveLength(0)
  })
})

describe('correções de endereço', () => {
  it('salva o override, corrige a venda e some da pendência', async () => {
    const db = openDb()
    await importWorkbook(
      db,
      writeWorkbook([
        row({ code: '1', customer: 'Alfa', city: 'Alegre' }),
        row({ code: '2', customer: 'Alfa' }),
        row({ code: '3', customer: 'Beta' }),
      ]),
    )
    expect(db.listPendingAddresses().map(p => p.code)).toEqual(['1', '2', '3'])

    const saved = db.saveAddressOverrides([
      { code: '1', state: 'rs' },
      { code: '2', state: 'rs' },
    ])

    expect(saved).toBe(2)
    expect(db.listPendingAddresses().map(p => p.code)).toEqual(['3'])
    const stored = db.raw
      .prepare("SELECT cidade, estado, regiao FROM vendas WHERE codigo = '1'")
      .get()
    expect(stored).toMatchObject({
      cidade: 'Alegre',
      estado: 'RS',
      regiao: 'Sul',
    })
    expect(db.getAddressOverride('1')).toEqual({ state: 'RS', region: 'Sul' })
  })

  it('ignora UF inválida', async () => {
    const db = openDb()
    await importWorkbook(db, writeWorkbook([row({ code: '1' })]))

    expect(db.saveAddressOverrides([{ code: '1', state: 'ZZ' }])).toBe(0)
    expect(db.getAddressOverrides().size).toBe(0)
    expect(db.listPendingAddresses()).toHaveLength(1)
  })

  it('reaplica o override quando o SIGE volta sem endereço', async () => {
    const db = openDb()
    const file = writeWorkbook([row({ code: '1' })])
    await importWorkbook(db, file)
    db.saveAddressOverrides([{ code: '1', state: 'RS' }])

    await importWorkbook(db, file)

    const stored = db.raw
      .prepare("SELECT cidade, estado, regiao FROM vendas WHERE codigo = '1'")
      .get()
    expect(stored).toMatchObject({
      cidade: '',
      estado: 'RS',
      regiao: 'Sul',
    })
  })

  it('não pede endereço já coberto por override', () => {
    const db = openDb()
    db.saveAddressOverrides([{ code: '1', state: 'RS' }])

    const preview = previewImport(db, writeWorkbook([row({ code: '1' })]))

    expect(preview.pending).toHaveLength(0)
  })
})

describe('edição de pedido já preenchido', () => {
  it('troca a UF e restaura o valor da planilha ao limpar o override', async () => {
    const db = openDb()
    await importWorkbook(
      db,
      writeWorkbook([row({ code: '1', state: 'SP', region: 'Sudeste' })]),
    )
    expect(db.listPendingAddresses()).toHaveLength(0)

    db.saveAddressOverrides([{ code: '1', state: 'rs' }])

    expect(db.findSaleByCode('1')).toMatchObject({
      state: 'RS',
      region: 'Sul',
    })
    expect(db.getAddressOverride('1')).toEqual({ state: 'RS', region: 'Sul' })

    expect(db.clearAddressOverride('1')).toBe(true)
    expect(db.getAddressOverride('1')).toBeNull()
    expect(db.findSaleByCode('1')).toMatchObject({
      state: 'SP',
      region: 'Sudeste',
    })
    expect(db.clearAddressOverride('1')).toBe(false)
  })

  it('atualiza o valor original quando a planilha muda', async () => {
    const db = openDb()
    await importWorkbook(
      db,
      writeWorkbook([row({ code: '1', state: 'SP', region: 'Sudeste' })]),
    )
    db.saveAddressOverrides([{ code: '1', state: 'RS' }])

    await importWorkbook(
      db,
      writeWorkbook([row({ code: '1', state: 'PR', region: 'Sul' })]),
    )
    expect(db.findSaleByCode('1')).toMatchObject({
      state: 'RS',
      region: 'Sul',
    })

    db.clearAddressOverride('1')
    expect(db.findSaleByCode('1')).toMatchObject({
      state: 'PR',
      region: 'Sul',
    })
  })

  it('preserva o override original ao corrigir de novo', async () => {
    const db = openDb()
    await importWorkbook(
      db,
      writeWorkbook([row({ code: '1', state: 'SP', region: 'Sudeste' })]),
    )

    db.saveAddressOverrides([{ code: '1', state: 'RS' }])
    db.saveAddressOverrides([{ code: '1', state: 'PR' }])
    db.clearAddressOverride('1')

    expect(db.findSaleByCode('1')).toMatchObject({
      state: 'SP',
      region: 'Sudeste',
    })
  })
})

describe('migração do schema', () => {
  it('adiciona as colunas originais em bancos v10', () => {
    const raw = new DatabaseSync(':memory:')
    raw.exec(`
      CREATE TABLE sale_address_override (
        codigo TEXT PRIMARY KEY,
        cidade TEXT NOT NULL DEFAULT '',
        estado TEXT NOT NULL DEFAULT '',
        regiao TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO sale_address_override (codigo, cidade, estado, regiao)
      VALUES ('1', 'Alegre', 'RS', 'Sul');
      PRAGMA user_version = 10;
    `)

    const db = SalesDatabase.open(raw)
    const cols = (
      raw.prepare('PRAGMA table_info(sale_address_override)').all() as {
        name: string
      }[]
    ).map(c => c.name)

    expect(cols).toContain('estado_original')
    expect(cols).toContain('regiao_original')
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({
      user_version: 11,
    })
    expect(db.getAddressOverride('1')).toEqual({ state: 'RS', region: 'Sul' })
  })
})
