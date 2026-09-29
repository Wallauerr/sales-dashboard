import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MES_LABEL } from '@/lib/labels'
import type { Mes } from '../../../shared/types'

export function ActiveFilters({
  mes,
  vendedor,
  onClearMes,
  onClearVendedor,
  onClearAll,
}: {
  mes: Mes | 'todos'
  vendedor: string | null
  onClearMes: () => void
  onClearVendedor: () => void
  onClearAll: () => void
}) {
  const mesAtivo = mes !== 'todos'
  if (!mesAtivo && !vendedor) return null
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Filtrando por:
      </span>
      {mesAtivo ? (
        <button
          type="button"
          onClick={onClearMes}
          className="flex cursor-pointer items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
          Mês: {MES_LABEL[mes as Mes]}
          <XIcon className="size-3" />
        </button>
      ) : null}
      {vendedor ? (
        <button
          type="button"
          onClick={onClearVendedor}
          className="flex cursor-pointer items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
          Vendedor: {vendedor}
          <XIcon className="size-3" />
        </button>
      ) : null}
      <Button variant="outline" size="sm" onClick={onClearAll}>
        Limpar filtros
      </Button>
    </div>
  )
}
