import type { DatabaseSync } from 'node:sqlite'
import { saleSchema } from '../../shared/schemas.ts'
import type {
  CodigoHistory,
  ImportCodeEvent,
  ImportRecord,
  Mes,
  Sale,
} from '../../shared/types.ts'
import { MESES, ROTULO_SEM_VENDEDOR } from '../../shared/types.ts'
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
`

const SCHEMA_VERSION = 8

// v7 -> v8: com a extração do .xlsx removida a foto é sempre escolhida em
// Configurações, então origem não tinha mais o que distinguir.
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
      // Migração v3 -> v4 (reconciliação por codigo): preserva os dados, apenas
      // elimina eventuais duplicatas mantendo a linha mais recente por codigo.
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
    codigo: string
    data: string | null
    dataAprovOrcamento: string | null
    dataAprovPedido: string | null
    dataAprovFaturamento: string | null
    dataEmissaoFiscal: string | null
    empresa: string
    statusSistema: string
    vendedor: string
    categoria: string
    status: string
    origem: string
    cliente: string
    cidade: string
    estado: string
    regiao: string
    transportadora: string
    frete: number
    desconto: number
    comissao: number
    valorTotal: number
    nfe: string
    mes: string | null
    ano: number | null
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
        row.codigo,
        row.data,
        row.dataAprovOrcamento,
        row.dataAprovPedido,
        row.dataAprovFaturamento,
        row.dataEmissaoFiscal,
        row.empresa,
        row.statusSistema,
        row.vendedor,
        row.categoria,
        row.status,
        row.origem,
        row.cliente,
        row.cidade,
        row.estado,
        row.regiao,
        row.transportadora,
        row.frete,
        row.desconto,
        row.comissao,
        row.valorTotal,
        row.nfe,
        row.mes,
        row.ano,
      )
  }

  upsertSale(
    row: Parameters<SalesDatabase['insertSale']>[0],
  ): 'inserted' | 'updated' | 'unchanged' {
    const existing = this.db
      .prepare('SELECT * FROM vendas WHERE codigo = ?')
      .get(row.codigo) as Record<string, unknown> | undefined
    if (!existing) {
      this.insertSale(row)
      return 'inserted'
    }
    const fields: [string, unknown][] = [
      ['data', row.data],
      ['data_aprov_orcamento', row.dataAprovOrcamento],
      ['data_aprov_pedido', row.dataAprovPedido],
      ['data_aprov_faturamento', row.dataAprovFaturamento],
      ['data_emissao_fiscal', row.dataEmissaoFiscal],
      ['empresa', row.empresa],
      ['status_sistema', row.statusSistema],
      ['vendedor', row.vendedor],
      ['categoria', row.categoria],
      ['status', row.status],
      ['origem', row.origem],
      ['cliente', row.cliente],
      ['cidade', row.cidade],
      ['estado', row.estado],
      ['regiao', row.regiao],
      ['transportadora', row.transportadora],
      ['frete', row.frete],
      ['desconto', row.desconto],
      ['comissao', row.comissao],
      ['valor_total', row.valorTotal],
      ['nfe', row.nfe],
      ['mes', row.mes],
      ['ano', row.ano],
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
        row.data,
        row.dataAprovOrcamento,
        row.dataAprovPedido,
        row.dataAprovFaturamento,
        row.dataEmissaoFiscal,
        row.empresa,
        row.statusSistema,
        row.vendedor,
        row.categoria,
        row.status,
        row.origem,
        row.cliente,
        row.cidade,
        row.estado,
        row.regiao,
        row.transportadora,
        row.frete,
        row.desconto,
        row.comissao,
        row.valorTotal,
        row.nfe,
        row.mes,
        row.ano,
        row.codigo,
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
    codigo: string
    op: 'inserted' | 'updated'
    statusSistema: string
    valorTotal: number
    data: string | null
    mes: string | null
    ano: number | null
  }): void {
    this.db
      .prepare(
        'INSERT INTO import_items (import_id, codigo, op, status_sistema, valor_total, data, mes, ano) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        item.importId,
        item.codigo,
        item.op,
        item.statusSistema,
        item.valorTotal,
        item.data,
        item.mes,
        item.ano,
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

  findVendaByCodigo(codigo: string): Sale | null {
    const r = this.db
      .prepare('SELECT * FROM vendas WHERE codigo = ?')
      .get(codigo) as Record<string, unknown> | undefined
    if (!r) return null
    return saleSchema.parse(rowToSale(r))
  }

  codigoHistoryEvents(codigo: string): ImportCodeEvent[] {
    const rows = this.db
      .prepare(
        `SELECT ii.op, ii.status_sistema, ii.valor_total, ii.data, ii.mes, ii.ano, il.imported_at
         FROM import_items ii JOIN import_log il ON il.id = ii.import_id
         WHERE ii.codigo = ? ORDER BY il.id ASC, ii.id ASC`,
      )
      .all(codigo) as unknown as Record<string, unknown>[]
    return rows.map(r => ({
      importedAt: String(r.imported_at),
      op: String(r.op) as ImportCodeEvent['op'],
      statusSistema: String(r.status_sistema ?? ''),
      valorTotal: Number(r.valor_total) || 0,
      data: r.data ? String(r.data) : null,
      mes: r.mes ? (String(r.mes) as ImportCodeEvent['mes']) : null,
      ano: r.ano ? Number(r.ano) : null,
    }))
  }

  getCodigoHistory(codigo: string): CodigoHistory {
    return {
      codigo,
      venda: this.findVendaByCodigo(codigo),
      events: this.codigoHistoryEvents(codigo),
    }
  }

  getFator(ano: number): number {
    return Number(this.getMeta(`fator:${ano}`) ?? 1.15)
  }

  setFator(ano: number, fator: number): void {
    this.setMeta(`fator:${ano}`, String(fator))
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

  getMetaAnual(ano: number): number | null {
    return this.getMetaConfigNumber(`meta_anual:${ano}`)
  }

  setMetaAnual(ano: number, valor: number | null): void {
    if (valor === null) {
      this.clearMeta(`meta_anual:${ano}`)
    } else {
      this.setMeta(`meta_anual:${ano}`, String(valor))
    }
  }

  getMetasMesOverride(ano: number): Partial<Record<Mes, number>> {
    const raw = this.getMeta(`metas_mes:${ano}`)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const out: Partial<Record<Mes, number>> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (
          MESES.includes(key as Mes) &&
          typeof value === 'number' &&
          Number.isFinite(value)
        ) {
          out[key as Mes] = value
        }
      }
      return out
    } catch {
      return {}
    }
  }

  setMetasMesOverride(ano: number, meses: Partial<Record<Mes, number>>): void {
    const overrides = MESES.reduce<Partial<Record<Mes, number>>>((acc, mes) => {
      const value = meses[mes]
      if (typeof value === 'number' && Number.isFinite(value)) acc[mes] = value
      return acc
    }, {})
    if (Object.keys(overrides).length === 0) {
      this.clearMeta(`metas_mes:${ano}`)
    } else {
      this.setMeta(`metas_mes:${ano}`, JSON.stringify(overrides))
    }
  }

  private getMetaConfigNumber(key: string): number | null {
    const raw = this.getMeta(key)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  setVendedorFoto(vendedor: string, mime: string, img: Uint8Array): void {
    this.db
      .prepare(
        `INSERT INTO vendedor_fotos (vendedor, mime, img) VALUES (?, ?, ?)
         ON CONFLICT(vendedor) DO UPDATE SET
           mime = excluded.mime, img = excluded.img`,
      )
      .run(vendedor, mime, img)
  }

  removeVendedorFoto(vendedor: string): void {
    this.db
      .prepare('DELETE FROM vendedor_fotos WHERE vendedor = ?')
      .run(vendedor)
  }

  getVendedorFoto(vendedor: string): {
    mime: string
    img: Uint8Array
  } | null {
    const row = this.db
      .prepare('SELECT mime, img FROM vendedor_fotos WHERE vendedor = ?')
      .get(vendedor) as unknown as { mime: string; img: Uint8Array } | undefined
    return row ? { mime: row.mime, img: row.img } : null
  }

  listVendedorFotos(): { vendedor: string }[] {
    const rows = this.db
      .prepare('SELECT vendedor FROM vendedor_fotos')
      .all() as unknown as { vendedor: string }[]
    return rows.map(r => ({ vendedor: r.vendedor }))
  }

  listVendedores(): string[] {
    const rows = this.db
      .prepare(
        `SELECT vendedor FROM vendas WHERE vendedor <> ''
         UNION
         SELECT vendedor FROM vendedor_fotos
         ORDER BY vendedor COLLATE NOCASE`,
      )
      .all() as unknown as { vendedor: string }[]
    return rows.map(r => r.vendedor).filter(v => v !== ROTULO_SEM_VENDEDOR)
  }
}
