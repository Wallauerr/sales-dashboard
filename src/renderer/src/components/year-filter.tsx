import { EllipsisIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { yearOptions } from '@/lib/year-options'

export function YearFilter({
  years,
  value,
  onValueChange,
  variant = 'pills',
  maxVisible = 5,
  className,
  ariaLabel = 'Filtrar por ano',
}: {
  years: number[]
  value: number | null
  onValueChange: (year: number) => void
  variant?: 'pills' | 'select'
  maxVisible?: number
  className?: string
  ariaLabel?: string
}) {
  if (years.length === 0) return null

  const sorted = [...new Set(years)].sort((a, b) => b - a)

  if (variant === 'select') {
    return (
      <div data-slot="year-filter" data-variant="select">
        <Select
          value={value === null ? undefined : String(value)}
          onValueChange={next => onValueChange(Number(next))}>
          <SelectTrigger
            size="sm"
            className={cn('w-24', className)}
            aria-label={ariaLabel}>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {sorted.map(year => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const { visible, hidden } = yearOptions(sorted, value, maxVisible)

  return (
    <div
      data-slot="year-filter"
      data-variant="pills"
      className={cn('flex items-center gap-2', className)}>
      <div className="flex rounded-lg border bg-muted p-0.5">
        {visible.map(year => (
          <button
            key={year}
            type="button"
            onClick={() => onValueChange(year)}
            aria-pressed={year === value}
            className={cn(
              'rounded-md cursor-pointer px-3 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
              year === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {year}
          </button>
        ))}
      </div>
      {hidden.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Mais anos">
              <EllipsisIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24">
            {hidden.map(year => (
              <DropdownMenuItem key={year} onSelect={() => onValueChange(year)}>
                {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
