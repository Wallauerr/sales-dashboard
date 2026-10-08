import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MES_LABEL } from '@/lib/labels'
import type { Mes } from '../../../shared/types'

export function ActiveFilters({
  meses,
  vendedores,
  onClearMes,
  onClearVendedor,
  onClearAll,
}: {
  meses: Mes[]
  vendedores: string[]
  onClearMes: (m: Mes) => void
  onClearVendedor: (v: string) => void
  onClearAll: () => void
}) {
  if (meses.length === 0 && vendedores.length === 0) return null
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Filtrando por:
      </span>
      {meses.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {meses.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onClearMes(m)}
              className="flex cursor-pointer items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
              {MES_LABEL[m]}
              <XIcon className="size-3" />
            </button>
          ))}
        </span>
      ) : null}
      {vendedores.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {vendedores.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onClearVendedor(v)}
              className="flex cursor-pointer items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
              {v}
              <XIcon className="size-3" />
            </button>
          ))}
        </span>
      ) : null}
      <Button variant="outline" size="sm" onClick={onClearAll}>
        Limpar filtros
      </Button>
    </div>
  )
}
