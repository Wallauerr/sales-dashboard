import { describe, expect, it } from 'vitest'
import {
  fileName,
  MONTH_LABEL,
  originLabel,
  statusLabel,
} from '../../src/renderer/src/lib/labels'

describe('rótulos', () => {
  it('MONTH_LABEL cobre os 12 meses', () => {
    expect(Object.keys(MONTH_LABEL)).toHaveLength(12)
    expect(MONTH_LABEL.jan).toBe('Jan')
    expect(MONTH_LABEL.dez).toBe('Dez')
  })

  it('statusLabel corrige só o Pedido Nao Faturado', () => {
    expect(statusLabel('Pedido Nao Faturado')).toBe('Pedido Não Faturado')
    expect(statusLabel('Pedido')).toBe('Pedido')
  })

  it('originLabel mostra "Não informado" quando vazia', () => {
    expect(originLabel('')).toBe('Não informado')
    expect(originLabel('E-commerce')).toBe('E-commerce')
    expect(originLabel('Venda Direta')).toBe('Venda Direta')
  })

  it('fileName extrai o nome do caminho com qualquer separador', () => {
    expect(fileName('/a/b.xlsx')).toBe('b.xlsx')
    expect(fileName('C:\\pasta\\base.xlsx')).toBe('base.xlsx')
    expect(fileName('base.xlsx')).toBe('base.xlsx')
  })
})
