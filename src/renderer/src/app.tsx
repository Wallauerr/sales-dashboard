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
import { AutoStartCard } from '@/components/config/auto-start-card'
import { ConfigTab } from '@/components/config/config-tab'
import { VendedoresCard } from '@/components/config/vendedores-card'
import { DashboardGrid } from '@/components/dashboard-grid'
import { DashboardHeader } from '@/components/dashboard-header'
import { HistoryTab } from '@/components/history/history-tab'
import { buildKpis, periodoLabel } from '@/components/kpi/build-kpis'
import { KpiCard } from '@/components/kpi/kpi-card'
import { SellerCards } from '@/components/sellers/seller-cards'
import { TitleBar } from '@/components/title-bar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  const [ano, setAno] = useState(() => new Date().getFullYear())
  const [anos, setAnos] = useState<number[]>([])
  const [meses, setMeses] = useState<Mes[]>([])
  const [vendSel, setVendSel] = useState<string[]>([])
  const [view, setView] = useState<'dashboard' | 'historico'>('dashboard')
  const [metasOpen, setMetasOpen] = useState(false)
  const [layoutResetKey, setLayoutResetKey] = useState(0)
  const maximized = useWindowMaximized()
  const [snap, setSnap] = useState<KpiSnapshot | null>(null)
  const [fotos, setFotos] = useState<Set<string>>(new Set())
  const [vendedores, setVendedores] = useState<string[]>([])
  const [desativados, setDesativados] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [reload, setReload] = useState(1)

  const api = window.api

  const load = useCallback(async () => {
    if (!api) return
    setError(null)
    try {
      const [s, listaAnos] = await Promise.all([
        api.getSnapshot(ano, {
          meses: meses.length ? meses : null,
          vendedores: vendSel.length ? vendSel : null,
        }),
        api.listAnos(),
      ])
      setAnos(listaAnos)
      if (listaAnos.length > 0 && !listaAnos.includes(ano)) {
        setAno(Math.max(...listaAnos))
      }
      setSnap(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [ano, meses, vendSel])

  const loadFotos = useCallback(async () => {
    if (!api) return
    try {
      const [lista, nomes, desat] = await Promise.all([
        api.getFotos(),
        api.listVendedores(),
        api.listVendedoresDesativados(),
      ])
      setFotos(new Set(lista.map(f => f.vendedor)))
      setVendedores(nomes)
      setDesativados(desat)
    } catch {}
  }, [])

  const refresh = useCallback(() => {
    void load()
    void loadFotos()
  }, [load, loadFotos])

  const alternarVendedor = async (
    nome: string,
    desativar: boolean,
  ): Promise<void> => {
    if (!api) return
    await api.setVendedorDesativado(nome, desativar)
    if (desativar) {
      setVendSel(prev => prev.filter(x => x !== nome))
    }
    setReload(k => k + 1)
  }

  const escolherFoto = async (vendedor: string): Promise<void> => {
    if (!api) return
    const r = await api.escolherFoto(vendedor)
    if (!r) return
    setFotos(f => new Set(f).add(r.vendedor))
  }

  const removerFoto = async (vendedor: string): Promise<void> => {
    if (!api) return
    await api.removerFoto(vendedor)
    setFotos(f => {
      const next = new Set(f)
      next.delete(vendedor)
      return next
    })
  }

  const alternarMes = (m: Mes): void => {
    setMeses(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m],
    )
  }

  const alternarVend = (nome: string): void => {
    setVendSel(prev =>
      prev.includes(nome) ? prev.filter(x => x !== nome) : [...prev, nome],
    )
  }

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
      <div className="app-root flex h-dvh flex-col overflow-hidden rounded-[10px] bg-background text-foreground">
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

  const mesAtivo = meses.length > 0
  const vendedorFiltro = vendSel.length === 1 ? vendSel[0] : null
  const vendTitulo =
    vendSel.length === 1
      ? vendSel[0]
      : vendSel.length > 1
        ? `${vendSel.length} vendedores`
        : null
  const { kpis, kgrid } = buildKpis({ ano, meses, vendedores: vendSel, snap })

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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="flex w-full flex-col gap-3 p-3 pt-2">
          <DashboardHeader
            ano={ano}
            onAno={setAno}
            meses={meses}
            onMes={alternarMes}
            onClearMeses={() => setMeses([])}
            view={view}
            importing={importing}
            onImport={() => void handleImport()}
            onOpenMetas={() => setMetasOpen(true)}
            anos={anos}
          />

          <Dialog open={metasOpen} onOpenChange={setMetasOpen}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>Configurações</DialogTitle>
                <DialogDescription>
                  Ajuste as metas e o comportamento do app; o dashboard reflete
                  na hora.
                </DialogDescription>
              </DialogHeader>
              <Tabs
                defaultValue="metas"
                className="flex min-h-0 flex-1 flex-col gap-3">
                <TabsList className="w-fit shrink-0">
                  <TabsTrigger value="metas">Métricas</TabsTrigger>
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="metas"
                  className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <ConfigTab
                    key={reload}
                    ano={ano}
                    onSaved={() => setReload(k => k + 1)}
                  />
                </TabsContent>
                <TabsContent
                  value="geral"
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                  <AutoStartCard />
                  <VendedoresCard
                    ativos={vendedores}
                    desativados={desativados}
                    fotos={fotos}
                    onEscolher={escolherFoto}
                    onRemover={removerFoto}
                    onToggle={alternarVendedor}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Layout da dashboard</CardTitle>
                      <CardDescription>
                        Arraste os cartões pelo título e redimensione pelo
                        canto; o layout fica salvo neste computador.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setLayoutResetKey(k => k + 1)}>
                        Restaurar padrão
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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
              {view === 'dashboard' ? (
                <SellerCards
                  ano={ano}
                  vendedores={snap?.porVendedor ?? []}
                  fotos={fotos}
                  selected={vendSel}
                  onSelect={alternarVend}
                  onClear={() => setVendSel([])}
                  desativados={desativados.length}
                />
              ) : null}
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
                    meses={meses}
                    vendedores={vendSel}
                    onClearMes={m =>
                      setMeses(prev => prev.filter(x => x !== m))
                    }
                    onClearVendedor={n =>
                      setVendSel(prev => prev.filter(x => x !== n))
                    }
                    onClearAll={() => {
                      setMeses([])
                      setVendSel([])
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
                          vendTitulo
                            ? `Faturamento mensal — ${vendTitulo}`
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
                            ...(!vendTitulo
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
                          onClick={i => alternarMes(MESES[i])}
                        />
                      </ChartCard>
                    ) : null}

                    {!mesAtivo ? (
                      <ChartCard
                        key="acumulado"
                        headerClassName="card-drag-handle cursor-move"
                        title={
                          vendTitulo
                            ? `Acumulado ${ano} — ${vendTitulo}`
                            : 'Acumulado anual × meta'
                        }>
                        <AccumulatedLine
                          labels={MESES.map(m => MES_LABEL[m])}
                          values={MESES.map(m => snap.acumuladoPorMes[m])}
                          target={vendTitulo ? undefined : snap.metaAnual}
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
                      title={`Funil de vendas · ${[
                        vendedorFiltro,
                        mesAtivo ? `${periodoLabel(meses)}/${ano}` : ano,
                      ]
                        .filter(Boolean)
                        .join(' · ')}`}>
                      <HorizontalBars
                        data={funnelItems(snap)}
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
                      <div className="flex flex-col gap-2">
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
              <HistoryTab reloadKey={reload} ano={ano} meses={meses} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
