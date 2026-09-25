import type { Sale } from "../../shared/types.ts";

export function rowToSale(r: Record<string, unknown>): Sale {
  return {
    codigo: String(r.codigo ?? ""),
    data: r.data ? String(r.data) : null,
    dataAprovOrcamento: r.data_aprov_orcamento ? String(r.data_aprov_orcamento) : null,
    dataAprovPedido: r.data_aprov_pedido ? String(r.data_aprov_pedido) : null,
    dataAprovFaturamento: r.data_aprov_faturamento ? String(r.data_aprov_faturamento) : null,
    dataEmissaoFiscal: r.data_emissao_fiscal ? String(r.data_emissao_fiscal) : null,
    empresa: String(r.empresa ?? ""),
    statusSistema: String(r.status_sistema ?? ""),
    vendedor: String(r.vendedor ?? ""),
    categoria: String(r.categoria ?? ""),
    status: String(r.status ?? ""),
    origem: String(r.origem ?? ""),
    cliente: String(r.cliente ?? ""),
    cidade: String(r.cidade ?? ""),
    estado: String(r.estado ?? ""),
    regiao: String(r.regiao ?? ""),
    transportadora: String(r.transportadora ?? ""),
    frete: Number(r.frete) || 0,
    desconto: Number(r.desconto) || 0,
    comissao: Number(r.comissao) || 0,
    valorTotal: Number(r.valor_total) || 0,
    nfe: String(r.nfe ?? ""),
    mes: r.mes ? (String(r.mes) as Sale["mes"]) : null,
    ano: r.ano ? Number(r.ano) : null,
  };
}