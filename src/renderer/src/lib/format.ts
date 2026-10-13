import { z } from 'zod'

const brlFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})
const brl0Fmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const pctFmt = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function brl(v: number): string {
  return brlFmt.format(v)
}

export function brl0(v: number): string {
  return brl0Fmt.format(v)
}

export function brlCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e6)
    return `R$\u00A0${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}\u00A0mi`
  if (abs >= 1e3)
    return `R$\u00A0${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}\u00A0mil`
  return brl0(v)
}

export function int(v: number): string {
  return intFmt.format(v)
}

export function pct(v: number): string {
  return pctFmt.format(v)
}

const dtFmt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function brlHumanDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dtFmt.format(d)
}

const moneyTextRe = /^\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/

export function maskBrlText(value: string): string {
  const cleaned = value.replace(/[^\d,]/g, '').replace(/,{2,}/g, ',')
  const [intRaw = '', decRaw = ''] = cleaned.split(',')
  const intDigits = intRaw.replace(/\D/g, '').slice(0, 15)
  const decPart = decRaw.replace(/\D/g, '').slice(0, 2)
  const intPart = intDigits
    ? Number(intDigits).toLocaleString('pt-BR')
    : decPart
      ? '0'
      : ''
  return cleaned.includes(',') ? `${intPart},${decPart}` : intPart
}

export function brlInputValue(v: number): string {
  return maskBrlText(v.toFixed(2).replace('.', ','))
}

export const brlDraftSchema = z
  .string()
  .refine(s => {
    const t = s.trim()
    return t === '' || moneyTextRe.test(t)
  }, 'Valor em BRL inválido.')
  .transform(s => {
    const t = s.trim()
    if (t === '') return null
    return Number(t.replace(/\./g, '').replace(',', '.'))
  })

const pctTextRe = /^\d{1,4}(?:,\d)?$/

export function maskPctText(value: string): string {
  const cleaned = value.replace(/[^\d,]/g, '').replace(/,{2,}/g, ',')
  const [intRaw = '', decRaw = ''] = cleaned.split(',')
  const intDigits = intRaw.replace(/\D/g, '').slice(0, 4)
  const decPart = decRaw.replace(/\D/g, '').slice(0, 1)
  const intPart = intDigits ? String(Number(intDigits)) : decPart ? '0' : ''
  return cleaned.includes(',') ? `${intPart},${decPart}` : intPart
}

export function pctInputValue(v: number): string {
  return String(Math.round(v * 10) / 10).replace('.', ',')
}

export const pctDraftSchema = z
  .string()
  .refine(s => {
    const t = s.trim()
    return (
      t === '' || (pctTextRe.test(t) && Number(t.replace(',', '.')) <= 1000)
    )
  }, 'Percentual inválido.')
  .transform(s => {
    const t = s.trim()
    if (t === '') return null
    return Number(t.replace(',', '.'))
  })
