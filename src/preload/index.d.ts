import type { ImportResult, KpiSnapshot, VendasFilter, VendasPage } from "../shared/types";

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Api {
  versions: {
    node: () => string;
    chrome: () => string;
    electron: () => string;
  };
  ping: () => Promise<string>;
  importWorkbook: () => Promise<ImportResult | null>;
  importFromPath: (filePath: string) => Promise<ImportResult>;
  lastImport: () => Promise<{ path: string; at: string | null } | null>;
  getSnapshot: (ano: number) => Promise<KpiSnapshot>;
  getVendas: (filters: VendasFilter, limit?: number) => Promise<VendasPage>;
  exportPdf: (ano: number) => Promise<string | null>;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getBounds: () => Promise<WindowBounds>;
  setBounds: (bounds: WindowBounds) => void;
  onMaximized: (callback: (maximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    api: Api;
  }
}

export {};