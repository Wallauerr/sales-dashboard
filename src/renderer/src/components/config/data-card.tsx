import {
  DatabaseIcon,
  DownloadIcon,
  MapPinIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AddressDialog } from '@/components/address-dialog'
import { StateSelect } from '@/components/state-select'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { normalizeSaleCode, regionForState } from '@/lib/addresses'
import { errorMessage } from '@/lib/errors'
import { brl, int, isoDate } from '@/lib/format'
import type {
  AddressCorrection,
  DbStats,
  PendingAddress,
  SaleLookup,
} from '../../../../shared/types'

interface Props {
  onChanged: () => void
}

const CONFIRM_WORD = 'ZERAR'

function SaleField({ label, value }: { label: string; value: string }) {
  const text = value.trim() || '—'
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate" title={text}>
        {text}
      </dd>
    </div>
  )
}

export function DataCard({ onChanged }: Props) {
  const api = window.api
  const [stats, setStats] = useState<DbStats | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState<PendingAddress[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [saleCode, setSaleCode] = useState('')
  const [lookup, setLookup] = useState<SaleLookup | null>(null)
  const [lookupState, setLookupState] = useState('')
  const [searched, setSearched] = useState(false)
  const [lookupBusy, setLookupBusy] = useState(false)

  const loadStats = useCallback(async () => {
    if (!window.api) return
    try {
      setStats(await window.api.getDbStats())
    } catch (e) {
      toast.error('Não foi possível ler o banco de dados', {
        description: errorMessage(e),
      })
    }
  }, [])

  const loadPending = useCallback(async () => {
    if (!window.api) return
    try {
      setPending(await window.api.listPendingAddresses())
    } catch (e) {
      toast.error('Não foi possível ler os endereços pendentes', {
        description: errorMessage(e),
      })
    }
  }, [])

  useEffect(() => {
    void loadStats()
    void loadPending()
  }, [loadStats, loadPending])

  if (!api) return null

  const run = async (
    key: string,
    action: () => Promise<void>,
  ): Promise<void> => {
    setBusy(key)
    try {
      await action()
    } catch (e) {
      toast.error('Não foi possível concluir a ação', {
        description: errorMessage(e),
      })
    } finally {
      setBusy(null)
    }
  }

  const exportData = async (): Promise<void> => {
    const r = await api.exportBackup()
    if (!r) return
    toast.success('Backup exportado', { description: r.path })
  }

  const importData = async (): Promise<void> => {
    const r = await api.importBackup()
    if (!r) return
    setStats(await api.getDbStats())
    onChanged()
    toast.success('Backup importado', {
      description: `${int(r.sales)} pedidos, ${int(r.goals)} metas e ${int(r.photos)} fotos mesclados.`,
    })
  }

  const saveAddresses = async (
    corrections: AddressCorrection[],
  ): Promise<void> => {
    setBusy('addresses')
    try {
      const saved = await api.saveAddressOverrides(corrections)
      setPending(await api.listPendingAddresses())
      setStats(await api.getDbStats())
      onChanged()
      toast.success('Endereços atualizados', {
        description: `${int(saved)} pedido${saved === 1 ? '' : 's'} corrigido${saved === 1 ? '' : 's'}.`,
      })
      setReviewOpen(false)
    } catch (e) {
      toast.error('Não foi possível salvar os endereços', {
        description: errorMessage(e),
      })
    } finally {
      setBusy(null)
    }
  }

  const refreshLookup = async (code: string): Promise<void> => {
    const result = await api.findSale(code)
    setLookup(result)
    setLookupState(result?.override?.state ?? result?.sale.state ?? '')
    setPending(await api.listPendingAddresses())
    setStats(await api.getDbStats())
    onChanged()
  }

  const findSale = async (): Promise<void> => {
    const code = normalizeSaleCode(saleCode)
    if (!code) return
    setSaleCode(code)
    setLookupBusy(true)
    try {
      await refreshLookup(code)
      setSearched(true)
    } catch (e) {
      toast.error('Não foi possível buscar o pedido', {
        description: errorMessage(e),
      })
    } finally {
      setLookupBusy(false)
    }
  }

  const saveLookup = async (): Promise<void> => {
    if (!lookup) return
    setBusy('lookup')
    try {
      const saved = await api.saveAddressOverrides([
        { code: lookup.sale.code, state: lookupState },
      ])
      if (saved === 0) {
        toast.error('Selecione uma UF válida')
        return
      }
      await refreshLookup(lookup.sale.code)
      toast.success('UF atualizada', {
        description: `Pedido ${lookup.sale.code}.`,
      })
    } catch (e) {
      toast.error('Não foi possível salvar a UF', {
        description: errorMessage(e),
      })
    } finally {
      setBusy(null)
    }
  }

  const clearLookup = async (): Promise<void> => {
    if (!lookup) return
    setBusy('lookup')
    try {
      await api.clearAddressOverride(lookup.sale.code)
      await refreshLookup(lookup.sale.code)
      toast.success('Valor da planilha restaurado')
    } catch (e) {
      toast.error('Não foi possível restaurar o valor da planilha', {
        description: errorMessage(e),
      })
    } finally {
      setBusy(null)
    }
  }

  const resetData = async (): Promise<void> => {
    setStats(await api.resetData())
    setConfirmOpen(false)
    setTyped('')
    onChanged()
    toast.success('Dados importados apagados', {
      description:
        'Metas, fotos, vendedores desativados e correções de endereço foram mantidos.',
    })
  }

  const confirmReset = async (): Promise<void> => {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) return
    await run('reset', resetData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados</CardTitle>
        <CardDescription>
          Exporte um backup do banco, restaure um backup antigo, corrija
          endereços pendentes ou apague os dados importados da planilha do SIGE.
          Metas, fotos, vendedores desativados e correções de endereço são
          preservados ao apagar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <DatabaseIcon className="size-3.5" />
            {stats
              ? `${int(stats.sales)} pedidos · ${int(stats.imports)} importações`
              : '—'}
          </span>
          <span>{stats ? `${int(stats.sellers)} vendedores` : '—'}</span>
          <span>{stats ? `${int(stats.photos)} fotos` : '—'}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void run('export', exportData)}>
            <DownloadIcon />
            {busy === 'export' ? 'Exportando…' : 'Exportar backup'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void run('import', importData)}>
            <UploadIcon />
            {busy === 'import' ? 'Importando…' : 'Importar backup'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null || pending.length === 0}
            onClick={() => setReviewOpen(true)}>
            <MapPinIcon />
            {pending.length === 0
              ? 'Endereços em dia'
              : `Revisar endereços (${int(pending.length)})`}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy !== null}
            onClick={() => {
              setTyped('')
              setConfirmOpen(true)
            }}>
            <Trash2Icon />
            Zerar dados importados
          </Button>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-sm font-medium">Corrigir pedido já preenchido</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Busque pelo código para ajustar a UF de um pedido que já veio com
            endereço. Só o endereço é alterado; os demais campos continuam vindo
            da planilha.
          </p>
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              void findSale()
            }}>
            <Input
              className="max-w-48"
              placeholder="Código do pedido"
              aria-label="Código do pedido"
              value={saleCode}
              onChange={e => setSaleCode(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={lookupBusy || saleCode.trim() === ''}>
              <SearchIcon />
              {lookupBusy ? 'Buscando…' : 'Buscar'}
            </Button>
          </form>

          {searched && !lookup ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Pedido não encontrado.
            </p>
          ) : null}

          {lookup ? (
            <div className="mt-3 flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <SaleField label="Cliente" value={lookup.sale.customer} />
                <SaleField label="Cidade" value={lookup.sale.city} />
                <SaleField label="UF" value={lookup.sale.state} />
                <SaleField label="Região" value={lookup.sale.region} />
                <SaleField label="Valor" value={brl(lookup.sale.totalValue)} />
                <SaleField
                  label="Data"
                  value={lookup.sale.date ? isoDate(lookup.sale.date) : ''}
                />
                <SaleField
                  label="Status"
                  value={lookup.sale.systemStatus || lookup.sale.status}
                />
              </dl>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    UF
                  </span>
                  <StateSelect
                    value={lookupState}
                    onChange={setLookupState}
                    ariaLabel="UF do pedido"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Região:{' '}
                  {lookupState ? regionForState(lookupState) || '—' : '—'}
                </span>
                <Button
                  type="button"
                  disabled={busy !== null || lookupState === ''}
                  onClick={() => void saveLookup()}>
                  Salvar UF
                </Button>
                {lookup.override ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => void clearLookup()}>
                    Restaurar valor da planilha
                  </Button>
                ) : null}
              </div>
              {lookup.override ? (
                <p className="text-xs text-muted-foreground">
                  Este pedido tem ajuste manual de endereço.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <Dialog
          open={confirmOpen}
          onOpenChange={open => {
            setConfirmOpen(open)
            if (!open) setTyped('')
          }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zerar dados importados?</DialogTitle>
              <DialogDescription>
                Isso apaga todos os pedidos importados e o histórico de
                importações. Metas, fotos dos vendedores e vendedores
                desativados continuam como estão. Não dá para desfazer.
              </DialogDescription>
            </DialogHeader>
            <label
              className="text-sm text-muted-foreground"
              htmlFor="confirmar-zerar">
              Digite {CONFIRM_WORD} para confirmar.
            </label>
            <Input
              id="confirmar-zerar"
              value={typed}
              autoFocus
              placeholder={CONFIRM_WORD}
              onChange={e => setTyped(e.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  busy === 'reset' ||
                  typed.trim().toUpperCase() !== CONFIRM_WORD
                }
                onClick={() => void confirmReset()}>
                {busy === 'reset' ? 'Apagando…' : 'Apagar tudo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AddressDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          pending={pending}
          busy={busy === 'addresses'}
          mode="review"
          onSave={saveAddresses}
        />
      </CardContent>
    </Card>
  )
}
