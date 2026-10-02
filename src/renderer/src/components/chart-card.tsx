import type { ComponentProps, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ChartCardProps = {
  title: string
  contentClassName?: string
  headerClassName?: string
  children: ReactNode
} & Omit<ComponentProps<typeof Card>, 'title' | 'children'>

// O react-grid-layout clona este card injetando className/style/ref e os
// handlers de drag, então os props extras precisam cair no Card.
export function ChartCard({
  title,
  contentClassName,
  headerClassName,
  children,
  ...cardProps
}: ChartCardProps) {
  return (
    <Card {...cardProps}>
      <CardHeader className={headerClassName}>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
