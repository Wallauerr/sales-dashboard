import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { chartColor } from '@/lib/colors'
import { brlCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { KpiSnapshot } from '../../../../shared/types'

export function funnelItems(snap: KpiSnapshot): HBarDatum[] {
  const f = snap.funnelByMonth.reduce(
    (acc, m) => {
      acc.quote += m.quote
      acc.order += m.order
      acc.approvedWithoutInvoicing += m.approvedWithoutInvoicing
      acc.cancelled += m.cancelled
      acc.invoiced += m.invoiced
      acc.notInvoiced += m.notInvoiced
      return acc
    },
    {
      quote: 0,
      order: 0,
      approvedWithoutInvoicing: 0,
      cancelled: 0,
      invoiced: 0,
      notInvoiced: 0,
    },
  )
  const rows = [
    { singular: 'Orçamento', plural: 'Orçamentos', v: f.quote },
    { singular: 'Pedido', plural: 'Pedidos', v: f.order },
    {
      singular: 'Pedido Aprovado S/F',
      plural: 'Pedidos Aprovados S/F',
      v: f.approvedWithoutInvoicing,
    },
    {
      singular: 'Pedido Cancelado',
      plural: 'Pedidos Cancelados',
      v: f.cancelled,
    },
    {
      singular: 'Pedido Faturado',
      plural: 'Pedidos Faturados',
      v: f.invoiced,
    },
    {
      singular: 'Pedido Não Faturado',
      plural: 'Pedidos Não Faturados',
      v: f.notInvoiced,
    },
  ]
  return rows.map((r, i) => ({
    label: r.v > 1 ? r.plural : r.singular,
    value: r.v,
    color: i < 5 ? chartColor(i + 1) : 'var(--destructive)',
  }))
}

export interface HBarDatum {
  label: string
  value: number
  color?: string
}

interface HorizontalBarsProps {
  data: HBarDatum[]
  valueFormat?: (v: number) => string
  valueLabel?: string
  showValue?: boolean
  className?: string
}

export function HorizontalBars({
  data,
  valueFormat = brlCompact,
  valueLabel = 'Valor',
  showValue = false,
  className,
}: HorizontalBarsProps) {
  const config = {
    value: { label: 'Valor', color: chartColor(1) },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto min-h-[90px] w-full flex-1', className)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: showValue ? 48 : 8, left: -30, bottom: 0 }}
        barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={152}
          interval={0}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => [
                valueFormat(Number(value)),
                ` ${item?.payload?.label ?? valueLabel}`,
              ]}
            />
          }
        />
        <Bar dataKey="value" radius={3} maxBarSize={18}>
          {data.map((datum, i) => (
            <Cell
              key={datum.label}
              fill={datum.color ?? chartColor((i % 5) + 1)}
            />
          ))}
          {showValue ? (
            <LabelList
              dataKey="value"
              position="right"
              formatter={v => valueFormat(Number(v))}
              className="fill-muted-foreground text-xs"
            />
          ) : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
