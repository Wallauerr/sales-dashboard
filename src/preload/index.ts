import { contextBridge, ipcRenderer } from "electron";
import type {
  CodigoHistory,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  VendasFilter,
  VendasPage,
} from "../shared/types.ts";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const api = {
  importWorkbook: () => ipcRenderer.invoke("ingest:import") as Promise<ImportResult | null>,
  importFromPath: (filePath: string) => ipcRenderer.invoke("ingest:import-from-path", filePath) as Promise<ImportResult>,
  lastImport: () => ipcRenderer.invoke("ingest:last-import") as Promise<{ path: string; at: string | null } | null>,
  getImports: () => ipcRenderer.invoke("ingest:imports") as Promise<ImportRecord[]>,
  getCodigoHistory: (codigo: string) => ipcRenderer.invoke("ingest:codigo-history", codigo) as Promise<CodigoHistory>,
  getSnapshot: (ano: number) => ipcRenderer.invoke("kpis:get", ano) as Promise<KpiSnapshot>,
  getVendas: (filters: VendasFilter, limit?: number) => ipcRenderer.invoke("vendas:list", filters, limit) as Promise<VendasPage>,
  exportPdf: (ano: number) => ipcRenderer.invoke("app:export-pdf", ano) as Promise<string | null>,
  minimize: () => ipcRenderer.invoke("win:minimize") as Promise<void>,
  toggleMaximize: () => ipcRenderer.invoke("win:toggle-maximize") as Promise<void>,
  closeWindow: () => ipcRenderer.invoke("win:close") as Promise<void>,
  getBounds: () => ipcRenderer.invoke("win:get-bounds") as Promise<WindowBounds>,
  setBounds: (bounds: WindowBounds) => ipcRenderer.send("win:set-bounds", bounds),
  onMaximized: (callback: (maximized: boolean) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, value: boolean): void => callback(value);
    ipcRenderer.on("win:maximized", listener);
    return () => {
      ipcRenderer.off("win:maximized", listener);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;