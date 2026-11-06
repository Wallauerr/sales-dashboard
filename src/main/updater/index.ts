import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState, UpdateView } from '../../shared/types.ts'
import type { AppEnv } from '../env.ts'
import { idleUpdateState, shouldAutoUpdate } from './rules.ts'

let enabled = false
let state: UpdateState = idleUpdateState()

function emit(next: UpdateState): void {
  state = next
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('updates:state', next)
  }
}

function fail(error: unknown): void {
  emit({
    status: 'error',
    version: null,
    percent: null,
    message: error instanceof Error ? error.message : String(error),
  })
}

export function updateView(): UpdateView {
  return {
    supported: enabled,
    currentVersion: app.getVersion(),
    state,
  }
}

export function setupAutoUpdater(env: AppEnv, isPackaged: boolean): void {
  enabled = shouldAutoUpdate(env, isPackaged)
  if (!enabled) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    emit({ status: 'checking', version: null, percent: null, message: null })
  })
  autoUpdater.on('update-available', info => {
    emit({
      status: 'available',
      version: info.version,
      percent: null,
      message: null,
    })
  })
  autoUpdater.on('update-not-available', () => {
    emit(idleUpdateState())
  })
  autoUpdater.on('download-progress', progress => {
    emit({
      status: 'downloading',
      version: state.version,
      percent: Math.round(progress.percent),
      message: null,
    })
  })
  autoUpdater.on('update-downloaded', info => {
    emit({
      status: 'downloaded',
      version: info.version,
      percent: null,
      message: null,
    })
  })

  void checkForUpdates(true)
}

export async function checkForUpdates(quiet = false): Promise<UpdateView> {
  if (!enabled) return updateView()
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    if (!quiet) fail(error)
  }
  return updateView()
}

export async function downloadUpdate(): Promise<UpdateView> {
  if (!enabled) return updateView()
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    fail(error)
  }
  return updateView()
}

export function installUpdate(): void {
  if (!enabled || state.status !== 'downloaded') return
  autoUpdater.quitAndInstall()
}
