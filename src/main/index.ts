import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { SalesDatabase } from './db/database'
import { registerIpc } from './ipc'
import {
  registerFotoProtocol,
  registerFotoSchemePrivileges,
} from './photos/protocol'
import type { Ponto, Tela } from './window-maximize'
import {
  boundsDaTelaDoCursor,
  boundsVisiveis,
  telaDosBounds,
} from './window-maximize'

app.disableHardwareAcceleration()

// Antes do app ready: sem isso o esquema não entra na lista de privilegiados.
registerFotoSchemePrivileges()

let db: SalesDatabase

function iconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../resources/icon.png')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    title: 'Sulmag Dashboard',
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  win.setMenuBarVisibility(false)

  // Último tamanho antes de maximizar: o unmaximize do Windows nem sempre volta
  // para ele, e um monitor desligado no meio do maximize deixaria a janela fora
  // de tela. `emTransicao` segura a gravação enquanto nós mesmos movemos a
  // janela, senão o setBounds sobrescreveria o que queremos guardar.
  let boundsNormais: Electron.Rectangle | null = null
  let emTransicao = false

  const todasAsTelas = (): Tela[] => screen.getAllDisplays()

  const alternarMaximize = (): void => {
    if (win.isMaximized()) {
      const volta = boundsNormais
      boundsNormais = null
      emTransicao = true
      win.unmaximize()
      if (volta && boundsVisiveis(volta, todasAsTelas())) win.setBounds(volta)
      emTransicao = false
      return
    }
    boundsNormais = win.getBounds()
    // Maximizar mira a tela do cursor: com dois monitores, Maximizar clicado com
    // o ponteiro no outro precisa pular para lá.
    let cursor: Ponto | null = null
    try {
      cursor = screen.getCursorScreenPoint()
    } catch {
      cursor = null
    }
    const destino = cursor
      ? boundsDaTelaDoCursor(
          cursor,
          telaDosBounds(boundsNormais, todasAsTelas()),
          todasAsTelas(),
        )
      : null
    emTransicao = true
    if (destino) win.setBounds(destino)
    win.maximize()
    emTransicao = false
  }

  // Arrastar a janela é o gesto de rotina para trocar de monitor, então o
  // tamanho guardado é o do arrasto, não o de antes do maximize.
  const guardarTamanho = (): void => {
    if (emTransicao || win.isMaximized() || win.isDestroyed()) return
    boundsNormais = win.getBounds()
  }

  ipcMain.handle('win:minimize', () => win.minimize())
  ipcMain.handle('win:toggle-maximize', () => alternarMaximize())
  ipcMain.handle('win:close', () => win.close())
  ipcMain.handle('win:get-bounds', () => win.getBounds())
  ipcMain.on('win:set-bounds', (_e, b) => {
    if (win.isMaximized() || win.isDestroyed()) return
    const minW = 960
    const minH = 620
    const x = Math.round(b?.x ?? win.getBounds().x)
    const y = Math.round(b?.y ?? win.getBounds().y)
    const width = Math.max(minW, Math.round(b?.width ?? win.getBounds().width))
    const height = Math.max(
      minH,
      Math.round(b?.height ?? win.getBounds().height),
    )
    win.setBounds({ x, y, width, height })
  })
  win.on('move', guardarTamanho)
  win.on('resize', guardarTamanho)
  win.on('maximize', () => win.webContents.send('win:maximized', true))
  win.on('unmaximize', () => win.webContents.send('win:maximized', false))

  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.on('console-message', (_e, _level, message) => {
      console.log('[renderer]', message)
    })
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setName('Sulmag Dashboard')
  db = SalesDatabase.open(
    new DatabaseSync(join(app.getPath('userData'), 'metas.db')),
  )

  registerIpc(db)
  registerFotoProtocol(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
