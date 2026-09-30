import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as XLSX from 'xlsx'
import { titleCase } from '../ingest/normalize.ts'
import { ZipReader } from './zip.ts'

export interface VendedorFotoRaw {
  vendedor: string
  mime: string
  img: Buffer
}

interface Anchor {
  row: number
  rId: string
}

// Extrator da regressão de fidelidade: o SheetJS (community) não expõe as
// imagens embutidas no .xlsx. Aqui abrimos o pacote (zip) na mão e:
//   1. localizamos a planilha com a coluna "Código" (a aba "Base" dos exports);
//   2. seguimos a corrente drawing -> rels -> media para achar cada imagem;
//   3. lemos a âncora <xdr:from><xdr:row> de cada desenho e casamos com a
//      linha real da planilha, extraindo o nome do vendedor na coluna
//      "Vendedor" (normalizado igual ao ingest, ex.: "Rosemeri").
// O resultado é um mapa vendedor -> bytes da foto. É best-effort: se a âncora
// não apontar para uma linha com vendedor, a foto é descartada e o app cai no
// avatar de iniciais.
export function extractWorkbookPhotos(filePath: string): VendedorFotoRaw[] {
  const bytes = readFileSync(filePath)
  const zip = new ZipReader(bytes)

  const sheetPath = findDataSourceSheet(zip)
  if (!sheetPath) return []

  const sheet = zip.get(sheetPath)
  if (!sheet) return []

  const sheetRelsPath = relsPathFor(sheetPath)
  const drawingPath = resolveTarget(
    zip.get(sheetRelsPath),
    'drawing',
    `${dirname(sheetPath)}/`,
  )
  if (!drawingPath) return []

  const mediaByRid = mediaMap(zip, drawingPath)
  if (mediaByRid.size === 0) return []

  const anchors = parseAnchors(zip.get(drawingPath)?.toString('utf8') ?? '')
  if (anchors.length === 0) return []

  const aoa = sheetAoA(bytes)
  const vendedorIdx = vendedorColumn(aoa)
  if (vendedorIdx < 0) return []

  const out: VendedorFotoRaw[] = []
  const seen = new Set<string>()
  for (const a of anchors) {
    const cell = aoa[a.row]
    const img = mediaByRid.get(a.rId)
    if (!cell || !img) continue
    const vendedor = titleCase(String(cell[vendedorIdx] ?? '').trim())
    if (!vendedor || seen.has(vendedor)) continue
    seen.add(vendedor)
    out.push({ vendedor, mime: img.mime, img: img.data })
  }
  return out
}

function findDataSourceSheet(zip: ZipReader): string | null {
  const wbXml = zip.get('xl/workbook.xml')?.toString('utf8')
  if (!wbXml) return null
  const rels = relMap(
    zip.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '',
  )
  const sheets = [...wbXml.matchAll(/<sheet\b[^>]*>/g)]
    .map(m => m[0])
    .map(tag => ({
      name: attr(tag, 'name'),
      rId: attrNS(tag, 'r:id'),
    }))
    .filter(s => s.name && s.rId)

  const named = sheets.filter((s): s is { name: string; rId: string } =>
    Boolean(s.name && s.rId),
  )
  const pick = named.find(s => s.name === 'Base') ?? named[0]
  if (!pick) return null
  const target = rels.get(pick.rId)
  return target ? normalize(`xl/${target}`) : null
}

function relsPathFor(sheetPath: string): string {
  const dir = sheetPath.slice(0, sheetPath.lastIndexOf('/'))
  const base = sheetPath.slice(sheetPath.lastIndexOf('/') + 1)
  return `${dir}/_rels/${base}.rels`
}

function relMap(relsXml: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attrNS(m[0], 'Id') ?? attr(m[0], 'Id')
    const target = attr(m[0], 'Target')
    if (id && target) map.set(id, target)
  }
  return map
}

function resolveTarget(
  relsXml: Buffer | null,
  typeSuffix: string,
  base: string,
): string | null {
  if (!relsXml) return null
  for (const m of relsXml.toString('utf8').matchAll(/<Relationship\b[^>]*>/g)) {
    const type = attr(m[0], 'Type') ?? ''
    const target = attr(m[0], 'Target')
    if (target && type.endsWith(`/${typeSuffix}`))
      return normalize(base + target)
  }
  return null
}

function mediaMap(
  zip: ZipReader,
  drawingPath: string,
): Map<string, { mime: string; data: Buffer }> {
  const dir = drawingPath.slice(0, drawingPath.lastIndexOf('/'))
  const base = drawingPath.slice(drawingPath.lastIndexOf('/') + 1)
  const rels = relMap(
    zip.get(`${dir}/_rels/${base}.rels`)?.toString('utf8') ?? '',
  )
  const out = new Map<string, { mime: string; data: Buffer }>()
  for (const [rid, target] of rels) {
    const mediaPath = normalize(`${dir}/${target}`)
    const data = zip.get(mediaPath)
    if (!data) continue
    const ext = mediaPath.slice(mediaPath.lastIndexOf('.') + 1).toLowerCase()
    const mime =
      ext === 'jpg'
        ? 'image/jpeg'
        : ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'svg'
              ? 'image/svg+xml'
              : 'image/png'
    out.set(rid, { mime, data })
  }
  return out
}

function parseAnchors(drawingXml: string): Anchor[] {
  const anchors: Anchor[] = []
  for (const m of drawingXml.matchAll(
    /<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>[\s\S]*?<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?r:embed="([^"]+)"/g,
  )) {
    anchors.push({ row: Number(m[1]), rId: m[2] })
  }
  return anchors
}

function sheetAoA(bytes: Uint8Array): unknown[][] {
  const wb = XLSX.read(bytes, { type: 'buffer', cellDates: false })
  const ws = wb.Sheets.Base ?? wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
}

function vendedorColumn(aoa: unknown[][]): number {
  const headerIdx = aoa.findIndex(
    row => String(row[0] ?? '').trim() === 'Código',
  )
  if (headerIdx < 0) return -1
  const header = aoa[headerIdx] ?? []
  return header.findIndex(c => String(c ?? '').trim() === 'Vendedor')
}

function normalize(path: string): string {
  const parts: string[] = []
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      parts.pop()
    } else {
      parts.push(seg)
    }
  }
  return parts.join('/')
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\s)${name}="([^"]*)"`)
  return re.exec(tag)?.[1] ?? null
}

function attrNS(tag: string, qname: string): string | null {
  return attr(tag, qname.replace(':', '\\:'))
}
