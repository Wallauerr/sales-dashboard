import {
  CheckIcon,
  ChevronDownIcon,
  FileUpIcon,
  HistoryIcon,
  PresentationIcon,
  SettingsIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MONTH_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Month } from '../../../shared/types'
import { MONTHS } from '../../../shared/types'
import { ThemeToggle } from './theme-toggle'

export function DashboardHeader({
  year,
  onYear,
  months,
  onMonth,
  onClearMonths,
  importing,
  onImport,
  onOpenMeta,
  onOpenHistory,
  onOpenRetrospective,
  years,
  sellerFilter,
}: {
  year: number
  onYear: (v: number) => void
  months: Month[]
  onMonth: (m: Month) => void
  onClearMonths: () => void
  importing: boolean
  onImport: () => void
  onOpenMeta: () => void
  onOpenHistory: () => void
  onOpenRetrospective: () => void
  years: number[]
  sellerFilter?: ReactNode
}) {
  const selectedText =
    months.length === 0
      ? 'Todos os meses'
      : months.length === 1
        ? MONTH_LABEL[months[0]]
        : `${months.length} meses`
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Sulmag Equipamentos Magnéticos
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Metas Comercial
        </h1>
        <p className="text-sm text-muted-foreground">Dashboard de vendas</p>
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-muted p-0.5">
          {years.map(y => (
            <button
              key={y}
              type="button"
              onClick={() => onYear(y)}
              className={cn(
                'rounded-md cursor-pointer px-3 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                y === year
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              {y}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-36 justify-between gap-2 px-3 text-sm font-normal">
              {selectedText}
              <ChevronDownIcon className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onSelect={onClearMonths}
              className="justify-between">
              Todos os meses
              {months.length === 0 ? (
                <span className="size-4 text-primary">
                  <CheckIcon className="size-4" />
                </span>
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {MONTHS.map(m => (
              <DropdownMenuCheckboxItem
                key={m}
                checked={months.includes(m)}
                onSelect={e => {
                  e.preventDefault()
                  onMonth(m)
                }}>
                {MONTH_LABEL[m]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {sellerFilter}
        <Button variant="outline" onClick={onOpenRetrospective}>
          <PresentationIcon className="size-4" />
          Retrospectiva
        </Button>
        <Button
          onClick={onImport}
          disabled={importing}
          title="Importar dados do SIGE"
          aria-label="Importar dados do SIGE">
          <FileUpIcon className="size-4" />
          {importing ? 'Importando…' : 'Importar'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Abrir histórico"
          onClick={onOpenHistory}>
          <HistoryIcon className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Abrir configurações"
          onClick={onOpenMeta}>
          <SettingsIcon className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
