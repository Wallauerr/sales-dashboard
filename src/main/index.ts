import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SalesDatabase } from "./db/database";
import { importWorkbook } from "./ingest/index";
import { registerIpc } from "./ipc";

let db: SalesDatabase;

const isMac = process.platform === "darwin";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

async function importViaDialog(): Promise<void> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Importar dados do SIGE (Metas Comercial.xlsx ou relatório de pedidos)",
    properties: ["openFile"],
    filters: [{ name: "Excel workbooks", extensions: ["xlsx"] }],
  });
  if (canceled || filePaths.length === 0) return;
  const result = await importWorkbook(db, filePaths[0]);
  console.log("Import:", JSON.stringify(result));
}

const template = [
  ...(isMac ? [{ role: "appMenu" as const }] : []),
  {
    label: "File",
    submenu: [
      {
        label: "Importar dados do SIGE…",
        accelerator: "CmdOrCtrl+O",
        click: (): void => {
          void importViaDialog();
        },
      },
      { type: "separator" as const },
      isMac ? { role: "close" as const } : { role: "quit" as const },
    ],
  },
  { label: "Edit", role: "editMenu" as const },
  { label: "View", role: "viewMenu" as const },
  { label: "Window", role: "windowMenu" as const },
];

app.whenReady().then(() => {
  db = SalesDatabase.open(new DatabaseSync(join(app.getPath("userData"), "metas.db")));
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

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

