import { copyFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { saleSchema } from '../../shared/schemas.ts'
import type { BackupMergeResult, DbStats } from '../../shared/types.ts'
import { type SalesDatabase, SCHEMA_VERSION } from './database.ts'
import { rowToSale } from './rows.ts'

const RESET_TABLES = ['import_items', 'import_log', 'vendas'] as const

export function dbStats(db: SalesDatabase): DbStats {
  const count = (table: string): number =>
    (
      db.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
        n: number
      }
    ).n
  return {
    sales: count('vendas'),
    imports: count('import_log'),
    sellers: db.listSellers().length,
    photos: count('vendedor_fotos'),
  }
}

export function resetImportedData(db: SalesDatabase): void {
  db.raw.exec('BEGIN')
  try {
    for (const table of RESET_TABLES) db.raw.exec(`DELETE FROM ${table}`)
    const hasSequence = db.raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'",
      )
      .get()
    if (hasSequence) {
      db.raw.exec(
        `DELETE FROM sqlite_sequence WHERE name IN (${RESET_TABLES.map(
          table => `'${table}'`,
        ).join(', ')})`,
      )
    }
    db.raw.exec('COMMIT')
  } catch (err) {
    db.raw.exec('ROLLBACK')
    throw err
  }
  db.raw.exec('VACUUM')
}

function getSourcePath(db: SalesDatabase): string {
  const source = db.path
  if (!source) throw new Error('O banco não está salvo em arquivo.')
  return source
}

export function exportBackup(db: SalesDatabase, target: string): void {
  const source = getSourcePath(db)
  db.raw.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  copyFileSync(source, target)
}

export function mergeBackup(
  db: SalesDatabase,
  source: string,
): BackupMergeResult {
  const backup = openBackup(source)
  try {
    assertBackupIsValid(backup)
    const result: BackupMergeResult = {
      sales: 0,
      goals: 0,
      photos: 0,
      disabledSellers: 0,
      imports: 0,
      historyItems: 0,
    }
    db.raw.exec('BEGIN')
    try {
      result.sales = mergeSales(db, backup)
      result.goals = mergeGoals(db, backup)
      result.photos = mergePhotos(db, backup)
      result.disabledSellers = mergeDisabledSellers(db, backup)
      const history = mergeHistory(db, backup)
      result.imports = history.imports
      result.historyItems = history.items
      db.raw.exec('COMMIT')
    } catch (err) {
      db.raw.exec('ROLLBACK')
      throw err
    }
    return result
  } finally {
    backup.close()
  }
}

function openBackup(source: string): DatabaseSync {
  try {
    return new DatabaseSync(source, { readOnly: true })
  } catch {
    throw new Error(
      'O arquivo escolhido não é um banco de dados válido do Sulmag Dashboard.',
    )
  }
}

function assertBackupIsValid(backup: DatabaseSync): void {
  const check = backup.prepare('PRAGMA integrity_check').all() as unknown as {
    integrity_check: string
  }[]
  if (check[0]?.integrity_check !== 'ok') {
    throw new Error('O arquivo de backup está corrompido.')
  }
  const { user_version: version } = backup
    .prepare('PRAGMA user_version')
    .get() as {
    user_version: number
  }
  if (Number(version) > SCHEMA_VERSION) {
    throw new Error(
      'Esse backup veio de uma versão mais nova do app. Atualize o Sulmag Dashboard antes de importar.',
    )
  }
  const tables = (
    backup
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as unknown as { name: string }[]
  ).map(row => row.name)
  for (const required of ['vendas', 'meta_config']) {
    if (!tables.includes(required)) {
      throw new Error('Esse arquivo não parece um backup do Sulmag Dashboard.')
    }
  }
}

function mergeSales(db: SalesDatabase, backup: DatabaseSync): number {
  const rows = backup
    .prepare('SELECT * FROM vendas')
    .all() as unknown as Record<string, unknown>[]
  for (const row of rows) {
    db.upsertSale(saleSchema.parse(rowToSale(row)))
  }
  return rows.length
}

function mergeGoals(db: SalesDatabase, backup: DatabaseSync): number {
  const rows = backup
    .prepare('SELECT key, value FROM meta_config')
    .all() as unknown as { key: string; value: string }[]
  for (const row of rows) db.setMeta(row.key, row.value)
  return rows.length
}

function mergePhotos(db: SalesDatabase, backup: DatabaseSync): number {
  const rows = backup
    .prepare('SELECT vendedor, mime, img FROM vendedor_fotos')
    .all() as unknown as { vendedor: string; mime: string; img: Uint8Array }[]
  for (const row of rows) db.setSellerPhoto(row.vendedor, row.mime, row.img)
  return rows.length
}

function mergeDisabledSellers(db: SalesDatabase, backup: DatabaseSync): number {
  const rows = backup
    .prepare('SELECT vendedor FROM vendedor_desativado')
    .all() as unknown as { vendedor: string }[]
  for (const row of rows) db.setSellerDisabled(row.vendedor, true)
  return rows.length
}

function mergeHistory(
  db: SalesDatabase,
  backup: DatabaseSync,
): { imports: number; items: number } {
  const logs = backup
    .prepare(
      'SELECT id, file_path, total_rows, inserted, updated, discarded, imported_at FROM import_log ORDER BY id',
    )
    .all() as unknown as {
    id: number
    file_path: string
    total_rows: number
    inserted: number
    updated: number
    discarded: number
    imported_at: string
  }[]
  const items = backup
    .prepare(
      'SELECT import_id, codigo, op, status_sistema, valor_total, data, mes, ano FROM import_items ORDER BY id',
    )
    .all() as unknown as {
    import_id: number
    codigo: string
    op: string
    status_sistema: string
    valor_total: number
    data: string | null
    mes: string | null
    ano: number | null
  }[]

  const idMap = new Map<number, number>()
  const insertLog = db.raw.prepare(
    'INSERT INTO import_log (file_path, total_rows, inserted, updated, discarded, imported_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  for (const log of logs) {
    const { lastInsertRowid } = insertLog.run(
      log.file_path,
      log.total_rows,
      log.inserted,
      log.updated,
      log.discarded,
      log.imported_at,
    )
    idMap.set(Number(log.id), Number(lastInsertRowid))
  }

  const insertItem = db.raw.prepare(
    'INSERT INTO import_items (import_id, codigo, op, status_sistema, valor_total, data, mes, ano) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  let inserted = 0
  for (const item of items) {
    const importId = idMap.get(Number(item.import_id))
    if (importId === undefined) continue
    insertItem.run(
      importId,
      item.codigo,
      item.op,
      item.status_sistema,
      item.valor_total,
      item.data,
      item.mes,
      item.ano,
    )
    inserted += 1
  }
  return { imports: logs.length, items: inserted }
}
