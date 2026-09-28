import { CheckIcon, ChevronDownIcon, FileUpIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccumulatedLine } from '@/components/charts/accumulated-line'
import { GroupedBars } from '@/components/charts/grouped-bars'
import type { HBarDatum } from '@/components/charts/horizontal-bars'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import type { DonutDatum } from '@/components/charts/region-donut'
import { RegionDonut } from '@/components/charts/region-donut'
import { HistoryTab } from '@/components/history/history-tab'
import {
  KpiCard,
  KpiCardContent,
  KpiCardHeader,
  KpiCardTitle,
  KpiCardValue,
} from '@/components/kpi/kpi-card'
import { SellerCards } from '@/components/sellers/seller-cards'
import { ThemeToggle } from '@/components/theme-toggle'
import { TitleBar } from '@/components/title-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WindowResizeHandles } from '@/components/window-resize-handles'
import { chartColor } from '@/lib/colors'
import { brl, brl0, brlCompact, int, pct } from '@/lib/format'
import { fileName, MES_LABEL } from '@/lib/labels'
import { useWindowMaximized } from '@/lib/useWindowMaximized'
import { cn } from '@/lib/utils'
import type { KpiSnapshot, Mes } from '../../shared/types'
import { MESES, STATUS_FATURAMENTO } from '../../shared/types'

const ANOS = [2024, 2025, 2026]

function funnelItems(mesIndex: number, snap: KpiSnapshot): HBarDatum[] {
  const f = snap.funilPorMes[mesIndex]
  const rows = [
    { singular: 'Orçamento', plural: 'Orçamentos', v: f.orcamento },
    { singular: 'Pedido', plural: 'Pedidos', v: f.pedido },
    {
      singular: 'Pedido Aprovado S/F',
      plural: 'Pedidos Aprovados S/F',
      v: f.pedidoAprovadoSemFaturamento,
    },
    {
      singular: 'Pedido Cancelado',
      plural: 'Pedidos Cancelados',
      v: f.pedidoCancelado,
    },
    {
      singular: 'Pedido Faturado',
      plural: 'Pedidos Faturados',
      v: f.pedidoFaturado,
    },
    {
      singular: 'Pedido Não Faturado',
      plural: 'Pedidos Não Faturados',
      v: f.pedidoNaoFaturado,
    },
  ]
  return rows.map((r, i) => ({
    label: r.v > 1 ? r.plural : r.singular,
    value: r.v,
    color: i < 5 ? chartColor(i + 1) : 'var(--destructive)',
  }))
}

const REGION_COLORS: Record<string, string> = {
  Norte: chartColor(1),
  Nordeste: chartColor(4),
  'Centro-Oeste': chartColor(3),
  Sudeste: chartColor(2),
  Sul: chartColor(5),
  Exterior: 'var(--muted-foreground)',
}

function regionDonutData(snap: KpiSnapshot): DonutDatum[] {
  return snap.porRegiao.map(r => ({
    label: r.regiao,
    value: r.valor,
    share: r.share,
    color: REGION_COLORS[r.regiao],
  }))
}

