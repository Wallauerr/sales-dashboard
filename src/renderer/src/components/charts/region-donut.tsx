import { Cell, Pie, PieChart } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { chartColor } from '@/lib/colors'
import { brl0, brlCompact, pct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { KpiSnapshot } from '../../../../shared/types'

const REGION_COLORS: Record<string, string> = {
  Norte: chartColor(1),
  Nordeste: chartColor(4),
  'Centro-Oeste': chartColor(3),
  Sudeste: chartColor(2),
  Sul: chartColor(5),
  Exterior: 'var(--muted-foreground)',
}

export function regionDonutData(snap: KpiSnapshot): DonutDatum[] {
  return snap.porRegiao.map(r => ({
    label: r.regiao,
    value: r.valor,
    share: r.share,
    color: REGION_COLORS[r.regiao],
  }))
}

export function regionBarData(snap: KpiSnapshot): DonutDatum[] {
  return snap.porRegiao.map(r => ({
    label: r.regiao,
    value: r.valor,
    color: REGION_COLORS[r.regiao],
  }))
}

export interface DonutDatum {
  label: string
  value: number
  share?: number
  color?: string
}

interface RegionDonutProps {
  data: DonutDatum[]
  valueFormat?: (v: number) => string
  className?: string
}

const PALETTE = [1, 2, 3, 4, 5]

export function RegionDonut({
  data,
  valueFormat = brl0,
  className,
}: RegionDonutProps) {
  const config = Object.fromEntries(
    data.map((datum, i) => [
      i,
      {
        label: datum.label,
        color: datum.color ?? chartColor(PALETTE[i % PALETTE.length]),
      },
    ]),
  ) satisfies ChartConfig

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ChartContainer config={config} className="h-[220px] w-full">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={58}
            outerRadius={86}
            paddingAngle={2}
            strokeWidth={2}>
            {data.map((datum, i) => (
              <Cell key={datum.label} fill={`var(--color-${i})`} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  valueFormat(Number(value)),
                  String(name),
                ]}
              />
            }
          />
        </PieChart>
      </ChartContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((datum, i) => {
          const color = (config[i] as { color?: string } | undefined)?.color
          return (
            <div
              key={datum.label}
              className="flex items-center gap-1.5 text-xs">
              <span
                className="size-2.5 rounded-[2px]"
                style={{ backgroundColor: color ?? 'var(--chart-1)' }}
              />
              <span className="text-muted-foreground">{datum.label}</span>
              <span className="font-medium tabular-nums">
                {brlCompact(datum.value)}
                {datum.share !== undefined ? ` · ${pct(datum.share)}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
