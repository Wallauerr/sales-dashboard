export interface WelcomeContent {
  summary: string
  features: string[]
  steps: string[]
}

export const WELCOME: WelcomeContent = {
  summary:
    'O Sulmag Dashboard transforma a planilha de vendas do SIGE em um painel para acompanhar faturamento, metas e o desempenho da equipe.',
  features: [
    'Faturamento, meta anual, ticket médio e funil de vendas por mês.',
    'Ranking por vendedor, participação por estado/região e histórico por pedido.',
    'Filtros por ano, vários meses e vários vendedores.',
    'Metas em % ou R$, com fator automático sobre o ano anterior.',
    'Fotos dos vendedores, vendedores desativados e backup dos dados.',
  ],
  steps: [
    'Clique em Importar e escolha a planilha do SIGE (.xlsx).',
    'Selecione o ano e, se quiser, filtre meses e vendedores no topo.',
    'Acompanhe os cartões de faturamento, meta, ticket e funil.',
    'Ajuste as metas em Configurações → Métricas.',
    'Gerencie vendedores, fotos, backup e atualizações em Configurações → Geral.',
  ],
}
