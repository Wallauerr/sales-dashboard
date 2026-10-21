import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron'
import { z } from 'zod'
import { goalSetInputSchema, sellerNameSchema } from '../shared/schemas.ts'
import type { SnapshotScope } from '../shared/types.ts'
import {
  AUTOSTART_SUPPORTED,
  isAutoStartEnabled,
  setAutoStartEnabled,
} from './autostart.ts'
import type { SalesDatabase } from './db/database.ts'
import {
  dbStats,
  exportBackup,
  mergeBackup,
  resetImportedData,
} from './db/maintenance.ts'
import { importWorkbook } from './ingest/index.ts'
import { getGoalConfig, getSnapshot, setGoalConfig } from './kpis/index.ts'
import { readChosenPhoto } from './photos/pick.ts'

export function registerIpc(db: SalesDatabase): void {
  ipcMain.handle('ingest:import', async () => {
    const filePath = await pickWorkbookPath()
    if (!filePath) return null
    return importWorkbook(db, filePath)
  })

  ipcMain.handle('ingest:imports', () => {
    return db.listImports()
  })

  ipcMain.handle('ingest:code-history', (_event, code: string) => {
    return db.getCodeHistory(String(code ?? '').trim())
  })

  ipcMain.handle(
    'kpis:get',
    (_event, year: number, scope: SnapshotScope = {}) => {
      return getSnapshot(db, year, scope)
    },
  )

  ipcMain.handle('photos:list', () => db.listSellerPhotos())

  ipcMain.handle('sellers:list', () => db.listSellers())

  ipcMain.handle('sellers:disabled', () => db.listDisabledSellers())

  ipcMain.handle(
    'seller:set-disabled',
    (_event, seller: unknown, disabled: unknown) => {
      db.setSellerDisabled(sellerNameSchema.parse(seller), Boolean(disabled))
    },
  )

  ipcMain.handle('years:list', () => db.listYears())

  ipcMain.handle('photo:pick', async (_event, seller: unknown) => {
    const name = sellerNameSchema.parse(seller)
    const owner = BrowserWindow.getFocusedWindow()
    const { canceled, filePaths } = owner
      ? await dialog.showOpenDialog(owner, {
          title: `Foto de ${name}`,
          properties: ['openFile'],
          filters: [
            {
              name: 'Imagens',
              extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
            },
          ],
        })
      : await showImageDialog(name)
    if (canceled || filePaths.length === 0) return null

    const photo = await readChosenPhoto(filePaths[0])
    db.setSellerPhoto(name, photo.mime, photo.img)
    return { seller: name }
  })

  ipcMain.handle('photo:remove', (_event, seller: unknown) => {
    const name = sellerNameSchema.parse(seller)
    db.removeSellerPhoto(name)
    return { seller: name }
  })

  ipcMain.handle('goals:get', (_event, year: number) => {
    return getGoalConfig(db, Number(year))
  })

  ipcMain.handle('goals:set', (_event, year: number, input: unknown) => {
    setGoalConfig(db, Number(year), goalSetInputSchema.parse(input))
    return getGoalConfig(db, Number(year))
  })

  ipcMain.handle('app:autostart-get', () => {
    return {
      supported: AUTOSTART_SUPPORTED,
      enabled: isAutoStartEnabled(),
    }
  })

  ipcMain.handle('app:autostart-set', (_event, enabled: unknown) => {
    const on = z.boolean().parse(enabled)
    return {
      supported: AUTOSTART_SUPPORTED,
      enabled: on ? setAutoStartEnabled(true) : setAutoStartEnabled(false),
    }
  })

  ipcMain.handle('db:stats', () => dbStats(db))

  ipcMain.handle('db:reset', () => {
    resetImportedData(db)
    return dbStats(db)
  })

  ipcMain.handle('db:export', async () => {
    const options: SaveDialogOptions = {
      title: 'Exportar backup',
      defaultPath: join(defaultBackupFolder(), backupFileName()),
      filters: [{ name: 'Banco do Sulmag', extensions: ['db'] }],
    }
    const owner = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = owner
      ? await dialog.showSaveDialog(owner, options)
      : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return null
    exportBackup(db, filePath)
    return { path: filePath }
  })

  ipcMain.handle('db:import', async () => {
    const options: OpenDialogOptions = {
      title: 'Importar backup',
      properties: ['openFile'],
      filters: [{ name: 'Banco do Sulmag', extensions: ['db'] }],
    }
    const owner = BrowserWindow.getFocusedWindow()
    const { canceled, filePaths } = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options)
    if (canceled || filePaths.length === 0) return null
    try {
      return mergeBackup(db, filePaths[0])
    } catch (err) {
      throw err
    }
  })
}

function backupFileName(): string {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  return `sulmag-backup-${date}.db`
}

function defaultBackupFolder(): string {
  const documents = app.getPath('documents')
  return existsSync(documents) ? documents : app.getPath('home')
}

function showImageDialog(
  seller: string,
): Promise<{ canceled: boolean; filePaths: string[] }> {
  return dialog.showOpenDialog({
    title: `Foto de ${seller}`,
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
    ],
  })
}

async function pickWorkbookPath(): Promise<string | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar dados do SIGE',
    properties: ['openFile'],
    filters: [{ name: 'Planilhas Excel', extensions: ['xlsx'] }],
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
}
