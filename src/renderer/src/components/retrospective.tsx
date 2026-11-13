import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PresentationIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { brl0, int, pct } from '@/lib/format'
import {
  buildRetrospective,
  type Retrospective as RetrospectiveData,
} from '@/lib/retrospective'
import { cn } from '@/lib/utils'
import type { KpiSnapshot } from '../../../shared/types'

const SLIDES = [
  'capa',
  'resultado',
  'melhor-mes',
  'vendedores',
  'regioes',
  'operacao',
  'encerramento',
] as const

const SLIDE_COUNT = SLIDES.length

interface Props {
  open: boolean
  year: number
  onClose: () => void
}

export function Retrospective({ open, year, onClose }: Props) {
  const [snap, setSnap] = useState<KpiSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setIndex(0)
    setSnap(null)
    setError(null)
    setLoading(true)
    let cancelled = false
    void window.api
      .getSnapshot(year)
      .then(result => {
        if (!cancelled) setSnap(result)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, year])

  const data = useMemo(() => (snap ? buildRetrospective(snap) : null), [snap])

  const go = useCallback((delta: number) => {
    setIndex(current => Math.min(Math.max(current + delta, 0), SLIDE_COUNT - 1))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (
        ['ArrowRight', 'ArrowDown', ' ', 'Enter', 'PageDown'].includes(
          event.key,
        )
      ) {
        event.preventDefault()
        go(1)
        return
      }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault()
        go(-1)
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setIndex(0)
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        setIndex(SLIDE_COUNT - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={`Retrospectiva ${year}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_62%)]" />

      <header className="relative flex items-center justify-between gap-3 px-6 py-4">
        <p className="flex items-center gap-2 text-xs tracking-[0.25em] text-muted-foreground uppercase">
          <PresentationIcon className="size-4 text-primary" />
          Retrospectiva {year}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {SLIDE_COUNT}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sair da apresentação"
            onClick={onClose}>
            <XIcon />
          </Button>
        </div>
      </header>

      <main
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 pb-2"
        aria-live="polite">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Erro: {error}</p>
        ) : data ? (
          <div key={index} className="retro-slide w-full max-w-6xl">
            {renderSlide(index, data)}
          </div>
        ) : null}
      </main>

      <footer className="relative flex items-center justify-between gap-4 px-6 py-4">
        <p className="hidden text-xs text-muted-foreground sm:block">
          ← → ou espaço para navegar · Esc para sair
        </p>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((id, dot) => (
            <button
              key={id}
              type="button"
              aria-label={`Ir para o slide ${dot + 1}`}
              onClick={() => setIndex(dot)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                dot === index
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Slide anterior"
            disabled={index === 0}
            onClick={() => go(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Próximo slide"
            disabled={index === SLIDE_COUNT - 1}
            onClick={() => go(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
      </footer>
    </div>
  )
}

function renderSlide(index: number, data: RetrospectiveData): ReactNode {
  switch (index) {
    case 0:
      return <CoverSlide data={data} />
    case 1:
      return <ResultSlide data={data} />
    case 2:
      return <BestMonthSlide data={data} />
    case 3:
      return <SellersSlide data={data} />
    case 4:
      return <RegionsSlide data={data} />
    case 5:
      return <OperationSlide data={data} />
    default:
      return <ClosingSlide data={data} />
  }
}

function CoverSlide({ data }: { data: RetrospectiveData }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">
        Sulmag Dashboard
      </p>
      <h1 className="mt-3 text-5xl font-bold sm:text-7xl">
        Retrospectiva {data.year}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">Um ano em números</p>
      <p className="mt-10 text-6xl font-bold text-primary tabular-nums sm:text-8xl">
        {brl0(data.total)}
      </p>
      <p className="mt-2 text-sm tracking-[0.2em] text-muted-foreground uppercase">
        de faturamento
      </p>
    </div>
  )
}

function ResultSlide({ data }: { data: RetrospectiveData }) {
  const goal = data.goalPct === null ? 0 : data.goalPct
  return (
    <div className="flex flex-col gap-8">
      <SlideTitle
        title="O resultado do ano"
        subtitle={`${data.year} em comparação com ${data.year - 1}`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Faturamento" value={brl0(data.total)} accent />
        <Stat label="Meta anual" value={brl0(data.goal)} />
        <Stat
          label="% da meta"
          value={data.goalPct === null ? '—' : pct(data.goalPct)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Realizado ÷ meta</span>
          <span className="font-medium tabular-nums">
            {data.goalPct === null ? '—' : pct(data.goalPct)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="retro-bar h-full rounded-full bg-primary"
            style={{ width: `${Math.min(goal * 100, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <GrowthBadge growth={data.growth} />
        <span className="text-muted-foreground">
          {data.year - 1}: {brl0(data.previousYear)}
        </span>
      </div>
    </div>
  )
}

function BestMonthSlide({ data }: { data: RetrospectiveData }) {
  if (!data.bestMonth) {
    return <EmptySlide title="O melhor mês" message="Sem faturamento no ano." />
  }
  return (
    <div className="flex flex-col gap-8">
      <SlideTitle title="O melhor mês" subtitle="Quando o caixa fez barulho" />
      <div className="flex flex-col items-center text-center">
        <p className="text-6xl font-bold text-primary sm:text-7xl">
          {data.bestMonth.label}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {brl0(data.bestMonth.value)}
        </p>
      </div>
      <RankBars items={data.topMonths} />
    </div>
  )
}

function SellersSlide({ data }: { data: RetrospectiveData }) {
  if (data.topSellers.length === 0) {
    return (
      <EmptySlide title="Quem mais vendeu" message="Sem vendedores no ano." />
    )
  }
  return (
    <div className="flex flex-col gap-8">
      <SlideTitle title="Quem mais vendeu" subtitle="Top 3 do ano" />
      <RankBars
        items={data.topSellers.map(seller => ({
          label: seller.label,
          value: seller.value,
          hint: pct(seller.share),
        }))}
        color="var(--chart-3)"
      />
    </div>
  )
}

function RegionsSlide({ data }: { data: RetrospectiveData }) {
  return (
    <div className="flex flex-col gap-8">
      <SlideTitle
        title="Onde vendemos"
        subtitle="Regiões e estados de destaque"
      />
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm tracking-[0.2em] text-muted-foreground uppercase">
            Regiões
          </h3>
          {data.topRegions.length > 0 ? (
            <RankBars
              items={data.topRegions.map(region => ({
                label: region.label,
                value: region.value,
                hint: pct(region.share),
              }))}
              color="var(--chart-2)"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem localização informada.
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-sm tracking-[0.2em] text-muted-foreground uppercase">
            Estados
          </h3>
          {data.topStates.length > 0 ? (
            <RankBars
              items={data.topStates.map(state => ({
                label: state.label,
                value: state.value,
                hint: pct(state.share),
              }))}
              color="var(--chart-4)"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem localização informada.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function OperationSlide({ data }: { data: RetrospectiveData }) {
  return (
    <div className="flex flex-col gap-8">
      <SlideTitle title="Como foi o ano" subtitle="Volume, ticket e funil" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pedidos" value={int(data.quantity)} />
        <Stat label="Ticket médio" value={brl0(data.averageTicket)} />
        <Stat label="Pedidos faturados" value={int(data.funnel.invoiced)} />
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <FunnelStep label="Orçamentos" value={data.funnel.quotes} />
        <ChevronRightIcon className="mx-auto hidden size-5 shrink-0 text-muted-foreground sm:block" />
        <FunnelStep label="Pedidos" value={data.funnel.orders} />
        <ChevronRightIcon className="mx-auto hidden size-5 shrink-0 text-muted-foreground sm:block" />
        <FunnelStep label="Faturados" value={data.funnel.invoiced} accent />
      </div>
      {data.funnel.cancelled > 0 ? (
        <p className="text-xs text-muted-foreground">
          {int(data.funnel.cancelled)} pedido(s) cancelado(s) no ano.
        </p>
      ) : null}
    </div>
  )
}

function ClosingSlide({ data }: { data: RetrospectiveData }) {
  const goal =
    data.goalPct === null ? 'meta não definida' : `${pct(data.goalPct)} da meta`
  return (
    <div className="flex flex-col items-center text-center">
      <TrophyIcon className="size-12 text-primary" />
      <h1 className="mt-4 text-4xl font-bold sm:text-6xl">
        Vamos repetir em {data.year + 1}?
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Um ano de {brl0(data.total)} em faturamento, {int(data.quantity)}{' '}
        pedidos e {goal}.
      </p>
      <p className="mt-10 text-3xl font-semibold text-primary">Obrigado!</p>
    </div>
  )
}

function SlideTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-5">
      <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-3xl font-bold tabular-nums sm:text-4xl',
          accent && 'text-primary',
        )}>
        {value}
      </p>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl border border-border/60 bg-card/80 p-4 text-center',
        accent && 'border-primary/40 bg-primary/10',
      )}>
      <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          accent && 'text-primary',
        )}>
        {int(value)}
      </p>
    </div>
  )
}

function RankBars({
  items,
  color = 'var(--chart-1)',
}: {
  items: { label: string; value: number; hint?: string }[]
  color?: string
}) {
  const max = Math.max(...items.map(item => item.value), 1)
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, position) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">
              <span className="mr-2 text-muted-foreground tabular-nums">
                {position + 1}.
              </span>
              {item.label}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {brl0(item.value)}
              {item.hint ? ` · ${item.hint}` : ''}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="retro-bar h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) {
    return <span className="text-muted-foreground">Sem base de comparação</span>
  }
  const positive = growth >= 0
  const Icon = positive ? TrendingUpIcon : TrendingDownIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium',
        positive
          ? 'bg-chart-2/15 text-chart-2'
          : 'bg-destructive/15 text-destructive',
      )}>
      <Icon className="size-4" />
      {positive ? '+' : '-'}
      {pct(Math.abs(growth))}
    </span>
  )
}

function EmptySlide({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
