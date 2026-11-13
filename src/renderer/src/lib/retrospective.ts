import {
  type KpiSnapshot,
  MONTHS,
  type Month,
  NO_SELLER_LABEL,
  NO_STATE_LABEL,
} from '../../../shared/types'
import { MONTH_FULL } from './labels'

export interface RankedValue {
  label: string
  value: number
  share: number
}

export interface MonthValue {
  month: Month
  label: string
  value: number
}

export interface RetrospectiveFunnel {
  quotes: number
  orders: number
  invoiced: number
  cancelled: number
}

export interface Retrospective {
  year: number
  total: number
  goal: number
  goalPct: number | null
  previousYear: number
  growth: number | null
  quantity: number
  averageTicket: number
  bestMonth: MonthValue | null
  topMonths: MonthValue[]
  topSellers: RankedValue[]
  topRegions: RankedValue[]
  topStates: RankedValue[]
  funnel: RetrospectiveFunnel
}

export function buildRetrospective(snap: KpiSnapshot): Retrospective {
  const months: MonthValue[] = MONTHS.map(month => ({
    month,
    label: MONTH_FULL[month],
    value: snap.billingByMonth[month],
  }))
    .filter(month => month.value > 0)
    .sort((a, b) => b.value - a.value)

  const quantity = MONTHS.reduce(
    (acc, month) => acc + snap.quantityByMonth[month],
    0,
  )

  const funnel = snap.funnelByMonth.reduce<RetrospectiveFunnel>(
    (acc, month) => ({
      quotes: acc.quotes + month.quote,
      orders: acc.orders + month.order,
      invoiced: acc.invoiced + month.invoiced,
      cancelled: acc.cancelled + month.cancelled,
    }),
    { quotes: 0, orders: 0, invoiced: 0, cancelled: 0 },
  )

  return {
    year: snap.year,
    total: snap.periodTotal,
    goal: snap.annualGoal,
    goalPct: snap.annualGoal > 0 ? snap.periodTotal / snap.annualGoal : null,
    previousYear: snap.annualGoalBase,
    growth:
      snap.annualGoalBase > 0
        ? (snap.periodTotal - snap.annualGoalBase) / snap.annualGoalBase
        : null,
    quantity,
    averageTicket: quantity > 0 ? snap.periodTotal / quantity : 0,
    bestMonth: months[0] ?? null,
    topMonths: months.slice(0, 3),
    topSellers: snap.bySeller
      .filter(seller => seller.seller !== NO_SELLER_LABEL)
      .slice(0, 3)
      .map(seller => ({
        label: seller.seller,
        value: seller.value,
        share: seller.share,
      })),
    topRegions: snap.byRegion
      .filter(region => region.region !== NO_STATE_LABEL)
      .slice(0, 3)
      .map(region => ({
        label: region.region,
        value: region.value,
        share: region.share,
      })),
    topStates: snap.byState
      .filter(state => state.state !== NO_STATE_LABEL)
      .slice(0, 3)
      .map(state => ({
        label: state.state,
        value: state.value,
        share: state.share,
      })),
    funnel,
  }
}
