import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { brl0, brlCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccumulatedLineProps {
  labels: string[];
  values: number[];
  target?: number;
  valueFormat?: (v: number) => string;
  className?: string;
}

export function AccumulatedLine({
  labels,
  values,
  target,
  valueFormat = brl0,
  className,
}: AccumulatedLineProps) {
  const data = labels.map((label, i) => ({ label, acumulado: values[i] ?? 0 }));

  const config = {
    acumulado: { label: "Acumulado", color: "var(--chart-2)" },
    meta: { label: "Meta", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={cn("h-[260px] w-full", className)}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
          tickFormatter={(v) => brlCompact(Number(v))}
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [valueFormat(Number(value)), "Acumulado"]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="acumulado"
          stroke="var(--color-acumulado)"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
        {target !== undefined ? (
          <ReferenceLine
            y={target}
            stroke="var(--color-meta)"
            strokeDasharray="6 4"
            label={{
              value: "Meta",
              position: "right",
              fontSize: 11,
              fill: "var(--muted-foreground)",
            }}
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}