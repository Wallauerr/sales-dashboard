import { describe, expect, it } from 'vitest'
import {
  brl,
  brl0,
  brlCompact,
  brlDraftSchema,
  brlHumanDate,
  brlInputValue,
  int,
  maskBrlText,
  pct,
} from '../../src/renderer/src/lib/format'

describe('formatação de moeda', () => {
  it('brl e brl0 usam pt-BR', () => {
    expect(brl(1234.5)).toBe('R$\u00A01.234,50')
    expect(brl0(1234.5)).toBe('R$\u00A01.235')
    expect(brl0(4600)).toBe('R$\u00A04.600')
  })

  it('brlCompact reduz milhar e milhão', () => {
    expect(brlCompact(999)).toBe('R$\u00A0999')
    expect(brlCompact(2000)).toBe('R$\u00A02\u00A0mil')
    expect(brlCompact(2000000)).toBe('R$\u00A02\u00A0mi')
  })

  it('int e pct usam pt-BR', () => {
    expect(int(3)).toBe('3')
    expect(int(10000)).toBe('10.000')
    expect(pct(0.25)).toBe('25%')
    expect(pct(2500 / 4600)).toBe('54,3%')
  })
})

describe('brlHumanDate', () => {
  it('formata ISO para data curta pt-BR', () => {
    expect(brlHumanDate('2026-07-12T00:00')).toBe('12/07/2026, 00:00')
  })

  it('devolve a entrada quando não for data válida', () => {
    expect(brlHumanDate('nao-e-data')).toBe('nao-e-data')
  })
})

describe('máscara de input BRL', () => {
  it('mascara inteiros com ponto de milhar', () => {
    expect(maskBrlText('1234')).toBe('1.234')
    expect(maskBrlText('99')).toBe('99')
    expect(maskBrlText('')).toBe('')
  })

  it('mantém até dois decimais após a vírgula', () => {
    expect(maskBrlText('1234,5')).toBe('1.234,5')
    expect(maskBrlText('1,234')).toBe('1,23')
    expect(maskBrlText('0,')).toBe('0,')
  })

  it('ignora caracteres não numéricos', () => {
    expect(maskBrlText('abc')).toBe('')
    expect(maskBrlText('12a34,')).toBe('1.234,')
  })

  it('brlInputValue transforma número em texto mascarado', () => {
    expect(brlInputValue(1234.5)).toBe('1.234,50')
  })

  it('brlDraftSchema valida vazio, valor válido e rejeita inválido', () => {
    expect(brlDraftSchema.safeParse('').success).toBe(true)
    expect(brlDraftSchema.parse('')).toBeNull()
    expect(brlDraftSchema.parse('1.234,50')).toBe(1234.5)
    expect(brlDraftSchema.parse('12,30')).toBe(12.3)
    expect(brlDraftSchema.safeParse('12,3').success).toBe(false)
    expect(brlDraftSchema.safeParse('abc').success).toBe(false)
  })
})
