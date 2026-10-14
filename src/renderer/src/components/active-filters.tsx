import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MONTH_LABEL } from '@/lib/labels'
import type { Month } from '../../../shared/types'

export function ActiveFilters({
  months,
  sellers,
  onClearMonth,
  onClearSeller,
  onClearAll,
}: {
  months: Month[]
  sellers: string[]
  onClearMonth: (m: Month) => void
  onClearSeller: (v: string) => void
  onClearAll: () => void
}) {
  if (months.length === 0 && sellers.length === 0) return null
  return (
    <div className="no-print flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs font-medium text-muted-foreground">
        Filtrando por:
      </span>
      {months.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {months.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onClearMonth(m)}
              className="flex cursor-pointer items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
              {MONTH_LABEL[m]}
              <XIcon className="size-3" />
            </button>
          ))}
        </span>
      ) : null}
      {sellers.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {sellers.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onClearSeller(v)}
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
