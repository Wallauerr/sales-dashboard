import { useCallback, useEffect, useState } from 'react'
import { ActiveFilters } from '@/components/active-filters'
import { ChartCard } from '@/components/chart-card'
import { AccumulatedLine } from '@/components/charts/accumulated-line'
import { GroupedBars } from '@/components/charts/grouped-bars'
import {
  funnelItems,
  HorizontalBars,
} from '@/components/charts/horizontal-bars'
import {
  RegionDonut,
  regionBarData,
  regionDonutData,
} from '@/components/charts/region-donut'
import { ConfigTab } from '@/components/config/config-tab'
import { DashboardGrid } from '@/components/dashboard-grid'
import { DashboardHeader } from '@/components/dashboard-header'
import { HistoryTab } from '@/components/history/history-tab'
import { buildKpis } from '@/components/kpi/build-kpis'
import { KpiCard } from '@/components/kpi/kpi-card'
import { SellerCards } from '@/components/sellers/seller-cards'
import { TitleBar } from '@/components/title-bar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WindowResizeHandles } from '@/components/window-resize-handles'
import { chartColor } from '@/lib/colors'
import { brl, brl0, int, pct } from '@/lib/format'
import { fileName, MES_LABEL } from '@/lib/labels'
import { useWindowMaximized } from '@/lib/useWindowMaximized'
import { cn } from '@/lib/utils'
import type { KpiSnapshot, Mes } from '../../shared/types'
import { MESES } from '../../shared/types'

