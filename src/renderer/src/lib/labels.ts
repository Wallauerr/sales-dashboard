import type { Mes } from "../../../shared/types";

export const MES_LABEL: Record<Mes, string> = {
  jan: "Jan", fev: "Fev", mar: "Mar", abr: "Abr", mai: "Mai", jun: "Jun",
  jul: "Jul", ago: "Ago", set: "Set", out: "Out", nov: "Nov", dez: "Dez",
};

export function statusLabel(status: string): string {
  return status === "Pedido Nao Faturado" ? "Pedido Não Faturado" : status;
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}