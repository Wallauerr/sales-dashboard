import { dialog, ipcMain } from "electron";
import type { SnapshotFilter } from "../shared/types.ts";
import { metasSetInputSchema } from "../shared/schemas.ts";
import { getSnapshot, getMetaConfig, setMetaConfig } from "./kpis/index.ts";
import { importWorkbook } from "./ingest/index.ts";
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

  ipcMain.handle("kpis:get", (_event, ano: number, filtro: SnapshotFilter = {}) => {
    return getSnapshot(db, ano, filtro);
  });

  ipcMain.handle("fotos:list", () => {
    return db.listVendedorFotos().map((f) => ({
      vendedor: f.vendedor,
      dataUrl: `data:${f.mime};base64,${Buffer.from(f.img).toString("base64")}`,
    }));
  });

  ipcMain.handle("metas:get", (_event, ano: number) => {
    return getMetaConfig(db, Number(ano));
  });

  ipcMain.handle("metas:set", (_event, ano: number, input: unknown) => {
    setMetaConfig(db, Number(ano), metasSetInputSchema.parse(input));
    return getMetaConfig(db, Number(ano));
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