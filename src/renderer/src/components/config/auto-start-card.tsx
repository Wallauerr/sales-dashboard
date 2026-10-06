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

  const toggle = async (): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const v = await window.api.setAutoStart(!view?.enabled)
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
      <CardHeader>
        <CardTitle>Abrir junto com o Windows</CardTitle>
        <CardDescription>
          Deixa o dashboard aberto automaticamente quando a TV é ligada.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2">
        <Button
          type="button"
          className="w-full"
          variant={view?.enabled ? 'secondary' : 'outline'}
          disabled={busy || !view?.supported}
          onClick={() => void toggle()}>
          {busy ? 'Salvando…' : view?.enabled ? 'Desativar' : 'Ativar'}
        </Button>
        {err ? <p className="text-xs text-destructive">Erro: {err}</p> : null}
        {msg && !err ? <p className="text-xs text-primary">{msg}</p> : null}
        {err || msg ? (
          <p className="text-xs text-muted-foreground">
            O autostart é registrado pelo Windows na pasta “Inicializar”.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
