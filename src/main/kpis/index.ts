import type { FunnelMonth, KpiSnapshot, Mes, MetasMes, SnapshotFilter, TicketMedio } from "../../shared/types.ts";
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

interface Escopo {
  where: string;
  params: (string | number)[];
}

// Escopo da consulta: sempre o ano, restringindo a um mês e/ou a um vendedor.
// Sem filtro de mês/vendedor equivale ao panorama anual completo. O restritor
// de status de faturamento é opcional: o funil e o nº de fechamento contam cada
// status individualmente e não podem nascer já filtrados.
function escopo(ano: number, filtro: SnapshotFilter | null | undefined, opts: { faturamento?: boolean } = {}): Escopo {
  const faturamento = opts.faturamento ?? true;
  const where: string[] = ["ano = ?"];
  const params: (string | number)[] = [ano];
  if (faturamento) {
    where.push(`status_sistema IN (${STATUS_FATURAMENTO.map(() => "?").join(", ")})`);
    params.push(...STATUS_FATURAMENTO);
  }
  if (filtro?.mes) {
    where.push("mes = ?");
    params.push(filtro.mes);
  }
  if (filtro?.vendedor) {
    where.push("vendedor = ?");
    params.push(filtro.vendedor);
  }
  return { where: `WHERE ${where.join(" AND ")}`, params };
}

function metricasPorMes(db: SalesDatabase, expr: "SUM(valor_total)" | "COUNT(*)", scope: Escopo): Record<Mes, number> {
  const rows = db.raw
    .prepare(`SELECT mes, ${expr} AS v FROM vendas ${scope.where} GROUP BY mes`)
    .all(...scope.params) as { mes: string | null; v: number }[];
  const out = Object.fromEntries(MESES.map((m) => [m, 0])) as Record<Mes, number>;
  for (const r of rows) {
    const key = r.mes as Mes;
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = r.v;
  }
  return out;
}

function faturamentoPorMes(db: SalesDatabase, ano: number, filtro?: SnapshotFilter | null): Record<Mes, number> {
  return metricasPorMes(db, "SUM(valor_total)", escopo(ano, filtro));
}

function quantidadePorMes(db: SalesDatabase, ano: number, filtro?: SnapshotFilter | null): Record<Mes, number> {
  return metricasPorMes(db, "COUNT(*)", escopo(ano, filtro));
}

const COLUNA_GRUPO = { vendedor: "vendedor", estado: "estado", regiao: "regiao" } as const;

function somaPor(db: SalesDatabase, coluna: keyof typeof COLUNA_GRUPO, scope: Escopo): { chave: string; valor: number }[] {
  const campo = COLUNA_GRUPO[coluna];
  return db.raw
    .prepare(
      `SELECT ${campo} AS chave, SUM(valor_total) AS valor FROM vendas
       ${scope.where} GROUP BY ${campo} ORDER BY valor DESC`,
    )
    .all(...scope.params) as { chave: string; valor: number }[];
}

function shareDe(valor: number, total: number): number {
  return total ? valor / total : 0;
}

function porVendedor(db: SalesDatabase, scope: Escopo, total: number): { vendedor: string; valor: number; share: number }[] {
  return somaPor(db, "vendedor", scope).map((r) => ({ vendedor: r.chave, valor: r.valor, share: shareDe(r.valor, total) }));
}

function porEstado(db: SalesDatabase, scope: Escopo, total: number): { estado: string; valor: number; share: number }[] {
  return somaPor(db, "estado", scope).map((r) => ({ estado: r.chave, valor: r.valor, share: shareDe(r.valor, total) }));
}

function porRegiao(db: SalesDatabase, scope: Escopo, total: number): { regiao: string; valor: number; share: number; x: number; y: number }[] {
  return somaPor(db, "regiao", scope).map((r) => ({
    regiao: r.chave,
    valor: r.valor,
    share: shareDe(r.valor, total),
    ...(REGIAO_MAPA[r.chave] ?? { x: 0, y: 0 }),
  }));
}

function countStatus(db: SalesDatabase, scope: Escopo, mes: Mes, status: string): number {
  const r = db.raw
    .prepare(`SELECT COUNT(*) AS n FROM vendas ${scope.where} AND mes = ? AND status_sistema = ?`)
    .get(...scope.params, mes, status) as { n: number };
  return r.n;
}