export function App() {
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState<Mes | 'todos'>('todos')
  const [vendedor, setVendedor] = useState<string | null>(null)
  const [view, setView] = useState<'dashboard' | 'historico'>('dashboard')
  const [metasOpen, setMetasOpen] = useState(false)
  const [layoutResetKey, setLayoutResetKey] = useState(0)
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
    } catch {}
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

  if (!api) {
    return (
      <div className="app-root flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <TitleBar />
        <main className="w-full max-w-2xl overflow-y-auto p-8">
          <p className="text-muted-foreground">
            Aponte o app (Electron) para ver o dashboard. A API do preload não
            está disponível.
          </p>
        </main>
      </div>
    )
  }

  const mesAtivo = mes !== 'todos'
  const { kpis, kgrid } = buildKpis({ ano, mes, vendedor, snap })

  return (
    <div
      className={cn(
        'app-root flex h-dvh flex-col overflow-hidden bg-background text-foreground',
        maximized
          ? 'border-0 shadow-none'
          : 'border border-border/60 shadow-2xl',
      )}>
      <TitleBar />
      <WindowResizeHandles />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="flex w-full flex-col gap-3 p-3 pt-2">
          <DashboardHeader
            ano={ano}
            onAno={setAno}
            mes={mes}
            onMes={setMes}
            view={view}
            importing={importing}
            onImport={() => void handleImport()}
            onOpenMetas={() => setMetasOpen(true)}
          />

          <Dialog open={metasOpen} onOpenChange={setMetasOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Configurações</DialogTitle>
                <DialogDescription>
                  Ajuste as metas e o layout; o dashboard reflete na hora.
                </DialogDescription>
              </DialogHeader>
              <ConfigTab
                key={reload}
                ano={ano}
                onSaved={() => setReload(k => k + 1)}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Layout da dashboard</p>
                  <p className="text-xs text-muted-foreground">
                    Arraste os cartões pelo título e redimensione pelo canto; o
                    layout fica salvo neste computador.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setLayoutResetKey(k => k + 1)}>
                  Restaurar padrão
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {importMsg ? (
            <p className="text-xs text-muted-foreground no-print">
              {importMsg}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive no-print">Erro: {error}</p>
          ) : null}

          <Tabs
            value={view}
            onValueChange={v => setView(v as 'dashboard' | 'historico')}
            className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="w-fit">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>
              <SellerCards
                ano={ano}
                vendedores={snap?.porVendedor ?? []}
                fotos={fotos}
                selected={vendedor}
                onSelect={setVendedor}
              />
            </div>
            <TabsContent value="dashboard" className="flex flex-col gap-3">
              {!snap ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Carregando… (rode "Importar dados do SIGE" para carregar os
                  dados)
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <ActiveFilters
                    mes={mes}
                    vendedor={vendedor}
                    onClearMes={() => setMes('todos')}
                    onClearVendedor={() => setVendedor(null)}
                    onClearAll={() => {
                      setMes('todos')
                      setVendedor(null)
                    }}
                  />

                  <section className={cn('grid gap-2 sm:grid-cols-3', kgrid)}>
                    {kpis.map(k => (
                      <KpiCard
                        key={k.title}
                        title={k.title}
                        value={k.value}
                        hint={k.hint}
                      />
                    ))}
                  </section>

                  <DashboardGrid resetKey={layoutResetKey}>
                    {!mesAtivo ? (
                      <ChartCard
                        key="fat-mensal"
                        headerClassName="card-drag-handle cursor-move"
                        title={
                          vendedor
                            ? `Faturamento mensal — ${vendedor}`
                            : 'Faturamento mensal × meta'
                        }
                        contentClassName="flex flex-col gap-2">
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
                      </ChartCard>
                    ) : null}

                    {!mesAtivo ? (
                      <ChartCard
                        key="acumulado"
                        headerClassName="card-drag-handle cursor-move"
                        title={
                          vendedor
                            ? `Acumulado ${ano} — ${vendedor}`
                            : 'Acumulado anual × meta'
                        }>
                        <AccumulatedLine
                          labels={MESES.map(m => MES_LABEL[m])}
                          values={MESES.map(m => snap.acumuladoPorMes[m])}
                          target={vendedor ? undefined : snap.metaAnual}
                        />
                      </ChartCard>
                    ) : null}

                    {!mesAtivo ? (
                      <ChartCard
                        key="fechamento"
                        headerClassName="card-drag-handle cursor-move"
                        title="Nº de fechamento por mês">
                        <GroupedBars
                          labels={MESES.map(m => MES_LABEL[m])}
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
                      </ChartCard>
                    ) : null}

                    <ChartCard
                      key="funil"
                      headerClassName="card-drag-handle cursor-move"
                      title="Funil de vendas">
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
                    </ChartCard>

                    <ChartCard
                      key="regioes"
                      headerClassName="card-drag-handle cursor-move"
                      title="Regiões"
                      contentClassName="flex flex-col gap-2">
                      <RegionDonut data={regionDonutData(snap)} />
                      <HorizontalBars
                        data={regionBarData(snap)}
                        valueFormat={brl0}
                      />
                    </ChartCard>

                    <ChartCard
                      key="estados"
                      headerClassName="card-drag-handle cursor-move"
                      title="Estados">
                      <HorizontalBars
                        data={snap.porEstado.slice(0, 8).map(e => ({
                          label: `${e.estado} · ${pct(e.share)}`,
                          value: e.valor,
                          color: chartColor(2),
                        }))}
                        valueFormat={brl0}
                      />
                    </ChartCard>

                    <ChartCard
                      key="ticket"
                      headerClassName="card-drag-handle cursor-move"
                      title="Ticket médio por produto">
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
                    </ChartCard>

                    <ChartCard
                      key="historico"
                      headerClassName="card-drag-handle cursor-move"
                      title="Histórico">
                      <div className="flex flex-col gap-3 text-sm">
                        {[
                          {
                            label: 'Faturamento total (todos os anos)',
                            value: brl0(snap.totalHistorico),
                          },
                          {
                            label: `Participação de ${ano}`,
                            value: pct(snap.participacaoAno),
                          },
                          {
                            label: `Base meta ${ano}`,
                            value: brl0(snap.metaAnualBase),
                          },
                          {
                            label: 'Fator de meta',
                            value: `×${(snap.fator * 100).toFixed(0)}%`,
                          },
                        ].map(row => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ChartCard>
                  </DashboardGrid>
                </div>
              )}
            </TabsContent>
            <TabsContent value="historico">
              <HistoryTab reloadKey={reload} ano={ano} mes={mes} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
