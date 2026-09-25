import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUpIcon, SettingsIcon, XIcon } from "lucide-react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

import type { KpiSnapshot, Mes } from "../../shared/types";
import { MESES, STATUS_FATURAMENTO } from "../../shared/types";
import AccumulatedLine from "@/components/charts/AccumulatedLine";
import GroupedBars from "@/components/charts/GroupedBars";
import HorizontalBars from "@/components/charts/HorizontalBars";
import type { HBarDatum } from "@/components/charts/HorizontalBars";
import RegionMap from "@/components/charts/RegionMap";
import type { RegionPoint } from "@/components/charts/RegionMap";
import HistoryTab from "@/components/history/HistoryTab";
import ConfigTab from "@/components/config/ConfigTab";
import SellerCards from "@/components/sellers/SellerCards";
import {
  KpiCard,
  KpiCardContent,
  KpiCardHeader,
  KpiCardTitle,
  KpiCardValue,
} from "@/components/kpi/KpiCard";
import ThemeToggle from "@/components/ThemeToggle";
import TitleBar from "@/components/TitleBar";
import WindowResizeHandles from "@/components/WindowResizeHandles";
import {
  WidthProvider,
  ReactGridLayout as GridLayout,
  type Layout,
  type LayoutItem,
  type LegacyReactGridLayoutProps,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { brl, brl0, brlCompact, int, pct } from "@/lib/format";
import { MES_LABEL, fileName } from "@/lib/labels";
import { useWindowMaximized } from "@/lib/useWindowMaximized";

const ANOS = [2024, 2025, 2026];

const DASHBOARD_LAYOUT_KEY = "sd:dashboard-layout:v1";
const DashboardGrid = WidthProvider<LegacyReactGridLayoutProps>(GridLayout);

const DEFAULT_DASHBOARD_LAYOUT: LayoutItem[] = [
  { i: "fat-mensal", x: 0, y: 0, w: 12, h: 16, minW: 3, minH: 5 },
  { i: "acumulado", x: 0, y: 16, w: 6, h: 15, minW: 3, minH: 5 },
  { i: "fechamento", x: 6, y: 16, w: 6, h: 15, minW: 3, minH: 5 },
  { i: "funil", x: 0, y: 31, w: 6, h: 12, minW: 3, minH: 5 },
  { i: "regioes", x: 6, y: 31, w: 6, h: 16, minW: 3, minH: 5 },
  { i: "estados", x: 0, y: 47, w: 4, h: 14, minW: 3, minH: 5 },
  { i: "ticket", x: 4, y: 47, w: 4, h: 14, minW: 3, minH: 5 },
  { i: "historico", x: 8, y: 47, w: 4, h: 10, minW: 3, minH: 5 },
];

function loadDashboardLayout(): Layout {
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Layout;
      if (Array.isArray(parsed)) {
        const byKey = new Map(parsed.map((it) => [it.i, it]));
        return DEFAULT_DASHBOARD_LAYOUT.map((d) => byKey.get(d.i) ?? d);
      }
    }
  } catch {
    // layout corrompido: volta ao padrão
  }
  return DEFAULT_DASHBOARD_LAYOUT;
}

function funnelItems(mesIndex: number, snap: KpiSnapshot): HBarDatum[] {
  const f = snap.funilPorMes[mesIndex];
  const rows = [
    { label: "Orçamento", v: f.orcamento, color: "bg-chart-1" },
    { label: "Pedido", v: f.pedido, color: "bg-chart-2" },
    { label: "Pedido Aprovado S/F", v: f.pedidoAprovadoSemFaturamento, color: "bg-chart-3" },
    { label: "Pedido Cancelado", v: f.pedidoCancelado, color: "bg-chart-4" },
    { label: "Pedido Faturado", v: f.pedidoFaturado, color: "bg-chart-5" },
    { label: "Pedido Não Faturado", v: f.pedidoNaoFaturado, color: "bg-destructive" },
  ];
  return rows.map((r) => ({ label: r.label, value: r.v, colorClass: r.color }));
}

