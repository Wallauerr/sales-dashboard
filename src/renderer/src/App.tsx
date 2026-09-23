import { useCallback, useEffect, useMemo, useState } from "react";

import type { KpiSnapshot, Mes } from "../../shared/types";
import { MESES, STATUS_FATURAMENTO } from "../../shared/types";
import AccumulatedLine from "@/components/charts/AccumulatedLine";
import GroupedBars from "@/components/charts/GroupedBars";
import HorizontalBars from "@/components/charts/HorizontalBars";
import type { HBarDatum } from "@/components/charts/HorizontalBars";
import RegionMap from "@/components/charts/RegionMap";
import type { RegionPoint } from "@/components/charts/RegionMap";
import VendasTable from "@/components/detail/VendasTable";
import { KpiCard, KpiCardContent, KpiCardHeader, KpiCardTitle, KpiCardValue } from "@/components/kpi/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { brl, brl0, brlCompact, brlHumanDate, int, pct } from "@/lib/format";

const ANOS = [2024, 2025, 2026];
const MES_LABEL: Record<Mes, string> = {
  jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr", mai: "Mai", jun: "Jun",
  jul: "Jul", ago: "Ago", set: "Set", out: "Out", nov: "Nov", dez: "Dez",
};

function funnelItems(mes: number, snap: KpiSnapshot): HBarDatum[] {
  const f = snap.funilPorMes[mes];
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
  const [snap, setSnap] = useState<KpiSnapshot | null>(null);
  const [funnelMes, setFunnelMes] = useState<Mes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [lastImport, setLastImport] = useState<{ path: string; at: string | null } | null>(null);
  const [detail, setDetail] = useState<{ mes?: Mes; vendedor?: string } | null>(null);

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
  }, [ano, api, reload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (snap && funnelMes === null) {
      const last = MESES.findLast((_m, i) => snap.funilPorMes[i].total > 0);
      setFunnelMes(last ?? "dez");
    }
  }, [snap, funnelMes]);

  const refreshLastImport = useCallback(async () => {
    if (!api) return;
    try {
      setLastImport(await api.lastImport());
    } catch {
      setLastImport(null);
    }
  }, [api]);

  useEffect(() => {
    void refreshLastImport();
  }, [refreshLastImport]);

  const handleImport = async (viaDialog: boolean): Promise<void> => {
    if (!api) return;
    setImporting(true);
    try {
      const r = viaDialog ? await api.importWorkbook() : await api.importFromPath(lastImport?.path ?? "");
      if (r) {
        setImportMsg(
          `${r.filePath.split(/[\\/]/).pop()} — ${int(r.inserted)} linhas importadas` +
            (r.updated ? `, ${int(r.updated)} atualizadas` : "") +
            (r.discarded ? `, ${int(r.discarded)} descartadas` : ""),
        );
        await refreshLastImport();
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
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-muted-foreground">Aponte o app (Electron) para ver o dashboard. A API do preload não está disponível.</p>
      </main>
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
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas Comercial</h1>
          <p className="text-sm text-muted-foreground">Dashbboard de vendas — substituto do workbook SIGE Cloud</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button onClick={() => void handleImport(true)} disabled={importing}>
            {importing ? "Importando…" : "Importar export do SIGE"}
          </Button>
          {lastImport ? (
            <Button variant="outline" onClick={() => void handleImport(false)} disabled={importing}>
              Reimportar {lastImport.path.split(/[\\/]/).pop()}
            </Button>
          ) : null}
        </div>
      </header>

      {importMsg ? <p className="text-xs text-muted-foreground">{importMsg}</p> : null}
      {error ? <p className="text-xs text-destructive">Erro: {error}</p> : null}
      {lastImport && lastImport.at ? (
        <p className="text-xs text-muted-foreground">última atualização: {brlHumanDate(lastImport.at)}</p>
      ) : null}

      {!snap ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Carregando… (rode "Importar export do SIGE" para carregar os dados)
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {detail ? (
            <VendasTable ano={ano} initial={detail} onClose={() => setDetail(null)} />
          ) : null}

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
                <select
                  value={funnelMes ?? "dez"}
                  onChange={(e) => setFunnelMes(e.target.value as Mes)}
                  className="rounded border bg-background px-2 py-1 text-xs"
                >
                  {MESES.map((m) => (
                    <option key={m} value={m}>
                      {MES_LABEL[m]}
                    </option>
                  ))}
                </select>
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

      <footer className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Electron {api.versions.electron()} · Node {api.versions.node()} · Chrome {api.versions.chrome()}
        </span>
        <span>Fonte: Metas Comercial.xlsx (aba Base)</span>
      </footer>
    </main>
  );
}