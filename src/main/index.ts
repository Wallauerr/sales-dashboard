import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { join } from "node:path";

const isMac = process.platform === "darwin";

const createWindow = (): void => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

const template = [
  ...(isMac ? [{ role: "appMenu" as const }] : []),
  {
    label: "File",
    submenu: [
      {
        label: "Import Metas Comercial.xlsx…",
        accelerator: "CmdOrCtrl+O",
        click: async (): Promise<void> => {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: "Import export from SIGE Cloud",
            properties: ["openFile"],
            filters: [{ name: "Excel workbooks", extensions: ["xlsx"] }],
          });

          if (!canceled && filePaths.length > 0) {
            console.log("Selected workbook:", filePaths[0]);
          }
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
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

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
