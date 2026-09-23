import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SalesDatabase } from "./db/database";
import { registerIpc } from "./ipc";

app.disableHardwareAcceleration();

let db: SalesDatabase;

function iconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(__dirname, "../../resources/icon.png");
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    title: "Sulmag Dashboard",
    backgroundColor: "#0B0B0D",
    frame: false,
    icon: iconPath(),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  win.setMenuBarVisibility(false);

  ipcMain.handle("win:minimize", () => win.minimize());
  ipcMain.handle("win:toggle-maximize", () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.handle("win:close", () => win.close());
  win.on("maximize", () => win.webContents.send("win:maximized", true));
  win.on("unmaximize", () => win.webContents.send("win:maximized", false));

  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.on("console-message", (_e, _level, message) => {
      console.log("[renderer]", message);
    });
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  app.setName("Sulmag Dashboard");
  db = SalesDatabase.open(new DatabaseSync(join(app.getPath("userData"), "metas.db")));

  registerIpc(db);

  ipcMain.handle("ping", () => "pong");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});