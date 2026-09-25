import type { FunnelMonth, KpiSnapshot, Mes, MetasMes, TicketMedio } from "../../shared/types.ts";
import { MESES, STATUS_FATURAMENTO } from "../../shared/types.ts";
import type { SalesDatabase } from "../db/database.ts";

const PRODUTOS_VENDEDORES: Record<string, string[]> = {
  Equipamentos: ["Bruno Keller", "Iago Gernhardt Benedetto", "Sul Magnéticos Equipamentos Industriais Eireli", "Vinicius Horn"],
  Neodimio: ["Rosemeri", "Ursula"],
  "Follow-Up": ["Stephani Strack da Silva"],
};

const REGIAO_MAPA: Record<string, { x: number; y: number }> = {
  Norte: { x: 30, y: 80 },
  Nordeste: { x: 90, y: 70 },
  "Centro-Oeste": { x: 50, y: 50 },
  Sudeste: { x: 80, y: 30 },
  Sul: { x: 60, y: 10 },
};

const IN_FATURAMENTO = `status_sistema IN (${STATUS_FATURAMENTO.map(() => "?").join(", ")})`;

function metricasPorMes(db: SalesDatabase, ano: number, expr: "SUM(valor_total)" | "COUNT(*)"): Record<Mes, number> {
  const rows = db.raw
    .prepare(`SELECT mes, ${expr} AS v FROM vendas WHERE ano = ? AND ${IN_FATURAMENTO} GROUP BY mes`)
    .all(ano, ...STATUS_FATURAMENTO) as { mes: string | null; v: number }[];
  const out = Object.fromEntries(MESES.map((m) => [m, 0])) as Record<Mes, number>;
  for (const r of rows) {
    const key = r.mes as Mes;
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = r.v;
  }
  return out;
}

function faturamentoPorMes(db: SalesDatabase, ano: number): Record<Mes, number> {
  return metricasPorMes(db, ano, "SUM(valor_total)");
}

function quantidadePorMes(db: SalesDatabase, ano: number): Record<Mes, number> {
  return metricasPorMes(db, ano, "COUNT(*)");
}

const COLUNA_GRUPO = { vendedor: "vendedor", estado: "estado", regiao: "regiao" } as const;

function somaPor(db: SalesDatabase, ano: number, coluna: keyof typeof COLUNA_GRUPO): { chave: string; valor: number }[] {
  const campo = COLUNA_GRUPO[coluna];
  return db.raw
    .prepare(
      `SELECT ${campo} AS chave, SUM(valor_total) AS valor FROM vendas
       WHERE ano = ? AND ${IN_FATURAMENTO} GROUP BY ${campo} ORDER BY valor DESC`,
    )
    .all(ano, ...STATUS_FATURAMENTO) as { chave: string; valor: number }[];
}

function shareDe(valor: number, total: number): number {
  return total ? valor / total : 0;
}

function porVendedor(db: SalesDatabase, ano: number, total: number): { vendedor: string; valor: number; share: number }[] {
  return somaPor(db, ano, "vendedor").map((r) => ({ vendedor: r.chave, valor: r.valor, share: shareDe(r.valor, total) }));
}

function porEstado(db: SalesDatabase, ano: number, total: number): { estado: string; valor: number; share: number }[] {
  return somaPor(db, ano, "estado").map((r) => ({ estado: r.chave, valor: r.valor, share: shareDe(r.valor, total) }));
}

function porRegiao(
  db: SalesDatabase,
  ano: number,
  total: number,
): { regiao: string; valor: number; share: number; x: number; y: number }[] {
  return somaPor(db, ano, "regiao").map((r) => ({
    regiao: r.chave,
    valor: r.valor,
    share: shareDe(r.valor, total),
    ...(REGIAO_MAPA[r.chave] ?? { x: 0, y: 0 }),
  }));
}

function countStatus(db: SalesDatabase, ano: number, mes: Mes, status: string): number {
  const r = db.raw
    .prepare("SELECT COUNT(*) AS n FROM vendas WHERE ano = ? AND mes = ? AND status_sistema = ?")
    .get(ano, mes, status) as { n: number };
  return r.n;
}

