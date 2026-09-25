import { dialog, ipcMain, BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";
import { getSnapshot } from "./kpis/index.ts";
import { importWorkbook } from "./ingest/index.ts";
import { getVendas } from "./vendas/index.ts";
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

  ipcMain.handle("ingest:last-import", () => {
    const path = db.getMeta("last_import_path");
    return path ? { path, at: db.getMeta("last_import_at") } : null;
  });

  ipcMain.handle("ingest:imports", () => {
    return db.listImports();
  });

  ipcMain.handle("ingest:codigo-history", (_event, codigo: string) => {
    return db.getCodigoHistory(String(codigo ?? "").trim());
  });

  ipcMain.handle("kpis:get", (_event, ano: number) => {
    return getSnapshot(db, ano);
  });

  ipcMain.handle("vendas:list", (_event, filters: Parameters<typeof getVendas>[1], limit?: number) => {
    return getVendas(db, filters, limit ?? 200);
  });

  ipcMain.handle("app:export-pdf", async (event, ano: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const pdf = await win.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Exportar relatório em PDF",
      defaultPath: `relatorio-metas-${ano}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return null;
    await writeFile(filePath, pdf);
    return filePath;
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