import { DatabaseSync } from "node:sqlite";

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
`;

const SCHEMA_VERSION = 4;

export class SalesDatabase {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec("PRAGMA journal_mode = WAL");
    const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
    if (user_version < SCHEMA_VERSION) {
      // Migração v3 -> v4 (reconciliação por codigo): preserva os dados, apenas
      // elimina eventuais duplicatas mantendo a linha mais recente por codigo.
      try {
        db.exec("DELETE FROM vendas WHERE id NOT IN (SELECT MAX(id) FROM vendas GROUP BY codigo)");
      } catch {
        // tabela ainda não existe (instalação nova) — o SCHEMA abaixo cria.
      }
      db.exec(SCHEMA);
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    } else {
      db.exec(SCHEMA);
    }
  }

  static open(db: DatabaseSync): SalesDatabase {
    return new SalesDatabase(db);
  }

  get raw(): DatabaseSync {
    return this.db;
  }

  clear(): void {
    this.db.exec("DELETE FROM vendas");
  }

  insertSale(row: {
    codigo: string;
    data: string | null;
    dataAprovOrcamento: string | null;
    dataAprovPedido: string | null;
    dataAprovFaturamento: string | null;
    dataEmissaoFiscal: string | null;
    empresa: string;
    statusSistema: string;
    vendedor: string;
    categoria: string;
    status: string;
    origem: string;
    cliente: string;
    cidade: string;
    estado: string;
    regiao: string;
    transportadora: string;
    frete: number;
    desconto: number;
    comissao: number;
    valorTotal: number;
    nfe: string;
    mes: string | null;
    ano: number | null;
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
      );
  }

  upsertSale(row: Parameters<SalesDatabase["insertSale"]>[0]): "inserted" | "updated" | "unchanged" {
    const existing = this.db.prepare("SELECT * FROM vendas WHERE codigo = ?").get(row.codigo) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      this.insertSale(row);
      return "inserted";
    }
    const fields: [string, unknown][] = [
      ["data", row.data],
      ["data_aprov_orcamento", row.dataAprovOrcamento],
      ["data_aprov_pedido", row.dataAprovPedido],
      ["data_aprov_faturamento", row.dataAprovFaturamento],
      ["data_emissao_fiscal", row.dataEmissaoFiscal],
      ["empresa", row.empresa],
      ["status_sistema", row.statusSistema],
      ["vendedor", row.vendedor],
      ["categoria", row.categoria],
      ["status", row.status],
      ["origem", row.origem],
      ["cliente", row.cliente],
      ["cidade", row.cidade],
      ["estado", row.estado],
      ["regiao", row.regiao],
      ["transportadora", row.transportadora],
      ["frete", row.frete],
      ["desconto", row.desconto],
      ["comissao", row.comissao],
      ["valor_total", row.valorTotal],
      ["nfe", row.nfe],
      ["mes", row.mes],
      ["ano", row.ano],
    ];
    const unchanged = fields.every(([key, value]) => existing[key] === value);
    if (unchanged) return "unchanged";
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
      );
    return "updated";
  }

  logImport(result: { filePath: string; totalRows: number; inserted: number; updated: number; discarded: number }): void {
    this.db
      .prepare("INSERT INTO import_log (file_path, total_rows, inserted, updated, discarded) VALUES (?, ?, ?, ?, ?)")
      .run(result.filePath, result.totalRows, result.inserted, result.updated, result.discarded);
  }

  getFator(ano: number): number {
    return Number(this.getMeta(`fator:${ano}`) ?? 1.15);
  }

  setFator(ano: number, fator: number): void {
    this.setMeta(`fator:${ano}`, String(fator));
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM meta_config WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row ? row.value : null;
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare("INSERT INTO meta_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }
}