function funilPorMes(db: SalesDatabase, ano: number): FunnelMonth[] {
  return MESES.map((mes) => {
    const orcamento = countStatus(db, ano, mes, "Orçamento");
    const pedido = countStatus(db, ano, mes, "Pedido");
    const pedidoAprovadoSemFaturamento = countStatus(db, ano, mes, "Pedido Aprovado Sem Faturamento");
    const pedidoCancelado = countStatus(db, ano, mes, "Pedido Cancelado");
    const pedidoFaturado = countStatus(db, ano, mes, "Pedido Faturado");
    const pedidoNaoFaturado = countStatus(db, ano, mes, "Pedido Nao Faturado");
    return {
      mes,
      orcamento,
      pedido,
      pedidoAprovadoSemFaturamento,
      pedidoCancelado,
      pedidoFaturado,
      pedidoNaoFaturado,
      total: orcamento + pedido + pedidoAprovadoSemFaturamento + pedidoCancelado + pedidoFaturado + pedidoNaoFaturado,
    } as FunnelMonth;
  });
}

function numeroFechamento(db: SalesDatabase, ano: number): Record<Mes, { orcamento: number; pedido: number }> {
  const out = {} as Record<Mes, { orcamento: number; pedido: number }>;
  for (const mes of MESES) {
    const orcamento = countStatus(db, ano, mes, "Orçamento") + countStatus(db, ano, mes, "Pedido Aprovado Sem Faturamento");
    const pedido = countStatus(db, ano, mes, "Pedido") + countStatus(db, ano, mes, "Pedido Cancelado") + countStatus(db, ano, mes, "Pedido Faturado");
    out[mes] = { orcamento, pedido };
  }
  return out;
}

function ticketMedio(db: SalesDatabase, ano: number): TicketMedio[] {
  const placeholders = STATUS_FATURAMENTO.map(() => "?").join(", ");
  const out: TicketMedio[] = [];
  for (const [produto, vendedores] of Object.entries(PRODUTOS_VENDEDORES)) {
    const q = `SELECT COALESCE(SUM(valor_total), 0) AS valor, COUNT(*) AS volume FROM vendas
               WHERE ano = ? AND status_sistema IN (${placeholders})
                 AND vendedor IN (${vendedores.map(() => "?").join(", ")})`;
    const r = db.raw.prepare(q).get(ano, ...STATUS_FATURAMENTO, ...vendedores) as { valor: number; volume: number };
    out.push({ produto, valor: r.valor, volume: r.volume, ticket: r.volume ? r.valor / r.volume : 0 });
  }
  return out;
}

export function getSnapshot(db: SalesDatabase, ano: number): KpiSnapshot {
  const faturamento = faturamentoPorMes(db, ano);
  const totalPeriodo = MESES.reduce((acc, m) => acc + faturamento[m], 0);
  const totalHistorico =
    (db.raw
      .prepare(`SELECT COALESCE(SUM(valor_total),0) AS v FROM vendas WHERE ${IN_FATURAMENTO}`)
      .get(...STATUS_FATURAMENTO) as { v: number }).v;

  const baseAno = ano - 1;
  const faturamentoBase = faturamentoPorMes(db, baseAno);
  const totalBase = MESES.reduce((acc, m) => acc + faturamentoBase[m], 0);
  const fator = db.getFator(ano);
  const metaAnual = totalBase * fator;
  const metaAnualBase = totalBase;

  const metasPorMes: MetasMes[] = MESES.map((mes) => {
    const faturamentoAnoAnterior = faturamentoBase[mes];
    const meta = faturamentoAnoAnterior * fator;
    const atual = faturamento[mes];
    return {
      mes,
      faturamentoAnoAnterior,
      meta,
      acima: atual >= meta ? atual : 0,
      abaixo: atual <= meta ? atual : 0,
      restanteMes: meta - atual,
    };
  });

  const acumuladoPorMes = {} as Record<Mes, number>;
  const restanteAnoPorMes = {} as Record<Mes, number>;
  let acc = 0;
  for (const mes of MESES) {
    acc += faturamento[mes];
    acumuladoPorMes[mes] = acc;
    restanteAnoPorMes[mes] = metaAnual - acc;
  }

  return {
    ano,
    totalPeriodo,
    totalHistorico,
    participacaoAno: totalHistorico ? totalPeriodo / totalHistorico : 0,
    faturamentoPorMes: faturamento,
    quantidadePorMes: quantidadePorMes(db, ano),
    porVendedor: porVendedor(db, ano, totalPeriodo),
    porEstado: porEstado(db, ano, totalPeriodo),
    porRegiao: porRegiao(db, ano, totalPeriodo),
    funilPorMes: funilPorMes(db, ano),
    numeroFechamento: numeroFechamento(db, ano),
    ticketMedio: ticketMedio(db, ano),
    metaAnual: Number(metaAnual.toFixed(2)),
    metaAnualBase: Number(metaAnualBase.toFixed(2)),
    fator,
    metasPorMes,
    acumuladoPorMes,
    restanteAnoPorMes,
  };
}