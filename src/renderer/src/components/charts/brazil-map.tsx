import {
  Scatter,
  ScatterChart,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import {
  BRAZIL_BOUNDS,
  MAP_STATES,
  type MapPoint,
  type StateBubble,
  type StateValue,
  stateBubbles,
  unmappedStateValue,
} from '@/lib/brazil-map'
import { brl0, brlCompact, pct } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StateTooltipProps {
  active?: boolean
  payload?: { payload?: StateBubble }[]
  valueFormat: (value: number) => string
}

interface BrazilMapProps {
  rows: StateValue[]
  valueFormat?: (value: number) => string
  className?: string
}

const config = {
  value: { label: 'Faturamento', color: 'var(--primary)' },
} satisfies ChartConfig

function ringPath(
  ring: MapPoint[],
  xScale: (value: number) => number | undefined,
  yScale: (value: number) => number | undefined,
): string {
  const commands = ring.flatMap((point, index) => {
    const x = xScale(point.x)
    const y = yScale(point.y)
    if (x === undefined || y === undefined) return []
    return [`${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`]
  })
  return commands.length ? `${commands.join(' ')}Z` : ''
}

function MapBackground() {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  return (
    <g pointerEvents="none">
      {MAP_STATES.map(state => (
        <path
          key={state.uf}
          d={state.polygons
            .map(polygon =>
              polygon.map(ring => ringPath(ring, xScale, yScale)).join(' '),
            )
            .join(' ')}
          fill="var(--muted)"
          fillRule="evenodd"
          stroke="var(--border)"
          strokeWidth={0.6}
        />
      ))}
    </g>
  )
}

function StateTooltip({ active, payload, valueFormat }: StateTooltipProps) {
  const item = payload?.[0]?.payload
  if (!active || !item) return null

  return (
    <div className="grid gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.uf}</span>
        <span className="text-muted-foreground">{pct(item.share)}</span>
      </div>
      <span className="font-mono font-medium tabular-nums">
        {valueFormat(item.value)}
      </span>
    </div>
  )
}

export function BrazilMap({
  rows,
  valueFormat = brl0,
  className,
}: BrazilMapProps) {
  const data = stateBubbles(rows)
  const unmapped = unmappedStateValue(rows)

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="aspect-square w-full max-w-[160px]">
        <ChartContainer config={config} className="aspect-auto h-full w-full">
          <ScatterChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[BRAZIL_BOUNDS.minX, BRAZIL_BOUNDS.maxX]}
              height={0}
              hide
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[BRAZIL_BOUNDS.minY, BRAZIL_BOUNDS.maxY]}
              width={0}
              hide
            />
            <ZAxis type="number" dataKey="value" range={[36, 480]} />
            <MapBackground />
            <ChartTooltip
              cursor={false}
              content={<StateTooltip valueFormat={valueFormat} />}
            />
            <Scatter
              data={data}
              fill="var(--primary)"
              fillOpacity={0.5}
              stroke="var(--primary)"
              strokeWidth={1}
            />
          </ScatterChart>
        </ChartContainer>
      </div>

      {unmapped > 0 ? (
        <p className="text-center text-[11px] leading-tight text-muted-foreground">
          Fora do mapa (sem UF/Exterior): {brlCompact(unmapped)}
        </p>
      ) : null}
    </div>
  )
}
