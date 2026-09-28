import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { brl0, pct } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Seller {
  vendedor: string
  valor: number
  share: number
}

interface Props {
  ano: number
  vendedores: Seller[]
  fotos: Record<string, string>
  selected: string | null
  onSelect: (vendedor: string | null) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function SellerCards({
  ano,
  vendedores,
  fotos,
  selected,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {vendedores.map(v => {
        const active = selected === v.vendedor
        const foto = fotos[v.vendedor]
        return (
          <Tooltip key={v.vendedor}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelect(active ? null : v.vendedor)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-lg border bg-card p-3 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-primary/60 hover:bg-muted/40',
                )}>
                {foto ? (
                  <img
                    src={foto}
                    alt={v.vendedor}
                    className="size-16 rounded-full border object-cover shadow-sm ring-1 ring-border"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tracking-wide text-primary">
                    {initials(v.vendedor)}
                  </span>
                )}
                <span className="line-clamp-2 min-h-8 text-xs font-medium leading-tight">
                  {v.vendedor}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {brl0(v.valor)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {pct(v.share)} de {ano}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={2}>
              {active
                ? 'Clique para limpar o filtro de vendedor'
                : `Filtrar o dashboard por ${v.vendedor}`}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
