import type {
  AverageTicket,
  FunnelMonth,
  GoalConfigView,
  GoalSetInput,
  KpiSnapshot,
  Month,
  MonthlyGoal,
  SnapshotScope,
} from '../../shared/types.ts'
import {
  APPROVED_WITHOUT_BILLING_STATUS,
  BILLING_STATUSES,
  MONTHS,
  NO_SELLER_LABEL,
  NO_STATE_LABEL,
  NON_BILLING_CATEGORIES,
} from '../../shared/types.ts'
import type { SalesDatabase } from '../db/database.ts'

const PRODUCT_SELLERS: Record<string, string[]> = {
  Equipamentos: [
    'Bruno Keller',
    'Iago Gernhardt Benedetto',
    'Sul Magnéticos Equipamentos Industriais Eireli',
    'Vinicius Horn',
  ],
  Neodimio: ['Rosemeri', 'Ursula'],
  'Follow-Up': ['Stephani Strack da Silva'],
}

const REGION_POSITION: Record<string, { x: number; y: number }> = {
  Norte: { x: 30, y: 80 },
  Nordeste: { x: 90, y: 70 },
  'Centro-Oeste': { x: 50, y: 50 },
  Sudeste: { x: 80, y: 30 },
  Sul: { x: 60, y: 10 },
}

interface Scope {
  where: string
  params: (string | number)[]
}

// Filtro de faturamento: `Pedido`/`Pedido Faturado` sempre entram;
// `Pedido Aprovado Sem Faturamento` só quando a categoria não é remessa nem
// amostra — categoria vazia conta.
function billingClause(): { sql: string; params: string[] } {
  const inStatus = BILLING_STATUSES.map(() => '?').join(', ')
  const notLike = NON_BILLING_CATEGORIES.map(() => 'categoria NOT LIKE ?').join(
    ' AND ',
  )
  return {
    sql: `(status_sistema IN (${inStatus}) OR (status_sistema = ? AND ${notLike}))`,
    params: [
      ...BILLING_STATUSES,
      APPROVED_WITHOUT_BILLING_STATUS,
      ...NON_BILLING_CATEGORIES,
    ],
  }
}

// O filtro de faturamento é opcional porque o funil e o nº de fechamento contam
// cada status individualmente.
function scope(
  db: SalesDatabase,
  year: number,
  filter: SnapshotScope | null | undefined,
  opts: { billing?: boolean } = {},
): Scope {
  const billing = opts.billing ?? true
  const where: string[] = ['ano = ?']
  const params: (string | number)[] = [year]
  if (billing) {
    const clause = billingClause()
    where.push(clause.sql)
    params.push(...clause.params)
  }
  if (filter?.months?.length) {
    where.push(`mes IN (${filter.months.map(() => '?').join(', ')})`)
    params.push(...filter.months)
  }
  if (filter?.sellers?.length) {
    const values = new Set<string>()
    for (const v of filter.sellers) {
      if (v === NO_SELLER_LABEL) {
        values.add('')
        for (const disabled of db.listDisabledSellers()) values.add(disabled)
      } else {
        values.add(v)
      }
    }
    where.push(`vendedor IN (${[...values].map(() => '?').join(', ')})`)
    params.push(...values)
  }
  return { where: `WHERE ${where.join(' AND ')}`, params }
}

function metricsByMonth(
  db: SalesDatabase,
  expr: 'SUM(valor_total)' | 'COUNT(*)',
  sc: Scope,
): Record<Month, number> {
  const rows = db.raw
    .prepare(`SELECT mes, ${expr} AS v FROM vendas ${sc.where} GROUP BY mes`)
    .all(...sc.params) as { mes: string | null; v: number }[]
  const out = Object.fromEntries(MONTHS.map(m => [m, 0])) as Record<
    Month,
    number
  >
  for (const r of rows) {
    const key = r.mes as Month
    if (Object.hasOwn(out, key)) out[key] = r.v
  }
  return out
}

function billingByMonth(
  db: SalesDatabase,
  year: number,
  filter?: SnapshotScope | null,
): Record<Month, number> {
  return metricsByMonth(db, 'SUM(valor_total)', scope(db, year, filter))
}

function quantityByMonth(
  db: SalesDatabase,
  year: number,
  filter?: SnapshotScope | null,
): Record<Month, number> {
  return metricsByMonth(db, 'COUNT(*)', scope(db, year, filter))
}

const GROUP_COLUMN = {
  seller: 'vendedor',
  state: 'estado',
  region: 'regiao',
} as const

