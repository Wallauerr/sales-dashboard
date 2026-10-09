export function photoUrl(seller: string): string {
  return `photo://img/${encodeURIComponent(seller)}`
}
