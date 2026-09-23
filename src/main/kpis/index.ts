import type { FunnelMonth, KpiSnapshot, Mes, MetasMes, TicketMedio } from "../../shared/types.ts";
import { MESES, STATUS_FATURAMENTO } from "../../shared/types.ts";
import type { SalesDatabase } from "../db/database.ts";

const STATUS_FUNIL = [
  "Orçamento",
  "Pedido",
  "Pedido Aprovado Sem Faturamento",
  "Pedido Cancelado",
  "Pedido Faturado",
  "Pedido Nao Faturado",
] as const;

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

function faturamentoPorMes(db: SalesDatabase, ano: number): Record<Mes, number> {
  const rows = db.raw
    .prepare(
      `SELECT mes, SUM(valor_total) AS valor FROM vendas
       WHERE ano = ? AND status_sistema IN ('Pedido', 'Pedido Faturado')
       GROUP BY mes`,
    )
    .all(ano) as { mes: string | null; valor: number }[];
  const out = Object.fromEntries(MESES.map((m) => [m, 0])) as Record<Mes, number>;
  for (const r of rows) {
    const key = r.mes as Mes;
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = r.valor;
  }
  return out;
}

function quantidadePorMes(db: SalesDatabase, ano: number): Record<Mes, number> {
  const rows = db.raw
    .prepare(
      `SELECT mes, COUNT(*) AS qtd FROM vendas
       WHERE ano = ? AND status_sistema IN ('Pedido', 'Pedido Faturado')
       GROUP BY mes`,
    )
    .all(ano) as { mes: string | null; qtd: number }[];
  const out = Object.fromEntries(MESES.map((m) => [m, 0])) as Record<Mes, number>;
  for (const r of rows) {
    const key = r.mes as Mes;
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = r.qtd;
  }
  return out;
}

function porVendedor(db: SalesDatabase, ano: number, total: number): { vendedor: string; valor: number; share: number }[] {
  const rows = db.raw
    .prepare(
      `SELECT vendedor, SUM(valor_total) AS valor FROM vendas
       WHERE ano = ? AND status_sistema IN ('Pedido', 'Pedido Faturado')
       GROUP BY vendedor ORDER BY valor DESC`,
    )
    .all(ano) as { vendedor: string; valor: number }[];
  return rows.map((r) => ({ vendedor: r.vendedor, valor: r.valor, share: total ? r.valor / total : 0 }));
}

function porEstado(db: SalesDatabase, ano: number, total: number): { estado: string; valor: number; share: number }[] {
  const rows = db.raw
    .prepare(
      `SELECT estado, SUM(valor_total) AS valor FROM vendas
       WHERE ano = ? AND status_sistema IN ('Pedido', 'Pedido Faturado')
       GROUP BY estado ORDER BY valor DESC`,
    )
    .all(ano) as { estado: string; valor: number }[];
  return rows.map((r) => ({ estado: r.estado, valor: r.valor, share: total ? r.valor / total : 0 }));
}

function porRegiao(
  db: SalesDatabase,
  ano: number,
  total: number,
): { regiao: string; valor: number; share: number; x: number; y: number }[] {
  const rows = db.raw
    .prepare(
      `SELECT regiao, SUM(valor_total) AS valor FROM vendas
       WHERE ano = ? AND status_sistema IN ('Pedido', 'Pedido Faturado')
       GROUP BY regiao ORDER BY valor DESC`,
    )
    .all(ano) as { regiao: string; valor: number }[];
  return rows.map((r) => ({
    regiao: r.regiao,
    valor: r.valor,
    share: total ? r.valor / total : 0,
    ...(REGIAO_MAPA[r.regiao] ?? { x: 0, y: 0 }),
  }));
}

function funilPorMes(db: SalesDatabase, ano: number): FunnelMonth[] {
  const months = MESES.map((mes) => {
    const row = {
      mes,
      orcamento: 0,
      pedido: 0,
      pedidoAprovadoSemFaturamento: 0,
      pedidoCancelado: 0,
      pedidoFaturado: 0,
      pedidoNaoFaturado: 0,
      total: 0,
    } as FunnelMonth;
    const count = (status: string): number => {
      const r = db.raw
        .prepare("SELECT COUNT(*) AS n FROM vendas WHERE ano = ? AND mes = ? AND status_sistema = ?")
        .get(ano, mes, status) as { n: number };
      return r.n;
    };
    row.orcamento = count("Orçamento");
    row.pedido = count("Pedido");
    row.pedidoAprovadoSemFaturamento = count("Pedido Aprovado Sem Faturamento");
    row.pedidoCancelado = count("Pedido Cancelado");
    row.pedidoFaturado = count("Pedido Faturado");
    row.pedidoNaoFaturado = count("Pedido Nao Faturado");
    row.total = STATUS_FUNIL.reduce((acc, st) => acc + count(st), 0);
    return row;
  });
  return months;
}

function numeroFechamento(db: SalesDatabase, ano: number): Record<Mes, { orcamento: number; pedido: number }> {
  const out = {} as Record<Mes, { orcamento: number; pedido: number }>;
  for (const mes of MESES) {
    const count = (status: string): number =>
      (db.raw
        .prepare("SELECT COUNT(*) AS n FROM vendas WHERE ano = ? AND mes = ? AND status_sistema = ?")
        .get(ano, mes, status) as { n: number }).n;
    const orcamento = count("Orçamento") + count("Pedido Aprovado Sem Faturamento");
    const pedido = count("Pedido") + count("Pedido Cancelado") + count("Pedido Faturado");
    out[mes] = { orcamento, pedido };
  }
  return out;
}

function ticketMedio(db: SalesDatabase, ano: number): TicketMedio[] {
  const out: TicketMedio[] = [];
  const placeholders = STATUS_FATURAMENTO.map(() => "?").join(", ");
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
      .prepare(
        `SELECT COALESCE(SUM(valor_total),0) AS v FROM vendas
         WHERE status_sistema IN ('Pedido','Pedido Faturado')`,
      )
      .get() as { v: number }).v;

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