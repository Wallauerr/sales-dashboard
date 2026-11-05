import { fakerPT_BR as faker } from '@faker-js/faker'

const STATUS_POOL = [
  'Pedido Faturado',
  'Pedido Faturado',
  'Pedido Faturado',
  'Pedido',
  'Pedido',
  'Pedido Aprovado Sem Faturamento',
  'Orçamento',
  'Pedido Cancelado',
]

const CATEGORY_POOL = ['Equipamentos', 'Equipamentos', 'Neodimio', 'Follow-Up']

const STATES = ['SP', 'RS', 'PR', 'SC', 'MG', 'RJ', 'BA', 'PE', 'GO', 'MT']

export interface SaleRowOverrides {
  code?: string
  status?: string
  category?: string
  seller?: string
  state?: string
  customer?: string
  value?: number
  month?: number
  year?: number
}

export function withSeed(seed: number): void {
  faker.seed(seed)
}

function fmtDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`
}

export function makeSaleRow(overrides: SaleRowOverrides = {}): unknown[] {
  const year = overrides.year ?? new Date().getFullYear()
  const month = overrides.month ?? faker.number.int({ min: 0, max: 11 })
  const day = faker.number.int({ min: 1, max: 28 })
  const date = fmtDate(year, month, day)
  const status = overrides.status ?? faker.helpers.arrayElement(STATUS_POOL)

  let quoteApproved = ''
  let orderApproved = ''
  let billingApproved = ''
  if (status === 'Orçamento') {
    quoteApproved = date
  } else if (
    status === 'Pedido' ||
    status === 'Pedido Aprovado Sem Faturamento'
  ) {
    orderApproved = date
  } else if (status === 'Pedido Faturado') {
    orderApproved = date
    billingApproved = date
  }

  return [
    overrides.code ?? String(faker.number.int({ min: 1000, max: 99999 })),
    date,
    quoteApproved,
    'X',
    status,
    overrides.seller ?? faker.person.fullName(),
    overrides.category ?? faker.helpers.arrayElement(CATEGORY_POOL),
    '',
    '',
    overrides.customer ?? `C${faker.number.int({ min: 100, max: 9999 })}`,
    faker.location.city(),
    overrides.state ?? faker.helpers.arrayElement(STATES),
    '',
    '',
    0,
    0,
    0,
    overrides.value ??
      faker.number.float({ min: 200, max: 20000, fractionDigits: 2 }),
    '',
    orderApproved,
    billingApproved,
    '',
  ]
}

export function makeSaleRows(
  count: number,
  options: { seed?: number; sellers?: string[] } = {},
): unknown[][] {
  if (options.seed !== undefined) withSeed(options.seed)
  const sellers =
    options.sellers ?? Array.from({ length: 6 }, () => faker.person.fullName())
  return Array.from({ length: count }, () =>
    makeSaleRow({ seller: faker.helpers.arrayElement(sellers) }),
  )
}
