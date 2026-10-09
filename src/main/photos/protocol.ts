import { protocol } from 'electron'
import type { SalesDatabase } from '../db/database.ts'

// O CSP é `img-src 'self'` e não aceita `data:`; um protocolo próprio mantém o
// CSP estrito e poupa o IPC de mandar base64 a cada refresh.
export const PHOTO_SCHEME = 'photo'
const PHOTO_HOST = 'img'

// Antes do app ready, senão o Chromium ignora o esquema privilegiado.
export function registerPhotoSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PHOTO_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ])
}

export function registerPhotoProtocol(db: SalesDatabase): void {
  protocol.handle(PHOTO_SCHEME, request => {
    const url = new URL(request.url)
    if (url.host !== PHOTO_HOST) return new Response(null, { status: 404 })

    const seller = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!seller) return new Response(null, { status: 404 })

    const photo = db.getSellerPhoto(seller)
    if (!photo) return new Response(null, { status: 404 })

    return new Response(photo.img, {
      headers: {
        'content-type': photo.mime,
        'cache-control': 'no-cache',
      },
    })
  })
}

export function photoUrl(seller: string): string {
  return `${PHOTO_SCHEME}://${PHOTO_HOST}/${encodeURIComponent(seller)}`
}
