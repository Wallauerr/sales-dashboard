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
    <div className="flex flex-wrap items-center justify-end gap-2">
      {vendedores.map(v => {
        const active = selected === v.vendedor
        const foto = fotos[v.vendedor]
        return (
          <Tooltip key={v.vendedor}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelect(active ? null : v.vendedor)}
                aria-label={`${v.vendedor}, ${brl0(v.valor)} (${pct(v.share)} de ${ano})`}
                className={cn(
                  'rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'opacity-80 hover:opacity-100',
                )}>
                {foto ? (
                  <img
                    src={foto}
                    alt=""
                    className="size-9 rounded-full border object-cover shadow-sm ring-1 ring-border"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tracking-wide text-primary">
                    {initials(v.vendedor)}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={2}>
              <div className="flex min-w-44 flex-col gap-1">
                <span className="font-medium">{v.vendedor}</span>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-primary-foreground/70">Total</span>
                  <span className="font-semibold tabular-nums">
                    {brl0(v.valor)}
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-primary-foreground/70">
                    Participação
                  </span>
                  <span className="tabular-nums">{pct(v.share)}</span>
                </span>
                <span className="mt-1 border-t border-border pt-1 text-[11px] text-primary-foreground/60">
                  {active ? 'Clique p/ limpar o filtro' : 'Clique p/ filtrar'} ·{' '}
                  {ano}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
