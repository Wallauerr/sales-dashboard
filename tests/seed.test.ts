import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { getGoalConfig, getSnapshot } from '../src/main/kpis/index.ts'
import { seedDatabase } from '../src/main/seed/seed.ts'

async function openDb(): Promise<SalesDatabase> {
  return SalesDatabase.open(new DatabaseSync(':memory:'))
}

const YEAR = 2026

describe('seed de dados fictícios', () => {
  it('é determinístico para a mesma seed', async () => {
    const a = await openDb()
    const b = await openDb()

    await seedDatabase(a, { year: YEAR, seed: 7, count: 60 })
    await seedDatabase(b, { year: YEAR, seed: 7, count: 60 })

    const snapA = getSnapshot(a, YEAR)
    const snapB = getSnapshot(b, YEAR)

    expect(snapA.periodTotal).toBe(snapB.periodTotal)
    expect(snapA.annualGoal).toBe(snapB.annualGoal)
    expect(snapA.bySeller).toEqual(snapB.bySeller)
  })

  it('gera dados para o ano e para o ano anterior', async () => {
    const db = await openDb()
    await seedDatabase(db, { year: YEAR, seed: 7, count: 60 })

    expect(getSnapshot(db, YEAR).periodTotal).toBeGreaterThan(0)
    expect(getSnapshot(db, YEAR - 1).periodTotal).toBeGreaterThan(0)
  })

  it('configura meta percentual e desativa um vendedor', async () => {
    const db = await openDb()
    const result = await seedDatabase(db, { year: YEAR, seed: 7, count: 60 })

    const goal = getGoalConfig(db, YEAR)
    expect(goal.unit).toBe('pct')
    expect(goal.percent).toBe(120)

    expect(result.disabled).toHaveLength(1)
    expect(db.listDisabledSellers()).toEqual(result.disabled)
    expect(db.listSellers()).not.toContain(result.disabled[0])
  })

  it('cadastra foto para os vendedores ativos', async () => {
    const db = await openDb()
    const result = await seedDatabase(db, { year: YEAR, seed: 7, count: 60 })

    const active = result.sellers.filter(s => !result.disabled.includes(s))
    expect(result.photos).toBe(active.length)
    for (const seller of active) {
      const photo = db.getSellerPhoto(seller)
      expect(photo?.mime).toBe('image/png')
      expect(Array.from(photo?.img.subarray(0, 4) ?? [])).toEqual([
        0x89, 0x50, 0x4e, 0x47,
      ])
    }
  })

  it('seeds diferentes geram totais diferentes', async () => {
    const a = await openDb()
    const b = await openDb()

    await seedDatabase(a, { year: YEAR, seed: 7, count: 60 })
    await seedDatabase(b, { year: YEAR, seed: 8, count: 60 })

    expect(getSnapshot(a, YEAR).periodTotal).not.toBe(
      getSnapshot(b, YEAR).periodTotal,
    )
  })
})
