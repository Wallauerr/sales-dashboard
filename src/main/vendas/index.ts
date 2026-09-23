import type { Sale, VendasFilter, VendasPage } from "../../shared/types.ts";
import type { SalesDatabase } from "../db/database.ts";

const STATUS_FATURAMENTO = ["Pedido", "Pedido Faturado"];

export function getVendas(db: SalesDatabase, filters: VendasFilter, limit = 200): VendasPage {
  const where: string[] = ["ano = ?"];
  const params: (string | number)[] = [filters.ano];

  if (filters.mes) {
    where.push("mes = ?");
    params.push(filters.mes);
  }
  if (filters.statusSistema) {
    if (filters.statusSistema === "__fat__") {
      where.push(`status_sistema IN (${STATUS_FATURAMENTO.map(() => "?").join(", ")})`);
      params.push(...STATUS_FATURAMENTO);
    } else {
      where.push("status_sistema = ?");
      params.push(filters.statusSistema);
    }
  }
  if (filters.vendedor) {
    where.push("vendedor LIKE ?");
    params.push(`%${filters.vendedor}%`);
  }
  if (filters.regiao) {
    where.push("regiao = ?");
    params.push(filters.regiao);
  }

  const sql = `WHERE ${where.join(" AND ")}`;
  const total = (
    db.raw.prepare(`SELECT COUNT(*) AS n FROM vendas ${sql}`).get(...params) as { n: number }
  ).n;

  const rows = db.raw
    .prepare(`SELECT * FROM vendas ${sql} ORDER BY valor_total DESC, codigo ASC LIMIT ?`)
    .all(...params, limit) as unknown as Record<string, unknown>[];

  return { rows: rows.map(normalizeRow), total };
}

function normalizeRow(r: Record<string, unknown>): Sale {
  return {
    codigo: String(r.codigo ?? ""),
    data: r.data ? String(r.data) : null,
    dataAprovOrcamento: r.data_aprov_orcamento ? String(r.data_aprov_orcamento) : null,
    dataAprovPedido: r.data_aprov_pedido ? String(r.data_aprov_pedido) : null,
    dataAprovFaturamento: r.data_aprov_faturamento ? String(r.data_aprov_faturamento) : null,
    dataEmissaoFiscal: r.data_emissao_fiscal ? String(r.data_emissao_fiscal) : null,
    empresa: String(r.empresa ?? ""),
    statusSistema: String(r.status_sistema ?? ""),
    vendedor: String(r.vendedor ?? ""),
    categoria: String(r.categoria ?? ""),
    status: String(r.status ?? ""),
    origem: String(r.origem ?? ""),
    cliente: String(r.cliente ?? ""),
    cidade: String(r.cidade ?? ""),
    estado: String(r.estado ?? ""),
    regiao: String(r.regiao ?? ""),
    transportadora: String(r.transportadora ?? ""),
    frete: Number(r.frete) || 0,
    desconto: Number(r.desconto) || 0,
    comissao: Number(r.comissao) || 0,
    valorTotal: Number(r.valor_total) || 0,
    nfe: String(r.nfe ?? ""),
    mes: r.mes ? (String(r.mes) as Sale["mes"]) : null,
    ano: r.ano ? Number(r.ano) : null,
  };
}