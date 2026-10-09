import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { SalesDatabase } from './db/database'
import { registerIpc } from './ipc'
import {
  registerPhotoProtocol,
  registerPhotoSchemePrivileges,
} from './photos/protocol'
import type { Point, Screen } from './window-maximize'
import {
  cursorScreenBounds,
  screenOfBounds,
  visibleBounds,
} from './window-maximize'

app.disableHardwareAcceleration()

// Antes do app ready: sem isso o esquema não entra na lista de privilegiados.
registerPhotoSchemePrivileges()

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

  // Último tamanho antes de maximizar: o WM nem sempre volta para ele.
  // `transitioning` impede que o nosso próprio setBounds sobrescreva o guardado.
  let normalBounds: Electron.Rectangle | null = null
  let transitioning = false

  const allScreens = (): Screen[] => screen.getAllDisplays()

  const toggleMaximize = (): void => {
    if (win.isMaximized()) {
      const restore = normalBounds
      normalBounds = null
      transitioning = true
      win.unmaximize()
      if (restore && visibleBounds(restore, allScreens()))
        win.setBounds(restore)
      transitioning = false
      return
    }
    normalBounds = win.getBounds()
    let cursor: Point | null = null
    try {
      cursor = screen.getCursorScreenPoint()
    } catch {
      cursor = null
    }
    const target = cursor
      ? cursorScreenBounds(
          cursor,
          screenOfBounds(normalBounds, allScreens()),
          allScreens(),
        )
      : null
    transitioning = true
    if (target) win.setBounds(target)
    win.maximize()
    transitioning = false
  }

  const saveSize = (): void => {
    if (transitioning || win.isMaximized() || win.isDestroyed()) return
    normalBounds = win.getBounds()
  }

  ipcMain.handle('win:minimize', () => win.minimize())
  ipcMain.handle('win:toggle-maximize', () => toggleMaximize())
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
  win.on('move', saveSize)
  win.on('resize', saveSize)
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
  registerPhotoProtocol(db)

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
