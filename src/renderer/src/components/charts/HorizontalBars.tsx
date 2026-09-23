import type { ReactElement, ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

import { brlCompact, int } from "@/lib/format";
import { resolveChartColor } from "@/lib/colors";

export interface HBarDatum {
  label: string;
  value: number;
  sub?: string;
  raw?: ReactNode;
  colorClass?: string;
}

interface Props {
  data: HBarDatum[];
  format?: (v: number) => string;
  colorClass?: string;
  maxValue?: number;
  showValue?: boolean;
  valueClassName?: string;
  onSelect?: (datum: HBarDatum, index: number) => void;
}

const AXIS_WIDTH = 132;

function labelTick(props: unknown, subByLabel: Map<string, string>): ReactElement {
  const { x, y, payload } = props as {
    x: number;
    y: number;
    payload: { value: string };
  };
  const sub = subByLabel.get(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={sub ? -3 : 0} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted-foreground)">
        {payload.value}
      </text>
      {sub ? (
        <text x={-6} y={8} textAnchor="end" fontSize={9} fill="var(--muted-foreground)" opacity={0.7}>
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export default function HorizontalBars({
  data,
  format,
  colorClass = "bg-chart-1",
  maxValue,
  showValue = true,
  valueClassName,
  onSelect,
}: Props) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const axisFormat = format ?? int;
  const subByLabel = new Map(data.map((d) => [d.label, d.sub ?? ""]));
  const rows = data.map((d, i) => ({
    idx: i,
    label: d.label,
    value: d.value,
    sub: d.sub,
    colorClass: d.colorClass ?? colorClass,
  }));
  const height = Math.max(180, rows.length * 24 + 24);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 46, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, max]}
            tickFormatter={(v: ValueType | undefined) => brlCompact(Number(v ?? 0))}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={AXIS_WIDTH}
            tick={(tickProps) => labelTick(tickProps, subByLabel)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: ValueType | undefined) => [axisFormat(Number(value ?? 0)), ""]}
            labelFormatter={(label) => String(label ?? "")}
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 3, 3, 0]}
            maxBarSize={16}
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={
              onSelect
                ? (entry: { payload?: HBarDatum & { idx?: number } }) => {
                    const p = entry?.payload;
                    if (p) onSelect(p, p.idx ?? 0);
                  }
                : undefined
            }
          >
            {rows.map((r) => (
              <Cell key={r.label} fill={resolveChartColor(r.colorClass)} />
            ))}
            {showValue ? (
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => axisFormat(Number(v ?? 0))}
                className={valueClassName}
                style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}