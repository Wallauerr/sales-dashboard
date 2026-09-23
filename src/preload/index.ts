import { contextBridge, ipcRenderer } from "electron";
import type { ImportResult, KpiSnapshot, VendasFilter, VendasPage } from "../shared/types.ts";

const api = {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
  ping: () => ipcRenderer.invoke("ping") as Promise<string>,
  importWorkbook: () => ipcRenderer.invoke("ingest:import") as Promise<ImportResult | null>,
  importFromPath: (filePath: string) => ipcRenderer.invoke("ingest:import-from-path", filePath) as Promise<ImportResult>,
  lastImport: () => ipcRenderer.invoke("ingest:last-import") as Promise<{ path: string; at: string | null } | null>,
  getSnapshot: (ano: number) => ipcRenderer.invoke("kpis:get", ano) as Promise<KpiSnapshot>,
  getVendas: (filters: VendasFilter, limit?: number) => ipcRenderer.invoke("vendas:list", filters, limit) as Promise<VendasPage>,
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;