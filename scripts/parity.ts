import { DatabaseSync } from "node:sqlite";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { SalesDatabase } from "../src/main/db/database.ts";
import { getSnapshot } from "../src/main/kpis/index.ts";
import { importWorkbook } from "../src/main/ingest/index.ts";
import { titleCase, canonicalEstado, canonicalRegion } from "../src/main/ingest/normalize.ts";
import { MESES } from "../src/shared/types.ts";

const INPUT = process.argv[2] ?? "/home/wallauer/coding/Metas Comercial.xlsx";
const ANO = 2026;

let failed = 0;
function check(name: string, actual: number, expected: number, tol = 0.01): void {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got ${actual} expected ${expected}${ok ? "" : ` (Δ ${(actual - expected).toFixed(2)})`}`);
}
function show(name: string, actual: number, expected: number): void {
  console.log(`INFO ${name}: engine=${actual.toFixed(2)} excel-pivot=${expected.toFixed(2)} Δ=${(actual - expected).toFixed(2)}`);
}
function soft(name: string, actual: number, expected: number): void {
  console.log(`INFO ${name}: got ${actual} excel-pivot(stale)=${expected} Δ=${(actual - expected).toFixed(2)}`);
}

interface Ref {
  fatMes: Record<string, number>;
  qtdMes: Record<string, number>;
  funil: Record<string, number[]>;
  funilTot: Record<string, number>;
  vendedor: Map<string, number>;
  estado: Map<string, number>;
  regiao: Map<string, number>;
  anoAnterior: Record<string, number>;
  total2026: number;
  totalHistorico: number;
  linhas: number;
}

function reference(): Ref {
  const wb = XLSX.read(readFileSync(INPUT), { type: "buffer", cellDates: false });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Base"], { defval: "" });
  // Espelha a regra do motor: linhas sem código são descartadas e,
  // para códigos repetidos, vale a última ocorrência (reconciliação por codigo).
  const byCode = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const c = String(r["Código"] ?? "").trim();
    if (!c) continue;
    byCode.set(c, r);
  }
  const effective = [...byCode.values()];
  const fatMes: Record<string, number> = {};
  const qtdMes: Record<string, number> = {};
  const funil: Record<string, number[]> = {};
  const funilTot: Record<string, number> = {};
  const vendedor = new Map<string, number>();
  const estado = new Map<string, number>();
  const regiao = new Map<string, number>();
  const anoAnterior: Record<string, number> = {};
  const statuses = ["Orçamento", "Pedido", "Pedido Aprovado Sem Faturamento", "Pedido Cancelado", "Pedido Faturado", "Pedido Nao Faturado"];
  for (const s of statuses) {
    funil[s] = MESES.map(() => 0);
    funilTot[s] = 0;
  }
  let total2026 = 0;
  let totalHistorico = 0;
  for (const r of effective) {
    const st = String(r["Status Sistema"] ?? "").trim();
    const valor = Number(r["Valor Total(R$)"]) || 0;
    const mesC = String(r["Mês"] ?? "").trim();
    const anoC = Number(r["Ano"]);
    const mesIdx = MESES.indexOf(mesC as never);
    const mesValido = mesIdx >= 0;
    const anov = Number.isInteger(anoC) && anoC >= 2000 && anoC <= 2099 ? anoC : null;
    if (st === "Pedido" || st === "Pedido Faturado") {
      totalHistorico += valor;
      if (anov === ANO) {
        total2026 += valor;
        if (mesValido) {
          fatMes[mesC] = (fatMes[mesC] ?? 0) + valor;
          qtdMes[mesC] = (qtdMes[mesC] ?? 0) + 1;
        }
        vendedor.set(titleCase(String(r["Vendedor"] ?? "")), (vendedor.get(titleCase(String(r["Vendedor"] ?? ""))) ?? 0) + valor);
        estado.set(canonicalEstado(String(r["Estado"] ?? "")), (estado.get(canonicalEstado(String(r["Estado"] ?? ""))) ?? 0) + valor);
        const regKey = canonicalRegion(canonicalEstado(String(r["Estado"] ?? "")), String(r["Região"] ?? ""));
        regiao.set(regKey, (regiao.get(regKey) ?? 0) + valor);
      }
      if (anov === ANO - 1 && mesValido) anoAnterior[mesC] = (anoAnterior[mesC] ?? 0) + valor;
    }
    if (mesValido && anov === ANO) {
      const key = statuses.find((s) => st === s);
      if (key) {
        funil[key][mesIdx] += 1;
        funilTot[key] += 1;
      }
    }
  }
  void funilTot;
  return { fatMes, qtdMes, funil, funilTot, vendedor, estado, regiao, anoAnterior, total2026, totalHistorico, linhas: effective.length };
}

async function main(): Promise<void> {
  const db = SalesDatabase.open(new DatabaseSync(":memory:"));
  const result = await importWorkbook(db, INPUT);
  console.log(`IMPORT ${result.filePath}: ${result.totalRows} linhas -> ${result.inserted} inseridas, ${result.updated} atualizadas, ${result.discarded} descartadas`);

  const ref = reference();
  check("total de linhas", result.totalRows, 18419);
  const tableCount = (db.raw.prepare("SELECT COUNT(*) AS n FROM vendas").get() as { n: number }).n;
  check("linhas na tabela == referência (distinto por codigo)", tableCount, ref.linhas);
  check("descartadas == linhas sem codigo", result.discarded, 294);
  show("faturamento 2026 (referência cache, reconciliado)", ref.total2026, 7901673.35);

  const s = getSnapshot(db, ANO);

  check("faturamento 2026 total do motor == ref", s.totalPeriodo, ref.total2026, 0.05);
  show("faturamento 2026 total vs pivot (stale)", s.totalPeriodo, 7909136.78);

  console.log("\n— Faturamento por mês (motor vs referência-exata vs pivot obsoleto) —");
  let qtdEngTotal = 0;
  for (const mes of MESES) {
    const e = s.faturamentoPorMes[mes];
    const r = ref.fatMes[mes] ?? 0;
    check(`fat ${mes} motor==ref`, e, r, 0.01);
    show(`fat ${mes} vs pivot`, e, { jan: 360070.14, fev: 1110758.62, mar: 1371689.1, abr: 850610.12, mai: 1916537.99, jun: 749191.42, jul: 636787.25, ago: 880656.22, set: 32835.92, out: 0, nov: 0, dez: 0 }[mes] ?? 0);
    qtdEngTotal += s.quantidadePorMes[mes];
  }

  console.log("\n— Quantidade por mês (motor vs ref vs pivot) —");
  for (const mes of MESES) {
    check(`qtd ${mes} motor==ref`, s.quantidadePorMes[mes], ref.qtdMes[mes] ?? 0);
  }
  check("qtd total", qtdEngTotal, Object.values(ref.qtdMes).reduce((a, b) => a + b, 0));

  console.log("\n— Funil (contagem de vendas por status x mês) —");
  const pivotFunil: Record<string, number[]> = {
    "Orçamento": [84, 90, 119, 120, 104, 136, 175, 172, 12, 0, 0, 0],
    "Pedido": [34, 49, 42, 36, 55, 38, 39, 63, 4, 0, 0, 0],
    "Pedido Aprovado Sem Faturamento": [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
    "Pedido Cancelado": [1, 7, 8, 6, 7, 3, 7, 3, 0, 0, 0, 0],
    "Pedido Faturado": [87, 100, 130, 126, 111, 133, 133, 99, 0, 0, 0, 0],
    "Pedido Nao Faturado": [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  };
  const funnelTotPivot: Record<string, number> = { "Orçamento": 1012, "Pedido": 360, "Pedido Aprovado Sem Faturamento": 3, "Pedido Cancelado": 42, "Pedido Faturado": 919, "Pedido Nao Faturado": 1 };
  for (const mes of MESES) {
    const f = s.funilPorMes[MESES.indexOf(mes)];
    const field: Record<string, keyof typeof f> = {
      "Orçamento": "orcamento",
      "Pedido": "pedido",
      "Pedido Aprovado Sem Faturamento": "pedidoAprovadoSemFaturamento",
      "Pedido Cancelado": "pedidoCancelado",
      "Pedido Faturado": "pedidoFaturado",
      "Pedido Nao Faturado": "pedidoNaoFaturado",
    };
    for (const st of Object.keys(pivotFunil)) {
      check(`funil ${st} ${mes} (motor==ref)`, f[field[st]] as number, ref.funil[st][MESES.indexOf(mes)]);
      soft(`funil ${st} ${mes} (motor==pivot)`, f[field[st]] as number, pivotFunil[st][MESES.indexOf(mes)]);
    }
  }
  for (const st of Object.keys(funnelTotPivot)) {
    const field = { "Orçamento": "orcamento", "Pedido": "pedido", "Pedido Aprovado Sem Faturamento": "pedidoAprovadoSemFaturamento", "Pedido Cancelado": "pedidoCancelado", "Pedido Faturado": "pedidoFaturado", "Pedido Nao Faturado": "pedidoNaoFaturado" }[st] as "orcamento";
    const tot = s.funilPorMes.reduce((a, m) => a + (m[field] as number), 0);
    soft(`funil ${st} total (motor==pivot)`, tot, funnelTotPivot[st]);
  }
  soft("funil Total Geral (jan..set)", s.funilPorMes.reduce((a, m) => a + m.total, 0), 2337);
  soft("nº fechamento abr orçamento", s.numeroFechamento.abr.orcamento, 121);
  soft("nº fechamento abr pedido", s.numeroFechamento.abr.pedido, 168);

  console.log("\n— Vendedores 2026 —");
  let vendSum = 0;
  for (const v of s.porVendedor) {
    vendSum += v.valor;
    const r = ref.vendedor.get(v.vendedor) ?? 0;
    if (Math.abs(v.valor - r) > 0.01) {
      failed += 1;
      console.log(`FAIL vendedor ${v.vendedor}: motor=${v.valor.toFixed(2)} ref=${r.toFixed(2)}`);
    } else {
      console.log(`PASS vendedor ${v.vendedor}: ${v.valor.toFixed(2)} (share ${(v.share * 100).toFixed(2)}%)`);
    }
  }
  check("soma vendedores == ref", vendSum, ref.total2026, 0.05);
  show("soma vendedores vs pivot", vendSum, 7909136.78);

  console.log("\n— Estado x Região 2026 —");
  const regiaoPivot: Record<string, number> = { norte: 80884.64, nordeste: 283801.21, "centro-oeste": 462033.09, sudeste: 870485.3, sul: 6211542.54 };
  let regSum = 0;
  for (const v of s.porRegiao) {
    regSum += v.valor;
    const r = ref.regiao.get(v.regiao) ?? 0;
    if (Math.abs(v.valor - r) > 0.01) {
      failed += 1;
      console.log(`FAIL região ${v.regiao}: motor=${v.valor.toFixed(2)} ref=${r.toFixed(2)}`);
    } else {
      console.log(`PASS região ${v.regiao}: ${v.valor.toFixed(2)} (x=${v.x},y=${v.y}) vs pivot ${regiaoPivot[v.regiao.toLowerCase()] ?? "-"}`);
    }
  }
  check("soma regiões == ref", regSum, ref.total2026, 0.05);
  check("região = exata (ref) total == faturamento", regSum, s.totalPeriodo, 0.01);
  const rs = s.porEstado.find((e) => e.estado === "RS");
  check("estado RS motor==ref", rs?.valor ?? -1, ref.estado.get("RS") ?? -1, 0.01);
  show("estado RS vs pivot", rs?.valor ?? -1, 2174577.39);

  console.log("\n— Metas —");
  const baseAnteriorRef = Object.values(ref.anoAnterior).reduce((a, b) => a + b, 0);
  check("base meta anual == faturamento 2025 (ref)", s.metaAnualBase, baseAnteriorRef, 0.05);
  check("meta anual = base x1,15", s.metaAnual, Number((baseAnteriorRef * 1.15).toFixed(2)), 0.05);
  show("meta anual 2026 vs Excel (pivot corrompido dobrado)", s.metaAnual, 18066688.05);
  for (let i = 0; i < 9; i++) {
    const mes = MESES[i];
    const e = s.metasPorMes[i].faturamentoAnoAnterior;
    const r = ref.anoAnterior[mes] ?? 0;
    check(`meta base ${mes} (faturamento 2025) motor==ref`, e, r, 0.01);
  }

  console.log("\n— Ticket médio —");
  const tmPivot: Record<string, number> = { Equipamentos: 16346.53, Neodimio: 1176.02, "Follow-Up": 18468.83 };
  for (const t of s.ticketMedio) {
    console.log(`INFO ticket ${t.produto}: motor=${t.ticket.toFixed(2)} (valor ${t.valor.toFixed(2)} / volume ${t.volume}) pivot=${tmPivot[t.produto]}`);
  }

  console.log("\n— Histórico —");
  check("total histórico motor == ref", s.totalHistorico, ref.totalHistorico, 0.05);
  show("total histórico vs Gráfico9 (stale)", s.totalHistorico, 34845425.77);
  console.log(`INFO participação ano corrente: ${(s.participacaoAno * 100).toFixed(2)}%`);

  console.log(failed === 0 ? "\nPARITY: TODOS OS CHECKS PASSARAM" : `\nPARITY: ${failed} CHECKS FALHARAM`);
  process.exit(failed === 0 ? 0 : 1);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(2);
}