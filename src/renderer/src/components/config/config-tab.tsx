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
import {
  brl,
  brl0,
  brlDraftSchema,
  brlInputValue,
  maskBrlText,
  maskPctText,
  pct,
  pctDraftSchema,
  pctInputValue,
} from '@/lib/format'
import { MONTH_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type {
  GoalConfigView,
  GoalSetInput,
  GoalUnit,
  Month,
} from '../../../../shared/types'
import { MONTHS } from '../../../../shared/types'

function parseDraft(value: string): number | null {
  const parsed = brlDraftSchema.safeParse(value)
  return parsed.success ? parsed.data : NaN
}

function parsePctDraft(value: string): number | null {
  const parsed = pctDraftSchema.safeParse(value)
  return parsed.success ? parsed.data : NaN
}

interface GoalShape {
  unit: GoalUnit
  percent: number | null
  annual: number | null
  months: Partial<Record<Month, number>>
}

function shapesDiffer(a: GoalShape, b: GoalShape): boolean {
  if (a.unit !== b.unit) return true
  if (a.percent !== b.percent) return true
  if (a.annual !== b.annual) return true
  return overridesDiffer(a.months, b.months)
}

export function ConfigTab({
  year,
  onSaved,
}: {
  year: number
  onSaved: () => void
}) {
  const [view, setView] = useState<GoalConfigView | null>(null)
  const [unit, setUnit] = useState<GoalUnit>('pct')
  const [percentDraft, setPercentDraft] = useState('')
  const [annualDraft, setAnnualDraft] = useState('')
  const [monthsDraft, setMonthsDraft] = useState<Record<Month, string>>(
    () => Object.fromEntries(MONTHS.map(m => [m, ''])) as Record<Month, string>,
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const syncDrafts = useCallback((v: GoalConfigView) => {
    setUnit(v.unit)
    setPercentDraft(v.percent === null ? '' : pctInputValue(v.percent))
    setAnnualDraft(v.annualCustom === null ? '' : brlInputValue(v.annualCustom))
    setMonthsDraft(
      Object.fromEntries(
        MONTHS.map(m => [
          m,
          v.monthsCustom[m] === undefined
            ? ''
            : brlInputValue(v.monthsCustom[m]),
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
    if (unit === 'pct') {
      const p = parsePctDraft(percentDraft)
      return typeof p === 'number' && Number.isNaN(p)
    }
    const annual = parseDraft(annualDraft)
    if (annual !== null && Number.isNaN(annual)) return true
    return MONTHS.some(month => {
      const n = parseDraft(monthsDraft[month])
      return typeof n === 'number' && Number.isNaN(n)
    })
  }, [unit, percentDraft, annualDraft, monthsDraft])

  const shape: GoalShape = useMemo(() => {
    if (unit === 'pct') {
      const p = parsePctDraft(percentDraft)
      return {
        unit: 'pct' as const,
        percent: p === null || Number.isNaN(p) ? null : p,
        annual: null,
        months: {},
      }
    }
    const annual = parseDraft(annualDraft)
    const months = {} as Partial<Record<Month, number>>
    for (const month of MONTHS) {
      const n = parseDraft(monthsDraft[month])
      if (n !== null && !Number.isNaN(n)) months[month] = n
    }
    return {
      unit: 'brl' as const,
      percent: null,
      annual: annual === null || Number.isNaN(annual) ? null : annual,
      months,
    }
  }, [unit, percentDraft, annualDraft, monthsDraft])

  const viewShape = useMemo<GoalShape | null>(
    () =>
      view
        ? {
            unit: view.unit,
            percent: view.percent,
            annual: view.annualCustom,
            months: view.monthsCustom,
          }
        : null,
    [view],
  )

  const dirty = useMemo(
    () => viewShape !== null && shapesDiffer(shape, viewShape),
    [shape, viewShape],
  )

  const input: GoalSetInput = useMemo(
    () => ({
      unit: shape.unit,
      percent: shape.percent,
      annual: shape.annual,
      months: shape.months,
    }),
    [shape],
  )

  const save = async (): Promise<void> => {
    if (!window.api || invalid) return
    setSaving(true)
    setErr(null)
    setSavedMsg(null)
    try {
      const v = await window.api.setGoalConfig(year, input)
      setView(v)
      syncDrafts(v)
      setSavedMsg('Metas salvas. Já refletem no dashboard.')
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
        unit: 'pct',
        percent: null,
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

  const effectivePercent = (() => {
    const p = parsePctDraft(percentDraft)
    return p !== null && !Number.isNaN(p) ? p : null
  })()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Metas comerciais</CardTitle>
          <CardDescription>
            Escolha a unidade da meta de {year}: um percentual único sobre a
            base de {year - 1} ou valores fixos em R$. Os campos vazios seguem o
            cálculo automático — base de {year - 1} ×{' '}
            {view ? Math.round(view.factor * 100) : '—'}%.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Meta {year}</CardTitle>
            <CardDescription>
              {unit === 'pct'
                ? `Um percentual define o ano e os 12 meses (base do mês × %).`
                : 'Meta anual fixa em R$; meses vazios distribuem a meta.'}
            </CardDescription>
          </div>
          <UnitSwitch value={unit} onChange={setUnit} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {unit === 'pct' ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={percentDraft}
                  placeholder={
                    view ? String(Math.round(view.factor * 100)) : '115'
                  }
                  onChange={e => setPercentDraft(maskPctText(e.target.value))}
                  className="w-32 pr-8"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPercentDraft('')}
                disabled={percentDraft === ''}>
                <RotateCcwIcon className="size-4" />
                Usar automática
              </Button>
              <span className="text-xs text-muted-foreground">
                ={' '}
                {effectivePercent !== null && view
                  ? `${brl(view.baseYear * (effectivePercent / 100))} no ano`
                  : 'auto × base'}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <MoneyInput
                value={annualDraft}
                placeholder={view ? brl0(view.annualGoalAuto) : '0,00'}
                onChange={setAnnualDraft}
                className="w-56"
              />
              <span className="text-xs text-muted-foreground">
                automática: {view ? brl(view.annualGoalAuto) : '—'} · em vigor:{' '}
                {view ? brl(view.annualGoal) : '—'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Metas por mês ({year})
            {unit === 'pct' && view ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {pct(view.factor)} da base de cada mês
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            {unit === 'pct'
              ? 'Quando a meta é em %, todos os meses seguem o mesmo percentual da base de cada mês.'
              : 'Mês vazio continua com a meta automática (ou a distribuição da meta anual personalizada).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unit === 'pct' ? (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {MONTHS.map(month => (
                <li key={month} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 font-medium">
                    {MONTH_LABEL[month]}
                  </span>
                  <span className="w-12 tabular-nums text-muted-foreground">
                    {view ? pct(view.factor) : '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold tabular-nums">
                    {view ? brl(view.effectiveGoals[month]) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MONTHS.map(month => {
                const overridden = view ? month in view.monthsCustom : false
                const effective = view?.effectiveGoals[month]
                return (
                  <div key={month} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-sm font-medium">
                      {MONTH_LABEL[month]}
                    </span>
                    <MoneyInput
                      value={monthsDraft[month]}
                      placeholder="automática"
                      onChange={v =>
                        setMonthsDraft(prev => ({
                          ...prev,
                          [month]: v,
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
                        <span className="font-medium text-chart-3">
                          definida
                        </span>
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
          )}
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
      {err ? <p className="text-xs text-destructive">Erro: {err}</p> : null}
      {savedMsg ? <p className="text-xs text-primary">{savedMsg}</p> : null}
      {invalid ? (
        <p className="text-xs text-destructive">
          Há valores inválidos (use números maiores ou iguais a zero).
        </p>
      ) : null}
    </div>
  )
}

function UnitSwitch({
  value,
  onChange,
}: {
  value: GoalUnit
  onChange: (u: GoalUnit) => void
}) {
  const options: { value: GoalUnit; label: string }[] = [
    { value: 'pct', label: '% da base' },
    { value: 'brl', label: 'R$ fixo' },
  ]
  return (
    <fieldset className="flex gap-1 rounded-lg border p-0.5">
      <legend className="sr-only">Unidade da meta</legend>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}>
          {o.label}
        </button>
      ))}
    </fieldset>
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

function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
}) {
  return (
    <Input
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(maskBrlText(e.target.value))}
      className={className}
    />
  )
}
