import type { ReactNode } from 'react'
import { useLayoutEffect, useRef } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function KpiCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <Card className={cn('min-w-0 gap-2 py-4', className)}>{children}</Card>
}

function KpiCardHeader({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <CardHeader className={cn('px-4 pb-0', className)}>{children}</CardHeader>
  )
}

function KpiCardTitle({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <CardTitle
      className={cn('text-sm font-medium text-muted-foreground', className)}>
      {children}
    </CardTitle>
  )
}

function KpiCardContent({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <CardContent className={cn('min-w-0 px-4 pb-2', className)}>
      {children}
    </CardContent>
  )
}

function KpiCardValue({ value, hint }: { value: string; hint?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      el.style.fontSize = ''
      const base = parseFloat(getComputedStyle(el).fontSize) || 16
      const natural = el.scrollWidth
      const avail = parent.clientWidth
      if (natural > 0 && avail > 0 && natural > avail) {
        el.style.fontSize = `${Math.max(11, (avail / natural) * base)}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  })

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        ref={ref}
        className="whitespace-nowrap text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

export { KpiCard, KpiCardContent, KpiCardHeader, KpiCardTitle, KpiCardValue }
