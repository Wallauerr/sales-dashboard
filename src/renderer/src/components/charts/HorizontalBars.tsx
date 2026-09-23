import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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
}

export default function HorizontalBars({
  data,
  format,
  colorClass = "bg-chart-1",
  maxValue,
  showValue = true,
}: Props) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
          <span className="truncate text-xs text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-3.5 overflow-hidden rounded bg-muted">
            <div
              className={cn("h-full rounded", d.colorClass ?? colorClass)}
              style={{ width: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${format ? format(d.value) : d.value}`}
            />
          </div>
          {showValue ? (
            <span className="min-w-16 text-right text-xs tabular-nums">
              {format ? format(d.value) : d.value.toLocaleString("pt-BR")}
              {d.sub ? <span className="ml-1.5 text-muted-foreground">{d.sub}</span> : null}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}