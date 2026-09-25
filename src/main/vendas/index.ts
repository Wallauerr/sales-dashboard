import { STATUS_FATURAMENTO } from "../../shared/types.ts";
import { saleSchema, vendasFilterSchema, vendasPageSchema } from "../../shared/schemas.ts";
import { rowToSale } from "../db/rows.ts";
import type { SalesDatabase } from "../db/database.ts";

export function getVendas(db: SalesDatabase, filtersInput: unknown, limit = 200) {
  const filters = vendasFilterSchema.parse(filtersInput);
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

  return vendasPageSchema.parse({ rows: rows.map((r) => saleSchema.parse(rowToSale(r))), total });
}