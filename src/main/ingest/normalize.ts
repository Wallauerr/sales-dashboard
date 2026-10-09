import { type Month, SYSTEM_STATUSES } from '../../shared/types.ts'

export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    const ms = (value - 25569) * 86400 * 1000
    return new Date(ms)
  }
  const s = String(value).trim()
  if (!s) return null
  let m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/,
  )
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0))
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const MONTH_KEYS: Month[] = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

export function monthKey(d: Date): Month {
  return MONTH_KEYS[d.getMonth()]
}

export function toISO(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} T${pad(d.getHours())}:${pad(d.getMinutes())}`.replace(
    ' T',
    'T',
  )
}

const LOWER_CONNECTIVES = new Set([
  'da',
  'de',
  'di',
  'do',
  'das',
  'dos',
  'du',
  'e',
  'd',
])

export function titleCase(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  const original = clean
  const allUpper = clean === clean.toUpperCase()
  const words = clean.split(' ').map(w => {
    const lower = w.toLowerCase()
    if (LOWER_CONNECTIVES.has(lower)) return lower
    if (!allUpper && /^[a-zÀ-ÿ]/.test(w)) {
      const first = w.slice(0, 1)
      return first.toUpperCase() + w.slice(1)
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
  const candidate = words.join(' ')
  if (!allUpper) return candidate
  return candidate === original ? original : candidate
}

export function uppercase(text: string): string {
  return text.trim().toUpperCase()
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const CANONICAL_STATUS = new Map(
  SYSTEM_STATUSES.map(status => [stripAccents(status).toLowerCase(), status]),
)

export function statusRaw(status: string): string {
  const s = String(status).trim()
  if (!s) return s
  return CANONICAL_STATUS.get(stripAccents(s).toLowerCase()) ?? s
}

/**
 * A venda conta no mês em que ela chegou no funil: aprovada em julho, mesmo
 * nascida como orçamento em maio.
 */
export function referenceDate(
  status: string,
  dates: {
    quote: Date | null
    order: Date | null
    billing: Date | null
    fiscalIssue: Date | null
    base: Date | null
  },
): Date | null {
  const s = status.trim()
  let candidates: (Date | null)[]
  switch (s) {
    case 'Orçamento':
      candidates = [dates.quote, dates.base]
      break
    case 'Pedido':
    case 'Pedido Aprovado Sem Faturamento':
      candidates = [dates.order, dates.quote, dates.base]
      break
    case 'Pedido Faturado':
      candidates = [dates.billing, dates.fiscalIssue, dates.order, dates.base]
      break
    case 'Pedido Cancelado':
    case 'Pedido Nao Faturado':
      candidates = [dates.base, dates.quote]
      break
    default:
      candidates = [dates.quote, dates.base]
  }
  return candidates.find(d => d !== null) ?? null
}

const STATE_REGION: Record<string, string> = {
  AC: 'Norte',
  AP: 'Norte',
  AM: 'Norte',
  PA: 'Norte',
  RO: 'Norte',
  RR: 'Norte',
  TO: 'Norte',
  AL: 'Nordeste',
  BA: 'Nordeste',
  CE: 'Nordeste',
  MA: 'Nordeste',
  PB: 'Nordeste',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RN: 'Nordeste',
  SE: 'Nordeste',
  GO: 'Centro-Oeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  DF: 'Centro-Oeste',
  ES: 'Sudeste',
  MG: 'Sudeste',
  RJ: 'Sudeste',
  SP: 'Sudeste',
  PR: 'Sul',
  RS: 'Sul',
  SC: 'Sul',
  Exterior: 'Exterior',
}

const NORMALIZED_REGION: Record<string, string> = {
  sul: 'Sul',
  sudeste: 'Sudeste',
  nordeste: 'Nordeste',
  norte: 'Norte',
  'centro-oeste': 'Centro-Oeste',
  exterior: 'Exterior',
}

export function canonicalRegion(state: string, region: string): string {
  const r = String(region).trim().toLowerCase().replace(/\s+/g, ' ')
  if (r && NORMALIZED_REGION[r]) return NORMALIZED_REGION[r]
  const uf = state.trim().toUpperCase().replace(/\s+/g, '')
  if (STATE_REGION[uf]) return STATE_REGION[uf]
  return String(region).trim()
}

export function canonicalState(state: string): string {
  const e = String(state).trim().toUpperCase().replace(/\s+/g, '')
  return e === '' ? '' : e
}
