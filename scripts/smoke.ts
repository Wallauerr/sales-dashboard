import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";

import { SalesDatabase } from "../src/main/db/database.ts";
import { importWorkbook } from "../src/main/ingest/index.ts";
import { getSnapshot } from "../src/main/kpis/index.ts";
import { getVendas } from "../src/main/vendas/index.ts";

const HEADERS = [
  "Código",
  "Data",
  "Data Aprov Orçamento",
  "Empresa",
  "Status Sistema",
  "Vendedor",
  "Categoria",
  "Status",
  "Origem",
  "Cliente",
  "Cidade",
  "Estado",
  "Região",
  "Transportadora",
  "Frete (R$)",
  "Desconto (R$)",
  "Comissão (R$)",
  "Valor Total(R$)",
  "NF-e/NFS-e",
  "Data Aprov Pedido",
  "Data Aprov Faturamento",
  "Data Emissão Fiscal",
];

const ROWS: unknown[][] = [
  ["1", "05/01/2025", "", "X", "Pedido Faturado", "Bruno Keller", "Equipamentos", "", "", "A", "Alegre", "RS", "Sul", "", 0, 0, 0, 1000, ""],
  ["2", "10/02/2025", "", "X", "Pedido Faturado", "Rosemeri", "Neodimio", "", "", "B", "Porto", "RS", "Sul", "", 0, 0, 0, 1000, ""],
  ["10", "15/01/2026", "", "X", "Pedido Faturado", "Bruno Keller", "Equipamentos", "", "", "C1", "Alegre", "RS", "Sul", "", 0, 0, 0, 1000, ""],
  ["11", "16/01/2026", "", "X", "Pedido Faturado", "Rosemeri", "Neodimio", "", "", "C2", "Porto", "RS", "Sul", "", 0, 0, 0, 2000, ""],
  ["12", "17/01/2026", "", "X", "Pedido Faturado", "Stephani Strack da Silva", "Follow-Up", "", "", "C3", "Lins", "SP", "Sudeste", "", 0, 0, 0, 3000, ""],
  ["13", "20/01/2026", "20/01/2026", "X", "Orçamento", "Bruno Keller", "Equipamentos", "", "", "C4", "Alegre", "RS", "Sul", "", 0, 0, 0, 500, ""],
  ["14", "05/02/2026", "", "X", "Pedido", "Ursula", "Neodimio", "", "", "C5", "Curitiba", "PR", "Sul", "", 0, 0, 0, 4000, ""],
];

function writeWorkbook(rows: unknown[][]): string {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Base");
  const filePath = join(tmpdir(), `smoke-base-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`);
  writeFileSync(filePath, XLSX.write(wb, { type: "buffer" }));
  return filePath;
}

function check(label: string, got: unknown, expected: unknown): void {
  assert.deepEqual(got, expected, `${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  console.log(`PASS ${label}`);
}

async function main(): Promise<void> {
  const db = SalesDatabase.open(new DatabaseSync(":memory:"));
  const filePath = writeWorkbook(ROWS);

  const result = await importWorkbook(db, filePath);
  check("import inserted", result.inserted, ROWS.length);
  check("last import path persisted", db.getMeta("last_import_path"), filePath);

  const s = await getSnapshot(db, 2026);
  check("totalPeriodo 2026", s.totalPeriodo, 10000);
  check("totalHistorico", s.totalHistorico, 12000);
  check("metaAnual 2026", s.metaAnual, 2300);
  check("quantidade jan", s.quantidadePorMes.jan, 3);
  check("quantidade fev", s.quantidadePorMes.fev, 1);
  check("faturamento jan", s.faturamentoPorMes.jan, 6000);
  check("faturamento fev", s.faturamentoPorMes.fev, 4000);
  check("funil jan", { orcamento: s.funilPorMes[0].orcamento, faturado: s.funilPorMes[0].pedidoFaturado }, { orcamento: 1, faturado: 3 });
  check("fechamento jan", s.numeroFechamento.jan, { orcamento: 1, pedido: 3 });
  check("ticket Equipamentos", s.ticketMedio.find((t) => t.produto === "Equipamentos")?.ticket, 1000);
  check("ticket Follow-Up", s.ticketMedio.find((t) => t.produto === "Follow-Up")?.ticket, 3000);

  const sorted = [...s.porVendedor].sort((a, b) => b.valor - a.valor);
  check("vendedores top", sorted[0], { vendedor: "Ursula", valor: 4000, share: 0.4 });

  assert.throws(() => getVendas(db, { ano: "2026" }), /expected number/);
  assert.throws(() => getVendas(db, { ano: 2026, mes: "janeiro" }), /expected number|invalid_enum_value|expected.*jan/);
  const fat = getVendas(db, { ano: 2026, statusSistema: "__fat__" }, 100);
  check("getVendas faturamento count", fat.total, 4);
  check("getVendas faturamento sum", fat.rows.reduce((a, r) => a + r.valorTotal, 0), 10000);
  check("getVendas order desc", fat.rows[0].codigo, "14");

  console.log("\n— Reconciliação diária por codigo (orçamento evolui para pedido) —");
  const db2 = SalesDatabase.open(new DatabaseSync(":memory:"));
  const dayA = writeWorkbook([
    ["900", "10/05/2026", "10/05/2026", "", "Orçamento", "V1", "Equipamentos", "", "", "CA", "Alegre", "RS", "Sul", "", 0, 0, 0, 5000, "", "", "", ""],
    ["901", "01/01/2026", "", "", "Pedido Faturado", "V2", "Neodimio", "", "", "CB", "Porto", "RS", "Sul", "", 0, 0, 0, 2000, "", "", "", ""],
  ]);
  const dayB = writeWorkbook([
    ["900", "12/07/2026", "10/05/2026", "", "Pedido Faturado", "V1", "Equipamentos", "", "", "CA", "Alegre", "RS", "Sul", "", 0, 0, 0, 5000, "", "", "12/07/2026", ""],
    ["902", "11/07/2026", "11/07/2026", "", "Orçamento", "V3", "Follow-Up", "", "", "CC", "Lins", "SP", "Sudeste", "", 0, 0, 0, 400, "", "", "", ""],
  ]);

  const rA = await importWorkbook(db2, dayA);
  check("dia A: 2 inseridos", rA.inserted, 2);
  const rB = await importWorkbook(db2, dayB);
  check("dia B: 1 novo + 1 atualizado", { inserted: rB.inserted, updated: rB.updated }, { inserted: 1, updated: 1 });
  check("total de linhas sem duplicar", (db2.raw.prepare("SELECT COUNT(*) AS n FROM vendas").get() as { n: number }).n, 3);

  const s2 = await getSnapshot(db2, 2026);
  check("faturamento maio zerado (900 saiu do orçamento)", s2.faturamentoPorMes.mai, 0);
  check("faturamento julho inclui venda aprovada", s2.faturamentoPorMes.jul, 5000);
  check("funil julho", { orcamento: s2.funilPorMes[6].orcamento, faturado: s2.funilPorMes[6].pedidoFaturado }, { orcamento: 1, faturado: 1 });
  check("quantidade julho", s2.quantidadePorMes.jul, 1);
  check("total do período 2026", s2.totalPeriodo, 7000);

  console.log("SMOKE PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});