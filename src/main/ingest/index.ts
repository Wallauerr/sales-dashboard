import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import type { ImportResult, Mes, Sale } from "../../shared/types.ts";
import { MESES } from "../../shared/types.ts";
import type { SalesDatabase } from "../db/database.ts";
import { canonicalEstado, canonicalRegion, monthKey, parseDate, statusRaw, titleCase, uppercase, toISO } from "./normalize.ts";

interface RawBaseRow {
  "Código": string;
  "Data"?: string;
  "Data Aprov Orçamento"?: string;
  "Data Aprov Pedido"?: string;
  "Data Aprov Faturamento"?: string;
  "Data Emissão Fiscal"?: string;
  "Empresa"?: string;
  "Status Sistema"?: string;
  "Vendedor"?: string;
  "Categoria"?: string;
  "Status"?: string;
  "Origem"?: string;
  "Cliente"?: string;
  "Cidade"?: string;
  "Estado"?: string;
  "Região"?: string;
  "Transportadora"?: string;
  "Frete (R$)"?: number;
  "Desconto (R$)"?: number;
  "Comissão (R$)"?: number;
  "Valor Total(R$)"?: number;
  "NF-e/NFS-e"?: string;
  "Mês"?: string;
  "Ano"?: number;
  "Quantidade"?: number;
}

function readWorkbook(filePath: string): RawBaseRow[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets["Base"];
  if (!ws) throw new Error(`Planilha "Base" não encontrada em ${filePath}`);
  return XLSX.utils.sheet_to_json<RawBaseRow>(ws, { defval: "" });
}

function normalizeRow(raw: RawBaseRow): Sale {
  const data = parseDate(raw["Data"]);
  const dataAprovOrcamento = parseDate(raw["Data Aprov Orçamento"] ?? "");
  const dataAprovPedido = parseDate(raw["Data Aprov Pedido"]);
  const dataAprovFaturamento = parseDate(raw["Data Aprov Faturamento"]);
  const dataEmissaoFiscal = parseDate(raw["Data Emissão Fiscal"]);
  const estado = canonicalEstado(String(raw["Estado"] ?? ""));
  const regiao = canonicalRegion(estado, String(raw["Região"] ?? ""));

  const mesCache = String(raw["Mês"] ?? "").trim() as Mes;
  const anoCache = raw["Ano"] as number;
  const cacheValido =
    (MESES as readonly string[]).includes(mesCache) &&
    Number.isInteger(anoCache) &&
    anoCache >= 2000 &&
    anoCache <= 2099;
  const dEng = dataAprovOrcamento ?? data;
  const mes: Mes | null = cacheValido ? mesCache : dEng ? monthKey(dEng) : null;
  const ano: number | null = cacheValido ? anoCache : dEng ? dEng.getFullYear() : null;

  return {
    codigo: String(raw["Código"]).trim(),
    data: data ? toISO(data) : null,
    dataAprovOrcamento: dataAprovOrcamento ? toISO(dataAprovOrcamento) : null,
    dataAprovPedido: dataAprovPedido ? toISO(dataAprovPedido) : null,
    dataAprovFaturamento: dataAprovFaturamento ? toISO(dataAprovFaturamento) : null,
    dataEmissaoFiscal: dataEmissaoFiscal ? toISO(dataEmissaoFiscal) : null,
    empresa: uppercase(String(raw["Empresa"] ?? "")),
    statusSistema: statusRaw(String(raw["Status Sistema"] ?? "")),
    vendedor: titleCase(String(raw["Vendedor"] ?? "")),
    categoria: String(raw["Categoria"] ?? "").trim(),
    status: String(raw["Status"] ?? "").trim(),
    origem: String(raw["Origem"] ?? "").trim(),
    cliente: String(raw["Cliente"] ?? "").trim(),
    cidade: String(raw["Cidade"] ?? "").trim(),
    estado,
    regiao,
    transportadora: String(raw["Transportadora"] ?? "").trim(),
    frete: Number(raw["Frete (R$)"]) || 0,
    desconto: Number(raw["Desconto (R$)"]) || 0,
    comissao: Number(raw["Comissão (R$)"]) || 0,
    valorTotal: Number(raw["Valor Total(R$)"]) || 0,
    nfe: String(raw["NF-e/NFS-e"] ?? "").trim(),
    mes,
    ano,
    quantidade: Number(raw["Quantidade"]) || 0,
  };
}

export async function importWorkbook(db: SalesDatabase, filePath: string): Promise<ImportResult> {
  const rows = readWorkbook(filePath);
  const result: ImportResult = { filePath, totalRows: rows.length, inserted: 0, updated: 0, discarded: 0 };

  db.raw.exec("BEGIN");
  try {
    db.clear();
    for (const raw of rows) {
      db.insertSale(normalizeRow(raw));
      result.inserted += 1;
    }
    db.raw.exec("COMMIT");
  } catch (err) {
    db.raw.exec("ROLLBACK");
    throw err;
  }

  db.logImport(result);
  return result;
}