function funilPorMes(db: SalesDatabase, ano: number, filtro?: SnapshotFilter | null): FunnelMonth[] {
  const scope = escopo(ano, filtro, { faturamento: false });
  return MESES.map((mes) => {
    const orcamento = countStatus(db, scope, mes, "Orçamento");
    const pedido = countStatus(db, scope, mes, "Pedido");
    const pedidoAprovadoSemFaturamento = countStatus(db, scope, mes, "Pedido Aprovado Sem Faturamento");
    const pedidoCancelado = countStatus(db, scope, mes, "Pedido Cancelado");
    const pedidoFaturado = countStatus(db, scope, mes, "Pedido Faturado");
    const pedidoNaoFaturado = countStatus(db, scope, mes, "Pedido Nao Faturado");
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

function numeroFechamento(db: SalesDatabase, ano: number, filtro?: SnapshotFilter | null): Record<Mes, { orcamento: number; pedido: number }> {
  const scope = escopo(ano, filtro, { faturamento: false });
  const out = {} as Record<Mes, { orcamento: number; pedido: number }>;
  for (const mes of MESES) {
    const orcamento = countStatus(db, scope, mes, "Orçamento") + countStatus(db, scope, mes, "Pedido Aprovado Sem Faturamento");
    const pedido = countStatus(db, scope, mes, "Pedido") + countStatus(db, scope, mes, "Pedido Cancelado") + countStatus(db, scope, mes, "Pedido Faturado");
    out[mes] = { orcamento, pedido };
  }
  return out;
}

function ticketMedio(db: SalesDatabase, ano: number, filtro?: SnapshotFilter | null): TicketMedio[] {
  const scope = escopo(ano, filtro);
  const out: TicketMedio[] = [];
  for (const [produto, vendedores] of Object.entries(PRODUTOS_VENDEDORES)) {
    const q = `SELECT COALESCE(SUM(valor_total), 0) AS valor, COUNT(*) AS volume FROM vendas
               ${scope.where} AND vendedor IN (${vendedores.map(() => "?").join(", ")})`;
    const r = db.raw.prepare(q).get(...scope.params, ...vendedores) as { valor: number; volume: number };
    out.push({ produto, valor: r.valor, volume: r.volume, ticket: r.volume ? r.valor / r.volume : 0 });
  }
  return out;
}

export function getSnapshot(db: SalesDatabase, ano: number, filtro: SnapshotFilter = {}): KpiSnapshot {
  const faturamento = faturamentoPorMes(db, ano, filtro);
  const totalPeriodo = MESES.reduce((acc, m) => acc + faturamento[m], 0);
  const totalHistorico =
    (db.raw
      .prepare(`SELECT COALESCE(SUM(valor_total),0) AS v FROM vendas WHERE status_sistema IN (${STATUS_FATURAMENTO.map(() => "?").join(", ")})`)
      .get(...STATUS_FATURAMENTO) as { v: number }).v;

  const baseAno = ano - 1;
  const faturamentoBase = faturamentoPorMes(db, baseAno);
  const faturamentoGlobal = faturamentoPorMes(db, ano);
  const totalBase = MESES.reduce((acc, m) => acc + faturamentoBase[m], 0);
  const totalAno = MESES.reduce((acc, m) => acc + faturamentoGlobal[m], 0);
  const fator = db.getFator(ano);
  const metaAnual = totalBase * fator;
  const metaAnualBase = totalBase;

  const metasPorMes: MetasMes[] = MESES.map((mes) => {
    const faturamentoAnoAnterior = faturamentoBase[mes];
    const meta = faturamentoAnoAnterior * fator;
    const atual = faturamentoGlobal[mes];
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
    participacaoAno: totalHistorico ? totalAno / totalHistorico : 0,
    participacaoEscopo: totalHistorico ? totalPeriodo / totalHistorico : 0,
    faturamentoPorMes: faturamento,
    quantidadePorMes: quantidadePorMes(db, ano, filtro),
    porVendedor: porVendedor(db, escopo(ano, { ...filtro, vendedor: null }), totalAno),
    porEstado: porEstado(db, escopo(ano, filtro), totalAno),
    porRegiao: porRegiao(db, escopo(ano, filtro), totalAno),
    funilPorMes: funilPorMes(db, ano, filtro),
    numeroFechamento: numeroFechamento(db, ano, filtro),
    ticketMedio: ticketMedio(db, ano, filtro),
    metaAnual: Number(metaAnual.toFixed(2)),
    metaAnualBase: Number(metaAnualBase.toFixed(2)),
    fator,
    metasPorMes,
    acumuladoPorMes,
    restanteAnoPorMes,
  };
}