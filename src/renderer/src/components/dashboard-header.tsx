import {
  CheckIcon,
  ChevronDownIcon,
  FileUpIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  mes,
  onMes,
  view,
  importing,
  onImport,
  onOpenMetas,
  anos,
}: {
  ano: number
  onAno: (v: number) => void
  mes: Mes | 'todos'
  onMes: (v: Mes | 'todos') => void
  view: 'dashboard' | 'historico'
  importing: boolean
  onImport: () => void
  onOpenMetas: () => void
  anos: number[]
}) {
  const mesAtivo = mes !== 'todos'
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
              {mesAtivo ? MES_LABEL[mes as Mes] : 'Todos os meses'}
              <ChevronDownIcon className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onSelect={() => onMes('todos')}
              className="justify-between">
              Todos os meses
              {!mesAtivo ? <CheckIcon className="size-4" /> : null}
            </DropdownMenuItem>
            {MESES.map(m => (
              <DropdownMenuItem
                key={m}
                onSelect={() => onMes(m)}
                className="justify-between">
                {MES_LABEL[m]}
                {mes === m ? <CheckIcon className="size-4" /> : null}
              </DropdownMenuItem>
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
