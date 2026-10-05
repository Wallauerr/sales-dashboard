import { contextBridge, ipcRenderer } from 'electron'
import type {
  AutoStartView,
  CodigoHistory,
  FotoRemovida,
  FotoResultado,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  MetaConfigView,
  MetasSetInput,
  SnapshotFilter,
  VendedorFoto,
} from '../shared/types.ts'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

const api = {
  importWorkbook: () =>
    ipcRenderer.invoke('ingest:import') as Promise<ImportResult | null>,
  getImports: () =>
    ipcRenderer.invoke('ingest:imports') as Promise<ImportRecord[]>,
  getCodigoHistory: (codigo: string) =>
    ipcRenderer.invoke(
      'ingest:codigo-history',
      codigo,
    ) as Promise<CodigoHistory>,
  getSnapshot: (ano: number, filtro?: SnapshotFilter) =>
    ipcRenderer.invoke('kpis:get', ano, filtro) as Promise<KpiSnapshot>,
  getMetaConfig: (ano: number) =>
    ipcRenderer.invoke('metas:get', ano) as Promise<MetaConfigView>,
  setMetaConfig: (ano: number, input: MetasSetInput) =>
    ipcRenderer.invoke('metas:set', ano, input) as Promise<MetaConfigView>,
  getFotos: () => ipcRenderer.invoke('fotos:list') as Promise<VendedorFoto[]>,
  listVendedores: () =>
    ipcRenderer.invoke('vendedores:list') as Promise<string[]>,
  escolherFoto: (vendedor: string) =>
    ipcRenderer.invoke(
      'foto:escolher',
      vendedor,
    ) as Promise<FotoResultado | null>,
  removerFoto: (vendedor: string) =>
    ipcRenderer.invoke('foto:remover', vendedor) as Promise<FotoRemovida>,
  getAutoStart: () =>
    ipcRenderer.invoke('app:autostart-get') as Promise<AutoStartView>,
  setAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke('app:autostart-set', enabled) as Promise<AutoStartView>,
  minimize: () => ipcRenderer.invoke('win:minimize') as Promise<void>,
  toggleMaximize: () =>
    ipcRenderer.invoke('win:toggle-maximize') as Promise<void>,
  closeWindow: () => ipcRenderer.invoke('win:close') as Promise<void>,
  getBounds: () =>
    ipcRenderer.invoke('win:get-bounds') as Promise<WindowBounds>,
  setBounds: (bounds: WindowBounds) =>
    ipcRenderer.send('win:set-bounds', bounds),
  onMaximized: (callback: (maximized: boolean) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, value: boolean): void =>
      callback(value)
    ipcRenderer.on('win:maximized', listener)
    return () => {
      ipcRenderer.off('win:maximized', listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
