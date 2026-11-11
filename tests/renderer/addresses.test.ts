import { describe, expect, it } from 'vitest'
import {
  correctionsFromDrafts,
  draftsFromGroups,
  groupByCustomer,
  regionForState,
  validDraftCount,
} from '../../src/renderer/src/lib/addresses.ts'
import type { PendingAddress } from '../../src/shared/types.ts'

function pending(
  overrides: Partial<PendingAddress> & { code: string },
): PendingAddress {
  return {
    customer: 'Cliente',
    city: '',
    state: '',
    region: '',
    totalValue: 100,
    date: '2026-05-10',
    systemStatus: 'Pedido Faturado',
    ...overrides,
  }
}

describe('agrupamento de endereços pendentes', () => {
  it('agrupa por cliente somando os pedidos', () => {
    const groups = groupByCustomer([
      pending({ code: '1', customer: 'Beta', totalValue: 100 }),
      pending({ code: '2', customer: 'Alfa', totalValue: 200 }),
      pending({ code: '3', customer: 'Alfa', totalValue: 50 }),
    ])

    expect(groups.map(g => g.customer)).toEqual(['Alfa', 'Beta'])
    expect(groups[0].items.map(i => i.code)).toEqual(['2', '3'])
    expect(groups[0].totalValue).toBe(250)
    expect(groups[1].totalValue).toBe(100)
  })

  it('usa rótulo quando o cliente está vazio', () => {
    const groups = groupByCustomer([pending({ code: '1', customer: '  ' })])
    expect(groups[0].customer).toBe('Cliente não informado')
  })

  it('semeia os rascunhos com o endereço atual do primeiro pedido', () => {
    const groups = groupByCustomer([
      pending({ code: '1', customer: 'Alfa', city: 'Alegre', state: 'RS' }),
      pending({ code: '2', customer: 'Alfa' }),
    ])

    expect(draftsFromGroups(groups)).toEqual({
      Alfa: { city: 'Alegre', state: 'RS' },
    })
  })

  it('gera uma correção por pedido e descarta UF inválida', () => {
    const groups = groupByCustomer([
      pending({ code: '1', customer: 'Alfa' }),
      pending({ code: '2', customer: 'Alfa' }),
      pending({ code: '3', customer: 'Beta' }),
    ])
    const drafts = {
      Alfa: { city: '  Alegre  ', state: 'rs' },
      Beta: { city: 'Porto', state: 'ZZ' },
    }

    expect(correctionsFromDrafts(groups, drafts)).toEqual([
      { code: '1', city: 'Alegre', state: 'RS' },
      { code: '2', city: 'Alegre', state: 'RS' },
    ])
    expect(validDraftCount(groups, drafts)).toBe(1)
  })

  it('não gera correção sem UF preenchida', () => {
    const groups = groupByCustomer([pending({ code: '1' })])
    expect(
      correctionsFromDrafts(groups, { Cliente: { city: 'Alegre', state: '' } }),
    ).toEqual([])
  })

  it('deriva a região da UF', () => {
    expect(regionForState('rs')).toBe('Sul')
    expect(regionForState('SP')).toBe('Sudeste')
    expect(regionForState('')).toBe('')
  })
})
