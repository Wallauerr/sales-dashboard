import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SalesDatabase } from '../src/main/db/database.ts'
import { databasePath, defaultUserData } from '../src/main/env.ts'
import { generateSeedData, seedDatabase } from '../src/main/seed/seed.ts'
import { writeWorkbook } from '../src/main/seed/workbook.ts'

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length)
}

function seedDatabasePath(): string {
  const explicit = arg('db') ?? process.env.SD_DB
  if (explicit) return explicit
  const base =
    process.env.SD_USER_DATA ??
    defaultUserData({
      platform: process.platform,
      home: homedir(),
      appData: process.env.APPDATA,
      xdgConfig: process.env.XDG_CONFIG_HOME,
    })
  return databasePath(base, 'dev')
}

function numberArg(name: string): number | undefined {
  const raw = arg(name) ?? process.env[`SD_${name.toUpperCase()}`]
  const value = Number(raw)
  return raw && Number.isFinite(value) ? value : undefined
}

async function main(): Promise<void> {
  const options = {
    year: numberArg('year'),
    seed: numberArg('seed'),
    count: numberArg('count'),
  }
  const workbook = arg('workbook')

  if (workbook) {
    const data = generateSeedData(options)
    const out = writeWorkbook(data.rows, workbook)
    console.log(
      `Planilha de exemplo gerada em ${out} (${data.rows.length} linhas).`,
    )
    return
  }

  const dbPath = seedDatabasePath()
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = SalesDatabase.open(new DatabaseSync(dbPath), dbPath)
  try {
    const result = await seedDatabase(db, options)
    console.log(
      `Seed ${result.seed} em ${dbPath}: ${result.sales} vendas ` +
        `(${result.year} + ${result.year - 1}), ${result.sellers.length} vendedores ` +
        `(${result.disabled.length} desativado), ${result.photos} fotos.`,
    )
  } finally {
    db.raw.close()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
