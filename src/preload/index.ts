import { contextBridge, ipcRenderer } from 'electron'
import type { ReleaseNote } from '../shared/releases.ts'
import type {
  AddressCorrection,
  AutoStartView,
  BackupExportResult,
  BackupMergeResult,
  CodeHistory,
  DbStats,
  GoalConfigView,
  GoalSetInput,
  ImportPreview,
  ImportRecord,
  ImportResult,
  KpiSnapshot,
  PendingAddress,
  PhotoResult,
  SaleLookup,
  SellerPhoto,
  SnapshotScope,
  UpdateState,
  UpdateView,
} from '../shared/types.ts'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

const api = {
  previewImport: () =>
    ipcRenderer.invoke('ingest:preview') as Promise<ImportPreview | null>,
  commitImport: (filePath: string, corrections: AddressCorrection[]) =>
    ipcRenderer.invoke(
      'ingest:commit',
      filePath,
      corrections,
    ) as Promise<ImportResult>,
  listPendingAddresses: () =>
    ipcRenderer.invoke('addresses:pending') as Promise<PendingAddress[]>,
  saveAddressOverrides: (corrections: AddressCorrection[]) =>
    ipcRenderer.invoke('addresses:save', corrections) as Promise<number>,
  clearAddressOverride: (code: string) =>
    ipcRenderer.invoke('addresses:clear', code) as Promise<boolean>,
  findSale: (code: string) =>
    ipcRenderer.invoke('sales:find', code) as Promise<SaleLookup | null>,
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
  openRepo: () => ipcRenderer.invoke('app:open-repo') as Promise<void>,
  listReleases: () =>
    ipcRenderer.invoke('releases:list') as Promise<ReleaseNote[]>,
  getUpdateState: () =>
    ipcRenderer.invoke('updates:get') as Promise<UpdateView>,
  checkForUpdates: () =>
    ipcRenderer.invoke('updates:check') as Promise<UpdateView>,
  downloadUpdate: () =>
    ipcRenderer.invoke('updates:download') as Promise<UpdateView>,
  installUpdate: () => ipcRenderer.invoke('updates:install') as Promise<void>,
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, value: UpdateState) =>
      callback(value)
    ipcRenderer.on('updates:state', listener)
    return () => {
      ipcRenderer.off('updates:state', listener)
    }
  },
  getDbStats: () => ipcRenderer.invoke('db:stats') as Promise<DbStats>,
  resetData: () => ipcRenderer.invoke('db:reset') as Promise<DbStats>,
  exportBackup: () =>
    ipcRenderer.invoke('db:export') as Promise<BackupExportResult | null>,
  importBackup: () =>
    ipcRenderer.invoke('db:import') as Promise<BackupMergeResult | null>,
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
