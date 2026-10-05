import type { ComponentProps, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ChartCardProps = {
  title: string
  contentClassName?: string
  headerClassName?: string
  children: ReactNode
} & Omit<ComponentProps<typeof Card>, 'title' | 'children'>

// O react-grid-layout clona o card injetando className/style/ref e os handlers
// de drag, então os props extras precisam cair no Card.
export function ChartCard({
  title,
  contentClassName,
  headerClassName,
  children,
  className,
  ...cardProps
}: ChartCardProps) {
  return (
    <Card className={cn('gap-2 py-3', className)} {...cardProps}>
      <CardHeader className={cn('px-4 pb-1', headerClassName)}>
        <CardTitle className="text-sm leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn('px-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
