import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { chartColor } from '@/lib/colors'
import { brlCompact } from '@/lib/format'
import { cn } from '@/lib/utils'

interface TooltipItem {
  name?: string
  value?: number
  color?: string
  payload?: { label?: string; fill?: string; stroke?: string }
}

function BarsTooltip({
  active,
  payload,
  valueFormat,
}: {
  active?: boolean
  payload?: TooltipItem[]
  valueFormat: (v: number) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{payload[0].payload?.label}</div>
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const color = item.color ?? item.payload?.fill ?? item.payload?.stroke
          return (
            <div
              key={item.name ?? index}
              className="flex w-full flex-wrap items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {valueFormat(Number(item.value))}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface BarsSeries {
  name: string
  values: number[]
  kind?: 'bar' | 'line'
  color?: string
}

interface GroupedBarsProps {
  labels: string[]
  series: BarsSeries[]
  valueFormat?: (v: number) => string
  className?: string
  onClick?: (index: number) => void
}

export function GroupedBars({
  labels,
  series,
  valueFormat = brlCompact,
  className,
  onClick,
}: GroupedBarsProps) {
  const data = labels.map((label, i) => ({
    label,
    ...Object.fromEntries(series.map(s => [s.name, s.values[i] ?? 0])),
  }))

  const config = Object.fromEntries(
    series.map((s, i) => [
      s.name,
      { label: s.name, color: s.color ?? chartColor((i % 5) + 1) },
    ]),
  ) satisfies ChartConfig

  const bars = series.filter(s => s.kind !== 'line')
  const lines = series.filter(s => s.kind === 'line')

  return (
    <ChartContainer
      config={config}
      className={cn(
        'aspect-auto min-h-[90px] w-full flex-1',
        onClick && '[&_.recharts-bar-rectangle]:cursor-pointer',
        className,
      )}>
      <ComposedChart
        data={data}
        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickFormatter={v => valueFormat(Number(v))}
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip content={<BarsTooltip valueFormat={valueFormat} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {bars.map(s => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={`var(--color-${s.name})`}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            onClick={
              onClick
                ? (_data: unknown, index: number) => {
                    onClick(index)
                  }
                : undefined
            }
          />
        ))}
        {lines.map(s => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={`var(--color-${s.name})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  )
}
