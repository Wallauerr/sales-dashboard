import type { Layout, LayoutItem } from 'react-grid-layout/legacy'

const DASHBOARD_LAYOUT_KEY = 'sd:dashboard-layout:v4'

export const DEFAULT_DASHBOARD_LAYOUT: LayoutItem[] = [
  { i: 'billing-monthly', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
  { i: 'cumulative', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
  { i: 'closing', x: 8, y: 0, w: 4, h: 7, minW: 3, minH: 5 },
  { i: 'funnel', x: 0, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
  { i: 'regions', x: 4, y: 6, w: 4, h: 11, minW: 3, minH: 5 },
  { i: 'states', x: 8, y: 6, w: 4, h: 7, minW: 3, minH: 5 },
  { i: 'history', x: 0, y: 12, w: 4, h: 5, minW: 3, minH: 5 },
  { i: 'ticket', x: 8, y: 12, w: 4, h: 5, minW: 3, minH: 5 },
]

export function loadDashboardLayout(): Layout {
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Layout
      if (Array.isArray(parsed)) {
        const byKey = new Map(parsed.map(item => [item.i, item]))
        return DEFAULT_DASHBOARD_LAYOUT.map(
          fallback => byKey.get(fallback.i) ?? fallback,
        )
      }
    }
  } catch {}
  return DEFAULT_DASHBOARD_LAYOUT
}

export function saveDashboardLayout(layout: Layout): void {
  try {
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout))
  } catch {}
}

export function clearDashboardLayout(): void {
  try {
    localStorage.removeItem(DASHBOARD_LAYOUT_KEY)
  } catch {}
}
