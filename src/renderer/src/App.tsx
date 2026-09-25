import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUpIcon } from "lucide-react";

import type { KpiSnapshot, Mes } from "../../shared/types";
import { MESES, STATUS_FATURAMENTO } from "../../shared/types";
import AccumulatedLine from "@/components/charts/AccumulatedLine";
import GroupedBars from "@/components/charts/GroupedBars";
import HorizontalBars from "@/components/charts/HorizontalBars";
import type { HBarDatum } from "@/components/charts/HorizontalBars";
import RegionMap from "@/components/charts/RegionMap";
import type { RegionPoint } from "@/components/charts/RegionMap";
import VendasTable from "@/components/detail/VendasTable";
import HistoryTab from "@/components/history/HistoryTab";
import { KpiCard, KpiCardContent, KpiCardHeader, KpiCardTitle, KpiCardValue } from "@/components/kpi/KpiCard";
import ThemeToggle from "@/components/ThemeToggle";
import TitleBar from "@/components/TitleBar";
import WindowResizeHandles from "@/components/WindowResizeHandles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { brl, brl0, brlCompact, int, pct } from "@/lib/format";
import { MES_LABEL, fileName } from "@/lib/labels";
import { useWindowMaximized } from "@/lib/useWindowMaximized";

const ANOS = [2024, 2025, 2026];

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
  const [view, setView] = useState<"dashboard" | "historico">("dashboard");
  const maximized = useWindowMaximized();
  const [snap, setSnap] = useState<KpiSnapshot | null>(null);
  const [funnelMes, setFunnelMes] = useState<Mes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<{ mes?: Mes; vendedor?: string; regiao?: string } | null>(null);

  const api = window.api;

  const load = useCallback(async () => {
    if (!api) return;
    setError(null);
    try {
      const s = await api.getSnapshot(ano);
      setSnap(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ano, api]);

  useEffect(() => {
    void load();
  }, [load, reload]);

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

  const totalQtd = useMemo(
    () => (snap ? MESES.reduce((acc, m) => acc + snap.quantidadePorMes[m], 0) : 0),
    [snap],
  );

  if (!api) {
    return (
      <div className="app-root flex h-dvh flex-col overflow-hidden rounded-[10px] bg-background text-foreground">
        <TitleBar />
        <main className="mx-auto w-full max-w-2xl overflow-y-auto p-8">
          <p className="text-muted-foreground">Aponte o app (Electron) para ver o dashboard. A API do preload não está disponível.</p>
        </main>
      </div>
    );
  }

  const metaPct = snap && snap.metaAnual > 0 ? snap.totalPeriodo / snap.metaAnual : 0;
  const restanteAno = snap ? snap.restanteAnoPorMes.dez : 0;

  const runRate = useMemo(() => {
    if (!snap || !snap.totalPeriodo || snap.totalPeriodo <= 0) return null;
    const now = new Date();
    const elapsed = now.getFullYear() === ano ? now.getMonth() + 1 : 12;
    if (elapsed <= 0) return null;
    return { projection: (snap.totalPeriodo / elapsed) * 12, elapsed };
  }, [snap, ano]);

  return (
    <div
      className={cn(
        "app-root flex h-dvh flex-col overflow-hidden bg-background text-foreground",
        maximized ? "rounded-none border-0 shadow-none" : "rounded-[10px] border border-border/60 shadow-2xl",
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
            <p className="text-sm text-muted-foreground">Dashboard de vendas — substituto do workbook SIGE Cloud</p>
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
                    a === ano ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <Button onClick={() => void handleImport()} disabled={importing}>
              <FileUpIcon className="size-4" />
              {importing ? "Importando…" : "Importar export do SIGE"}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {importMsg ? <p className="text-xs text-muted-foreground no-print">{importMsg}</p> : null}
        {error ? <p className="text-xs text-destructive no-print">Erro: {error}</p> : null}

        <Tabs value={view} onValueChange={(v) => setView(v as "dashboard" | "historico")} className="flex min-h-0 flex-1 flex-col gap-4">
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
            <Dialog
              open={detail !== null}
              onOpenChange={(open) => {
                if (!open) setDetail(null);
              }}
            >
              <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
                  <DialogTitle>Linhas de venda — {ano}</DialogTitle>
                  <DialogDescription>Detalhamento da venda por mês, vendedor ou região.</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto p-6 pt-4">
                  {detail ? <VendasTable ano={ano} initial={detail} /> : null}
                </div>
              </DialogContent>
            </Dialog>

            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>Faturamento {ano}</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue value={brl0(snap.totalPeriodo)} hint={`status ${STATUS_FATURAMENTO.join(" + ")}`} />
                </KpiCardContent>
              </KpiCard>
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>Meta anual</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue value={brl0(snap.metaAnual)} hint={`base ${ano - 1} × ${(snap.fator * 100).toFixed(0)}%`} />
                </KpiCardContent>
              </KpiCard>
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>% da meta</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue value={pct(metaPct)} hint="realizado ÷ meta" />
                </KpiCardContent>
              </KpiCard>
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>Restante p/ meta</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue
                    value={restanteAno > 0 ? brl0(restanteAno) : "—"}
                    hint={restanteAno > 0 ? "no acumulado de dez" : "meta atingida"}
                  />
                </KpiCardContent>
              </KpiCard>
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>Quantidade</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue value={int(totalQtd)} hint="vendas no ano (1 por linha)" />
                </KpiCardContent>
              </KpiCard>
              <KpiCard>
                <KpiCardHeader>
                  <KpiCardTitle>Participação</KpiCardTitle>
                </KpiCardHeader>
                <KpiCardContent>
                  <KpiCardValue value={pct(snap.participacaoAno)} hint={`de ${brlCompact(snap.totalHistorico)}`} />
                </KpiCardContent>
              </KpiCard>
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
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Faturamento mensal × meta</CardTitle>
              </CardHeader>
              <CardContent>
                <GroupedBars
                  labels={MESES.map((m) => MES_LABEL[m])}
                  series={[
                    { name: "Realizado", kind: "bar", colorClass: "fill-chart-1", values: MESES.map((m) => snap.faturamentoPorMes[m]) },
                    { name: "Meta", kind: "marker", colorClass: "stroke-chart-3", values: MESES.map((_m, i) => snap.metasPorMes[i].meta) },
                  ]}
                  onBarClick={(i) => setDetail({ mes: MESES[i] })}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Acumulado anual × meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <AccumulatedLine
                    labels={MESES.map((m) => MES_LABEL[m])}
                    values={MESES.map((m) => snap.acumuladoPorMes[m])}
                    target={snap.metaAnual}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Nº de fechamento por mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <GroupedBars
                    labels={MESES.map((m) => MES_LABEL[m])}
                    height={260}
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
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
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
                  <HorizontalBars data={funnelItems(MESES.indexOf(funnelMes ?? "jan"), snap)} showValue colorClass="bg-chart-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vendedores — faturamento {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBars
                    data={snap.porVendedor.map((v) => ({ label: v.vendedor, value: v.valor, sub: pct(v.share), colorClass: "bg-chart-5" }))}
                    format={brl0}
                    onSelect={(d) => setDetail({ vendedor: d.label })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regiões</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <RegionMap regions={regionPoints(snap)} />
                  <HorizontalBars
                    data={snap.porRegiao.map((r) => ({ label: r.regiao, value: r.valor, colorClass: REGION_COLORS[r.regiao] }))}
                    format={brl0}
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
                    data={snap.porEstado.slice(0, 8).map((e) => ({ label: e.estado, value: e.valor, sub: pct(e.share), colorClass: "bg-chart-2" }))}
                    format={brl0}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket médio por produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {snap.ticketMedio.map((t) => (
                      <div key={t.produto} className="flex items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-medium">{t.produto}</p>
                          <p className="text-xs text-muted-foreground">
                            {int(t.volume)} vendas · {brl0(t.valor)}
                          </p>
                        </div>
                        <span className="text-lg font-semibold tabular-nums">{brl(t.ticket)}</span>
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
                      <span className="text-muted-foreground">Faturamento total (todos os anos)</span>
                      <span className="font-semibold tabular-nums">{brl0(snap.totalHistorico)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Participação de {ano}</span>
                      <span className="font-semibold tabular-nums">{pct(snap.participacaoAno)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Base meta {ano}</span>
                      <span className="font-semibold tabular-nums">{brl0(snap.metaAnualBase)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fator de meta</span>
                      <span className="font-semibold tabular-nums">×{(snap.fator * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            )}
          </TabsContent>
          <TabsContent value="historico">
            <HistoryTab reloadKey={reload} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}