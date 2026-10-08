import {
  CheckIcon,
  ChevronDownIcon,
  FileUpIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MES_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Mes } from '../../../shared/types'
import { MESES } from '../../../shared/types'
import { ThemeToggle } from './theme-toggle'

export function DashboardHeader({
  ano,
  onAno,
  meses,
  onMes,
  onClearMeses,
  view,
  importing,
  onImport,
  onOpenMetas,
  anos,
}: {
  ano: number
  onAno: (v: number) => void
  meses: Mes[]
  onMes: (m: Mes) => void
  onClearMeses: () => void
  view: 'dashboard' | 'historico'
  importing: boolean
  onImport: () => void
  onOpenMetas: () => void
  anos: number[]
}) {
  const selTxt =
    meses.length === 0
      ? 'Todos os meses'
      : meses.length === 1
        ? MES_LABEL[meses[0]]
        : `${meses.length} meses`
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Sulmag Equipamentos Magnéticos
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Metas Comercial
        </h1>
        <p className="text-sm text-muted-foreground">
          {view === 'dashboard' ? 'Dashboard de vendas' : 'Histórico de vendas'}
        </p>
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-muted p-0.5">
          {anos.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => onAno(a)}
              className={cn(
                'rounded-md cursor-pointer px-3 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                a === ano
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              {a}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-36 justify-between gap-2 px-3 text-sm font-normal">
              {selTxt}
              <ChevronDownIcon className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onSelect={onClearMeses}
              className="justify-between">
              Todos os meses
              {meses.length === 0 ? (
                <span className="size-4 text-primary">
                  <CheckIcon className="size-4" />
                </span>
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {MESES.map(m => (
              <DropdownMenuCheckboxItem
                key={m}
                checked={meses.includes(m)}
                onSelect={e => {
                  e.preventDefault()
                  onMes(m)
                }}>
                {MES_LABEL[m]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onImport} disabled={importing}>
          <FileUpIcon className="size-4" />
          {importing ? 'Importando…' : 'Importar dados do SIGE'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Abrir configurações"
          onClick={onOpenMetas}>
          <SettingsIcon className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
