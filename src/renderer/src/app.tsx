import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ActiveFilters } from '@/components/active-filters'
import { AddressDialog } from '@/components/address-dialog'
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
import { DataCard } from '@/components/config/data-card'
import { PreferencesCard } from '@/components/config/preferences-card'
import { ReleasesCard } from '@/components/config/releases-card'
import { SellersCard } from '@/components/config/sellers-card'
import { UpdatesCard } from '@/components/config/updates-card'
import { DashboardGrid } from '@/components/dashboard-grid'
import { DashboardHeader } from '@/components/dashboard-header'
import { HistoryTab } from '@/components/history/history-tab'
import { buildKpis, periodLabel } from '@/components/kpi/build-kpis'
import { KpiCard } from '@/components/kpi/kpi-card'
import { ReleaseNotesDialog } from '@/components/release-notes'
import { SellerCards } from '@/components/sellers/seller-cards'
import { TitleBar } from '@/components/title-bar'
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
import { errorMessage } from '@/lib/errors'
import { brl, brl0, int, pct } from '@/lib/format'
import { fileName, MONTH_LABEL } from '@/lib/labels'
import { useUpdateNotifications } from '@/lib/updates'
import { useReleases } from '@/lib/use-releases'
import { useWindowMaximized } from '@/lib/useWindowMaximized'
import { cn } from '@/lib/utils'
import {
  readLastVersion,
  resolveWhatsNew,
  type WhatsNewMode,
  writeLastVersion,
} from '@/lib/whats-new'
import type {
  AddressCorrection,
  ImportPreview,
  KpiSnapshot,
  Month,
} from '../../shared/types'
import { MONTHS } from '../../shared/types'

