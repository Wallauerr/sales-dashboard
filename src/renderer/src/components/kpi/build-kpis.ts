import { brl0, brlCompact, int, pct } from '@/lib/format'
import { MONTH_LABEL } from '@/lib/labels'
import type { KpiSnapshot, Month } from '../../../../shared/types'
import { MONTHS } from '../../../../shared/types'

export type KpiDef = { title: string; value: string; hint?: string }

function variation(current: number, previous: number): string | null {
  if (previous <= 0) return null
  const v = (current - previous) / previous
  return `${v >= 0 ? '+' : '-'}${pct(Math.abs(v))}`
}

export function periodLabel(months: Month[]): string {
  if (months.length === 1) return MONTH_LABEL[months[0]]
  if (months.length <= 3) return months.map(m => MONTH_LABEL[m]).join('·')
  return `${months.length} meses`
}

function sellersLabel(sellers: string[]): string {
  if (sellers.length === 1) return sellers[0]
  return `${sellers.length} vendedores`
}

export function buildKpis({
  year,
  months,
  sellers,
  snap,
}: {
  year: number
  months: Month[]
  sellers: string[]
  snap: KpiSnapshot | null
}): { kpis: KpiDef[]; gridClass: string } {
  const monthActive = months.length > 0
  const sellerActive = sellers.length > 0
  const gridClass = sellerActive
    ? 'lg:grid-cols-3'
    : monthActive
      ? 'lg:grid-cols-6'
      : 'lg:grid-cols-7'

  const kpis: KpiDef[] = []
  if (!snap) return { kpis, gridClass }

  const monthLabel = periodLabel(months)
  const sellerLabel = sellersLabel(sellers)
  const monthIndexes = months.map(m => MONTHS.indexOf(m))
  const periodGoal = monthActive
    ? monthIndexes.reduce((acc, i) => acc + snap.monthlyGoals[i].goal, 0)
    : 0
  const goalPct =
    !sellerActive && !monthActive && snap.annualGoal > 0
      ? snap.periodTotal / snap.annualGoal
      : 0
  const periodGoalPct =
    monthActive && !sellerActive && periodGoal > 0
      ? snap.periodTotal / periodGoal
      : 0
  const remainingYear = snap.remainingYearByMonth.dez
  const remainingMonth =
    monthActive && !sellerActive
      ? Math.max(periodGoal - snap.periodTotal, 0)
      : 0

  const totalQuantity = monthActive
    ? monthIndexes.reduce((acc, i) => acc + snap.quantityByMonth[MONTHS[i]], 0)
    : MONTHS.reduce((acc, m) => acc + snap.quantityByMonth[m], 0)

  const monthsWithData = (() => {
    for (let i = MONTHS.length - 1; i >= 0; i--) {
      if (snap.billingByMonth[MONTHS[i]] > 0) return i + 1
    }
    return 0
  })()

  const runRate =
    !monthActive && !sellerActive && snap.periodTotal > 0 && monthsWithData > 0
      ? {
          projection: (snap.periodTotal / monthsWithData) * 12,
          elapsed: monthsWithData,
        }
      : null

  const quantityHint = sellerActive
    ? monthActive
      ? `vendas de ${sellerLabel} em ${monthLabel}`
      : `vendas de ${sellerLabel}`
    : monthActive
      ? `vendas em ${monthLabel}`
      : 'vendas no ano'

  const prevYear = year - 1
  const prevPeriod =
    monthActive && !sellerActive
      ? monthIndexes.reduce(
          (acc, i) => acc + snap.monthlyGoals[i].previousYearBilling,
          0,
        )
      : MONTHS.slice(0, monthsWithData).reduce(
          (acc, _m, i) => acc + snap.monthlyGoals[i].previousYearBilling,
          0,
        )
  const sellersShare =
    sellerActive && snap.bySeller.length > 0
      ? snap.bySeller
          .filter(v => sellers.includes(v.seller))
          .reduce((acc, v) => acc + v.share, 0)
      : undefined
  const billingHint = (() => {
    if (sellerActive) {
      return sellersShare === undefined
        ? undefined
        : `part. ${pct(sellersShare)} do ${monthActive ? monthLabel : year}`
    }
    if (monthActive) {
      const delta = variation(snap.periodTotal, prevPeriod)
      return `${monthLabel} ${prevYear}: ${brlCompact(prevPeriod)}${delta ? ` · ${delta}` : ''}`
    }
    const period =
      monthsWithData > 0 && monthsWithData < 12
        ? ` (${MONTH_LABEL[MONTHS[0]]}–${MONTH_LABEL[MONTHS[monthsWithData - 1]]})`
        : ''
    const delta = variation(snap.periodTotal, prevPeriod)
    return `vs ${prevYear}${period}: ${brlCompact(prevPeriod)}${delta ? ` · ${delta}` : ''}`
  })()

  kpis.push({
    title: sellerActive
      ? `Faturamento ${sellerLabel}${monthActive ? ` · ${monthLabel}` : ''}`
      : monthActive
        ? `Faturamento ${monthLabel} ${year}`
        : `Faturamento ${year}`,
    value: brl0(snap.periodTotal),
    hint: billingHint,
  })
  if (!sellerActive) {
    kpis.push(
      monthActive
        ? {
            title: `Meta ${monthLabel}`,
            value: brl0(periodGoal),
            hint: 'meta do período (empresa)',
          }
        : {
            title: 'Meta anual',
            value: brl0(snap.annualGoal),
            hint: `base ${year - 1} × ${(snap.factor * 100).toFixed(0)}%`,
          },
      {
        title: '% da meta',
        value: pct(monthActive ? periodGoalPct : goalPct),
        hint: monthActive ? 'realizado do período ÷ meta' : 'realizado ÷ meta',
      },
      {
        title: monthActive ? 'Restante p/ meta do período' : 'Restante p/ meta',
        value: monthActive
          ? remainingMonth > 0
            ? brl0(remainingMonth)
            : '—'
          : remainingYear > 0
            ? brl0(remainingYear)
            : '—',
        hint: monthActive
          ? remainingMonth > 0
            ? 'no período'
            : 'meta atingida'
          : remainingYear > 0
            ? 'no acumulado de dez'
            : 'meta atingida',
      },
    )
    if (!monthActive) {
      kpis.push({
        title: 'Projeção (run-rate)',
        value: runRate ? brl0(runRate.projection) : '—',
        hint: runRate
          ? `${brl0(snap.periodTotal / runRate.elapsed)}/mês med em ${runRate.elapsed === 12 ? 'ano fechado' : `${runRate.elapsed} meses`}`
          : 'sem dados',
      })
    }
  }
  kpis.push(
    {
      title: 'Quantidade',
      value: int(totalQuantity),
      hint: quantityHint,
    },
    {
      title: 'Participação',
      value: pct(snap.scopeShare),
      hint: `de ${brlCompact(snap.historyTotal)}`,
    },
  )

  return { kpis, gridClass }
}
