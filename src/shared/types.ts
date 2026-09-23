export type Mes =
  | "jan"
  | "fev"
  | "mar"
  | "abr"
  | "mai"
  | "jun"
  | "jul"
  | "ago"
  | "set"
  | "out"
  | "nov"
  | "dez";

export const MESES: Mes[] = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const STATUS_FATURAMENTO = ["Pedido", "Pedido Faturado"];

export interface Sale {
  codigo: string;
  data: string | null;
  dataAprovOrcamento: string | null;
  dataAprovPedido: string | null;
  dataAprovFaturamento: string | null;
  dataEmissaoFiscal: string | null;
  empresa: string;
  statusSistema: string;
  vendedor: string;
  categoria: string;
  status: string;
  origem: string;
  cliente: string;
  cidade: string;
  estado: string;
  regiao: string;
  transportadora: string;
  frete: number;
  desconto: number;
  comissao: number;
  valorTotal: number;
  nfe: string;
  mes: Mes | null;
  ano: number | null;
  quantidade: number;
}

export interface ImportResult {
  filePath: string;
  totalRows: number;
  inserted: number;
  updated: number;
  discarded: number;
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