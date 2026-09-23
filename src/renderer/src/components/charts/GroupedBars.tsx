import { cn } from "@/lib/utils";
import { brlCompact } from "@/lib/format";

export interface BarSeries {
  name: string;
  values: number[];
  kind: "bar" | "marker";
  colorClass?: string;
}

interface Props {
  labels: string[];
  series: BarSeries[];
  valueFormat?: (v: number) => string;
  height?: number;
  onBarClick?: (index: number) => void;
}

const W = 800;
const L = 60;
const R = 16;
const T = 28;
const B = 30;

function niceCeil(v: number): number {
  const safe = Math.max(1, v);
  const p = Math.pow(10, Math.floor(Math.log10(safe)));
  const m = safe / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

export default function GroupedBars({ labels, series, valueFormat = brlCompact, height = 280, onBarClick }: Props) {
  const chartW = W - L - R;
  const chartH = height - T - B;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = niceCeil(max);
  const bars = series.filter((s) => s.kind === "bar");
  const markers = series.filter((s) => s.kind === "marker");
  const n = labels.length;
  const band = chartW / n;
  const bw = Math.min(30, (band / Math.max(1, bars.length)) * 0.7);
  const x = (i: number): number => L + band * (i + 0.5);
  const y = (v: number): number => T + chartH - (v / nice) * chartH;
  const steps = 4;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img">
      {Array.from({ length: steps + 1 }, (_, k) => {
        const v = (nice / steps) * k;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.1} />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
              {valueFormat(v)}
            </text>
          </g>
        );
      })}
      {bars.length === 1
        ? bars[0].values.map((v, i) => (
            <rect
              key={i}
              x={x(i) - bw / 2}
              y={y(v)}
              width={bw}
              height={Math.max(0, T + chartH - y(v))}
              rx={2}
              className={cn(bars[0].colorClass ?? "fill-chart-1", onBarClick && "cursor-pointer")}
              onClick={onBarClick ? () => onBarClick(i) : undefined}
            />
          ))
        : bars.map((s, si) =>
            s.values.map((v, i) => (
              <rect
                key={`${s.name}-${i}`}
                x={x(i) - (bw * bars.length) / 2 + si * bw + 1}
                y={y(v)}
                width={bw - 2}
                height={Math.max(0, T + chartH - y(v))}
                rx={2}
                className={cn(s.colorClass ?? "fill-chart-1", onBarClick && "cursor-pointer")}
                onClick={onBarClick ? () => onBarClick(i) : undefined}
              />
            )),
          )}
      {markers.map((s) =>
        s.values.map((v, i) => (
          <line
            key={`${s.name}-${i}`}
            x1={x(i) - (band / 2) * 0.82}
            x2={x(i) + (band / 2) * 0.82}
            y1={y(v)}
            y2={y(v)}
            strokeWidth={2}
            strokeDasharray="4 3"
            className={s.colorClass ?? "stroke-chart-3"}
          />
        )),
      )}
      {labels.map((lab, i) => (
        <text key={lab} x={x(i)} y={height - B + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {lab}
        </text>
      ))}
      <g>
        {series.map((s, i) => (
          <g key={s.name} transform={`translate(${L + i * 110}, ${T - 10})`}>
            {s.kind === "bar" ? (
              <rect x={0} y={-7} width={9} height={9} rx={2} className={s.colorClass ?? "fill-chart-1"} />
            ) : (
              <line x1={0} x2={14} y1={-2} y2={-2} strokeWidth={2} strokeDasharray="4 3" className={s.colorClass ?? "stroke-chart-3"} />
            )}
            <text x={13} y={0} className="fill-muted-foreground text-[10px]">
              {s.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}