export function App() {
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState<Mes | 'todos'>('todos')
  const [vendedor, setVendedor] = useState<string | null>(null)
  const [view, setView] = useState<'dashboard' | 'historico'>('dashboard')
  const maximized = useWindowMaximized()
  const [snap, setSnap] = useState<KpiSnapshot | null>(null)
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [reload, setReload] = useState(1)

  const api = window.api

  const load = useCallback(async () => {
    if (!api) return
    setError(null)
    try {
      const s = await api.getSnapshot(ano, {
        mes: mes === 'todos' ? null : mes,
        vendedor,
      })
      setSnap(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [ano, mes, vendedor])

  const loadFotos = useCallback(async () => {
    if (!api) return
    try {
      const list = await api.getFotos()
      setFotos(Object.fromEntries(list.map(f => [f.vendedor, f.dataUrl])))
    } catch {
      // as fotos são best-effort; sem elas, mostra iniciais
    }
  }, [])

  const refresh = useCallback(() => {
    void load()
    void loadFotos()
  }, [load, loadFotos])

  useEffect(() => {
    if (!reload) return
    refresh()
  }, [reload, refresh])

  const handleImport = async (): Promise<void> => {
    if (!api) return
    setImporting(true)
    try {
      const r = await api.importWorkbook()
      if (r) {
        setImportMsg(
          `${fileName(r.filePath)} — ${int(r.inserted)} novos, ${int(r.updated)} atualizados` +
            (r.discarded ? `, ${int(r.discarded)} descartados` : ''),
        )
        setReload(k => k + 1)
      }
    } catch (e) {
      setImportMsg(e instanceof Error ? `Erro: ${e.message}` : String(e))
    } finally {
      setImporting(false)
    }
  }

  const mesAtivo = mes !== 'todos'
  const mesIndex = mesAtivo ? MESES.indexOf(mes as Mes) : -1
  const metaMes = snap && mesAtivo ? snap.metasPorMes[mesIndex].meta : 0
  const faturamentoMes =
    snap && mesAtivo ? snap.faturamentoPorMes[mes as Mes] : 0
  const metaPct =
    snap && !vendedor && !mesAtivo && snap.metaAnual > 0
      ? snap.totalPeriodo / snap.metaAnual
      : 0
  const metaMesPct =
    mesAtivo && metaMes > 0 ? (faturamentoMes ?? 0) / metaMes : 0
  const restanteAno = snap ? snap.restanteAnoPorMes.dez : 0
  const restanteMes = mesAtivo
    ? Math.max(metaMes - (faturamentoMes ?? 0), 0)
    : 0

  const totalQtd = useMemo(() => {
    if (!snap) return 0
    if (mesAtivo) return snap.quantidadePorMes[mes as Mes]
    return MESES.reduce((acc, m) => acc + snap.quantidadePorMes[m], 0)
  }, [snap, mesAtivo, mes])

  const runRate = useMemo(() => {
    if (
      !snap ||
      mesAtivo ||
      vendedor ||
      !snap.totalPeriodo ||
      snap.totalPeriodo <= 0
    )
      return null
    const now = new Date()
    const elapsed = now.getFullYear() === ano ? now.getMonth() + 1 : 12
    if (elapsed <= 0) return null
    return { projection: (snap.totalPeriodo / elapsed) * 12, elapsed }
  }, [snap, ano, mesAtivo, vendedor])

  if (!api) {
    return (
      <div className="app-root flex h-dvh flex-col overflow-hidden rounded-[10px] bg-background text-foreground">
        <TitleBar />
        <main className="mx-auto w-full max-w-2xl overflow-y-auto p-8">
          <p className="text-muted-foreground">
            Aponte o app (Electron) para ver o dashboard. A API do preload não
            está disponível.
          </p>
        </main>
      </div>
    )
  }

  const kgrid = vendedor
    ? 'lg:grid-cols-3'
    : mesAtivo
      ? 'lg:grid-cols-6'
      : 'lg:grid-cols-7'
  const quantHint = vendedor
    ? mesAtivo
      ? `vendas de ${vendedor} em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : `vendas de ${vendedor} (1 por linha)`
    : mesAtivo
      ? `vendas em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : 'vendas no ano (1 por linha)'

  return (
    <div
      className={cn(
        'app-root flex h-dvh flex-col overflow-hidden bg-background text-foreground',
        maximized
          ? 'rounded-none border-0 shadow-none'
          : 'rounded-[10px] border border-border/60 shadow-2xl',
      )}>
      <TitleBar />
      <WindowResizeHandles />

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-y-auto p-6 pt-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              Sulmag Equipamentos Magnéticos
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Metas Comercial
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === 'dashboard'
                ? 'Dashboard de vendas'
                : 'Histórico de vendas'}
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-muted p-0.5">
              {ANOS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAno(a)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    a === ano
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}>
                  {a}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-36 justify-between gap-2 px-3 text-sm font-normal">
                  {mesAtivo ? MES_LABEL[mes as Mes] : 'Todos os meses'}
                  <ChevronDownIcon className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onSelect={() => setMes('todos')}
                  className="justify-between">
                  Todos os meses
                  {!mesAtivo ? <CheckIcon className="size-4" /> : null}
                </DropdownMenuItem>
                {MESES.map(m => (
                  <DropdownMenuItem
                    key={m}
                    onSelect={() => setMes(m)}
                    className="justify-between">
                    {MES_LABEL[m]}
                    {mes === m ? <CheckIcon className="size-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => void handleImport()} disabled={importing}>
              <FileUpIcon className="size-4" />
              {importing ? 'Importando…' : 'Importar export do SIGE'}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {importMsg ? (
          <p className="text-xs text-muted-foreground no-print">{importMsg}</p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive no-print">Erro: {error}</p>
        ) : null}

        <Tabs
          value={view}
          onValueChange={v => setView(v as 'dashboard' | 'historico')}
          className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="flex flex-col gap-6">
            {!snap ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Carregando… (rode "Importar export do SIGE" para carregar os
                dados)
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {(vendedor || mesAtivo) && (
                  <div className="no-print flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Filtrando por:
                    </span>
                    {mesAtivo ? (
                      <button
                        type="button"
                        onClick={() => setMes('todos')}
                        className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
                        Mês: {MES_LABEL[mes as Mes]}
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                    {vendedor ? (
                      <button
                        type="button"
                        onClick={() => setVendedor(null)}
                        className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
                        Vendedor: {vendedor}
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMes('todos')
                        setVendedor(null)
                      }}>
                      Limpar filtros
                    </Button>
                  </div>
                )}

                <section
                  className={cn(
                    'grid grid-cols-2 gap-4 sm:grid-cols-3',
                    kgrid,
                  )}>
                  <KpiCard>
                    <KpiCardHeader>
                      <KpiCardTitle>
                        Faturamento{' '}
                        {vendedor
                          ? `${vendedor}${mesAtivo ? ` · ${MES_LABEL[mes as Mes]}` : ''}`
                          : mesAtivo
                            ? `${MES_LABEL[mes as Mes]} ${ano}`
                            : ano}
                      </KpiCardTitle>
                    </KpiCardHeader>
                    <KpiCardContent>
                      <KpiCardValue
                        value={brl0(snap.totalPeriodo)}
                        hint={`status ${STATUS_FATURAMENTO.join(' + ')}`}
                      />
                    </KpiCardContent>
                  </KpiCard>

                  {!vendedor ? (
                    mesAtivo ? (
                      <KpiCard>
                        <KpiCardHeader>
                          <KpiCardTitle>
                            Meta {MES_LABEL[mes as Mes]}
                          </KpiCardTitle>
                        </KpiCardHeader>
                        <KpiCardContent>
                          <KpiCardValue
                            value={brl0(metaMes)}
                            hint="meta do mês (empresa)"
                          />
                        </KpiCardContent>
                      </KpiCard>
                    ) : (
                      <KpiCard>
                        <KpiCardHeader>
                          <KpiCardTitle>Meta anual</KpiCardTitle>
                        </KpiCardHeader>
                        <KpiCardContent>
                          <KpiCardValue
                            value={brl0(snap.metaAnual)}
                            hint={`base ${ano - 1} × ${(snap.fator * 100).toFixed(0)}%`}
                          />
                        </KpiCardContent>
                      </KpiCard>
                    )
                  ) : null}

                  {!vendedor ? (
                    <KpiCard>
                      <KpiCardHeader>
                        <KpiCardTitle>% da meta</KpiCardTitle>
                      </KpiCardHeader>
                      <KpiCardContent>
                        <KpiCardValue
                          value={pct(mesAtivo ? metaMesPct : metaPct)}
                          hint={
                            mesAtivo
                              ? 'realizado do mês ÷ meta'
                              : 'realizado ÷ meta'
                          }
                        />
                      </KpiCardContent>
                    </KpiCard>
                  ) : null}

                  {!vendedor ? (
                    <KpiCard>
                      <KpiCardHeader>
                        <KpiCardTitle>
                          {mesAtivo
                            ? 'Restante p/ meta do mês'
                            : 'Restante p/ meta'}
                        </KpiCardTitle>
                      </KpiCardHeader>
                      <KpiCardContent>
                        <KpiCardValue
                          value={
                            mesAtivo
                              ? restanteMes > 0
                                ? brl0(restanteMes)
                                : '—'
                              : restanteAno > 0
                                ? brl0(restanteAno)
                                : '—'
                          }
                          hint={
                            mesAtivo
                              ? restanteMes > 0
                                ? 'no mês'
                                : 'meta atingida'
                              : restanteAno > 0
                                ? 'no acumulado de dez'
                                : 'meta atingida'
                          }
                        />
                      </KpiCardContent>
                    </KpiCard>
                  ) : null}

                  <KpiCard>
                    <KpiCardHeader>
                      <KpiCardTitle>Quantidade</KpiCardTitle>
                    </KpiCardHeader>
                    <KpiCardContent>
                      <KpiCardValue value={int(totalQtd)} hint={quantHint} />
                    </KpiCardContent>
                  </KpiCard>

                  <KpiCard>
                    <KpiCardHeader>
                      <KpiCardTitle>Participação</KpiCardTitle>
                    </KpiCardHeader>
                    <KpiCardContent>
                      <KpiCardValue
                        value={pct(snap.participacaoEscopo)}
                        hint={`de ${brlCompact(snap.totalHistorico)}`}
                      />
                    </KpiCardContent>
                  </KpiCard>

                  {!vendedor && !mesAtivo ? (
                    <KpiCard>
                      <KpiCardHeader>
                        <KpiCardTitle>Projeção (run-rate)</KpiCardTitle>
                      </KpiCardHeader>
                      <KpiCardContent>
                        <KpiCardValue
                          value={runRate ? brl0(runRate.projection) : '—'}
                          hint={
                            runRate
                              ? `${brl0(snap.totalPeriodo / runRate.elapsed)}/mês med em ${runRate.elapsed === 12 ? 'ano fechado' : `${runRate.elapsed} meses`}`
                              : 'sem dados'
                          }
                        />
                      </KpiCardContent>
                    </KpiCard>
                  ) : null}
                </section>

                <Card className="no-print">
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Vendedores — faturamento {ano}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Clique em um vendedor para filtrar todo o dashboard;
                        clique de novo para limpar o filtro.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SellerCards
                      ano={ano}
                      vendedores={snap.porVendedor}
                      fotos={fotos}
                      selected={vendedor}
                      onSelect={setVendedor}
                    />
                  </CardContent>
                </Card>

                {!mesAtivo ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {vendedor
                          ? `Faturamento mensal — ${vendedor}`
                          : 'Faturamento mensal × meta'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <GroupedBars
                        labels={MESES.map(m => MES_LABEL[m])}
                        series={[
                          {
                            name: 'Realizado',
                            kind: 'bar',
                            color: chartColor(1),
                            values: MESES.map(m => snap.faturamentoPorMes[m]),
                          },
                          ...(!vendedor
                            ? [
                                {
                                  name: 'Meta',
                                  kind: 'line' as const,
                                  color: chartColor(3),
                                  values: MESES.map(
                                    (_m, i) => snap.metasPorMes[i].meta,
                                  ),
                                },
                              ]
                            : []),
                        ]}
                        onClick={i => setMes(MESES[i])}
                      />
                      <p className="text-xs text-muted-foreground">
                        Clique em uma barra para filtrar o mês.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {!mesAtivo ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {vendedor
                            ? `Acumulado ${ano} — ${vendedor}`
                            : 'Acumulado anual × meta'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AccumulatedLine
                          labels={MESES.map(m => MES_LABEL[m])}
                          values={MESES.map(m => snap.acumuladoPorMes[m])}
                          target={vendedor ? undefined : snap.metaAnual}
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Nº de fechamento por mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GroupedBars
                          labels={MESES.map(m => MES_LABEL[m])}
                          className="h-[260px]"
                          valueFormat={v => int(v)}
                          series={[
                            {
                              name: 'Orçamentos',
                              kind: 'bar',
                              color: chartColor(2),
                              values: MESES.map(
                                m => snap.numeroFechamento[m].orcamento,
                              ),
                            },
                            {
                              name: 'Pedidos',
                              kind: 'bar',
                              color: chartColor(3),
                              values: MESES.map(
                                m => snap.numeroFechamento[m].pedido,
                              ),
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Funil de vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBars
                        data={funnelItems(
                          MESES.indexOf(
                            mes === 'todos'
                              ? (MESES.findLast(
                                  (_m, i) => snap.funilPorMes[i].total > 0,
                                ) ?? 'dez')
                              : mes,
                          ),
                          snap,
                        )}
                        showValue
                        valueFormat={int}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Regiões</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <RegionDonut data={regionDonutData(snap)} />
                      <HorizontalBars
                        data={snap.porRegiao.map(r => ({
                          label: r.regiao,
                          value: r.valor,
                          color: REGION_COLORS[r.regiao],
                        }))}
                        valueFormat={brl0}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Estados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBars
                        data={snap.porEstado.slice(0, 8).map(e => ({
                          label: `${e.estado} · ${pct(e.share)}`,
                          value: e.valor,
                          color: chartColor(2),
                        }))}
                        valueFormat={brl0}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket médio por produto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        {snap.ticketMedio.map(t => (
                          <div
                            key={t.produto}
                            className="flex items-center justify-between gap-2 text-sm">
                            <div>
                              <p className="font-medium">{t.produto}</p>
                              <p className="text-xs text-muted-foreground">
                                {int(t.volume)} vendas · {brl0(t.valor)}
                              </p>
                            </div>
                            <span className="text-lg font-semibold tabular-nums">
                              {brl(t.ticket)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Faturamento total (todos os anos)
                          </span>
                          <span className="font-semibold tabular-nums">
                            {brl0(snap.totalHistorico)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Participação de {ano}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {pct(snap.participacaoAno)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Base meta {ano}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {brl0(snap.metaAnualBase)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Fator de meta
                          </span>
                          <span className="font-semibold tabular-nums">
                            ×{(snap.fator * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="historico">
            <HistoryTab reloadKey={reload} ano={ano} mes={mes} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
