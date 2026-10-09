import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'

// A foto sai servida por `photo://` e mime errado faz o Chromium recusar a
// imagem: conferimos a assinatura, não a extensão.

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024

const SIGNATURES: { mime: string; bytes: number[]; label: string }[] = [
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

export interface ChosenPhoto {
  mime: string
  img: Buffer
}

export async function readChosenPhoto(filePath: string): Promise<ChosenPhoto> {
  const { size } = await stat(filePath)
  if (size === 0) throw new Error('O arquivo está vazio.')
  if (size > PHOTO_MAX_BYTES) {
    const mb = (n: number): string => (n / 1024 / 1024).toFixed(1)
    throw new Error(
      `A foto tem ${mb(size)}MB e o limite é ${mb(PHOTO_MAX_BYTES)}MB.`,
    )
  }

  const img = await readFile(filePath)
  const head = img.subarray(0, 12)

  const found = SIGNATURES.find(s =>
    s.bytes.every((byte, i) => head[i] === byte),
  )
  if (found) return { mime: found.mime, img }
  if (isWebp(head)) return { mime: 'image/webp', img }

  // SVG fica de fora: é XML com script.
  if (extname(filePath).toLowerCase() === '.svg') {
    throw new Error('SVG não é aceito. Salve a foto como PNG ou JPG.')
  }
  throw new Error('Esse arquivo não é uma imagem. Use PNG, JPG, WEBP ou GIF.')
}