export function App() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [years, setYears] = useState<number[]>([])
  const [months, setMonths] = useState<Month[]>([])
  const [selectedSellers, setSelectedSellers] = useState<string[]>([])
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard')
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [layoutResetKey, setLayoutResetKey] = useState(0)
  const [whatsNew, setWhatsNew] = useState<{
    mode: WhatsNewMode
    version: string
  } | null>(null)
  const maximized = useWindowMaximized()
  useUpdateNotifications()
  const {
    releases,
    loading: releasesLoading,
    error: releasesError,
    refresh: refreshReleases,
  } = useReleases()
  const [snap, setSnap] = useState<KpiSnapshot | null>(null)
  const [photos, setPhotos] = useState<Set<string>>(new Set())
  const [sellers, setSellers] = useState<string[]>([])
  const [disabled, setDisabled] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [addressOpen, setAddressOpen] = useState(false)
  const [reload, setReload] = useState(1)

  useEffect(() => {
    const api = window.api
    if (!api) return
    let cancelled = false
    void api
      .getUpdateState()
      .then(async view => {
        if (cancelled) return
        const lastSeen = readLastVersion(window.localStorage)
        let mode = resolveWhatsNew(view.currentVersion, lastSeen)
        if (mode === 'welcome' && view.supported) {
          try {
            const stats = await api.getDbStats()
            mode = resolveWhatsNew(
              view.currentVersion,
              lastSeen,
              stats.sales > 0,
            )
          } catch {}
        }
        if (cancelled) return
        if (mode) setWhatsNew({ mode, version: view.currentVersion })
        writeLastVersion(window.localStorage, view.currentVersion)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const api = window.api

  const load = useCallback(async () => {
    if (!api) return
    setError(null)
    try {
      const [s, yearsList] = await Promise.all([
        api.getSnapshot(year, {
          months: months.length ? months : null,
          sellers: selectedSellers.length ? selectedSellers : null,
        }),
        api.listYears(),
      ])
      setYears(yearsList)
      if (yearsList.length > 0 && !yearsList.includes(year)) {
        setYear(Math.max(...yearsList))
      }
      setSnap(s)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [year, months, selectedSellers])

  const loadPhotos = useCallback(async () => {
    if (!api) return
    try {
      const [list, active, disabledList] = await Promise.all([
        api.getPhotos(),
        api.listSellers(),
        api.listDisabledSellers(),
      ])
      setPhotos(new Set(list.map(f => f.seller)))
      setSellers(active)
      setDisabled(disabledList)
    } catch (e) {
      toast.error('Não foi possível carregar vendedores e fotos', {
        id: 'photos-load',
        description: errorMessage(e),
      })
    }
  }, [])

  const refresh = useCallback(() => {
    void load()
    void loadPhotos()
  }, [load, loadPhotos])

  const toggleSellerDisable = async (
    seller: string,
    disable: boolean,
  ): Promise<void> => {
    if (!api) return
    await api.setSellerDisabled(seller, disable)
    if (disable) {
      setSelectedSellers(prev => prev.filter(x => x !== seller))
    }
    setReload(k => k + 1)
    toast.success(disable ? `${seller} desativado` : `${seller} reativado`, {
      description: disable
        ? 'As vendas desse vendedor passam a contar como VENDAS.'
        : 'O vendedor volta a aparecer no filtro.',
    })
  }

  const pickPhoto = async (seller: string): Promise<void> => {
    if (!api) return
    const r = await api.pickPhoto(seller)
    if (!r) return
    setPhotos(f => new Set(f).add(r.seller))
    toast.success(`Foto de ${seller} atualizada`)
  }

  const removePhoto = async (seller: string): Promise<void> => {
    if (!api) return
    await api.removePhoto(seller)
    setPhotos(f => {
      const next = new Set(f)
      next.delete(seller)
      return next
    })
    toast.success(`Foto de ${seller} removida`)
  }

  const toggleMonth = (m: Month): void => {
    setMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m],
    )
  }

  const toggleSeller = (seller: string): void => {
    setSelectedSellers(prev =>
      prev.includes(seller)
        ? prev.filter(x => x !== seller)
        : [...prev, seller],
    )
  }

  useEffect(() => {
    if (!reload) return
    refresh()
  }, [reload, refresh])

  const commitImport = async (
    filePath: string,
    corrections: AddressCorrection[],
  ): Promise<boolean> => {
    if (!api) return false
    const id = toast.loading('Importando dados do SIGE…')
    try {
      const r = await api.commitImport(filePath, corrections)
      const parts = `${int(r.inserted)} novos, ${int(r.updated)} atualizados`
      toast.success('Dados importados', {
        id,
        description: `${fileName(r.filePath)} — ${parts}${
          r.discarded ? `, ${int(r.discarded)} descartados` : ''
        }`,
      })
      setReload(k => k + 1)
      return true
    } catch (e) {
      toast.error('Falha ao importar os dados do SIGE', {
        id,
        description: errorMessage(e),
      })
      return false
    }
  }

  const handleImport = async (): Promise<void> => {
    if (!api) return
    setImporting(true)
    const id = toast.loading('Lendo a planilha do SIGE…')
    try {
      const p = await api.previewImport()
      toast.dismiss(id)
      if (!p) return
      if (p.pending.length === 0) {
        await commitImport(p.filePath, [])
        return
      }
      setPreview(p)
      setAddressOpen(true)
    } catch (e) {
      toast.error('Falha ao ler a planilha do SIGE', {
        id,
        description: errorMessage(e),
      })
    } finally {
      setImporting(false)
    }
  }

  const saveAddresses = async (
    corrections: AddressCorrection[],
  ): Promise<void> => {
    if (!preview) return
    setImporting(true)
    const ok = await commitImport(preview.filePath, corrections)
    setImporting(false)
    if (!ok) return
    setAddressOpen(false)
    setPreview(null)
  }

  const skipAddresses = async (): Promise<void> => {
    if (!preview) return
    setImporting(true)
    const ok = await commitImport(preview.filePath, [])
    setImporting(false)
    if (!ok) return
    setAddressOpen(false)
    setPreview(null)
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

  const monthActive = months.length > 0
  const sellerFilter = selectedSellers.length === 1 ? selectedSellers[0] : null
  const sellerTitle =
    selectedSellers.length === 1
      ? selectedSellers[0]
      : selectedSellers.length > 1
        ? `${selectedSellers.length} vendedores`
        : null
  const { kpis, gridClass } = buildKpis({
    year,
    months,
    sellers: selectedSellers,
    snap,
  })

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

      <div className="min-h-0 flex overflow-y-auto">
        <main className="flex w-full flex-col gap-1 p-3 pt-2">
          <DashboardHeader
            year={year}
            onYear={setYear}
            months={months}
            onMonth={toggleMonth}
            onClearMonths={() => setMonths([])}
            view={view}
            importing={importing}
            onImport={() => void handleImport()}
            onOpenMeta={() => setGoalsOpen(true)}
            years={years}
          />

          <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>Configurações</DialogTitle>
                <DialogDescription>
                  Ajuste metas, preferências, vendedores e dados; o dashboard
                  reflete na hora.
                </DialogDescription>
              </DialogHeader>
              <Tabs
                defaultValue="goals"
                className="flex min-h-0 flex-1 flex-col gap-3">
                <TabsList className="w-fit shrink-0">
                  <TabsTrigger value="goals">Métricas</TabsTrigger>
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="sellers">Vendedores</TabsTrigger>
                  <TabsTrigger value="data">Dados</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="goals"
                  className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <ConfigTab
                    key={reload}
                    year={year}
                    onSaved={() => setReload(k => k + 1)}
                  />
                </TabsContent>
                <TabsContent
                  value="general"
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                  <PreferencesCard
                    onResetLayout={() => {
                      setLayoutResetKey(k => k + 1)
                      toast.success('Layout restaurado', {
                        description: 'Os cartões voltaram ao padrão.',
                      })
                    }}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <UpdatesCard />
                    <ReleasesCard
                      releases={releases}
                      loading={releasesLoading}
                      error={releasesError}
                      onRefresh={refreshReleases}
                    />
                  </div>
                </TabsContent>
                <TabsContent
                  value="sellers"
                  className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <SellersCard
                    active={sellers}
                    disabled={disabled}
                    photos={photos}
                    onPick={pickPhoto}
                    onRemove={removePhoto}
                    onToggle={toggleSellerDisable}
                  />
                </TabsContent>
                <TabsContent
                  value="data"
                  className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <DataCard onChanged={() => setReload(k => k + 1)} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <AddressDialog
            open={addressOpen}
            onOpenChange={open => {
              setAddressOpen(open)
              if (!open) setPreview(null)
            }}
            pending={preview?.pending ?? []}
            busy={importing}
            mode="import"
            onSave={saveAddresses}
            onSkip={skipAddresses}
          />

          {error ? (
            <p className="text-xs text-destructive no-print">Erro: {error}</p>
          ) : null}

          <Tabs
            value={view}
            onValueChange={v => setView(v as 'dashboard' | 'history')}
            className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="w-fit">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              {view === 'dashboard' ? (
                <SellerCards
                  year={year}
                  sellers={snap?.bySeller ?? []}
                  photos={photos}
                  selected={selectedSellers}
                  onSelect={toggleSeller}
                  onClear={() => setSelectedSellers([])}
                  disabled={disabled.length}
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
                <div className="flex flex-col">
                  <ActiveFilters
                    months={months}
                    sellers={selectedSellers}
                    onClearMonth={m =>
                      setMonths(prev => prev.filter(x => x !== m))
                    }
                    onClearSeller={n =>
                      setSelectedSellers(prev => prev.filter(x => x !== n))
                    }
                    onClearAll={() => {
                      setMonths([])
                      setSelectedSellers([])
                    }}
                  />

                  <section
                    className={cn('grid gap-2 sm:grid-cols-3', gridClass)}>
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
                    {!monthActive ? (
                      <ChartCard
                        key="billing-monthly"
                        headerClassName="card-drag-handle cursor-move"
                        title={
                          sellerTitle
                            ? `Faturamento mensal — ${sellerTitle}`
                            : 'Faturamento mensal × meta'
                        }
                        contentClassName="gap-2">
                        <GroupedBars
                          labels={MONTHS.map(m => MONTH_LABEL[m])}
                          series={[
                            {
                              name: 'Realizado',
                              kind: 'bar',
                              color: chartColor(1),
                              values: MONTHS.map(m => snap.billingByMonth[m]),
                            },
                            ...(!sellerTitle
                              ? [
                                  {
                                    name: 'Meta',
                                    kind: 'line' as const,
                                    color: chartColor(3),
                                    values: MONTHS.map(
                                      (_m, i) => snap.monthlyGoals[i].goal,
                                    ),
                                  },
                                ]
                              : []),
                          ]}
                          onClick={i => toggleMonth(MONTHS[i])}
                        />
                      </ChartCard>
                    ) : null}

                    {!monthActive ? (
                      <ChartCard
                        key="cumulative"
                        headerClassName="card-drag-handle cursor-move"
                        title={
                          sellerTitle
                            ? `Acumulado ${year} — ${sellerTitle}`
                            : 'Acumulado anual × meta'
                        }>
                        <AccumulatedLine
                          labels={MONTHS.map(m => MONTH_LABEL[m])}
                          values={MONTHS.map(m => snap.cumulativeByMonth[m])}
                          target={sellerTitle ? undefined : snap.annualGoal}
                        />
                      </ChartCard>
                    ) : null}

                    {!monthActive ? (
                      <ChartCard
                        key="closing"
                        headerClassName="card-drag-handle cursor-move"
                        title="Nº de fechamento por mês">
                        <GroupedBars
                          labels={MONTHS.map(m => MONTH_LABEL[m])}
                          valueFormat={v => int(v)}
                          series={[
                            {
                              name: 'Orçamentos',
                              kind: 'bar',
                              color: chartColor(2),
                              values: MONTHS.map(
                                m => snap.closingCounts[m].quote,
                              ),
                            },
                            {
                              name: 'Pedidos',
                              kind: 'bar',
                              color: chartColor(3),
                              values: MONTHS.map(
                                m => snap.closingCounts[m].order,
                              ),
                            },
                          ]}
                        />
                      </ChartCard>
                    ) : null}

                    <ChartCard
                      key="funnel"
                      headerClassName="card-drag-handle cursor-move"
                      title={`Funil de vendas · ${[
                        sellerFilter,
                        monthActive ? `${periodLabel(months)}/${year}` : year,
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
                      key="regions"
                      headerClassName="card-drag-handle cursor-move"
                      title="Regiões"
                      contentClassName="gap-2">
                      <RegionDonut data={regionDonutData(snap)} />
                      <HorizontalBars
                        data={regionBarData(snap)}
                        valueFormat={brl0}
                      />
                    </ChartCard>

                    <ChartCard
                      key="states"
                      headerClassName="card-drag-handle cursor-move"
                      title="Estados">
                      <HorizontalBars
                        data={snap.byState.slice(0, 8).map(e => ({
                          label: `${e.state} · ${pct(e.share)}`,
                          value: e.value,
                          color: chartColor(2),
                        }))}
                        valueFormat={brl0}
                      />
                    </ChartCard>

                    <ChartCard
                      key="ticket"
                      headerClassName="card-drag-handle cursor-move"
                      title="Ticket médio por produto">
                      <div className="flex flex-1 flex-col justify-evenly gap-2">
                        {snap.averageTickets.map(t => (
                          <div
                            key={t.product}
                            className="flex items-center justify-between gap-2 text-sm">
                            <div>
                              <p className="font-medium">{t.product}</p>
                              <p className="text-xs text-muted-foreground">
                                {int(t.volume)} vendas · {brl0(t.value)}
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
                      key="history"
                      headerClassName="card-drag-handle cursor-move"
                      title="Histórico">
                      <div className="flex flex-1 flex-col justify-evenly gap-3 text-sm">
                        {[
                          {
                            label: 'Faturamento total (todos os anos)',
                            value: brl0(snap.historyTotal),
                          },
                          {
                            label: `Participação de ${year}`,
                            value: pct(snap.yearShare),
                          },
                          {
                            label: `Base meta ${year}`,
                            value: brl0(snap.annualGoalBase),
                          },
                          ...(snap.goalUnit === 'brl'
                            ? []
                            : [
                                {
                                  label: 'Fator de meta',
                                  value: `×${(snap.factor * 100).toFixed(0)}%`,
                                },
                              ]),
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
            <TabsContent value="history">
              <HistoryTab reloadKey={reload} year={year} months={months} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <ReleaseNotesDialog
        open={whatsNew !== null}
        mode={whatsNew?.mode ?? 'welcome'}
        version={whatsNew?.version ?? ''}
        release={
          whatsNew
            ? (releases.find(release => release.version === whatsNew.version) ??
              null)
            : null
        }
        loading={releasesLoading}
        onOpenChange={open => {
          if (!open) setWhatsNew(null)
        }}
      />
    </div>
  )
}
