import type { DatabaseSync } from 'node:sqlite'
import { saleSchema } from '../../shared/schemas.ts'
import type {
  CodeHistory,
  ImportCodeEvent,
  ImportRecord,
  Month,
  Sale,
} from '../../shared/types.ts'
import { MONTHS, NO_SELLER_LABEL } from '../../shared/types.ts'
import { rowToSale } from './rows.ts'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL,
  data TEXT,
  data_aprov_orcamento TEXT,
  data_aprov_pedido TEXT,
  data_aprov_faturamento TEXT,
  data_emissao_fiscal TEXT,
  empresa TEXT NOT NULL DEFAULT '',
  status_sistema TEXT NOT NULL DEFAULT '',
  vendedor TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  cliente TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  regiao TEXT NOT NULL DEFAULT '',
  transportadora TEXT NOT NULL DEFAULT '',
  frete REAL NOT NULL DEFAULT 0,
  desconto REAL NOT NULL DEFAULT 0,
  comissao REAL NOT NULL DEFAULT 0,
  valor_total REAL NOT NULL DEFAULT 0,
  nfe TEXT NOT NULL DEFAULT '',
  mes TEXT,
  ano INTEGER
);

CREATE INDEX IF NOT EXISTS idx_vendas_ano_mes ON vendas (ano, mes);
CREATE INDEX IF NOT EXISTS idx_vendas_ano_status ON vendas (ano, status_sistema);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas (vendedor);
CREATE INDEX IF NOT EXISTS idx_vendas_estado ON vendas (estado);
CREATE INDEX IF NOT EXISTS idx_vendas_regiao ON vendas (regiao);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendas_codigo ON vendas (codigo);

CREATE TABLE IF NOT EXISTS meta_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  inserted INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  discarded INTEGER NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id INTEGER NOT NULL REFERENCES import_log(id),
  codigo TEXT NOT NULL,
  op TEXT NOT NULL,
  status_sistema TEXT NOT NULL DEFAULT '',
  valor_total REAL NOT NULL DEFAULT 0,
  data TEXT,
  mes TEXT,
  ano INTEGER
);
CREATE INDEX IF NOT EXISTS idx_import_items_codigo ON import_items (codigo, id);
CREATE INDEX IF NOT EXISTS idx_import_items_import ON import_items (import_id);

