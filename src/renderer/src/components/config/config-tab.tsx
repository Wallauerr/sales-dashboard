import { RotateCcwIcon, SaveIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { brl } from '@/lib/format'
import { MES_LABEL } from '@/lib/labels'
import type {
  Mes,
  MetaConfigView,
  MetasSetInput,
} from '../../../../shared/types'
import { MESES } from '../../../../shared/types'

function parseDraft(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export function ConfigTab({
  ano,
  onSaved,
}: {
  ano: number
  onSaved: () => void
}) {
  const [view, setView] = useState<MetaConfigView | null>(null)
  const [anualDraft, setAnualDraft] = useState('')
  const [mesesDraft, setMesesDraft] = useState<Record<Mes, string>>(
    () => Object.fromEntries(MESES.map(m => [m, ''])) as Record<Mes, string>,
  )
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const syncDrafts = useCallback((v: MetaConfigView) => {
    setAnualDraft(v.anualCustom === null ? '' : String(v.anualCustom))
    setMesesDraft(
      Object.fromEntries(
        MESES.map(m => [m, v.mesesCustom[m] ? String(v.mesesCustom[m]) : '']),
      ) as Record<Mes, string>,
    )
  }, [])

  useEffect(() => {
    setErr(null)
    setSavedMsg(null)
    if (!window.api) return
    let cancelled = false
    void window.api
      .getMetaConfig(ano)
      .then(v => {
        if (cancelled) return
        setView(v)
        syncDrafts(v)
      })
      .catch(e => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [ano, syncDrafts])

  const invalid = useMemo(() => {
    const anual = parseDraft(anualDraft)
    if (anual !== null && Number.isNaN(anual)) return true
    return MESES.some(mes => {
      const n = parseDraft(mesesDraft[mes])
      return typeof n === 'number' && Number.isNaN(n)
    })
  }, [anualDraft, mesesDraft])

  const input: MetasSetInput = useMemo(() => {
    const anual = parseDraft(anualDraft)
    const meses = {} as Partial<Record<Mes, number>>
    for (const mes of MESES) {
      const n = parseDraft(mesesDraft[mes])
      if (n !== null && !Number.isNaN(n)) meses[mes] = n
    }
    return {
      anual: anual === null || Number.isNaN(anual) ? null : anual,
      meses,
    }
  }, [anualDraft, mesesDraft])

  const dirty = useMemo(() => {
    if (!view) return false
    return (
      input.anual !== view.anualCustom ||
      overridesDiffer(input.meses, view.mesesCustom)
    )
  }, [input, view])

  const save = async (): Promise<void> => {
    if (!window.api || invalid) return
    setSaving(true)
    setErr(null)
    setSavedMsg(null)
    try {
      const v = await window.api.setMetaConfig(ano, input)
      setView(v)
      syncDrafts(v)
      setSavedMsg('Metas salvas — já refletem no dashboard.')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const restoreAll = async (): Promise<void> => {
    if (!window.api) return
    setSaving(true)
    setErr(null)
    setSavedMsg(null)
    try {
      const v = await window.api.setMetaConfig(ano, { anual: null, meses: {} })
      setView(v)
      syncDrafts(v)
      setSavedMsg('Metas restauradas para o cálculo automático.')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const resetMes = (mes: Mes): void => {
    setMesesDraft(prev => ({ ...prev, [mes]: '' }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Metas comerciais</CardTitle>
          <CardDescription>
            Por padrão a meta é calculada automaticamente: faturamento de{' '}
            {ano - 1} × {view ? Math.round(view.fator * 100) : '—'}
            %. Aqui você pode personalizar a meta anual e as metas de cada mês —
            os campos vazios seguem o cálculo automático.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                Base ({ano - 1})
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.baseAno) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Meta anual automática
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.metaAnualAuto) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Meta anual em vigor
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.metaAnual) : '—'}
              </dd>
            </div>
          </dl>
          {err ? (
            <p className="mt-3 text-xs text-destructive">Erro: {err}</p>
          ) : null}
          {savedMsg ? (
            <p className="mt-3 text-xs text-primary">{savedMsg}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Meta anual {ano}</CardTitle>
            <CardDescription>
              Deixe em branco para usar o cálculo automático.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnualDraft('')}
            disabled={anualDraft === ''}>
            <RotateCcwIcon className="size-4" />
            Usar automática
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={anualDraft}
              placeholder={view ? String(Math.round(view.metaAnualAuto)) : '0'}
              onChange={e => setAnualDraft(e.target.value)}
              className="w-56"
            />
            <span className="text-xs text-muted-foreground">
              automática: {view ? brl(view.metaAnualAuto) : '—'} · em vigor:{' '}
              {view ? brl(view.metaAnual) : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metas por mês ({ano})</CardTitle>
          <CardDescription>
            Mês vazio continua com a meta automática (ou a distribuição da meta
            anual personalizada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MESES.map(mes => {
              const overridden = view ? mes in view.mesesCustom : false
              const efetiva = view?.metasEfetivas[mes]
              return (
                <div key={mes} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-sm font-medium">
                    {MES_LABEL[mes]}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={mesesDraft[mes]}
                    placeholder="automática"
                    onChange={e =>
                      setMesesDraft(prev => ({
                        ...prev,
                        [mes]: e.target.value,
                      }))
                    }
                    className="h-9 w-32"
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
                    title={efetiva !== undefined ? brl(efetiva) : undefined}>
                    {overridden ? (
                      <span className="font-medium text-chart-3">definida</span>
                    ) : (
                      <>
                        automática: {efetiva !== undefined ? brl(efetiva) : '—'}
                      </>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Voltar ${MES_LABEL[mes]} à meta automática`}
                    onClick={() => resetMes(mes)}
                    disabled={mesesDraft[mes] === ''}
                    title="Voltar à meta automática">
                    <RotateCcwIcon className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          onClick={() => void restoreAll()}
          disabled={saving || !view}>
          <RotateCcwIcon className="size-4" />
          Restaurar tudo (cálculo automático)
        </Button>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || !view || !dirty || invalid}>
          <SaveIcon className="size-4" />
          {saving ? 'Salvando…' : 'Salvar metas'}
        </Button>
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">
          Há valores inválidos (use números maiores ou iguais a zero).
        </p>
      ) : null}
    </div>
  )
}

function overridesDiffer(
  a: Partial<Record<Mes, number>>,
  b: Partial<Record<Mes, number>>,
): boolean {
  for (const mes of MESES) {
    const va = a[mes]
    const vb = b[mes]
    const presentA = va !== undefined
    const presentB = vb !== undefined
    if (presentA !== presentB) return true
    if (presentA && va !== vb) return true
  }
  return false
}
