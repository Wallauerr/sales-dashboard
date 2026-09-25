import {
  MESES as MESES_LIST,
  type CodigoHistory,
  type ImportCodeEvent,
  type ImportRecord,
  type ImportResult,
  type Mes,
  type Sale,
  type VendasFilter,
  type VendasPage,
} from "./schemas.ts";

export type {
  CodigoHistory,
  ImportCodeEvent,
  ImportRecord,
  ImportResult,
  Mes,
  Sale,
  VendasFilter,
  VendasPage,
};

export const MESES = MESES_LIST;

export const STATUS_FATURAMENTO = ["Pedido", "Pedido Faturado"];

export interface SnapshotFilter {
  mes?: Mes | null;
  vendedor?: string | null;
}

export interface FunnelMonth {
  mes: Mes;
  orcamento: number;
  pedido: number;
  pedidoAprovadoSemFaturamento: number;
  pedidoCancelado: number;
  pedidoFaturado: number;
  pedidoNaoFaturado: number;
  total: number;
}

export interface MetasMes {
  mes: Mes;
  faturamentoAnoAnterior: number;
  meta: number;
  acima: number;
  abaixo: number;
  restanteMes: number;
}

export interface TicketMedio {
  produto: string;
  valor: number;
  volume: number;
  ticket: number;
}

export interface KpiSnapshot {
  ano: number;
  totalPeriodo: number;
  totalHistorico: number;
  participacaoAno: number;
  participacaoEscopo: number;
  faturamentoPorMes: Record<Mes, number>;
  quantidadePorMes: Record<Mes, number>;
  porVendedor: { vendedor: string; valor: number; share: number }[];
  porEstado: { estado: string; valor: number; share: number }[];
  porRegiao: { regiao: string; valor: number; share: number; x: number; y: number }[];
  funilPorMes: FunnelMonth[];
  numeroFechamento: Record<Mes, { orcamento: number; pedido: number }>;
  ticketMedio: TicketMedio[];
  metaAnual: number;
  metaAnualBase: number;
  fator: number;
  metasPorMes: MetasMes[];
  acumuladoPorMes: Record<Mes, number>;
  restanteAnoPorMes: Record<Mes, number>;
}