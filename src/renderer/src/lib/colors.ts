export const BRAND = {
  gold: "#E49E18",
  goldDark: "#B47A00",
  green: "#05D741",
  blue: "#1F6FEB",
  orange: "#CC5500",
  violet: "#7C3AED",
  red: "#DC2626",
  gray: "#6B7280",
  black: "#0B0B0D",
} as const;

const TOKEN_TO_HEX: Record<string, string> = {
  "bg-chart-1": BRAND.gold,
  "fill-chart-1": BRAND.gold,
  "stroke-chart-1": BRAND.gold,
  "bg-chart-2": BRAND.green,
  "fill-chart-2": BRAND.green,
  "stroke-chart-2": BRAND.green,
  "bg-chart-3": BRAND.blue,
  "fill-chart-3": BRAND.blue,
  "stroke-chart-3": BRAND.blue,
  "bg-chart-4": BRAND.orange,
  "fill-chart-4": BRAND.orange,
  "stroke-chart-4": BRAND.orange,
  "bg-chart-5": BRAND.violet,
  "fill-chart-5": BRAND.violet,
  "stroke-chart-5": BRAND.violet,
  "bg-destructive": BRAND.red,
  "fill-destructive": BRAND.red,
  "stroke-destructive": BRAND.red,
  "fill-muted-foreground": BRAND.gray,
  "bg-muted-foreground": BRAND.gray,
};

export function resolveChartColor(token?: string): string {
  return (token && TOKEN_TO_HEX[token]) || BRAND.gold;
}