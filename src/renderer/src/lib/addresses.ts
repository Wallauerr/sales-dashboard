import {
  canonicalRegion,
  canonicalState,
  isValidState,
} from '../../../shared/states'
import type { AddressCorrection, PendingAddress } from '../../../shared/types'

export interface CustomerGroup {
  customer: string
  items: PendingAddress[]
  totalValue: number
}

export interface AddressDraft {
  state: string
}

export function groupByCustomer(pending: PendingAddress[]): CustomerGroup[] {
  const groups = new Map<string, CustomerGroup>()
  for (const item of pending) {
    const key = item.customer.trim() || 'Cliente não informado'
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
      group.totalValue += item.totalValue
    } else {
      groups.set(key, {
        customer: key,
        items: [item],
        totalValue: item.totalValue,
      })
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.customer.localeCompare(b.customer, 'pt-BR'),
  )
}

export function draftsFromGroups(
  groups: CustomerGroup[],
): Record<string, AddressDraft> {
  const drafts: Record<string, AddressDraft> = {}
  for (const group of groups) {
    drafts[group.customer] = { state: group.items[0].state }
  }
  return drafts
}

export function correctionsFromDrafts(
  groups: CustomerGroup[],
  drafts: Record<string, AddressDraft>,
): AddressCorrection[] {
  const corrections: AddressCorrection[] = []
  for (const group of groups) {
    const draft = drafts[group.customer]
    if (!draft) continue
    const state = canonicalState(draft.state)
    if (!isValidState(state)) continue
    for (const item of group.items) {
      corrections.push({ code: item.code, state })
    }
  }
  return corrections
}

export function validDraftCount(
  groups: CustomerGroup[],
  drafts: Record<string, AddressDraft>,
): number {
  return groups.filter(group => {
    const draft = drafts[group.customer]
    return draft ? isValidState(draft.state) : false
  }).length
}

export function regionForState(state: string): string {
  return canonicalRegion(canonicalState(state), '')
}

export function normalizeSaleCode(term: string): string {
  return term.trim().toUpperCase()
}