function sumBy(
  db: SalesDatabase,
  column: keyof typeof GROUP_COLUMN,
  sc: Scope,
): { key: string; value: number }[] {
  const field = GROUP_COLUMN[column]
  const unnamedLabel =
    column === 'seller'
      ? `CASE WHEN ${field} = '' THEN '${NO_SELLER_LABEL}'
              WHEN ${field} IN (SELECT vendedor FROM vendedor_desativado)
                THEN '${NO_SELLER_LABEL}'
              ELSE ${field} END`
      : field
  return db.raw
    .prepare(
      `SELECT ${unnamedLabel} AS key, SUM(valor_total) AS value FROM vendas
       ${sc.where} GROUP BY key ORDER BY value DESC`,
    )
    .all(...sc.params) as { key: string; value: number }[]
}

function shareOf(value: number, total: number): number {
  return total ? value / total : 0
}

function bySeller(
  db: SalesDatabase,
  sc: Scope,
  total: number,
): { seller: string; value: number; share: number }[] {
  return sumBy(db, 'seller', sc).map(r => ({
    seller: r.key || NO_SELLER_LABEL,
    value: r.value,
    share: shareOf(r.value, total),
  }))
}

function byState(
  db: SalesDatabase,
  sc: Scope,
  total: number,
): { state: string; value: number; share: number }[] {
  return sumBy(db, 'state', sc).map(r => ({
    state: r.key || NO_STATE_LABEL,
    value: r.value,
    share: shareOf(r.value, total),
  }))
}

function byRegion(
  db: SalesDatabase,
  sc: Scope,
  total: number,
): { region: string; value: number; share: number; x: number; y: number }[] {
  return sumBy(db, 'region', sc).map(r => ({
    region: r.key || NO_STATE_LABEL,
    value: r.value,
    share: shareOf(r.value, total),
    ...(REGION_POSITION[r.key] ?? { x: 0, y: 0 }),
  }))
}

