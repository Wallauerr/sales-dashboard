import type {
  AutoStartView,
  CodigoHistory,
  FotoResultado,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  MetaConfigView,
  MetasSetInput,
  SnapshotFilter,
  VendedorFoto,
} from '../shared/types'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface Api {
  importWorkbook: () => Promise<ImportResult | null>
  getImports: () => Promise<ImportRecord[]>
  getCodigoHistory: (codigo: string) => Promise<CodigoHistory>
  getSnapshot: (ano: number, filtro?: SnapshotFilter) => Promise<KpiSnapshot>
  getMetaConfig: (ano: number) => Promise<MetaConfigView>
  setMetaConfig: (ano: number, input: MetasSetInput) => Promise<MetaConfigView>
  getFotos: () => Promise<VendedorFoto[]>
  listVendedores: () => Promise<string[]>
  listVendedoresDesativados: () => Promise<string[]>
  setVendedorDesativado: (
    vendedor: string,
    desativado: boolean,
  ) => Promise<void>
  listAnos: () => Promise<number[]>
  escolherFoto: (vendedor: string) => Promise<FotoResultado | null>
  removerFoto: (vendedor: string) => Promise<FotoResultado>
  getAutoStart: () => Promise<AutoStartView>
  setAutoStart: (enabled: boolean) => Promise<AutoStartView>
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<void>
  closeWindow: () => Promise<void>
  getBounds: () => Promise<WindowBounds>
  setBounds: (bounds: WindowBounds) => void
  onMaximized: (callback: (maximized: boolean) => void) => () => void
}

declare global {
  interface Window {
    api: Api
  }
}
