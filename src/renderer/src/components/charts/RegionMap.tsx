import { pct } from "@/lib/format";

export interface RegionPoint {
  label: string;
  value: number;
  share: number;
  x: number;
  y: number;
  colorClass?: string;
}

interface Props {
  regions: RegionPoint[];
}

export default function RegionMap({ regions }: Props) {
  const maxShare = Math.max(0.001, ...regions.map((r) => r.share));
  return (
    <div className="relative aspect-[5/4] w-full overflow-hidden rounded-lg border bg-muted/40">
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="border border-border/30" />
        ))}
      </div>
      {regions.map((r) => {
        const size = 26 + (r.share / maxShare) * 74;
        const top = 100 - r.y;
        return (
          <div
            key={r.label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${r.x}%`, top: `${top}%` }}
          >
            <div
              className={`flex items-center justify-center rounded-full ${r.colorClass ?? "bg-chart-1"} text-[10px] font-medium text-white`}
              style={{ width: size, height: size }}
            >
              {pct(r.share)}
            </div>
            <span className="text-[10px] leading-none text-muted-foreground">{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}