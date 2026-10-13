import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import { makeSaleRow } from './fixtures/factories.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

describe('banco de dados', () => {
  it('listYears retorna anos distintos em ordem crescente', async () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    const rows = [
      makeSaleRow({ year: 2025, value: 100 }),
      makeSaleRow({ year: 2026, value: 200 }),
      makeSaleRow({ year: 2026, value: 300 }),
    ]
    await importWorkbook(db, writeWorkbook(rows))
    expect(db.listYears()).toEqual([2025, 2026])
  })

  it('setMeta/getMeta/clearMeta fazem roundtrip', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    expect(db.getMeta('chave')).toBeNull()
    db.setMeta('chave', 'valor')
    expect(db.getMeta('chave')).toBe('valor')
    db.clearMeta('chave')
    expect(db.getMeta('chave')).toBeNull()
  })

  it('listDisabledSellers é idempotente e reversível', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    expect(db.listDisabledSellers()).toEqual([])
    db.setSellerDisabled('Ana', true)
    db.setSellerDisabled('Ana', true)
    expect(db.listDisabledSellers()).toEqual(['Ana'])
    db.setSellerDisabled('Ana', false)
    expect(db.listDisabledSellers()).toEqual([])
  })

  it('fator padrão 1.15 e setFactor persistem', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    expect(db.getFactor(2026)).toBe(1.15)
    db.setFactor(2026, 1.5)
    expect(db.getFactor(2026)).toBe(1.5)
    db.clearFactor(2026)
    expect(db.getFactor(2026)).toBe(1.15)
  })

  it('unidade da meta persiste e limpa', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    expect(db.getGoalUnit(2026)).toBeNull()
    db.setGoalUnit(2026, 'pct')
    expect(db.getGoalUnit(2026)).toBe('pct')
    db.setGoalUnit(2026, 'brl')
    expect(db.getGoalUnit(2026)).toBe('brl')
    db.setGoalUnit(2026, null)
    expect(db.getGoalUnit(2026)).toBeNull()
  })
})
