import { CheckIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { brl0, pct } from '@/lib/format'
import { fotoUrl } from '@/lib/foto-url'
import { cn } from '@/lib/utils'

interface Seller {
  vendedor: string
  valor: number
  share: number
}

interface Props {
  ano: number
  vendedores: Seller[]
  fotos: Set<string>
  selected: string[]
  onSelect: (vendedor: string) => void
  onClear: () => void
  desativados: number
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
  onClear,
  desativados,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UsersIcon />
          <span className="max-w-40 truncate">
            {selected.length === 1
              ? selected[0]
              : selected.length === 0
                ? 'Vendedores'
                : `${selected.length} vendedores`}
          </span>
          {selected.length === 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {vendedores.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">
            Vendedores · {ano}
          </span>
          {selected.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onClear}>
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {vendedores.map(v => {
            const active = selected.includes(v.vendedor)
            const temFoto = fotos.has(v.vendedor)
            return (
              <button
                key={v.vendedor}
                type="button"
                onClick={() => onSelect(v.vendedor)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                  active && 'bg-accent',
                )}>
                <Avatar className="size-7 border">
                  {temFoto ? (
                    <AvatarImage src={fotoUrl(v.vendedor)} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-[10px] font-bold tracking-wide text-primary">
                    {initials(v.vendedor)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{v.vendedor}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {brl0(v.valor)} · {pct(v.share)}
                </span>
                <CheckIcon
                  className={cn(
                    'size-4 shrink-0 text-primary',
                    !active && 'invisible',
                  )}
                />
              </button>
            )
          })}
        </div>
        {desativados > 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
            {desativados}{' '}
            {desativados === 1
              ? 'vendedor desativado'
              : 'vendedores desativados'}{' '}
            — gerencie em Configurações → Geral.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
