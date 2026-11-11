import type { ReleaseNote } from '../shared/releases'
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
  SellerPhoto,
  SnapshotScope,
  UpdateState,
  UpdateView,
} from '../shared/types'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface Api {
  previewImport: () => Promise<ImportPreview | null>
  commitImport: (
    filePath: string,
    corrections: AddressCorrection[],
  ) => Promise<ImportResult>
  listPendingAddresses: () => Promise<PendingAddress[]>
  saveAddressOverrides: (corrections: AddressCorrection[]) => Promise<number>
  getImports: () => Promise<ImportRecord[]>
  getCodeHistory: (code: string) => Promise<CodeHistory>
  getSnapshot: (year: number, scope?: SnapshotScope) => Promise<KpiSnapshot>
  getGoalConfig: (year: number) => Promise<GoalConfigView>
  setGoalConfig: (year: number, input: GoalSetInput) => Promise<GoalConfigView>
  getPhotos: () => Promise<SellerPhoto[]>
  listSellers: () => Promise<string[]>
  listDisabledSellers: () => Promise<string[]>
  setSellerDisabled: (seller: string, disabled: boolean) => Promise<void>
  listYears: () => Promise<number[]>
  pickPhoto: (seller: string) => Promise<PhotoResult | null>
  removePhoto: (seller: string) => Promise<PhotoResult>
  getAutoStart: () => Promise<AutoStartView>
  setAutoStart: (enabled: boolean) => Promise<AutoStartView>
  openRepo: () => Promise<void>
  listReleases: () => Promise<ReleaseNote[]>
  getUpdateState: () => Promise<UpdateView>
  checkForUpdates: () => Promise<UpdateView>
  downloadUpdate: () => Promise<UpdateView>
  installUpdate: () => Promise<void>
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
  getDbStats: () => Promise<DbStats>
  resetData: () => Promise<DbStats>
  exportBackup: () => Promise<BackupExportResult | null>
  importBackup: () => Promise<BackupMergeResult | null>
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
