import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { errorMessage } from '@/lib/errors'
import type { UpdateStatus, UpdateView } from '../../../../shared/types'

const STATUS_LABEL: Record<UpdateStatus, string> = {
  idle: 'Tudo atualizado.',
  checking: 'Verificando atualizações…',
  available: 'Nova versão disponível.',
  downloading: 'Baixando atualização…',
  downloaded: 'Atualização pronta para instalar.',
  error: 'Não foi possível verificar atualizações.',
}

export function UpdatesCard() {
  const [view, setView] = useState<UpdateView | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!window.api) return
    let cancelled = false
    void window.api
      .getUpdateState()
      .then(v => {
        if (!cancelled) setView(v)
      })
      .catch(e => {
        if (!cancelled)
          toast.error('Não foi possível ler a versão do app', {
            id: 'update-load',
            description: errorMessage(e),
          })
      })
    const unsubscribe = window.api.onUpdateState(state => {
      setView(current => (current ? { ...current, state } : current))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (view && !view.supported) return null

  const check = async (): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    try {
      const next = await window.api.checkForUpdates()
      setView(next)
      if (next.state.status === 'idle')
        toast.success('Você está na versão mais recente')
    } catch (e) {
      toast.error('Não foi possível verificar atualizações', {
        id: 'update-check',
        description: errorMessage(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const download = async (): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    try {
      setView(await window.api.downloadUpdate())
    } catch (e) {
      toast.error('Não foi possível baixar a atualização', {
        id: 'update-download',
        description: errorMessage(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const state = view?.state
  const checking = busy || state?.status === 'checking'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Atualizações</CardTitle>
        <CardDescription>
          {view
            ? `Versão ${view.currentVersion} instalada.`
            : 'Lendo a versão instalada…'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2 pt-0">
        {state ? (
          <p className="text-xs text-muted-foreground">
            {STATUS_LABEL[state.status]}
            {state.status === 'downloading' ? ` ${state.percent ?? 0}%` : ''}
          </p>
        ) : null}
        {state?.status === 'available' ? (
          <Button size="sm" disabled={busy} onClick={() => void download()}>
            Baixar {state.version}
          </Button>
        ) : state?.status === 'downloaded' ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void window.api?.installUpdate()}>
            Reiniciar e atualizar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={checking || !view?.supported}
            onClick={() => void check()}>
            {checking ? 'Verificando…' : 'Verificar atualizações'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
