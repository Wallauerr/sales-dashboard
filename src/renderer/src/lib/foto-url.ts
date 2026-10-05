export function fotoUrl(vendedor: string): string {
  return `foto://img/${encodeURIComponent(vendedor)}`
}
