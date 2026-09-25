import type {
  CodigoHistory,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  VendasFilter,
  VendasPage,
} from "../shared/types";

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Api {
  importWorkbook: () => Promise<ImportResult | null>;
  getImports: () => Promise<ImportRecord[]>;
  getCodigoHistory: (codigo: string) => Promise<CodigoHistory>;
  getSnapshot: (ano: number) => Promise<KpiSnapshot>;
  getVendas: (filters: VendasFilter, limit?: number) => Promise<VendasPage>;
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