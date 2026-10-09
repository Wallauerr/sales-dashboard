import { contextBridge, ipcRenderer } from 'electron'
import type {
  AutoStartView,
  CodeHistory,
  GoalConfigView,
  GoalSetInput,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  PhotoResult,
  SellerPhoto,
  SnapshotScope,
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
  getCodeHistory: (code: string) =>
    ipcRenderer.invoke('ingest:code-history', code) as Promise<CodeHistory>,
  getSnapshot: (year: number, scope?: SnapshotScope) =>
    ipcRenderer.invoke('kpis:get', year, scope) as Promise<KpiSnapshot>,
  getGoalConfig: (year: number) =>
    ipcRenderer.invoke('goals:get', year) as Promise<GoalConfigView>,
  setGoalConfig: (year: number, input: GoalSetInput) =>
    ipcRenderer.invoke('goals:set', year, input) as Promise<GoalConfigView>,
  getPhotos: () => ipcRenderer.invoke('photos:list') as Promise<SellerPhoto[]>,
  listSellers: () => ipcRenderer.invoke('sellers:list') as Promise<string[]>,
  listDisabledSellers: () =>
    ipcRenderer.invoke('sellers:disabled') as Promise<string[]>,
  setSellerDisabled: (seller: string, disabled: boolean) =>
    ipcRenderer.invoke(
      'seller:set-disabled',
      seller,
      disabled,
    ) as Promise<void>,
  listYears: () => ipcRenderer.invoke('years:list') as Promise<number[]>,
  pickPhoto: (seller: string) =>
    ipcRenderer.invoke('photo:pick', seller) as Promise<PhotoResult | null>,
  removePhoto: (seller: string) =>
    ipcRenderer.invoke('photo:remove', seller) as Promise<PhotoResult>,
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
