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
import type { AutoStartView } from '../../../../shared/types'

export function AutoStartCard() {
  const [view, setView] = useState<AutoStartView | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!window.api) return
    let cancelled = false
    void window.api
      .getAutoStart()
      .then(v => {
        if (!cancelled) setView(v)
      })
      .catch(e => {
        if (!cancelled)
          toast.error('Não foi possível ler a configuração de autostart', {
            description: e instanceof Error ? e.message : String(e),
          })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (view && !view.supported) return null

  const toggle = async (): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    try {
      const v = await window.api.setAutoStart(!view?.enabled)
      setView(v)
      toast.success(
        v.enabled
          ? 'Vai abrir junto com o Windows'
          : 'Não abre mais junto com o Windows',
      )
    } catch (e) {
      toast.error('Não foi possível alterar o autostart', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Abrir junto com o Windows</CardTitle>
        <CardDescription>
          Inicia o dashboard automaticamente ao ligar o PC.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          type="button"
          size="sm"
          variant={view?.enabled ? 'secondary' : 'outline'}
          disabled={busy || !view?.supported}
          onClick={() => void toggle()}>
          {busy ? 'Salvando…' : view?.enabled ? 'Desativar' : 'Ativar'}
        </Button>
      </CardContent>
    </Card>
  )
}
