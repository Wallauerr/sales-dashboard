import type { Sale } from '../../shared/types.ts'

export function rowToSale(r: Record<string, unknown>): Sale {
  return {
    code: String(r.codigo ?? ''),
    date: r.data ? String(r.data) : null,
    quoteApprovedDate: r.data_aprov_orcamento
      ? String(r.data_aprov_orcamento)
      : null,
    orderApprovedDate: r.data_aprov_pedido ? String(r.data_aprov_pedido) : null,
    billingApprovedDate: r.data_aprov_faturamento
      ? String(r.data_aprov_faturamento)
      : null,
    fiscalIssueDate: r.data_emissao_fiscal
      ? String(r.data_emissao_fiscal)
      : null,
    company: String(r.empresa ?? ''),
    systemStatus: String(r.status_sistema ?? ''),
    seller: String(r.vendedor ?? ''),
    category: String(r.categoria ?? ''),
    status: String(r.status ?? ''),
    origin: String(r.origem ?? ''),
    customer: String(r.cliente ?? ''),
    city: String(r.cidade ?? ''),
    state: String(r.estado ?? ''),
    region: String(r.regiao ?? ''),
    carrier: String(r.transportadora ?? ''),
    freight: Number(r.frete) || 0,
    discount: Number(r.desconto) || 0,
    commission: Number(r.comissao) || 0,
    totalValue: Number(r.valor_total) || 0,
    invoice: String(r.nfe ?? ''),
    month: r.mes ? (String(r.mes) as Sale['month']) : null,
    year: r.ano ? Number(r.ano) : null,
  }
}
