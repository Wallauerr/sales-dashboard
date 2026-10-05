import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'

// A foto vai crua para o banco e sai servida por `foto://`, então o mime errado
// faria o Chromium recusar a imagem: conferimos a assinatura do arquivo em vez da
// extensão, e o limite de tamanho evita um PNG de 30MB dentro do .db.

export const FOTO_MAX_BYTES = 2 * 1024 * 1024

const ASSINATURAS: { mime: string; bytes: number[]; label: string }[] = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47], label: 'PNG' },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], label: 'JPG' },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46], label: 'GIF' },
]

// WebP não tem assinatura nos 4 primeiros bytes: "RIFF" + tamanho + "WEBP".
function isWebp(head: Buffer): boolean {
  return (
    head.length >= 12 &&
    head.subarray(0, 4).toString('ascii') === 'RIFF' &&
    head.subarray(8, 12).toString('ascii') === 'WEBP'
  )
}

export interface FotoEscolhida {
  mime: string
  img: Buffer
}

export async function lerFotoEscolhida(
  filePath: string,
): Promise<FotoEscolhida> {
  const { size } = await stat(filePath)
  if (size === 0) throw new Error('O arquivo está vazio.')
  if (size > FOTO_MAX_BYTES) {
    const mb = (n: number): string => (n / 1024 / 1024).toFixed(1)
    throw new Error(
      `A foto tem ${mb(size)}MB e o limite é ${mb(FOTO_MAX_BYTES)}MB.`,
    )
  }

  const img = await readFile(filePath)
  const head = img.subarray(0, 12)

  const achada = ASSINATURAS.find(s =>
    s.bytes.every((byte, i) => head[i] === byte),
  )
  if (achada) return { mime: achada.mime, img }
  if (isWebp(head)) return { mime: 'image/webp', img }

  // SVG fica de fora: é XML com script.
  if (extname(filePath).toLowerCase() === '.svg') {
    throw new Error('SVG não é aceito. Salve a foto como PNG ou JPG.')
  }
  throw new Error('Esse arquivo não é uma imagem. Use PNG, JPG, WEBP ou GIF.')
}
