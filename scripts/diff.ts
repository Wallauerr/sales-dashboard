import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { parseDate, canonicalStatus, canonicalEstado, canonicalRegion, titleCase } from "../src/main/ingest/normalize.ts";
import { monthKey } from "../src/main/ingest/normalize.ts";

const INPUT = process.argv[2] ?? "/home/wallauer/coding/Metas Comercial.xlsx";
const buf = readFileSync(INPUT);
const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Base"], { defval: "" });

let tipoMesAnoDiff = 0;
let statusDiff = 0;
let estadoDiff = 0;
let regiaoDiff = 0;
let pedidoLower = 0;
let mesDiffDetail = 0;
let orcEmptyButDataPresent = 0;

const bySellerEngine = new Map<string, number>();
const bySellerCached = new Map<string, number>();
const tipoDetalhe = new Map<string, number>();

for (const r of rows) {
  const codigo = String(r["Código"] ?? "").trim();
  const stRaw = canonicalStatus(String(r["Status Sistema"] ?? "").trim());
  const stCached = String(r["Status Sistema"] ?? "").trim();
  if (stRaw !== stCached) {
    statusDiff += 1;
    if (stRaw === "Pedido") pedidoLower += 1;
  }

  const orc = parseDate(String(r["Data Aprov Orçamento"] ?? ""));
  const data = parseDate(String(r["Data"] ?? ""));
  let orcEmpty = false;
  if ((String(r["Data Aprov Orçamento"] ?? "")).trim() === "") orcEmpty = true;
  const dEng = orc ?? data;
  const engMes = dEng ? monthKey(dEng) : null;
  const engAno = dEng ? dEng.getFullYear() : null;

  const cachedMes = String(r["Mês"] ?? "").trim() || null;
  const cachedAno = r["Ano"] ? Number(r["Ano"]) : null;

  const mesOk = engMes === cachedMes;
  const anoOk = engAno === cachedAno;
  if (!mesOk || !anoOk) {
    tipoMesAnoDiff += 1;
    if (!orcEmpty && data && (String(r["Data"] ?? "")).trim() !== "") {
      // orçamento date present and data present too
      mesDiffDetail += 1;
    }
    if (orcEmpty && data) orcEmptyButDataPresent += 1;
    const key = `mes=${engMes}/${cachedMes} ano=${engAno}/${cachedAno} orcEmpty=${orcEmpty}`;
    tipoDetalhe.set(key, (tipoDetalhe.get(key) ?? 0) + 1);
  }

  const estCached = String(r["Mês"] ?? "");
  void estCached;

  const estEng = canonicalEstado(String(r["Estado"] ?? ""));
  const estCachedUf = String(r["Estado"] ?? "").trim();
  if (estEng !== estCachedUf && estEng !== estCachedUf.toUpperCase()) estadoDiff += 1;

  const regEng = canonicalRegion(estEng, String(r["Região"] ?? ""));
  const regCached = String(r["Região"] ?? "").trim();
  if (regEng.toLowerCase() !== regCached.toLowerCase() && !(regCached === "" || regCached === " — " || regCached === "-")) regiaoDiff += 1;

  if ((stRaw === "Pedido" || stRaw === "Pedido Faturado") && dEng && dEng.getFullYear() === 2026) {
    const v = Number(r["Valor Total(R$)"]) || 0;
    const vendedorEng = titleCase(String(r["Vendedor"] ?? ""));
    const vendedorCached = String(r["Vendedor"] ?? "").trim();
    bySellerEngine.set(vendedorEng, (bySellerEngine.get(vendedorEng) ?? 0) + v);
    bySellerCached.set(vendedorCached, (bySellerCached.get(vendedorCached) ?? 0) + v);
  }
}

console.log(`statusDiff(pedido lower → Pedido)=${statusDiff} (lowercase 'pedido' rows: ${pedidoLower})`);
console.log(`mes/ano diff total=${tipoMesAnoDiff} (mesDiff with both dates present=${mesDiffDetail}, orcEmpty→data=${orcEmptyButDataPresent})`);
console.log(`estado canonical diffs=${estadoDiff}, regiao canonical diffs=${regiaoDiff}`);

const sorted = [...tipoDetalhe.entries()].sort((a, b) => b[1] - a[1]);
console.log("\nTop tipos de divergência (config, ocorrências):");
for (const [k, n] of sorted.slice(0, 15)) console.log(`  ${n}\t${k}`);

console.log("\nVendedor engine vs cached (2026, Pedido/Faturado):");
const names = new Set([...bySellerEngine.keys(), ...bySellerCached.keys()]);
let sumEng = 0, sumCached = 0;
for (const n of names) {
  const e = bySellerEngine.get(n) ?? 0;
  const c = bySellerCached.get(n) ?? 0;
  sumEng += e; sumCached += c;
  console.log(`  ${n}: engine=${e.toFixed(2)} cached=${c.toFixed(2)} Δ=${(e - c).toFixed(2)}`);
}
console.log(`  TOTAL engine=${sumEng.toFixed(2)} cached=${sumCached.toFixed(2)} Δ=${(sumEng - sumCached).toFixed(2)}`);