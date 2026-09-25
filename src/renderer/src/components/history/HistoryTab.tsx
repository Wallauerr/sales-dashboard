import { useCallback, useEffect, useState } from "react";
import { InboxIcon, SearchIcon, XIcon } from "lucide-react";

import type { CodigoHistory, ImportRecord, Mes } from "../../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { brl0, brlHumanDate, int } from "@/lib/format";

const MES_LABEL: Record<Mes, string> = {
  jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr", mai: "Mai", jun: "Jun",
  jul: "Jul", ago: "Ago", set: "Set", out: "Out", nov: "Nov", dez: "Dez",
};

function statusLabel(status: string): string {
  return status === "Pedido Nao Faturado" ? "Pedido Não Faturado" : status;
}

function fileBase(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "Pedido Faturado" ? "secondary" : "outline"}
      className={cn(
        "font-normal",
        status === "Pedido Faturado" && "bg-chart-5/20 text-chart-5",
        status === "Pedido" && "bg-chart-2/20 text-chart-2",
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export default function HistoryTab({ reloadKey }: { reloadKey: number }) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CodigoHistory | null>(null);
  const [searched, setSearched] = useState<string | null>(null);

  const loadImports = useCallback(async () => {
    if (!window.api) return;
    setLoadingImports(true);
    setErr(null);
    try {
      setImports(await window.api.getImports());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingImports(false);
    }
  }, []);

  useEffect(() => {
    void loadImports();
  }, [loadImports, reloadKey]);

  const doSearch = async (value: string): Promise<void> => {
    const c = value.trim();
    if (!c) return;
    setSearching(true);
    try {
      const h = await window.api.getCodigoHistory(c);
      setResult(h);
      setSearched(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = (): void => {
    setCodigo("");
    setResult(null);
    setSearched(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Importações realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? <p className="mb-3 text-xs text-destructive">Erro: {err}</p> : null}
          {loadingImports ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <InboxIcon className="size-8 opacity-40" />
              <p>Nenhum import registrado ainda.</p>
              <p className="text-xs">Use o botão "Importar export do SIGE" para alimentar o app.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table className="text-xs">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Data / hora</TableHead>
                    <TableHead className="text-xs">Arquivo</TableHead>
                    <TableHead className="text-xs text-right">Linhas</TableHead>
                    <TableHead className="text-xs text-right">Novos</TableHead>
                    <TableHead className="text-xs text-right">Atualizados</TableHead>
                    <TableHead className="text-xs text-right">Descartados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="tabular-nums">{brlHumanDate(i.importedAt)}</TableCell>
                      <TableCell className="max-w-72 truncate" title={i.filePath}>
                        {fileBase(i.filePath)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{int(i.totalRows)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int(i.inserted)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int(i.updated)}</TableCell>
                      <TableCell className="text-right tabular-nums">{int(i.discarded)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buscar pedido por código</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void doSearch(codigo);
            }}
          >
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: 38149 (número do orçamento/pedido no SIGE)"
              className="w-72"
            />
            <Button type="submit" disabled={searching || codigo.trim().length === 0}>
              <SearchIcon className="size-4" />
              {searching ? "Buscando…" : "Buscar"}
            </Button>
            {searched ? (
              <Button type="button" variant="ghost" onClick={clearSearch}>
                <XIcon className="size-4" />
                Limpar
              </Button>
            ) : null}
          </form>

          {result ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Resultado para o código <span className="font-semibold text-foreground tabular-nums">{searched}</span>
              </p>
              {result.venda ? (
                <div className="flex flex-col gap-4 rounded-md border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-heading text-lg font-semibold tabular-nums">{result.venda.codigo}</span>
                    <StatusBadge status={result.venda.statusSistema} />
                    {result.venda.mes && result.venda.ano ? (
                      <span className="text-xs text-muted-foreground">
                        conta em {MES_LABEL[result.venda.mes]}/{result.venda.ano}
                      </span>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Cliente</dt>
                      <dd className="max-w-64 truncate font-medium" title={result.venda.cliente}>
                        {result.venda.cliente}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Vendedor</dt>
                      <dd className="font-medium">{result.venda.vendedor}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Valor</dt>
                      <dd className="font-semibold tabular-nums">{brl0(result.venda.valorTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Data</dt>
                      <dd className="tabular-nums">{brlHumanDate(result.venda.data ?? "")}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-2 border-t pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Evolução no app (por import)
                    </p>
                    {result.events.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Pedido já importado nesta versão? O histórico registrado só vale para imports feitos daqui pra frente.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {result.events.map((ev, i) => (
                          <li key={`${ev.importedAt}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {brlHumanDate(ev.importedAt)}
                            </span>
                            <Badge variant={ev.op === "inserted" ? "secondary" : "outline"} className="font-normal">
                              {ev.op === "inserted" ? "Novo" : "Atualizado"}
                            </Badge>
                            <StatusBadge status={ev.statusSistema} />
                            <span className="tabular-nums">{brl0(ev.valorTotal)}</span>
                            {ev.mes && ev.ano ? (
                              <span className="text-xs text-muted-foreground">
                                {MES_LABEL[ev.mes]}/{ev.ano}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Código <span className="font-semibold tabular-nums">{searched}</span> não encontrado no banco. Confira se o
                  export que o contém foi importado.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}