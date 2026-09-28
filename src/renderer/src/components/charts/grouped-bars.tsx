import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { brlCompact } from "@/lib/format";
import { chartColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

export interface BarsSeries {
  name: string;
  values: number[];
  kind?: "bar" | "line";
  color?: string;
}

interface GroupedBarsProps {
  labels: string[];
  series: BarsSeries[];
  valueFormat?: (v: number) => string;
  className?: string;
  onClick?: (index: number) => void;
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
    ...Object.fromEntries(series.map((s) => [s.name, s.values[i] ?? 0])),
  }));

  const config = Object.fromEntries(
    series.map((s, i) => [
      s.name,
      { label: s.name, color: s.color ?? chartColor((i % 5) + 1) },
    ]),
  ) satisfies ChartConfig;

  const bars = series.filter((s) => s.kind !== "line");
  const lines = series.filter((s) => s.kind === "line");

  return (
    <ChartContainer config={config} className={cn("h-[280px] w-full", className)}>
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
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => valueFormat(Number(v))}
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => [valueFormat(Number(value)), ""]} />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {bars.map((s) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={`var(--color-${s.name})`}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            onClick={
              onClick
                ? (_data: unknown, index: number) => {
                    onClick(index);
                  }
                : undefined
            }
          />
        ))}
        {lines.map((s) => (
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
  );
}