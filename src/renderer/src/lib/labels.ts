import type { Month } from '../../../shared/types'

export const MONTH_LABEL: Record<Month, string> = {
  jan: 'Jan',
  fev: 'Fev',
  mar: 'Mar',
  abr: 'Abr',
  mai: 'Mai',
  jun: 'Jun',
  jul: 'Jul',
  ago: 'Ago',
  set: 'Set',
  out: 'Out',
  nov: 'Nov',
  dez: 'Dez',
}

export function statusLabel(status: string): string {
  return status === 'Pedido Nao Faturado' ? 'Pedido Não Faturado' : status
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}
