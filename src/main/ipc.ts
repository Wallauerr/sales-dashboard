import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { metasSetInputSchema, vendedorSchema } from '../shared/schemas.ts'
import type { SnapshotFilter } from '../shared/types.ts'
import {
  AUTOSTART_SUPPORTED,
  isAutoStartEnabled,
  setAutoStartEnabled,
} from './autostart.ts'
import type { SalesDatabase } from './db/database.ts'
import { importWorkbook } from './ingest/index.ts'
import { getMetaConfig, getSnapshot, setMetaConfig } from './kpis/index.ts'
import { lerFotoEscolhida } from './photos/pick.ts'

export function registerIpc(db: SalesDatabase): void {
  ipcMain.handle('ingest:import', async () => {
    const filePath = await pickWorkbookPath()
    if (!filePath) return null
    return importWorkbook(db, filePath)
  })

  ipcMain.handle('ingest:imports', () => {
    return db.listImports()
  })

  ipcMain.handle('ingest:codigo-history', (_event, codigo: string) => {
    return db.getCodigoHistory(String(codigo ?? '').trim())
  })

  ipcMain.handle(
    'kpis:get',
    (_event, ano: number, filtro: SnapshotFilter = {}) => {
      return getSnapshot(db, ano, filtro)
    },
  )

  ipcMain.handle('fotos:list', () => db.listVendedorFotos())

  ipcMain.handle('vendedores:list', () => db.listVendedores())

  ipcMain.handle('foto:escolher', async (_event, vendedor: unknown) => {
    const nome = vendedorSchema.parse(vendedor)
    const owner = BrowserWindow.getFocusedWindow()
    const { canceled, filePaths } = owner
      ? await dialog.showOpenDialog(owner, {
          title: `Foto de ${nome}`,
          properties: ['openFile'],
          filters: [
            {
              name: 'Imagens',
              extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
            },
          ],
        })
      : await showImageDialog(nome)
    if (canceled || filePaths.length === 0) return null

    const foto = await lerFotoEscolhida(filePaths[0])
    db.setVendedorFotoManual(nome, foto.mime, foto.img)
    return { vendedor: nome, origem: 'manual' }
  })

  ipcMain.handle('foto:remover', (_event, vendedor: unknown) => {
    const nome = vendedorSchema.parse(vendedor)
    db.removeVendedorFoto(nome)
    return { vendedor: nome }
  })

  ipcMain.handle('metas:get', (_event, ano: number) => {
    return getMetaConfig(db, Number(ano))
  })

  ipcMain.handle('metas:set', (_event, ano: number, input: unknown) => {
    setMetaConfig(db, Number(ano), metasSetInputSchema.parse(input))
    return getMetaConfig(db, Number(ano))
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
}

function showImageDialog(
  nome: string,
): Promise<{ canceled: boolean; filePaths: string[] }> {
  return dialog.showOpenDialog({
    title: `Foto de ${nome}`,
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