CREATE TABLE IF NOT EXISTS vendedor_fotos (
  vendedor TEXT PRIMARY KEY,
  mime TEXT NOT NULL DEFAULT 'image/png',
  img BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS vendedor_desativado (
  vendedor TEXT PRIMARY KEY
);
`

const SCHEMA_VERSION = 9

// v8 -> v9: vendedor pode ser desativado (some do ranking/filtro) sem apagar as
// vendas, que continuam contando nas métricas globais.
function dropFotoOrigemColumn(db: DatabaseSync): void {
  const cols = db.prepare('PRAGMA table_info(vendedor_fotos)').all() as {
    name: string
  }[]
  if (!cols.some(c => c.name === 'origem')) return
  db.exec('ALTER TABLE vendedor_fotos DROP COLUMN origem')
}

export class SalesDatabase {
  private db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
    db.exec('PRAGMA journal_mode = WAL')
    const { user_version } = db.prepare('PRAGMA user_version').get() as {
      user_version: number
    }
    if (user_version < SCHEMA_VERSION) {
      // v3 -> v4: dedup por codigo, preservando os dados e a linha mais recente.
      try {
        db.exec(
          'DELETE FROM vendas WHERE id NOT IN (SELECT MAX(id) FROM vendas GROUP BY codigo)',
        )
      } catch {
        // tabela ainda não existe (instalação nova) — o SCHEMA abaixo cria.
      }
      db.exec(SCHEMA)
      dropFotoOrigemColumn(db)
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    } else {
      db.exec(SCHEMA)
      dropFotoOrigemColumn(db)
    }
  }

  static open(db: DatabaseSync): SalesDatabase {
    return new SalesDatabase(db)
  }

  get raw(): DatabaseSync {
    return this.db
  }

  insertSale(row: {
    code: string
    date: string | null
    quoteApprovedDate: string | null
    orderApprovedDate: string | null
    billingApprovedDate: string | null
    fiscalIssueDate: string | null
    company: string
    systemStatus: string
    seller: string
    category: string
    status: string
    origin: string
    customer: string
    city: string
    state: string
    region: string
    carrier: string
    freight: number
    discount: number
    commission: number
    totalValue: number
    invoice: string
    month: string | null
    year: number | null
  }): void {
    this.db
      .prepare(
        `INSERT INTO vendas (
           codigo, data, data_aprov_orcamento, data_aprov_pedido, data_aprov_faturamento,
           data_emissao_fiscal, empresa, status_sistema, vendedor, categoria, status, origem,
           cliente, cidade, estado, regiao, transportadora, frete, desconto, comissao,
           valor_total, nfe, mes, ano
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.code,
        row.date,
        row.quoteApprovedDate,
        row.orderApprovedDate,
        row.billingApprovedDate,
        row.fiscalIssueDate,
        row.company,
        row.systemStatus,
        row.seller,
        row.category,
        row.status,
        row.origin,
        row.customer,
        row.city,
        row.state,
        row.region,
        row.carrier,
        row.freight,
        row.discount,
        row.commission,
        row.totalValue,
        row.invoice,
        row.month,
        row.year,
      )
  }

  upsertSale(
    row: Parameters<SalesDatabase['insertSale']>[0],
  ): 'inserted' | 'updated' | 'unchanged' {
    const existing = this.db
      .prepare('SELECT * FROM vendas WHERE codigo = ?')
      .get(row.code) as Record<string, unknown> | undefined
    if (!existing) {
      this.insertSale(row)
      return 'inserted'
    }
    const fields: [string, unknown][] = [
      ['data', row.date],
      ['data_aprov_orcamento', row.quoteApprovedDate],
      ['data_aprov_pedido', row.orderApprovedDate],
      ['data_aprov_faturamento', row.billingApprovedDate],
      ['data_emissao_fiscal', row.fiscalIssueDate],
      ['empresa', row.company],
      ['status_sistema', row.systemStatus],
      ['vendedor', row.seller],
      ['categoria', row.category],
      ['status', row.status],
      ['origem', row.origin],
      ['cliente', row.customer],
      ['cidade', row.city],
      ['estado', row.state],
      ['regiao', row.region],
      ['transportadora', row.carrier],
      ['frete', row.freight],
      ['desconto', row.discount],
      ['comissao', row.commission],
      ['valor_total', row.totalValue],
      ['nfe', row.invoice],
      ['mes', row.month],
      ['ano', row.year],
    ]
    const unchanged = fields.every(([key, value]) => existing[key] === value)
    if (unchanged) return 'unchanged'
    this.db
      .prepare(
        `UPDATE vendas SET
           data = ?, data_aprov_orcamento = ?, data_aprov_pedido = ?, data_aprov_faturamento = ?,
           data_emissao_fiscal = ?, empresa = ?, status_sistema = ?, vendedor = ?, categoria = ?,
           status = ?, origem = ?, cliente = ?, cidade = ?, estado = ?, regiao = ?,
           transportadora = ?, frete = ?, desconto = ?, comissao = ?, valor_total = ?, nfe = ?,
           mes = ?, ano = ?
         WHERE codigo = ?`,
      )
      .run(
        row.date,
        row.quoteApprovedDate,
        row.orderApprovedDate,
        row.billingApprovedDate,
        row.fiscalIssueDate,
        row.company,
        row.systemStatus,
        row.seller,
        row.category,
        row.status,
        row.origin,
        row.customer,
        row.city,
        row.state,
        row.region,
        row.carrier,
        row.freight,
        row.discount,
        row.commission,
        row.totalValue,
        row.invoice,
        row.month,
        row.year,
        row.code,
      )
    return 'updated'
  }

  logImport(result: {
    filePath: string
    totalRows: number
    inserted: number
    updated: number
    discarded: number
  }): number {
    const { lastInsertRowid } = this.db
      .prepare(
        'INSERT INTO import_log (file_path, total_rows, inserted, updated, discarded, imported_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        result.filePath,
        result.totalRows,
        result.inserted,
        result.updated,
        result.discarded,
        new Date().toISOString(),
      )
    return Number(lastInsertRowid)
  }

  insertImportItem(item: {
    importId: number
    code: string
    op: 'inserted' | 'updated'
    systemStatus: string
    totalValue: number
    date: string | null
    month: string | null
    year: number | null
  }): void {
    this.db
      .prepare(
        'INSERT INTO import_items (import_id, codigo, op, status_sistema, valor_total, data, mes, ano) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        item.importId,
        item.code,
        item.op,
        item.systemStatus,
        item.totalValue,
        item.date,
        item.month,
        item.year,
      )
  }

  listImports(): ImportRecord[] {
    const rows = this.db
      .prepare(
        'SELECT id, file_path, total_rows, inserted, updated, discarded, imported_at FROM import_log ORDER BY id DESC',
      )
      .all() as unknown as Record<string, unknown>[]
    return rows.map(r => ({
      id: Number(r.id),
      filePath: String(r.file_path),
      totalRows: Number(r.total_rows),
      inserted: Number(r.inserted),
      updated: Number(r.updated),
      discarded: Number(r.discarded),
      importedAt: String(r.imported_at),
    }))
  }

  findSaleByCode(code: string): Sale | null {
    const r = this.db
      .prepare('SELECT * FROM vendas WHERE codigo = ?')
      .get(code) as Record<string, unknown> | undefined
    if (!r) return null
    return saleSchema.parse(rowToSale(r))
  }

  codeHistoryEvents(code: string): ImportCodeEvent[] {
    const rows = this.db
      .prepare(
        `SELECT ii.op, ii.status_sistema, ii.valor_total, ii.data, ii.mes, ii.ano, il.imported_at
         FROM import_items ii JOIN import_log il ON il.id = ii.import_id
         WHERE ii.codigo = ? ORDER BY il.id ASC, ii.id ASC`,
      )
      .all(code) as unknown as Record<string, unknown>[]
    return rows.map(r => ({
      importedAt: String(r.imported_at),
      op: String(r.op) as ImportCodeEvent['op'],
      systemStatus: String(r.status_sistema ?? ''),
      totalValue: Number(r.valor_total) || 0,
      date: r.data ? String(r.data) : null,
      month: r.mes ? (String(r.mes) as ImportCodeEvent['month']) : null,
      year: r.ano ? Number(r.ano) : null,
    }))
  }

  getCodeHistory(code: string): CodeHistory {
    return {
      code,
      sale: this.findSaleByCode(code),
      events: this.codeHistoryEvents(code),
    }
  }

  getFactor(year: number): number {
    return Number(this.getMeta(`fator:${year}`) ?? 1.15)
  }

  setFactor(year: number, factor: number): void {
    this.setMeta(`fator:${year}`, String(factor))
  }

  clearFactor(year: number): void {
    this.clearMeta(`fator:${year}`)
  }

  getGoalUnit(year: number): 'pct' | 'brl' | null {
    const raw = this.getMeta(`unidade_meta:${year}`)
    return raw === 'pct' || raw === 'brl' ? raw : null
  }

  setGoalUnit(year: number, unit: 'pct' | 'brl' | null): void {
    if (unit === null) {
      this.clearMeta(`unidade_meta:${year}`)
    } else {
      this.setMeta(`unidade_meta:${year}`, unit)
    }
  }

  getMeta(key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM meta_config WHERE key = ?')
      .get(key) as { value: string } | undefined
    return row ? row.value : null
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare(
        'INSERT INTO meta_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value)
  }

  clearMeta(key: string): void {
    this.db.prepare('DELETE FROM meta_config WHERE key = ?').run(key)
  }

  getAnnualGoal(year: number): number | null {
    return this.getMetaNumber(`meta_anual:${year}`)
  }

  setAnnualGoal(year: number, value: number | null): void {
    if (value === null) {
      this.clearMeta(`meta_anual:${year}`)
    } else {
      this.setMeta(`meta_anual:${year}`, String(value))
    }
  }

  getMonthlyGoalOverrides(year: number): Partial<Record<Month, number>> {
    const raw = this.getMeta(`metas_mes:${year}`)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const out: Partial<Record<Month, number>> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (
          MONTHS.includes(key as Month) &&
          typeof value === 'number' &&
          Number.isFinite(value)
        ) {
          out[key as Month] = value
        }
      }
      return out
    } catch {
      return {}
    }
  }

  setMonthlyGoalOverrides(
    year: number,
    months: Partial<Record<Month, number>>,
  ): void {
    const overrides = MONTHS.reduce<Partial<Record<Month, number>>>(
      (acc, month) => {
        const value = months[month]
        if (typeof value === 'number' && Number.isFinite(value)) {
          acc[month] = value
        }
        return acc
      },
      {},
    )
    if (Object.keys(overrides).length === 0) {
      this.clearMeta(`metas_mes:${year}`)
    } else {
      this.setMeta(`metas_mes:${year}`, JSON.stringify(overrides))
    }
  }

  private getMetaNumber(key: string): number | null {
    const raw = this.getMeta(key)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  setSellerPhoto(seller: string, mime: string, img: Uint8Array): void {
    this.db
      .prepare(
        `INSERT INTO vendedor_fotos (vendedor, mime, img) VALUES (?, ?, ?)
         ON CONFLICT(vendedor) DO UPDATE SET
           mime = excluded.mime, img = excluded.img`,
      )
      .run(seller, mime, img)
  }

  removeSellerPhoto(seller: string): void {
    this.db.prepare('DELETE FROM vendedor_fotos WHERE vendedor = ?').run(seller)
  }

  getSellerPhoto(seller: string): {
    mime: string
    img: Uint8Array
  } | null {
    const row = this.db
      .prepare('SELECT mime, img FROM vendedor_fotos WHERE vendedor = ?')
      .get(seller) as unknown as { mime: string; img: Uint8Array } | undefined
    return row ? { mime: row.mime, img: row.img } : null
  }

  listSellerPhotos(): { seller: string }[] {
    const rows = this.db
      .prepare('SELECT vendedor FROM vendedor_fotos')
      .all() as unknown as { vendedor: string }[]
    return rows.map(r => ({ seller: r.vendedor }))
  }

  listSellers(): string[] {
    const rows = this.db
      .prepare(
        `SELECT vendedor FROM vendas WHERE vendedor <> ''
           AND vendedor NOT IN (SELECT vendedor FROM vendedor_desativado)
         UNION
         SELECT vendedor FROM vendedor_fotos
           WHERE vendedor NOT IN (SELECT vendedor FROM vendedor_desativado)
         ORDER BY vendedor COLLATE NOCASE`,
      )
      .all() as unknown as { vendedor: string }[]
    return rows.map(r => r.vendedor).filter(v => v !== NO_SELLER_LABEL)
  }

  listDisabledSellers(): string[] {
    const rows = this.db
      .prepare('SELECT vendedor FROM vendedor_desativado')
      .all() as unknown as { vendedor: string }[]
    return rows.map(r => r.vendedor)
  }

  setSellerDisabled(seller: string, disabled: boolean): void {
    if (disabled) {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO vendedor_desativado (vendedor) VALUES (?)',
        )
        .run(seller)
    } else {
      this.db
        .prepare('DELETE FROM vendedor_desativado WHERE vendedor = ?')
        .run(seller)
    }
  }

  listYears(): number[] {
    const rows = this.db
      .prepare(
        'SELECT DISTINCT ano FROM vendas WHERE ano IS NOT NULL ORDER BY ano',
      )
      .all() as unknown as { ano: number }[]
    return rows.map(r => Number(r.ano)).filter(a => Number.isFinite(a))
  }
}