function countStatus(
  db: SalesDatabase,
  sc: Scope,
  month: Month,
  status: string,
): number {
  const r = db.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM vendas ${sc.where} AND mes = ? AND status_sistema = ?`,
    )
    .get(...sc.params, month, status) as { n: number }
  return r.n
}

function funnelByMonth(
  db: SalesDatabase,
  year: number,
  filter?: SnapshotScope | null,
): FunnelMonth[] {
  const sc = scope(db, year, filter, { billing: false })
  return MONTHS.map(month => {
    const quote = countStatus(db, sc, month, 'Orçamento')
    const order = countStatus(db, sc, month, 'Pedido')
    const approvedWithoutInvoicing = countStatus(
      db,
      sc,
      month,
      'Pedido Aprovado Sem Faturamento',
    )
    const cancelled = countStatus(db, sc, month, 'Pedido Cancelado')
    const invoiced = countStatus(db, sc, month, 'Pedido Faturado')
    const notInvoiced = countStatus(db, sc, month, 'Pedido Nao Faturado')
    return {
      month,
      quote,
      order,
      approvedWithoutInvoicing,
      cancelled,
      invoiced,
      notInvoiced,
      total:
        quote +
        order +
        approvedWithoutInvoicing +
        cancelled +
        invoiced +
        notInvoiced,
    } as FunnelMonth
  })
}

function closingCounts(
  db: SalesDatabase,
  year: number,
  filter?: SnapshotScope | null,
): Record<Month, { quote: number; order: number }> {
  const sc = scope(db, year, filter, { billing: false })
  const out = {} as Record<Month, { quote: number; order: number }>
  for (const month of MONTHS) {
    const quote =
      countStatus(db, sc, month, 'Orçamento') +
      countStatus(db, sc, month, 'Pedido Aprovado Sem Faturamento')
    const order =
      countStatus(db, sc, month, 'Pedido') +
      countStatus(db, sc, month, 'Pedido Cancelado') +
      countStatus(db, sc, month, 'Pedido Faturado')
    out[month] = { quote, order }
  }
  return out
}

function averageTicket(
  db: SalesDatabase,
  year: number,
  filter?: SnapshotScope | null,
): AverageTicket[] {
  const sc = scope(db, year, filter)
  const out: AverageTicket[] = []
  for (const [product, sellers] of Object.entries(PRODUCT_SELLERS)) {
    const q = `SELECT COALESCE(SUM(valor_total), 0) AS value, COUNT(*) AS volume FROM vendas
               ${sc.where} AND vendedor IN (${sellers.map(() => '?').join(', ')})`
    const r = db.raw.prepare(q).get(...sc.params, ...sellers) as {
      value: number
      volume: number
    }
    out.push({
      product,
      value: r.value,
      volume: r.volume,
      ticket: r.volume ? r.value / r.volume : 0,
    })
  }
  return out
}

export function getSnapshot(
  db: SalesDatabase,
  year: number,
  filter: SnapshotScope = {},
): KpiSnapshot {
  const billing = billingByMonth(db, year, filter)
  const periodTotal = MONTHS.reduce((acc, m) => acc + billing[m], 0)
  const historyClause = billingClause()
  const historyTotal = (
    db.raw
      .prepare(
        `SELECT COALESCE(SUM(valor_total),0) AS v FROM vendas WHERE ${historyClause.sql}`,
      )
      .get(...historyClause.params) as { v: number }
  ).v

  const baseYear = year - 1
  const billingBase = billingByMonth(db, baseYear)
  const billingGlobal = billingByMonth(db, year)
  const totalBase = MONTHS.reduce((acc, m) => acc + billingBase[m], 0)
  const totalYear = MONTHS.reduce((acc, m) => acc + billingGlobal[m], 0)
  const factor = db.getFactor(year)
  const annualGoalBase = totalBase
  const annualGoalAuto = totalBase * factor

  const annualCustom = db.getAnnualGoal(year)
  const monthsCustom = db.getMonthlyGoalOverrides(year)
  const shareOfBase = (month: Month): number =>
    totalBase ? billingBase[month] / totalBase : 1 / MONTHS.length

  const monthlyGoals: MonthlyGoal[] = MONTHS.map(month => {
    const previousYearBilling = billingBase[month]
    const goal =
      monthsCustom[month] ??
      (annualCustom ?? annualGoalAuto) * shareOfBase(month)
    const current = billingGlobal[month]
    return {
      month,
      previousYearBilling,
      goal,
      above: current >= goal ? current : 0,
      below: current <= goal ? current : 0,
      remainingInMonth: goal - current,
    }
  })

  const annualGoal = monthlyGoals.reduce((acc, month) => acc + month.goal, 0)
  const customGoal =
    annualCustom !== null || Object.keys(monthsCustom).length > 0

  const cumulativeByMonth = {} as Record<Month, number>
  const remainingYearByMonth = {} as Record<Month, number>
  let acc = 0
  for (const month of MONTHS) {
    acc += billing[month]
    cumulativeByMonth[month] = acc
    remainingYearByMonth[month] = annualGoal - acc
  }

  return {
    year,
    periodTotal,
    historyTotal,
    yearShare: historyTotal ? totalYear / historyTotal : 0,
    scopeShare: historyTotal ? periodTotal / historyTotal : 0,
    billingByMonth: billing,
    quantityByMonth: quantityByMonth(db, year, filter),
    bySeller: bySeller(
      db,
      scope(db, year, { ...filter, sellers: null }),
      totalYear,
    ),
    byState: byState(db, scope(db, year, filter), totalYear),
    byRegion: byRegion(db, scope(db, year, filter), totalYear),
    funnelByMonth: funnelByMonth(db, year, filter),
    closingCounts: closingCounts(db, year, filter),
    averageTickets: averageTicket(db, year, filter),
    annualGoal: Number(annualGoal.toFixed(2)),
    annualGoalBase: Number(annualGoalBase.toFixed(2)),
    annualGoalAuto: Number(annualGoalAuto.toFixed(2)),
    customGoal,
    factor,
    monthlyGoals,
    cumulativeByMonth,
    remainingYearByMonth,
  }
}

export function getGoalConfig(db: SalesDatabase, year: number): GoalConfigView {
  const baseYear = year - 1
  const billingBase = billingByMonth(db, baseYear)
  const totalBase = MONTHS.reduce((acc, month) => acc + billingBase[month], 0)
  const factor = db.getFactor(year)
  const annualGoalAuto = totalBase * factor
  const annualCustom = db.getAnnualGoal(year)
  const monthsCustom = db.getMonthlyGoalOverrides(year)
  const shareOfBase = (month: Month): number =>
    totalBase ? billingBase[month] / totalBase : 1 / MONTHS.length

  const effectiveGoals = MONTHS.map(
    month =>
      monthsCustom[month] ??
      (annualCustom ?? annualGoalAuto) * shareOfBase(month),
  )
  const autoGoals = Object.fromEntries(
    MONTHS.map(month => [month, billingBase[month] * factor]),
  ) as Record<Month, number>

  return {
    year,
    factor,
    baseYear: totalBase,
    annualGoal: Number(
      effectiveGoals.reduce((acc, goal) => acc + goal, 0).toFixed(2),
    ),
    annualGoalAuto: Number(annualGoalAuto.toFixed(2)),
    annualCustom,
    monthsCustom,
    autoGoals,
    effectiveGoals: Object.fromEntries(
      MONTHS.map((month, index) => [month, effectiveGoals[index]]),
    ) as Record<Month, number>,
  }
}

export function setGoalConfig(
  db: SalesDatabase,
  year: number,
  input: GoalSetInput,
): void {
  db.setAnnualGoal(year, input.annual)
  db.setMonthlyGoalOverrides(year, input.months)
}
