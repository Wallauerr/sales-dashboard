import { useEffect, useState } from 'react'
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
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api) return
    let cancelled = false
    void window.api
      .getAutoStart()
      .then(v => {
        if (!cancelled) setView(v)
      })
      .catch(e => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (view && !view.supported) return null

  const toggle = async (next: boolean): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const v = await window.api.setAutoStart(next)
      setView(v)
      setMsg(
        v.enabled
          ? 'O dashboard vai abrir junto com o Windows.'
          : 'O dashboard não vai mais abrir junto com o Windows.',
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Abrir junto com o Windows</CardTitle>
          <CardDescription>
            Deixa o dashboard aberto automaticamente quando a TV é ligada.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant={view?.enabled ? 'secondary' : 'outline'}
          disabled={busy || !view?.supported}
          onClick={() => void toggle(!view?.enabled)}
          aria-pressed={view?.enabled ?? false}>
          {busy ? 'Salvando…' : view?.enabled ? 'Desativar' : 'Ativar'}
        </Button>
      </CardHeader>
      <CardContent>
        {err ? <p className="text-xs text-destructive">Erro: {err}</p> : null}
        {msg && !err ? <p className="text-xs text-primary">{msg}</p> : null}
        {err || msg ? (
          <p className="mt-2 text-xs text-muted-foreground">
            O autostart é registrado pelo Windows na pasta “Inicializar”.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
