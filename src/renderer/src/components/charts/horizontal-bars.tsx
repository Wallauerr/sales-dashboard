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

export interface HBarDatum {
  label: string
  value: number
  color?: string
}

interface HorizontalBarsProps {
  data: HBarDatum[]
  valueFormat?: (v: number) => string
  showValue?: boolean
  className?: string
}

export function HorizontalBars({
  data,
  valueFormat = brlCompact,
  showValue = false,
  className,
}: HorizontalBarsProps) {
  const config = {
    value: { label: 'Valor', color: chartColor(1) },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      className={cn('h-[220px] w-full', className)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: showValue ? 16 : 8, left: 0, bottom: 0 }}
        barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => [
                valueFormat(Number(value)),
                name === 'value' ? 'Valor' : String(name),
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
