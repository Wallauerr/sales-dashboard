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
import { photoUrl } from '@/lib/photo-url'
import { cn } from '@/lib/utils'

interface SellerDatum {
  seller: string
  value: number
  share: number
}

interface Props {
  year: number
  sellers: SellerDatum[]
  photos: Set<string>
  selected: string[]
  onSelect: (seller: string) => void
  onClear: () => void
  disabled: number
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
  year,
  sellers,
  photos,
  selected,
  onSelect,
  onClear,
  disabled,
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
              {sellers.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">
            Vendedores · {year}
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
          {sellers.map(v => {
            const active = selected.includes(v.seller)
            const hasPhoto = photos.has(v.seller)
            return (
              <button
                key={v.seller}
                type="button"
                onClick={() => onSelect(v.seller)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                  active && 'bg-accent',
                )}>
                <Avatar className="size-7 border">
                  {hasPhoto ? (
                    <AvatarImage src={photoUrl(v.seller)} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-[10px] font-bold tracking-wide text-primary">
                    {initials(v.seller)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{v.seller}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {brl0(v.value)} · {pct(v.share)}
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
        {disabled > 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
            {disabled}{' '}
            {disabled === 1 ? 'vendedor desativado' : 'vendedores desativados'}{' '}
            — gerencie em Configurações → Geral.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
