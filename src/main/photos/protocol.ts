import { protocol } from 'electron'
import type { SalesDatabase } from '../db/database.ts'

// O CSP é `img-src 'self'` e não aceita `data:`; um protocolo próprio mantém o
// CSP estrito e poupa o IPC de mandar base64 a cada refresh.
export const FOTO_SCHEME = 'foto'
const FOTO_HOST = 'img'

// Antes do app ready, senão o Chromium ignora o esquema privilegiado.
export function registerFotoSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: FOTO_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ])
}

export function registerFotoProtocol(db: SalesDatabase): void {
  protocol.handle(FOTO_SCHEME, request => {
    const url = new URL(request.url)
    if (url.host !== FOTO_HOST) return new Response(null, { status: 404 })

    const vendedor = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!vendedor) return new Response(null, { status: 404 })

    const foto = db.getVendedorFoto(vendedor)
    if (!foto) return new Response(null, { status: 404 })

    return new Response(foto.img, {
      headers: {
        'content-type': foto.mime,
        'cache-control': 'no-cache',
      },
    })
  })
}

export function fotoUrl(vendedor: string): string {
  return `${FOTO_SCHEME}://${FOTO_HOST}/${encodeURIComponent(vendedor)}`
}
