import {
  type CodeHistory,
  type GoalSetInput,
  type ImportCodeEvent,
  type ImportRecord,
  type ImportResult,
  MONTHS as MONTHS_LIST,
  type Month,
  type Sale,
} from './schemas.ts'

export type {
  CodeHistory,
  GoalSetInput,
  ImportCodeEvent,
  ImportRecord,
  ImportResult,
  Month,
  Sale,
}

export const MONTHS = MONTHS_LIST

export const BILLING_STATUSES = ['Pedido', 'Pedido Faturado']

export const APPROVED_WITHOUT_BILLING_STATUS = 'Pedido Aprovado Sem Faturamento'

export const NON_BILLING_CATEGORIES = ['Remessa%', 'Amostra%']

export const NO_STATE_LABEL = 'Não informado'
export const NO_SELLER_LABEL = 'VENDAS'

export const SYSTEM_STATUSES = [
  'Orçamento',
  'Pedido',
  APPROVED_WITHOUT_BILLING_STATUS,
  'Pedido Cancelado',
  'Pedido Faturado',
  'Pedido Nao Faturado',
]

export interface SnapshotScope {
  months?: Month[] | null
  sellers?: string[] | null
}

export interface SellerPhoto {
  seller: string
}

export interface PhotoResult {
  seller: string
}

export interface AutoStartView {
  supported: boolean
  enabled: boolean
}

export interface DbStats {
  sales: number
  imports: number
  sellers: number
  photos: number
}

export interface BackupMergeResult {
  sales: number
  goals: number
  photos: number
  disabledSellers: number
  imports: number
  historyItems: number
}

export interface BackupExportResult {
  path: string
}

export interface FunnelMonth {
  month: Month
  quote: number
  order: number
  approvedWithoutInvoicing: number
  cancelled: number
  invoiced: number
  notInvoiced: number
  total: number
}

export interface MonthlyGoal {
  month: Month
  previousYearBilling: number
  goal: number
  above: number
  below: number
  remainingInMonth: number
}

export type GoalUnit = 'pct' | 'brl'

export interface GoalConfigView {
  year: number
  unit: GoalUnit
  factor: number
  percent: number | null
  baseYear: number
  annualGoal: number
  annualGoalAuto: number
  annualCustom: number | null
  monthsCustom: Partial<Record<Month, number>>
  autoGoals: Record<Month, number>
  effectiveGoals: Record<Month, number>
}

export interface AverageTicket {
  product: string
  value: number
  volume: number
  ticket: number
}

export interface KpiSnapshot {
  year: number
  periodTotal: number
  historyTotal: number
  yearShare: number
  scopeShare: number
  billingByMonth: Record<Month, number>
  quantityByMonth: Record<Month, number>
  bySeller: { seller: string; value: number; share: number }[]
  byState: { state: string; value: number; share: number }[]
  byRegion: {
    region: string
    value: number
    share: number
    x: number
    y: number
  }[]
  funnelByMonth: FunnelMonth[]
  closingCounts: Record<Month, { quote: number; order: number }>
  averageTickets: AverageTicket[]
  annualGoal: number
  annualGoalBase: number
  annualGoalAuto: number
  goalUnit: GoalUnit | null
  customGoal: boolean
  factor: number
  monthlyGoals: MonthlyGoal[]
  cumulativeByMonth: Record<Month, number>
  remainingYearByMonth: Record<Month, number>
}
