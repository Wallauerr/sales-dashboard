import {
  DatabaseIcon,
  DownloadIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { int } from '@/lib/format'
import type { DbStats } from '../../../../shared/types'

interface Props {
  onChanged: () => void
}

const CONFIRM_WORD = 'ZERAR'

export function DataCard({ onChanged }: Props) {
  const api = window.api
  const [stats, setStats] = useState<DbStats | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const loadStats = useCallback(async () => {
    if (!window.api) return
    try {
      setStats(await window.api.getDbStats())
    } catch (e) {
      toast.error('Não foi possível ler o banco de dados', {
        description: e instanceof Error ? e.message : String(e),
      })
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

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
        description: e instanceof Error ? e.message : String(e),
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

  const resetData = async (): Promise<void> => {
    setStats(await api.resetData())
    setConfirmOpen(false)
    setTyped('')
    onChanged()
    toast.success('Dados importados apagados', {
      description: 'Metas, fotos e vendedores desativados foram mantidos.',
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
          Exporte um backup do banco, restaure um backup antigo ou apague os
          dados importados da planilha do SIGE. Metas, fotos e vendedores
          desativados são preservados ao apagar.
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
      </CardContent>
    </Card>
  )
}
