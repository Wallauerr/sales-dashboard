import type { ImportResult, KpiSnapshot, VendasFilter, VendasPage } from "../shared/types";

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
}

declare global {
  interface Window {
    api: Api;
  }
}

export {};