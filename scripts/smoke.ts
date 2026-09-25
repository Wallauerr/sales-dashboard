import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";

import { SalesDatabase } from "../src/main/db/database.ts";
import { importWorkbook } from "../src/main/ingest/index.ts";
import { getSnapshot } from "../src/main/kpis/index.ts";
import { buildWorkbookWithPhoto } from "./photo-fixture.ts";

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

  console.log("\n— Histórico de imports e evolução por codigo —");
  const imports = db2.listImports();
  check("log de imports: 2 registros", imports.length, 2);
  check("log import dia A", { totalRows: imports[1]?.totalRows, inserted: imports[1]?.inserted, updated: imports[1]?.updated, discarded: imports[1]?.discarded }, { totalRows: 2, inserted: 2, updated: 0, discarded: 0 });
  check("log import dia B", { totalRows: imports[0]?.totalRows, inserted: imports[0]?.inserted, updated: imports[0]?.updated }, { totalRows: 2, inserted: 1, updated: 1 });

  const h900 = db2.getCodigoHistory("900");
  check("codigo 900: estado atual", { venda: h900.venda?.statusSistema, valor: h900.venda?.valorTotal }, { venda: "Pedido Faturado", valor: 5000 });
  check(
    "codigo 900: evolução nos imports",
    h900.events.map((e) => `${e.op}:${e.statusSistema}`),
    ["inserted:Orçamento", "updated:Pedido Faturado"],
  );
  check(
    "codigo 900: primeiro evento guarda valor/mês",
    { valor: h900.events[0]?.valorTotal, mes: h900.events[0]?.mes, ano: h900.events[0]?.ano },
    { valor: 5000, mes: "mai", ano: 2026 },
  );
  check("codigo 901 reexportado sem mudança gera 1 só evento", db2.getCodigoHistory("901").events.length, 1);
  const h999 = db2.getCodigoHistory("999");
  check("codigo inexistente", { venda: h999.venda, eventos: h999.events.length }, { venda: null, eventos: 0 });

  console.log("\n— Filtros de escopo (mês e vendedor) —");
  const sUrsula = await getSnapshot(db, 2026, { vendedor: "Ursula" });
  check("filtro vendedor faturamento", sUrsula.totalPeriodo, 4000);
  check("filtro vendedor mantém lista completa", sUrsula.porVendedor.some((v) => v.vendedor === "Ursula"), true);
  const sFev = await getSnapshot(db, 2026, { mes: "fev" });
  check("filtro mês faturamento", sFev.totalPeriodo, 4000);
  check("filtro mês zera outros meses", Object.values(sFev.faturamentoPorMes).filter((v) => v > 0).length, 1);
  const sUrsulaFev = await getSnapshot(db, 2026, { mes: "fev", vendedor: "Ursula" });
  check("filtro mês+vendedor", sUrsulaFev.totalPeriodo, 4000);

  console.log("\n— Fotos embutidas na planilha (xlsx com imagem ancorada) —");
  const fotoPath = join(tmpdir(), `smoke-foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`);
  writeFileSync(fotoPath, buildWorkbookWithPhoto());
  await importWorkbook(db, fotoPath);
  const fotos = db.listVendedorFotos();
  check("foto extraída para Rosemeri", fotos[0]?.vendedor, "Rosemeri");
  check("foto com mime png", fotos[0]?.mime, "image/png");
  check("foto não vazia", (fotos[0]?.img.length ?? 0) > 0, true);
  check("apenas fotos mapeadas", (fotos[0]?.img.length ?? 0) > 0 && fotos.every((f) => f.vendedor), true);

  console.log("SMOKE PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});