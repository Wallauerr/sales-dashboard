import type { ReactElement, ReactNode } from 'react'
import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  ReactGridLayout as GridLayout,
  type Layout,
  type LayoutItem,
  type LegacyReactGridLayoutProps,
  WidthProvider,
} from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import {
  clearDashboardLayout,
  DEFAULT_DASHBOARD_LAYOUT,
  loadDashboardLayout,
  saveDashboardLayout,
} from '@/lib/dashboard-layout'

const DashboardGridLayout =
  WidthProvider<LegacyReactGridLayoutProps>(GridLayout)

const FALLBACK_ITEM: Omit<LayoutItem, 'i'> = {
  x: 0,
  y: 0,
  w: 4,
  h: 10,
  minW: 3,
  minH: 5,
}

function gridItemKeys(children: ReactNode): string[] {
  return (Array.isArray(children) ? children : [children])
    .filter(
      (child): child is ReactElement =>
        isValidElement(child) && child.key != null,
    )
    .map(child => String(child.key))
}

function layoutFor(keys: string[], stored: Layout): Layout {
  const saved = new Map(stored.map(item => [item.i, item]))
  const fallback = new Map(DEFAULT_DASHBOARD_LAYOUT.map(item => [item.i, item]))
  return keys.map((key, index) => {
    const item = saved.get(key) ?? fallback.get(key)
    return item ? { ...item, i: key } : { i: key, ...FALLBACK_ITEM, y: index }
  })
}

export function DashboardGrid({
  children,
  resetKey,
}: {
  children: ReactNode
  resetKey?: number
}) {
  const [stored, setStored] = useState<Layout>(loadDashboardLayout)

  const keys = useMemo(() => gridItemKeys(children), [children])
  const layout = useMemo(() => layoutFor(keys, stored), [keys, stored])

  const persistLayout = useCallback((next: Layout) => {
    setStored(next)
    saveDashboardLayout(next)
  }, [])

  useEffect(() => {
    if (resetKey === undefined) return
    setStored(DEFAULT_DASHBOARD_LAYOUT)
    clearDashboardLayout()
  }, [resetKey])

  return (
    <DashboardGridLayout
      layout={layout}
      cols={12}
      rowHeight={24}
      margin={[16, 16]}
      draggableHandle=".card-drag-handle"
      draggableCancel="[data-slot='select-trigger'], select"
      isResizable
      resizeHandles={['se']}
      onLayoutChange={persistLayout}>
      {children}
    </DashboardGridLayout>
  )
}
