import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  const patternId = `raster-${useId().replace(/:/g, '')}`

  const config = {
    cumulative: { label: 'Acumulado', color: 'var(--chart-2)' },
    goal: { label: 'Meta', color: 'var(--chart-3)' },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto min-h-[90px] w-full flex-1', className)}>
      <AreaChart data={data} margin={{ top: 8, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="64"
            height="64">
            <rect
              width="64"
              height="64"
              fill="var(--color-cumulative)"
              fillOpacity={0.12}
            />
            <path d="M-106 110L22 -18" stroke="var(--color-cumulative)" />
            <path d="M-98 110L30 -18" stroke="var(--color-cumulative)" />
            <path d="M-90 110L38 -18" stroke="var(--color-cumulative)" />
            <path d="M-82 110L46 -18" stroke="var(--color-cumulative)" />
            <path d="M-74 110L54 -18" stroke="var(--color-cumulative)" />
            <path d="M-66 110L62 -18" stroke="var(--color-cumulative)" />
            <path d="M-58 110L70 -18" stroke="var(--color-cumulative)" />
            <path d="M-50 110L78 -18" stroke="var(--color-cumulative)" />
            <path d="M-42 110L86 -18" stroke="var(--color-cumulative)" />
            <path d="M-34 110L94 -18" stroke="var(--color-cumulative)" />
            <path d="M-26 110L102 -18" stroke="var(--color-cumulative)" />
            <path d="M-18 110L110 -18" stroke="var(--color-cumulative)" />
            <path d="M-10 110L118 -18" stroke="var(--color-cumulative)" />
            <path d="M-2 110L126 -18" stroke="var(--color-cumulative)" />
            <path d="M6 110L134 -18" stroke="var(--color-cumulative)" />
            <path d="M14 110L142 -18" stroke="var(--color-cumulative)" />
            <path d="M22 110L150 -18" stroke="var(--color-cumulative)" />
          </pattern>
        </defs>
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
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={value => [valueFormat(Number(value))]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          fill={`url(#${patternId})`}
          activeDot={{
            r: 5,
            fill: 'var(--card)',
            stroke: 'var(--color-cumulative)',
            strokeWidth: 2,
          }}
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
      </AreaChart>
    </ChartContainer>
  )
}
