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

function check(label: string, got: unknown, expected: unknown): void {
  assert.deepEqual(got, expected, `${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  console.log(`PASS ${label}`);
}

async function main(): Promise<void> {
  const db = SalesDatabase.open(new DatabaseSync(":memory:"));
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Base");
  const filePath = join(tmpdir(), `smoke-base-${Date.now()}.xlsx`);
  writeFileSync(filePath, XLSX.write(wb, { type: "buffer" }));

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

  console.log("SMOKE PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});