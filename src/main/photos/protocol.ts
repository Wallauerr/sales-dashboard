import { protocol } from 'electron'
import type { SalesDatabase } from '../db/database.ts'

// As fotos vivem como BLOB no banco, mas o CSP do renderer é `img-src 'self'` e
// não aceita `data:`. Servir por um protocolo próprio deixa o CSP estrito e
// ainda evita mandar todas as fotos em base64 pelo IPC a cada refresh: o
// renderer só recebe `foto://img/<vendedor>`.
export const FOTO_SCHEME = 'foto'
const FOTO_HOST = 'img'

// Precisa rodar antes do app ficar ready, senão o Chromium jáNavigate sem
// considerar o esquema privilegiado.
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
        // Foto trocada em Configurações precisa aparecer sem reiniciar.
        'cache-control': 'no-cache',
      },
    })
  })
}

export function fotoUrl(vendedor: string): string {
  return `${FOTO_SCHEME}://${FOTO_HOST}/${encodeURIComponent(vendedor)}`
}
