import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function KpiCard({ className, children }: { className?: string; children: ReactNode }) {
  return <Card className={cn("gap-2 py-4", className)}>{children}</Card>;
}

function KpiCardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <CardHeader className={cn("px-4 pb-0", className)}>{children}</CardHeader>;
}

function KpiCardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <CardTitle className={cn("text-sm font-medium text-muted-foreground", className)}>{children}</CardTitle>;
}

function KpiCardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <CardContent className={cn("px-4 pb-2", className)}>{children}</CardContent>;
}

function KpiCardValue({ value, hint }: { value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export { KpiCard, KpiCardHeader, KpiCardTitle, KpiCardContent, KpiCardValue };