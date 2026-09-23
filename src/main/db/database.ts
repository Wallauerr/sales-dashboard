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
  ano INTEGER,
  quantidade INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vendas_ano_mes ON vendas (ano, mes);
CREATE INDEX IF NOT EXISTS idx_vendas_ano_status ON vendas (ano, status_sistema);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas (vendedor);
CREATE INDEX IF NOT EXISTS idx_vendas_estado ON vendas (estado);
CREATE INDEX IF NOT EXISTS idx_vendas_regiao ON vendas (regiao);

CREATE TABLE IF NOT EXISTS meta_config (
  ano INTEGER PRIMARY KEY,
  fator REAL NOT NULL DEFAULT 1.15
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

const SCHEMA_VERSION = 1;

export class SalesDatabase {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec("PRAGMA journal_mode = WAL");
    const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
    if (user_version < SCHEMA_VERSION) {
      db.exec("DROP TABLE IF EXISTS vendas; DROP TABLE IF EXISTS meta_config; DROP TABLE IF EXISTS import_log;");
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
    db.exec(SCHEMA);
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
    quantidade: number;
  }): void {
    this.db
      .prepare(
        `INSERT INTO vendas (
           codigo, data, data_aprov_orcamento, data_aprov_pedido, data_aprov_faturamento,
           data_emissao_fiscal, empresa, status_sistema, vendedor, categoria, status, origem,
           cliente, cidade, estado, regiao, transportadora, frete, desconto, comissao,
           valor_total, nfe, mes, ano, quantidade
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        row.quantidade,
      );
  }

  logImport(result: { filePath: string; totalRows: number; inserted: number; updated: number; discarded: number }): void {
    this.db
      .prepare("INSERT INTO import_log (file_path, total_rows, inserted, updated, discarded) VALUES (?, ?, ?, ?, ?)")
      .run(result.filePath, result.totalRows, result.inserted, result.updated, result.discarded);
  }

  getFator(ano: number): number {
    const row = this.db.prepare("SELECT fator FROM meta_config WHERE ano = ?").get(ano) as { fator: number } | undefined;
    return row ? row.fator : 1.15;
  }
}