import { unlinkSync } from 'node:fs'
import { fakerPT_BR as faker } from '@faker-js/faker'
import type { SalesDatabase } from '../db/database.ts'
import { resetImportedData } from '../db/maintenance.ts'
import { importWorkbook } from '../ingest/index.ts'
import { makeSaleRow, withSeed } from './factories.ts'
import { solidPng } from './photos.ts'
import { writeWorkbook } from './workbook.ts'

const PALETTE: [number, number, number][] = [
  [59, 130, 246],
  [16, 185, 129],
  [245, 158, 11],
  [239, 68, 68],
  [139, 92, 246],
  [14, 165, 233],
]

export interface SeedOptions {
  year?: number
  seed?: number
  count?: number
  reset?: boolean
}

export interface SeedData {
  year: number
  seed: number
  sellers: string[]
  rows: unknown[][]
}

export interface SeedResult extends SeedData {
  sales: number
  disabled: string[]
  photos: number
}

function uniqueSellers(count: number): string[] {
  const names = new Set<string>()
  while (names.size < count) names.add(faker.person.fullName())
  return [...names]
}

function buildRows(
  year: number,
  count: number,
  sellers: string[],
  firstCode: number,
): unknown[][] {
  return Array.from({ length: count }, (_, index) =>
    makeSaleRow({
      code: String(firstCode + index),
      year,
      seller: faker.helpers.arrayElement(sellers),
    }),
  )
}

export function generateSeedData(options: SeedOptions = {}): SeedData {
  const year = options.year ?? new Date().getFullYear()
  const seed = options.seed ?? 42
  const count = options.count ?? 250

  withSeed(seed)
  const sellers = uniqueSellers(6)
  const rows = [
    ...buildRows(year, count, sellers, 900000),
    ...buildRows(year - 1, Math.round(count * 0.85), sellers, 800000),
  ]

  return { year, seed, sellers, rows }
}

export async function seedDatabase(
  db: SalesDatabase,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const data = generateSeedData(options)

  if (options.reset !== false) resetImportedData(db)

  const file = writeWorkbook(data.rows)
  try {
    await importWorkbook(db, file)
  } finally {
    unlinkSync(file)
  }

  db.setGoalUnit(data.year, 'pct')
  db.setFactor(data.year, 1.2)

  const disabled = [data.sellers[data.sellers.length - 1]]
  for (const seller of disabled) db.setSellerDisabled(seller, true)

  let photos = 0
  for (const [index, seller] of data.sellers.entries()) {
    if (disabled.includes(seller)) continue
    const [red, green, blue] = PALETTE[index % PALETTE.length]
    db.setSellerPhoto(seller, 'image/png', solidPng(red, green, blue))
    photos += 1
  }

  return { ...data, sales: data.rows.length, disabled, photos }
}
