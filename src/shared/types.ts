import {
  type CodigoHistory,
  type ImportCodeEvent,
  type ImportRecord,
  type ImportResult,
  MESES as MESES_LIST,
  type Mes,
  type MetasSetInput,
  type Sale,
} from './schemas.ts'

export type {
  CodigoHistory,
  ImportCodeEvent,
  ImportRecord,
  ImportResult,
  Mes,
  MetasSetInput,
  Sale,
}

export const MESES = MESES_LIST

// Regra de faturamento: `Pedido` e `Pedido Faturado` sempre contam (o comercial
// considera o pedido como faturamento). `Pedido Aprovado Sem Faturamento` conta
// junto, exceto quando a categoria é remessa/amostra — que não são venda.
export const STATUS_FATURAMENTO = ['Pedido', 'Pedido Faturado']

export const STATUS_APROVADO_SEM_FATURAMENTO = 'Pedido Aprovado Sem Faturamento'

export const CATEGORIAS_FORA_FATURAMENTO = ['Remessa%', 'Amostra%']

// Rótulos de dados ausentes exibidos na UI (pedidos sem UF e sem vendedor).
export const ROTULO_SEM_ESTADO = 'Não informado'
export const ROTULO_SEM_VENDEDOR = 'VENDAS'

// Status canônicos do SIGE, usados para normalizar caixa/acento no ingest.
export const STATUS_SISTEMA = [
  'Orçamento',
  'Pedido',
  STATUS_APROVADO_SEM_FATURAMENTO,
  'Pedido Cancelado',
  'Pedido Faturado',
  'Pedido Nao Faturado',
]

export interface SnapshotFilter {
  mes?: Mes | null
  vendedor?: string | null
}

export interface VendedorFoto {
  vendedor: string
  dataUrl: string
}

export interface AutoStartView {
  supported: boolean
  enabled: boolean
}

export interface FunnelMonth {
  mes: Mes
  orcamento: number
  pedido: number
  pedidoAprovadoSemFaturamento: number
  pedidoCancelado: number
  pedidoFaturado: number
  pedidoNaoFaturado: number
  total: number
}

export interface MetasMes {
  mes: Mes
  faturamentoAnoAnterior: number
  meta: number
  acima: number
  abaixo: number
  restanteMes: number
}

export interface MetaConfigView {
  ano: number
  fator: number
  baseAno: number
  metaAnual: number
  metaAnualAuto: number
  anualCustom: number | null
  mesesCustom: Partial<Record<Mes, number>>
  metasAuto: Record<Mes, number>
  metasEfetivas: Record<Mes, number>
}

export interface TicketMedio {
  produto: string
  valor: number
  volume: number
  ticket: number
}

export interface KpiSnapshot {
  ano: number
  totalPeriodo: number
  totalHistorico: number
  participacaoAno: number
  participacaoEscopo: number
  faturamentoPorMes: Record<Mes, number>
  quantidadePorMes: Record<Mes, number>
  porVendedor: { vendedor: string; valor: number; share: number }[]
  porEstado: { estado: string; valor: number; share: number }[]
  porRegiao: {
    regiao: string
    valor: number
    share: number
    x: number
    y: number
  }[]
  funilPorMes: FunnelMonth[]
  numeroFechamento: Record<Mes, { orcamento: number; pedido: number }>
  ticketMedio: TicketMedio[]
  metaAnual: number
  metaAnualBase: number
  metaAnualAuto: number
  metaPersonalizada: boolean
  fator: number
  metasPorMes: MetasMes[]
  acumuladoPorMes: Record<Mes, number>
  restanteAnoPorMes: Record<Mes, number>
}
