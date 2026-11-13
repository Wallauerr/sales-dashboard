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

export const MONTH_FULL: Record<Month, string> = {
  jan: 'Janeiro',
  fev: 'Fevereiro',
  mar: 'Março',
  abr: 'Abril',
  mai: 'Maio',
  jun: 'Junho',
  jul: 'Julho',
  ago: 'Agosto',
  set: 'Setembro',
  out: 'Outubro',
  nov: 'Novembro',
  dez: 'Dezembro',
}

export function statusLabel(status: string): string {
  return status === 'Pedido Nao Faturado' ? 'Pedido Não Faturado' : status
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}
