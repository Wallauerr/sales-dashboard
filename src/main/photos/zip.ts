import { inflateRawSync } from "node:zlib";

// Leitor ZIP mínimo (usamos só para abrir o pacote .xlsx e ler os arquivos que
// o SheetJS não expõe: mídia embutida e o XML de âncoras dos desenhos). Suporta
// os métodos STORED(0) e DEFLATE(8), que cobrem os exports do Excel.
export class ZipReader {
  private entries = new Map<string, Buffer>();

  constructor(file: Uint8Array) {
    const u8 = file instanceof Uint8Array ? file : new Uint8Array(file);
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    const eocd = findEocd(u8);
    const totalEntries = view.getUint16(eocd + 10, true);
    const cdOffset = view.getUint32(eocd + 16, true);

    let cursor = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      if (view.getUint32(cursor, true) !== 0x02014b50) break;
      const method = view.getUint16(cursor + 10, true);
      const compSize = view.getUint32(cursor + 20, true);
      const nameLen = view.getUint16(cursor + 28, true);
      const extraLen = view.getUint16(cursor + 30, true);
      const commentLen = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = decodeUtf8(u8.subarray(cursor + 46, cursor + 46 + nameLen));

      const lh = localOffset;
      const lhNameLen = view.getUint16(lh + 26, true);
      const lhExtraLen = view.getUint16(lh + 28, true);
      const dataStart = lh + 30 + lhNameLen + lhExtraLen;
      const raw = u8.subarray(dataStart, dataStart + compSize);

      const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
      this.entries.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data));

      cursor += 46 + nameLen + extraLen + commentLen;
    }
  }

  get(name: string): Buffer | null {
    return this.entries.get(name) ?? null;
  }

  names(): string[] {
    return [...this.entries.keys()];
  }
}

function findEocd(u8: Uint8Array): number {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const max = Math.max(0, u8.length - 22 - 65535);
  for (let i = u8.length - 22; i >= max; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error("ZIP inválido: fim do diretório central não encontrado");
}

function decodeUtf8(u8: Uint8Array): string {
  return new TextDecoder("utf-8").decode(u8);
}