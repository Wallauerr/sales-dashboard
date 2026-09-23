const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("node:path");

const isMac = process.platform === "darwin";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
};

const template = [
  ...(isMac ? [{ role: "appMenu" }] : []),
  {
    label: "File",
    submenu: [
      {
        label: "Import Metas Comercial.xlsx…",
        accelerator: "CmdOrCtrl+O",
        click: async () => {
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
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit" },
    ],
  },
  { label: "Edit", role: "editMenu" },
  { label: "View", role: "viewMenu" },
  { label: "Window", role: "windowMenu" },
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
