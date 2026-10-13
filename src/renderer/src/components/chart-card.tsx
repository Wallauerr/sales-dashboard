import type { ComponentProps, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ChartCardProps = {
  title: string
  contentClassName?: string
  headerClassName?: string
  children: ReactNode
} & Omit<ComponentProps<typeof Card>, 'title' | 'children'>

// O RGL clona o card injetando className/style/ref e os handlers de drag.
export function ChartCard({
  title,
  contentClassName,
  headerClassName,
  children,
  className,
  ...cardProps
}: ChartCardProps) {
  return (
    <Card className={cn('h-full gap-2 py-3', className)} {...cardProps}>
      <CardHeader className={cn('shrink-0 px-4', headerClassName)}>
        <CardTitle className="text-sm leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto px-4',
          contentClassName,
        )}>
        {children}
      </CardContent>
    </Card>
  )
}
