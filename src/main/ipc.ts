import { dialog, ipcMain } from "electron";
import { getSnapshot } from "./kpis/index.ts";
import { importWorkbook } from "./ingest/index.ts";
import { getVendas } from "./vendas/index.ts";
import type { SalesDatabase } from "./db/database.ts";

export function registerIpc(db: SalesDatabase): void {
  ipcMain.handle("ingest:import", async () => {
    const filePath = await pickWorkbookPath();
    if (!filePath) return null;
    return importWorkbook(db, filePath);
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
}

async function pickWorkbookPath(): Promise<string | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Importar export do SIGE",
    properties: ["openFile"],
    filters: [{ name: "Planilhas Excel", extensions: ["xlsx"] }],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
}