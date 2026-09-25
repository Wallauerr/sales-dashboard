import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

import { brlCompact } from "@/lib/format";
import { BRAND, resolveChartColor } from "@/lib/colors";

interface Props {
  labels: string[];
  values: number[];
  target?: number;
  valueFormat?: (v: number) => string;
  height?: number;
}

export default function AccumulatedLine({
  labels,
  values,
  target,
  valueFormat = brlCompact,
  height = 260,
}: Props) {
  const gid = useId();
  const data = labels.map((label, i) => ({ idx: i, label, value: values[i] ?? 0 }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND.gold} stopOpacity={0.35} />
              <stop offset="95%" stopColor={BRAND.gold} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            formatter={(value: ValueType | undefined, _name: unknown) => [valueFormat(Number(value ?? 0)), "Acumulado"]}
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          {target !== undefined && target > 0 ? (
            <ReferenceLine
              y={target}
              stroke={resolveChartColor("stroke-destructive")}
              strokeDasharray="6 4"
              label={{
                value: `meta ${valueFormat(target)}`,
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--destructive)",
              }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND.gold}
            strokeWidth={2.5}
            fill={`url(#${gid})`}
            dot={{ r: 2.5, fill: BRAND.gold, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}