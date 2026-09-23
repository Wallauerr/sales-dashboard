import { dialog, ipcMain, BrowserWindow } from "electron";
import { getSnapshot } from "./kpis/index.ts";
import { importWorkbook } from "./ingest/index.ts";
import type { SalesDatabase } from "./db/database.ts";

export function registerIpc(db: SalesDatabase): void {
  ipcMain.handle("ingest:import", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Import export from SIGE Cloud",
      properties: ["openFile"],
      filters: [{ name: "Excel workbooks", extensions: ["xlsx"] }],
    });
    if (canceled || filePaths.length === 0) return null;
    return importWorkbook(db, filePaths[0]);
  });

  ipcMain.handle("ingest:import-from-path", (_event, filePath: string) => {
    return importWorkbook(db, filePath);
  });

  ipcMain.handle("kpis:get", (_event, ano: number) => {
    return getSnapshot(db, ano);
  });

  ipcMain.handle("dialog:open-file", async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "Import export from SIGE Cloud",
      properties: ["openFile"],
      filters: [{ name: "Excel workbooks", extensions: ["xlsx"] }],
    });
    return canceled ? null : filePaths[0];
  });
}