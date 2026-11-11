import {
  APPROVED_WITHOUT_BILLING_STATUS,
  BILLING_STATUSES,
  NON_BILLING_CATEGORIES,
} from './types.ts'

// Filtro de faturamento: `Pedido`/`Pedido Faturado` sempre entram;
// `Pedido Aprovado Sem Faturamento` só quando a categoria não é remessa nem
// amostra — categoria vazia conta.
export function billingClause(): { sql: string; params: string[] } {
  const inStatus = BILLING_STATUSES.map(() => '?').join(', ')
  const notLike = NON_BILLING_CATEGORIES.map(() => 'categoria NOT LIKE ?').join(
    ' AND ',
  )
  return {
    sql: `(status_sistema IN (${inStatus}) OR (status_sistema = ? AND ${notLike}))`,
    params: [
      ...BILLING_STATUSES,
      APPROVED_WITHOUT_BILLING_STATUS,
      ...NON_BILLING_CATEGORIES,
    ],
  }
}

export function isBillingSale(sale: {
  systemStatus: string
  category: string
}): boolean {
  if (BILLING_STATUSES.includes(sale.systemStatus)) return true
  if (sale.systemStatus !== APPROVED_WITHOUT_BILLING_STATUS) return false
  const category = sale.category.trim().toLowerCase()
  return !NON_BILLING_CATEGORIES.some(prefix =>
    category.startsWith(prefix.replace(/%$/, '').toLowerCase()),
  )
}
