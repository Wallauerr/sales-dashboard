import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import {
  dbStats,
  exportBackup,
  mergeBackup,
  resetImportedData,
} from '../src/main/db/maintenance.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import { makeSaleRow } from './fixtures/factories.ts'
import { writeWorkbook } from './fixtures/workbook.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sd-manutencao-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function fileDb(name: string): SalesDatabase {
  const path = join(dir, name)
  return SalesDatabase.open(new DatabaseSync(path), path)
}

async function seededDb(name: string): Promise<SalesDatabase> {
  const db = fileDb(name)
  await importWorkbook(
    db,
    writeWorkbook([
      makeSaleRow({ code: '1001', year: 2026, value: 100 }),
      makeSaleRow({ code: '1002', year: 2026, value: 200 }),
    ]),
  )
  return db
}

describe('manutenção de dados', () => {
  it('reset apaga vendas e histórico e preserva metas, fotos e desativados', async () => {
    const db = await seededDb('alvo.db')
    db.setMeta('meta:2026', '1000')
    db.setSellerPhoto('Ana', 'image/png', new Uint8Array([1, 2, 3]))
    db.setSellerDisabled('Bruno', true)

    resetImportedData(db)

    expect(db.listYears()).toEqual([])
    expect(db.listImports()).toEqual([])
    expect(db.getMeta('meta:2026')).toBe('1000')
    expect(db.getSellerPhoto('Ana')).not.toBeNull()
    expect(db.listDisabledSellers()).toEqual(['Bruno'])
  })

  it('reset devolve o autoincrement das tabelas apagadas', async () => {
    const db = await seededDb('alvo.db')
    const before = db.raw
      .prepare('SELECT seq FROM sqlite_sequence WHERE name = ?')
      .get('vendas') as { seq: number } | undefined
    expect(before).toBeDefined()

    resetImportedData(db)

    const after = db.raw
      .prepare('SELECT seq FROM sqlite_sequence WHERE name = ?')
      .get('vendas') as { seq: number } | undefined
    expect(after?.seq ?? 0).toBe(0)
  })

  it('export gera um arquivo com os dados do banco', async () => {
    const db = await seededDb('alvo.db')
    const target = join(dir, 'backup.db')

    exportBackup(db, target)

    const copy = new DatabaseSync(target, { readOnly: true })
    const { n } = copy.prepare('SELECT COUNT(*) AS n FROM vendas').get() as {
      n: number
    }
    copy.close()
    expect(n).toBe(2)
  })

  it('export falha quando o banco não está em arquivo', async () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))
    expect(() => exportBackup(db, join(dir, 'backup.db'))).toThrow(
      /não está salvo em arquivo/,
    )
  })

  it('merge traz vendas, metas, fotos, desativados e histórico', async () => {
    const source = await seededDb('backup.db')
    source.setMeta('meta:2026', '1000')
    source.setSellerPhoto('Ana', 'image/png', new Uint8Array([1, 2, 3]))
    source.setSellerDisabled('Bruno', true)

    const target = SalesDatabase.open(new DatabaseSync(':memory:'))
    const result = mergeBackup(target, source.path as string)

    expect(result.sales).toBe(2)
    expect(result.goals).toBe(1)
    expect(result.photos).toBe(1)
    expect(result.disabledSellers).toBe(1)
    expect(result.imports).toBe(1)
    expect(result.historyItems).toBeGreaterThan(0)
    expect(target.findSaleByCode('1001')).not.toBeNull()
    expect(target.getMeta('meta:2026')).toBe('1000')
    expect(target.getSellerPhoto('Ana')).not.toBeNull()
    expect(target.listDisabledSellers()).toEqual(['Bruno'])
    expect(target.listImports()).toHaveLength(1)
  })

  it('merge atualiza venda existente em vez de duplicar', async () => {
    const source = await seededDb('backup.db')
    const target = SalesDatabase.open(new DatabaseSync(':memory:'))
    await importWorkbook(
      target,
      writeWorkbook([makeSaleRow({ code: '1001', year: 2026, value: 100 })]),
    )

    mergeBackup(target, source.path as string)

    const { n } = target.raw
      .prepare('SELECT COUNT(*) AS n FROM vendas')
      .get() as { n: number }
    expect(n).toBe(2)
  })

  it('merge recusa arquivo que não é um backup', () => {
    const target = SalesDatabase.open(new DatabaseSync(':memory:'))
    const bogus = join(dir, 'lixo.db')
    const handle = new DatabaseSync(bogus)
    handle.exec('CREATE TABLE vendas (codigo TEXT)')
    handle.close()

    expect(() => mergeBackup(target, bogus)).toThrow(
      /não parece um backup do Sulmag Dashboard/,
    )
  })

  it('dbStats conta vendas, importações, vendedores e fotos', async () => {
    const db = await seededDb('alvo.db')
    db.setSellerPhoto('Ana', 'image/png', new Uint8Array([1]))

    const stats = dbStats(db)

    expect(stats.sales).toBe(2)
    expect(stats.imports).toBe(1)
    expect(stats.sellers).toBeGreaterThan(0)
    expect(stats.photos).toBe(1)
  })
})
