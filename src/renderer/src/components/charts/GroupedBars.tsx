import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

import { brlCompact } from "@/lib/format";
import { resolveChartColor } from "@/lib/colors";

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

export default function GroupedBars({
  labels,
  series,
  valueFormat = brlCompact,
  height = 280,
  onBarClick,
}: Props) {
  const data = labels.map((label, i) => ({
    idx: i,
    label,
    ...Object.fromEntries(series.map((s) => [s.name, s.values[i] ?? 0])),
  }));

  const bars = series.filter((s) => s.kind === "bar");
  const markers = series.filter((s) => s.kind === "marker");

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => valueFormat(Number(v ?? 0))}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value: ValueType | undefined, name: unknown) => [valueFormat(Number(value ?? 0)), String(name ?? "")]}
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {bars.map((s) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={resolveChartColor(s.colorClass)}
              radius={[3, 3, 0, 0]}
              maxBarSize={34}
              className={onBarClick ? "cursor-pointer" : undefined}
              onClick={
                onBarClick
                  ? (entry: { payload?: { idx?: number } }) =>
                      onBarClick(entry?.payload?.idx ?? 0)
                  : undefined
              }
            />
          ))}
          {markers.map((s) => (
            <Line
              key={s.name}
              dataKey={s.name}
              stroke={resolveChartColor(s.colorClass)}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              legendType="line"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}