const REGION_COLORS: Record<string, string> = {
  Norte: "fill-chart-1",
  Nordeste: "fill-chart-4",
  "Centro-Oeste": "fill-chart-3",
  Sudeste: "fill-chart-2",
  Sul: "fill-chart-5",
  Exterior: "fill-muted-foreground",
};

function regionPoints(snap: KpiSnapshot): RegionPoint[] {
  return snap.porRegiao.map((r) => ({
    label: r.regiao,
    value: r.valor,
    share: r.share,
    x: r.x,
    y: r.y,
    colorClass: REGION_COLORS[r.regiao],
  }));
}

export default function App() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState<Mes | "todos">("todos");
  const [vendedor, setVendedor] = useState<string | null>(null);
  const [view, setView] = useState<"dashboard" | "historico">("dashboard");
  const [configOpen, setConfigOpen] = useState(false);
  const maximized = useWindowMaximized();
  const [snap, setSnap] = useState<KpiSnapshot | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [funnelMes, setFunnelMes] = useState<Mes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [dashboardLayout, setDashboardLayout] = useState<Layout>(loadDashboardLayout);

  const persistLayout = useCallback((next: Layout) => {
    setDashboardLayout(next);
    try {
      localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(next));
    } catch {
      // sem persistência: layout apenas na sessão
    }
  }, []);

  const resetDashboardLayout = useCallback(() => {
    setDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
    try {
      localStorage.removeItem(DASHBOARD_LAYOUT_KEY);
    } catch {
      // ignora
    }
  }, []);

  const api = window.api;

  const load = useCallback(async () => {
    if (!api) return;
    setError(null);
    try {
      const s = await api.getSnapshot(ano, {
        mes: mes === "todos" ? null : mes,
        vendedor,
      });
      setSnap(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ano, mes, vendedor, api]);

  const loadFotos = useCallback(async () => {
    if (!api) return;
    try {
      const list = await api.getFotos();
      setFotos(Object.fromEntries(list.map((f) => [f.vendedor, f.dataUrl])));
    } catch {
      // as fotos são best-effort; sem elas, mostra iniciais
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load, reload]);

  useEffect(() => {
    void loadFotos();
  }, [loadFotos, reload]);

  useEffect(() => {
    if (snap && funnelMes === null) {
      const last = MESES.findLast((_m, i) => snap.funilPorMes[i].total > 0);
      setFunnelMes(last ?? "dez");
    }
  }, [snap, funnelMes]);

  const handleImport = async (): Promise<void> => {
    if (!api) return;
    setImporting(true);
    try {
      const r = await api.importWorkbook();
      if (r) {
        setImportMsg(
          `${fileName(r.filePath)} — ${int(r.inserted)} novos, ${int(r.updated)} atualizados` +
          (r.discarded ? `, ${int(r.discarded)} descartados` : ""),
        );
        setReload((k) => k + 1);
      }
    } catch (e) {
      setImportMsg(e instanceof Error ? `Erro: ${e.message}` : String(e));
    } finally {
      setImporting(false);
    }
  };

  if (!api) {
    return (
      <div className="app-root flex h-dvh flex-col overflow-hidden rounded-[10px] bg-background text-foreground">
        <TitleBar />
        <main className="mx-auto w-full max-w-2xl overflow-y-auto p-8">
          <p className="text-muted-foreground">
            Aponte o app (Electron) para ver o dashboard. A API do preload não está disponível.
          </p>
        </main>
      </div>
    );
  }

  const mesAtivo = mes !== "todos";
  const mesIndex = mesAtivo ? MESES.indexOf(mes as Mes) : -1;
  const metaMes = snap && mesAtivo ? snap.metasPorMes[mesIndex].meta : 0;
  const faturamentoMes = snap && mesAtivo ? snap.faturamentoPorMes[mes as Mes] : 0;
  const metaPct =
    snap && !vendedor && !mesAtivo && snap.metaAnual > 0 ? snap.totalPeriodo / snap.metaAnual : 0;
  const metaMesPct = mesAtivo && metaMes > 0 ? (faturamentoMes ?? 0) / metaMes : 0;
  const restanteAno = snap ? snap.restanteAnoPorMes.dez : 0;
  const restanteMes = mesAtivo ? Math.max(metaMes - (faturamentoMes ?? 0), 0) : 0;

  const totalQtd = useMemo(() => {
    if (!snap) return 0;
    if (mesAtivo) return snap.quantidadePorMes[mes as Mes];
    return MESES.reduce((acc, m) => acc + snap.quantidadePorMes[m], 0);
  }, [snap, mesAtivo, mes]);

  const runRate = useMemo(() => {
    if (!snap || mesAtivo || vendedor || !snap.totalPeriodo || snap.totalPeriodo <= 0) return null;
    const now = new Date();
    const elapsed = now.getFullYear() === ano ? now.getMonth() + 1 : 12;
    if (elapsed <= 0) return null;
    return { projection: (snap.totalPeriodo / elapsed) * 12, elapsed };
  }, [snap, ano, mesAtivo, vendedor]);

  const kgrid = vendedor ? "lg:grid-cols-3" : mesAtivo ? "lg:grid-cols-6" : "lg:grid-cols-7";
  const quantHint = vendedor
    ? mesAtivo
      ? `vendas de ${vendedor} em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : `vendas de ${vendedor} (1 por linha)`
    : mesAtivo
      ? `vendas em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : "vendas no ano (1 por linha)";

  return (
    <div
      className={cn(
        "app-root flex h-dvh flex-col overflow-hidden bg-background text-foreground",
        maximized
          ? "rounded-none border-0 shadow-none"
          : "rounded-[10px] border border-border/60 shadow-2xl",
      )}
    >
      <TitleBar />
      <WindowResizeHandles />

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-y-auto p-6 pt-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              Sulmag Equipamentos Magnéticos
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Metas Comercial</h1>
            <p className="text-sm text-muted-foreground">
              {view === "dashboard" ? "Dashboard de vendas" : "Histórico de vendas"}
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-muted p-0.5">
              {ANOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAno(a)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium",
                    a === ano
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-36 justify-between gap-2 px-3 text-sm font-normal">
                  {mesAtivo ? MES_LABEL[mes as Mes] : "Todos os meses"}
                  <ChevronDownIcon className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onSelect={() => setMes("todos")}
                  className="justify-between"
                >
                  Todos os meses
                  {!mesAtivo ? <CheckIcon className="size-4" /> : null}
                </DropdownMenuItem>
                {MESES.map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onSelect={() => setMes(m)}
                    className="justify-between"
                  >
                    {MES_LABEL[m]}
                    {mes === m ? <CheckIcon className="size-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => void handleImport()} disabled={importing}>
              <FileUpIcon className="size-4" />
              {importing ? "Importando…" : "Importar export do SIGE"}
            </Button>
            <ThemeToggle />
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Abrir Configurações">
                  <SettingsIcon className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Configurações</DialogTitle>
                  <DialogDescription>
                    Ajuste as metas e o layout; o dashboard reflete na hora.
                  </DialogDescription>
                </DialogHeader>
                <ConfigTab ano={ano} reloadKey={reload} onSaved={() => setReload((k) => k + 1)} />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Layout da dashboard</p>
                    <p className="text-xs text-muted-foreground">
                      Arraste os gráficos pela barra de título e redimensione pelo canto; o layout
                      fica salvo neste computador.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetDashboardLayout}>
                    Restaurar padrão
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {importMsg ? <p className="text-xs text-muted-foreground no-print">{importMsg}</p> : null}
        {error ? <p className="text-xs text-destructive no-print">Erro: {error}</p> : null}

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "dashboard" | "historico")}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="w-fit">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="flex flex-col gap-6">
            {!snap ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Carregando… (rode "Importar export do SIGE" para carregar os dados)
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {(vendedor || mesAtivo) && (
                  <div className="no-print flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Filtrando por:</span>
                    {mesAtivo ? (
                      <button
                        type="button"
                        onClick={() => setMes("todos")}
                        className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
                      >
                        Mês: {MES_LABEL[mes as Mes]}
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                    {vendedor ? (
                      <button
                        type="button"
                        onClick={() => setVendedor(null)}
                        className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
                      >
                        Vendedor: {vendedor}
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMes("todos");
                        setVendedor(null);
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}

                <section className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3", kgrid)}>
                  <KpiCard>
                    <KpiCardHeader>
                      <KpiCardTitle>
                        Faturamento{" "}
                        {vendedor
                          ? `${vendedor}${mesAtivo ? ` · ${MES_LABEL[mes as Mes]}` : ""}`
                          : mesAtivo
                            ? `${MES_LABEL[mes as Mes]} ${ano}`
                            : ano}
                      </KpiCardTitle>
                    </KpiCardHeader>
                    <KpiCardContent>
                      <KpiCardValue
                        value={brl0(snap.totalPeriodo)}
                        hint={`status ${STATUS_FATURAMENTO.join(" + ")}`}
                      />
                    </KpiCardContent>
                  </KpiCard>

                  {!vendedor ? (
                    mesAtivo ? (
                      <KpiCard>
                        <KpiCardHeader>
                          <KpiCardTitle>Meta {MES_LABEL[mes as Mes]}</KpiCardTitle>
                        </KpiCardHeader>
                        <KpiCardContent>
                          <KpiCardValue value={brl0(metaMes)} hint="meta do mês (empresa)" />
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
                            hint={
                              snap.metaPersonalizada
                                ? "personalizada — edite em Configurações"
                                : `base ${ano - 1} × ${(snap.fator * 100).toFixed(0)}%`
                            }
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
                          hint={mesAtivo ? "realizado do mês ÷ meta" : "realizado ÷ meta"}
                        />
                      </KpiCardContent>
                    </KpiCard>
                  ) : null}

                  {!vendedor ? (
                    <KpiCard>
                      <KpiCardHeader>
                        <KpiCardTitle>{mesAtivo ? "Restante p/ meta do mês" : "Restante p/ meta"}</KpiCardTitle>
                      </KpiCardHeader>
                      <KpiCardContent>
                        <KpiCardValue
                          value={mesAtivo ? (restanteMes > 0 ? brl0(restanteMes) : "—") : restanteAno > 0 ? brl0(restanteAno) : "—"}
                          hint={mesAtivo ? (restanteMes > 0 ? "no mês" : "meta atingida") : restanteAno > 0 ? "no acumulado de dez" : "meta atingida"}
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
                          value={runRate ? brl0(runRate.projection) : "—"}
                          hint={
                            runRate
                              ? `${brl0(snap.totalPeriodo / runRate.elapsed)}/mês med em ${runRate.elapsed === 12 ? "ano fechado" : `${runRate.elapsed} meses`}`
                              : "sem dados"
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
                        Clique em um vendedor para filtrar todo o dashboard; clique de novo para
                        limpar o filtro.
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

                <p className="no-print text-xs text-muted-foreground">
                  Arraste os gráficos pela barra de título e redimensione pelo canto inferior; o
                  layout fica salvo neste computador.
                </p>

                <DashboardGrid
                  className="no-print"
                  layout={dashboardLayout}
                  cols={12}
                  rowHeight={24}
                  margin={[16, 16]}
                  draggableHandle=".card-drag-handle"
                  draggableCancel="[data-slot='select-trigger'], select"
                  isResizable
                  resizeHandles={["se"]}
                  onLayoutChange={persistLayout}
                >
                  {!mesAtivo ? (
                    <Card key="fat-mensal" className="h-full">
                      <CardHeader className="card-drag-handle cursor-move">
                        <CardTitle>
                          {vendedor ? `Faturamento mensal — ${vendedor}` : "Faturamento mensal × meta"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        <GroupedBars
                          labels={MESES.map((m) => MES_LABEL[m])}
                          series={[
                            {
                              name: "Realizado",
                              kind: "bar",
                              colorClass: "fill-chart-1",
                              values: MESES.map((m) => snap.faturamentoPorMes[m]),
                            },
                            ...(!vendedor
                              ? [
                                  {
                                    name: "Meta",
                                    kind: "marker" as const,
                                    colorClass: "stroke-chart-3",
                                    values: MESES.map((_m, i) => snap.metasPorMes[i].meta),
                                  },
                                ]
                              : []),
                          ]}
                          onBarClick={(i) => setMes(MESES[i])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Clique em uma barra para filtrar o mês.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}

                  {!mesAtivo ? (
                    <Card key="acumulado" className="h-full">
                      <CardHeader className="card-drag-handle cursor-move">
                        <CardTitle>
                          {vendedor ? `Acumulado ${ano} — ${vendedor}` : "Acumulado anual × meta"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AccumulatedLine
                          labels={MESES.map((m) => MES_LABEL[m])}
                          values={MESES.map((m) => snap.acumuladoPorMes[m])}
                          target={vendedor ? undefined : snap.metaAnual}
                        />
                      </CardContent>
                    </Card>
                  ) : null}

                  {!mesAtivo ? (
                    <Card key="fechamento" className="h-full">
                      <CardHeader className="card-drag-handle cursor-move">
                        <CardTitle>Nº de fechamento por mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GroupedBars
                          labels={MESES.map((m) => MES_LABEL[m])}
                          height={240}
                          valueFormat={(v) => int(v)}
                          series={[
                            {
                              name: "Orçamentos",
                              kind: "bar",
                              colorClass: "fill-chart-2",
                              values: MESES.map((m) => snap.numeroFechamento[m].orcamento),
                            },
                            {
                              name: "Pedidos",
                              kind: "bar",
                              colorClass: "fill-chart-3",
                              values: MESES.map((m) => snap.numeroFechamento[m].pedido),
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card key="funil" className="h-full">
                    <CardHeader className="card-drag-handle cursor-move flex-row items-center justify-between gap-2">
                      <CardTitle>Funil de vendas</CardTitle>
                      <Select value={funnelMes ?? "dez"} onValueChange={(v) => setFunnelMes(v as Mes)}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {MES_LABEL[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBars
                        data={funnelItems(MESES.indexOf(funnelMes ?? "jan"), snap)}
                        showValue
                        colorClass="bg-chart-1"
                      />
                    </CardContent>
                  </Card>

                  <Card key="regioes" className="h-full">
                    <CardHeader className="card-drag-handle cursor-move">
                      <CardTitle>Regiões</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <RegionMap regions={regionPoints(snap)} />
                      <HorizontalBars
                        data={snap.porRegiao.map((r) => ({
                          label: r.regiao,
                          value: r.valor,
                          colorClass: REGION_COLORS[r.regiao],
                        }))}
                        format={brl0}
                      />
                    </CardContent>
                  </Card>

                  <Card key="estados" className="h-full">
                    <CardHeader className="card-drag-handle cursor-move">
                      <CardTitle>Estados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBars
                        data={snap.porEstado.slice(0, 8).map((e) => ({
                          label: e.estado,
                          value: e.valor,
                          sub: pct(e.share),
                          colorClass: "bg-chart-2",
                        }))}
                        format={brl0}
                      />
                    </CardContent>
                  </Card>

                  <Card key="ticket" className="h-full">
                    <CardHeader className="card-drag-handle cursor-move">
                      <CardTitle>Ticket médio por produto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        {snap.ticketMedio.map((t) => (
                          <div
                            key={t.produto}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
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

                  <Card key="historico" className="h-full">
                    <CardHeader className="card-drag-handle cursor-move">
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
                          <span className="text-muted-foreground">Participação de {ano}</span>
                          <span className="font-semibold tabular-nums">
                            {pct(snap.participacaoAno)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Base meta {ano}</span>
                          <span className="font-semibold tabular-nums">
                            {brl0(snap.metaAnualBase)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Fator de meta</span>
                          <span className="font-semibold tabular-nums">
                            ×{(snap.fator * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
  );
}