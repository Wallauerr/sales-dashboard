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
import { MONTH_LABEL } from '@/lib/labels'
import type {
  GoalConfigView,
  GoalSetInput,
  Month,
} from '../../../../shared/types'
import { MONTHS } from '../../../../shared/types'

function parseDraft(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export function ConfigTab({
  year,
  onSaved,
}: {
  year: number
  onSaved: () => void
}) {
  const [view, setView] = useState<GoalConfigView | null>(null)
  const [annualDraft, setAnnualDraft] = useState('')
  const [monthsDraft, setMonthsDraft] = useState<Record<Month, string>>(
    () => Object.fromEntries(MONTHS.map(m => [m, ''])) as Record<Month, string>,
  )
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const syncDrafts = useCallback((v: GoalConfigView) => {
    setAnnualDraft(v.annualCustom === null ? '' : String(v.annualCustom))
    setMonthsDraft(
      Object.fromEntries(
        MONTHS.map(m => [
          m,
          v.monthsCustom[m] ? String(v.monthsCustom[m]) : '',
        ]),
      ) as Record<Month, string>,
    )
  }, [])

  useEffect(() => {
    setErr(null)
    setSavedMsg(null)
    if (!window.api) return
    let cancelled = false
    void window.api
      .getGoalConfig(year)
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
  }, [year, syncDrafts])

  const invalid = useMemo(() => {
    const annual = parseDraft(annualDraft)
    if (annual !== null && Number.isNaN(annual)) return true
    return MONTHS.some(month => {
      const n = parseDraft(monthsDraft[month])
      return typeof n === 'number' && Number.isNaN(n)
    })
  }, [annualDraft, monthsDraft])

  const input: GoalSetInput = useMemo(() => {
    const annual = parseDraft(annualDraft)
    const months = {} as Partial<Record<Month, number>>
    for (const month of MONTHS) {
      const n = parseDraft(monthsDraft[month])
      if (n !== null && !Number.isNaN(n)) months[month] = n
    }
    return {
      annual: annual === null || Number.isNaN(annual) ? null : annual,
      months,
    }
  }, [annualDraft, monthsDraft])

  const dirty = useMemo(() => {
    if (!view) return false
    return (
      input.annual !== view.annualCustom ||
      overridesDiffer(input.months, view.monthsCustom)
    )
  }, [input, view])

  const save = async (): Promise<void> => {
    if (!window.api || invalid) return
    setSaving(true)
    setErr(null)
    setSavedMsg(null)
    try {
      const v = await window.api.setGoalConfig(year, input)
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
      const v = await window.api.setGoalConfig(year, {
        annual: null,
        months: {},
      })
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

  const resetMonth = (month: Month): void => {
    setMonthsDraft(prev => ({ ...prev, [month]: '' }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Metas comerciais</CardTitle>
          <CardDescription>
            Por padrão a meta é calculada automaticamente: faturamento de{' '}
            {year - 1} × {view ? Math.round(view.factor * 100) : '—'}
            %. Aqui você pode personalizar a meta anual e as metas de cada mês —
            os campos vazios seguem o cálculo automático.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                Base ({year - 1})
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.baseYear) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Meta anual automática
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.annualGoalAuto) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Meta anual em vigor
              </dt>
              <dd className="font-semibold tabular-nums">
                {view ? brl(view.annualGoal) : '—'}
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
            <CardTitle>Meta anual {year}</CardTitle>
            <CardDescription>
              Deixe em branco para usar o cálculo automático.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnnualDraft('')}
            disabled={annualDraft === ''}>
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
              value={annualDraft}
              placeholder={view ? String(Math.round(view.annualGoalAuto)) : '0'}
              onChange={e => setAnnualDraft(e.target.value)}
              className="w-56"
            />
            <span className="text-xs text-muted-foreground">
              automática: {view ? brl(view.annualGoalAuto) : '—'} · em vigor:{' '}
              {view ? brl(view.annualGoal) : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metas por mês ({year})</CardTitle>
          <CardDescription>
            Mês vazio continua com a meta automática (ou a distribuição da meta
            anual personalizada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MONTHS.map(month => {
              const overridden = view ? month in view.monthsCustom : false
              const effective = view?.effectiveGoals[month]
              return (
                <div key={month} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-sm font-medium">
                    {MONTH_LABEL[month]}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={monthsDraft[month]}
                    placeholder="automática"
                    onChange={e =>
                      setMonthsDraft(prev => ({
                        ...prev,
                        [month]: e.target.value,
                      }))
                    }
                    className="h-9 w-32"
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
                    title={
                      effective !== undefined ? brl(effective) : undefined
                    }>
                    {overridden ? (
                      <span className="font-medium text-chart-3">definida</span>
                    ) : (
                      <>
                        automática:{' '}
                        {effective !== undefined ? brl(effective) : '—'}
                      </>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Voltar ${MONTH_LABEL[month]} à meta automática`}
                    onClick={() => resetMonth(month)}
                    disabled={monthsDraft[month] === ''}
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
  a: Partial<Record<Month, number>>,
  b: Partial<Record<Month, number>>,
): boolean {
  for (const month of MONTHS) {
    const va = a[month]
    const vb = b[month]
    const presentA = va !== undefined
    const presentB = vb !== undefined
    if (presentA !== presentB) return true
    if (presentA && va !== vb) return true
  }
  return false
}
