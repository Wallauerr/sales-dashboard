import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileDownIcon } from "lucide-react";

import type { Mes, Sale, VendasFilter } from "../../../../shared/types";
import { MESES } from "../../../../shared/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl0 } from "@/lib/format";

const STATUS_OPCOES = [
  { value: "__all__", label: "Todos status" },
  { value: "__fat__", label: "Faturamento (Pedido + Faturado)" },
  { value: "Orçamento", label: "Orçamento" },
  { value: "Pedido", label: "Pedido" },
  { value: "Pedido Aprovado Sem Faturamento", label: "Pedido Aprovado S/F" },
  { value: "Pedido Cancelado", label: "Pedido Cancelado" },
  { value: "Pedido Faturado", label: "Pedido Faturado" },
  { value: "Pedido Nao Faturado", label: "Pedido Não Faturado" },
];

const LIMIT = 200;

interface Props {
  ano: number;
  initial?: { mes?: Mes | null; vendedor?: string | null; regiao?: string | null };
}

function parseData(d: string | null): string {
  if (!d) return "";
  const parts = d.split(/[\/\-]/);
  if (parts.length !== 3) return d;
  return /^\d{4}$/.test(parts[0]) ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
}

function statusLabel(status: string): string {
  return status === "Pedido Nao Faturado" ? "Pedido Não Faturado" : status;
}

export default function VendasTable({ ano, initial }: Props) {
  const [mes, setMes] = useState<string>(initial?.mes ?? "__all__");
  const [status, setStatus] = useState<string>("__all__");
  const [vendedor, setVendedor] = useState<string>(initial?.vendedor ?? "");
  const [regiao, setRegiao] = useState<string>(initial?.regiao ?? "");
  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters = useMemo<VendasFilter>(
    () => ({
      ano,
      mes: (mes === "__all__" ? undefined : mes) as Mes | undefined,
      statusSistema: status === "__all__" ? undefined : status,
      vendedor: vendedor.trim() || undefined,
      regiao: regiao || undefined,
    }),
    [ano, mes, status, vendedor, regiao],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await window.api.getVendas(filters, LIMIT);
      setRows(page.rows);
      setTotal(page.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const totalValor = useMemo(() => rows.reduce((acc, r) => acc + r.valorTotal, 0), [rows]);

  const exportCsv = async (): Promise<void> => {
    try {
      const all = await window.api.getVendas(filters, 100000);
      const header = ["Codigo", "Data", "Mes", "Ano", "Status Sistema", "Vendedor", "Categoria", "Cliente", "Cidade", "UF", "Regiao", "Valor Total"];
      const esc = (v: string): string => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = all.rows.map((r) =>
        [
          esc(r.codigo),
          esc(parseData(r.data)),
          esc(r.mes ?? ""),
          r.ano ?? "",
          esc(statusLabel(r.statusSistema)),
          esc(r.vendedor),
          esc(r.categoria),
          esc(r.cliente),
          esc(r.cidade),
          esc(r.estado),
          esc(r.regiao),
          (r.valorTotal || 0).toFixed(2).replace(".", ","),
        ].join(";"),
      );
      const csv = [header.map((h) => esc(h)).join(";"), ...lines].join("\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendas-${ano}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold font-heading">Linhas — {ano}</p>
          <p className="text-xs text-muted-foreground">
            {total} linhas{rows.length < total ? ` · exibindo as ${LIMIT} maiores` : ""} · valor exibido{" "}
            {brl0(totalValor)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void exportCsv()} disabled={loading || rows.length === 0} className="no-print">
          <FileDownIcon className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue placeholder="Todos meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos meses</SelectItem>
            {MESES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52" size="sm">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPCOES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          value={vendedor}
          onChange={(e) => setVendedor(e.target.value)}
          placeholder="Filtrar vendedor…"
          className="h-8 w-56 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
        />
        <input
          value={regiao}
          onChange={(e) => setRegiao(e.target.value)}
          placeholder="Filtrar região…"
          className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
        />
      </div>

      {error ? <p className="text-xs text-destructive">Erro: {error}</p> : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Vendedor</th>
              <th className="px-3 py-2 font-medium">UF</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma linha para estes filtros.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.codigo}-${r.data}-${r.valorTotal}`} className="border-t align-top hover:bg-muted/40">
                  <td className="px-3 py-1.5 tabular-nums">{r.codigo}</td>
                  <td className="px-3 py-1.5">{parseData(r.data)}</td>
                  <td className="max-w-56 truncate px-3 py-1.5" title={r.cliente}>
                    {r.cliente}
                  </td>
                  <td className="px-3 py-1.5">{r.vendedor}</td>
                  <td className="px-3 py-1.5">{r.estado}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px]",
                        r.statusSistema === "Pedido Faturado" ? "bg-chart-5/20 text-chart-5" : "bg-muted",
                      )}
                    >
                      {statusLabel(r.statusSistema)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl0(r.valorTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length < total ? (
        <p className="text-xs text-muted-foreground">
          Liste apenas as {LIMIT} maiores em valor. Filtre ou exporte o CSV para ver tudo.
        </p>
      ) : null}
    </div>
  );
}