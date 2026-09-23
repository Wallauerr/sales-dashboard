import { brlCompact } from "@/lib/format";

interface Props {
  labels: string[];
  values: number[];
  target: number;
  valueFormat?: (v: number) => string;
  height?: number;
}

const W = 800;
const L = 60;
const R = 16;
const T = 20;
const B = 30;

function niceCeil(v: number): number {
  const safe = Math.max(1, v);
  const p = Math.pow(10, Math.floor(Math.log10(safe)));
  const m = safe / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

export default function AccumulatedLine({ labels, values, target, valueFormat = brlCompact, height = 260 }: Props) {
  const chartW = W - L - R;
  const chartH = height - T - B;
  const nice = niceCeil(Math.max(target, ...values));
  const n = labels.length;
  const x = (i: number): number => L + (chartW / Math.max(1, n - 1)) * i;
  const y = (v: number): number => T + chartH - (v / nice) * chartH;
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `M ${x(0)},${T + chartH} ${values.map((v, i) => `L ${x(i)},${y(v)}`).join(" ")} L ${x(n - 1)},${T + chartH} Z`;
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
      <line
        x1={L}
        x2={W - R}
        y1={y(target)}
        y2={y(target)}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="stroke-destructive"
      />
      <text x={W - R} y={y(target) - 4} textAnchor="end" className="fill-destructive text-[10px]">
        meta {valueFormat(target)}
      </text>
      <path d={area} className="fill-chart-1 opacity-15" />
      <polyline points={pts} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-chart-1" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.5} className="fill-chart-1" />
      ))}
      {labels.map((lab, i) => (
        <text key={lab} x={x(i)} y={height - B + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {lab}
        </text>
      ))}
    </svg>
  );
}