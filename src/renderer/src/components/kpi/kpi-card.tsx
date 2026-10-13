import { useLayoutEffect, useRef } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function KpiCardValue({ value, hint }: { value: string; hint?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const resize = () => {
      el.style.fontSize = ''
      const base = parseFloat(getComputedStyle(el).fontSize) || 16
      const natural = el.scrollWidth
      const avail = parent.clientWidth
      if (natural > 0 && avail > 0 && natural > avail) {
        el.style.fontSize = `${Math.max(11, (avail / natural) * base)}px`
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    return () => ro.disconnect()
  })

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span
        ref={ref}
        className="whitespace-nowrap text-lg leading-tight font-semibold tracking-tight tabular-nums sm:text-xl">
        {value}
      </span>
      {hint ? (
        <span className="text-[11px] leading-tight text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

export function KpiCard({
  title,
  value,
  hint,
  className,
}: {
  title: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn('min-w-0 gap-1 py-2', className)}>
      <CardHeader className="px-3 pb-0">
        <CardTitle className="text-xs leading-tight font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-3 pb-1">
        <KpiCardValue value={value} hint={hint} />
      </CardContent>
    </Card>
  )
}
