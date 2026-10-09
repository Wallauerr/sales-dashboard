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
