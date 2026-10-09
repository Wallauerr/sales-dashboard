import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { brl0, brlCompact } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AccumulatedLineProps {
  labels: string[]
  values: number[]
  target?: number
  valueFormat?: (v: number) => string
  className?: string
}

export function AccumulatedLine({
  labels,
  values,
  target,
  valueFormat = brl0,
  className,
}: AccumulatedLineProps) {
  const data = labels.map((label, i) => ({ label, cumulative: values[i] ?? 0 }))

  const config = {
    cumulative: { label: 'Acumulado', color: 'var(--chart-2)' },
    goal: { label: 'Meta', color: 'var(--chart-3)' },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto min-h-[90px] w-full flex-1', className)}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
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
          tickFormatter={v => brlCompact(Number(v))}
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={value => [valueFormat(Number(value))]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
        {target !== undefined ? (
          <ReferenceLine
            y={target}
            stroke="var(--color-goal)"
            strokeDasharray="6 4"
            label={{
              value: `Meta ${valueFormat(target)}`,
              position: 'top',
              fontSize: 11,
              fill: 'var(--color-goal)',
            }}
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  )
}
