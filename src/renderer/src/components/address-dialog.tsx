import { SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StateSelect } from '@/components/state-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  type AddressDraft,
  correctionsFromDrafts,
  draftsFromGroups,
  groupByCustomer,
  regionForState,
  validDraftCount,
} from '@/lib/addresses'
import { brl0 } from '@/lib/format'
import type { AddressCorrection, PendingAddress } from '../../../shared/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: PendingAddress[]
  busy: boolean
  mode: 'import' | 'review'
  onSave: (corrections: AddressCorrection[]) => void | Promise<void>
  onSkip?: () => void | Promise<void>
}

export function AddressDialog({
  open,
  onOpenChange,
  pending,
  busy,
  mode,
  onSave,
  onSkip,
}: Props) {
  const groups = useMemo(() => groupByCustomer(pending), [pending])
  const [drafts, setDrafts] = useState<Record<string, AddressDraft>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setDrafts(draftsFromGroups(groups))
    setSearch('')
  }, [open, groups])

  const corrections = correctionsFromDrafts(groups, drafts)
  const filled = validDraftCount(groups, drafts)
  const term = search.trim().toLowerCase()
  const filtered = groups.filter(group =>
    group.customer.toLowerCase().includes(term),
  )

  const setDraft = (customer: string, patch: Partial<AddressDraft>): void => {
    setDrafts(prev => {
      const current = prev[customer] ?? { state: '' }
      return { ...prev, [customer]: { ...current, ...patch } }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Endereços pendentes</DialogTitle>
          <DialogDescription>
            {pending.length} pedido(s) faturado(s) sem UF/região. Escolha a UF
            (a região é derivada); o ajuste fica salvo por cliente e é
            reaplicado nas próximas importações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {filled} de {groups.length} clientes
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            filtered.map(group => {
              const draft = drafts[group.customer] ?? { state: '' }
              return (
                <div
                  key={group.customer}
                  className="flex flex-wrap items-end gap-2 border-b p-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      title={group.customer}>
                      {group.customer}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {group.items.length} pedido
                      {group.items.length === 1 ? '' : 's'} ·{' '}
                      {brl0(group.totalValue)}
                      {group.items.length === 1
                        ? ` · #${group.items[0].code}`
                        : ''}
                    </p>
                  </div>
                  <StateSelect
                    value={draft.state}
                    onChange={state => setDraft(group.customer, { state })}
                    ariaLabel={`UF de ${group.customer}`}
                  />
                  <span className="w-24 text-xs text-muted-foreground">
                    {draft.state ? regionForState(draft.state) || '—' : '—'}
                  </span>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="gap-2">
          {mode === 'import' && onSkip ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void onSkip()}>
              Importar sem informar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy || corrections.length === 0}
            onClick={() => void onSave(corrections)}>
            {busy
              ? 'Salvando…'
              : mode === 'import'
                ? 'Salvar e importar'
                : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
