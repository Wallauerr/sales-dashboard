import type {
  FunnelMonth,
  KpiSnapshot,
  Mes,
  MetaConfigView,
  MetasMes,
  MetasSetInput,
  SnapshotFilter,
  TicketMedio,
} from '../../shared/types.ts'
import {
  CATEGORIAS_FORA_FATURAMENTO,
  MESES,
  ROTULO_SEM_ESTADO,
  ROTULO_SEM_VENDEDOR,
  STATUS_APROVADO_SEM_FATURAMENTO,
  STATUS_FATURAMENTO,
} from '../../shared/types.ts'
import type { SalesDatabase } from '../db/database.ts'

const PRODUTOS_VENDEDORES: Record<string, string[]> = {
  Equipamentos: [
    'Bruno Keller',
    'Iago Gernhardt Benedetto',
    'Sul Magnéticos Equipamentos Industriais Eireli',
    'Vinicius Horn',
  ],
  Neodimio: ['Rosemeri', 'Ursula'],
  'Follow-Up': ['Stephani Strack da Silva'],
}

const REGIAO_MAPA: Record<string, { x: number; y: number }> = {
  Norte: { x: 30, y: 80 },
  Nordeste: { x: 90, y: 70 },
  'Centro-Oeste': { x: 50, y: 50 },
  Sudeste: { x: 80, y: 30 },
  Sul: { x: 60, y: 10 },
}

interface Escopo {
  where: string
  params: (string | number)[]
}

// Filtro de faturamento compartilhado: `Pedido`/`Pedido Faturado` sempre entram;
// `Pedido Aprovado Sem Faturamento` entra só quando a categoria não é remessa nem
// amostra (categoria vazia conta).
function faturamentoClause(): { sql: string; params: string[] } {
  const inStatus = STATUS_FATURAMENTO.map(() => '?').join(', ')
  const notLike = CATEGORIAS_FORA_FATURAMENTO.map(
    () => 'categoria NOT LIKE ?',
  ).join(' AND ')
  return {
    sql: `(status_sistema IN (${inStatus}) OR (status_sistema = ? AND ${notLike}))`,
    params: [
      ...STATUS_FATURAMENTO,
      STATUS_APROVADO_SEM_FATURAMENTO,
      ...CATEGORIAS_FORA_FATURAMENTO,
    ],
  }
}

// Sempre o ano, opcionalmente restrito a um mês e/ou vendedor (sem filtro nenhum
// = panorama anual). O filtro de faturamento é opcional porque o funil e o nº de
// fechamento contam cada status individualmente.
function escopo(
  ano: number,
  filtro: SnapshotFilter | null | undefined,
  opts: { faturamento?: boolean } = {},
): Escopo {
  const faturamento = opts.faturamento ?? true
  const where: string[] = ['ano = ?']
  const params: (string | number)[] = [ano]
  if (faturamento) {
    const clause = faturamentoClause()
    where.push(clause.sql)
    params.push(...clause.params)
  }
  if (filtro?.mes) {
    where.push('mes = ?')
    params.push(filtro.mes)
  }
  if (filtro?.vendedor) {
    where.push('vendedor = ?')
    params.push(filtro.vendedor)
  }
  return { where: `WHERE ${where.join(' AND ')}`, params }
}

function metricasPorMes(
  db: SalesDatabase,
  expr: 'SUM(valor_total)' | 'COUNT(*)',
  scope: Escopo,
): Record<Mes, number> {
  const rows = db.raw
    .prepare(`SELECT mes, ${expr} AS v FROM vendas ${scope.where} GROUP BY mes`)
    .all(...scope.params) as { mes: string | null; v: number }[]
  const out = Object.fromEntries(MESES.map(m => [m, 0])) as Record<Mes, number>
  for (const r of rows) {
    const key = r.mes as Mes
    if (Object.hasOwn(out, key)) out[key] = r.v
  }
  return out
}

function faturamentoPorMes(
  db: SalesDatabase,
  ano: number,
  filtro?: SnapshotFilter | null,
): Record<Mes, number> {
  return metricasPorMes(db, 'SUM(valor_total)', escopo(ano, filtro))
}

function quantidadePorMes(
  db: SalesDatabase,
  ano: number,
  filtro?: SnapshotFilter | null,
): Record<Mes, number> {
  return metricasPorMes(db, 'COUNT(*)', escopo(ano, filtro))
}

const COLUNA_GRUPO = {
  vendedor: 'vendedor',
  estado: 'estado',
  regiao: 'regiao',
} as const

function somaPor(
  db: SalesDatabase,
  coluna: keyof typeof COLUNA_GRUPO,
  scope: Escopo,
): { chave: string; valor: number }[] {
  const campo = COLUNA_GRUPO[coluna]
  return db.raw
    .prepare(
      `SELECT ${campo} AS chave, SUM(valor_total) AS valor FROM vendas
       ${scope.where} GROUP BY ${campo} ORDER BY valor DESC`,
    )
    .all(...scope.params) as { chave: string; valor: number }[]
}

function shareDe(valor: number, total: number): number {
  return total ? valor / total : 0
}

function porVendedor(
  db: SalesDatabase,
  scope: Escopo,
  total: number,
): { vendedor: string; valor: number; share: number }[] {
  return somaPor(db, 'vendedor', scope).map(r => ({
    vendedor: r.chave || ROTULO_SEM_VENDEDOR,
    valor: r.valor,
    share: shareDe(r.valor, total),
  }))
}

function porEstado(
  db: SalesDatabase,
  scope: Escopo,
  total: number,
): { estado: string; valor: number; share: number }[] {
  return somaPor(db, 'estado', scope).map(r => ({
    estado: r.chave || ROTULO_SEM_ESTADO,
    valor: r.valor,
    share: shareDe(r.valor, total),
  }))
}

function porRegiao(
  db: SalesDatabase,
  scope: Escopo,
  total: number,
): { regiao: string; valor: number; share: number; x: number; y: number }[] {
  return somaPor(db, 'regiao', scope).map(r => ({
    regiao: r.chave || ROTULO_SEM_ESTADO,
    valor: r.valor,
    share: shareDe(r.valor, total),
    ...(REGIAO_MAPA[r.chave] ?? { x: 0, y: 0 }),
  }))
}

function countStatus(
  db: SalesDatabase,
  scope: Escopo,
  mes: Mes,
  status: string,
): number {
  const r = db.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM vendas ${scope.where} AND mes = ? AND status_sistema = ?`,
    )
    .get(...scope.params, mes, status) as { n: number }
  return r.n
}

function funilPorMes(
  db: SalesDatabase,
  ano: number,
  filtro?: SnapshotFilter | null,
): FunnelMonth[] {
  const scope = escopo(ano, filtro, { faturamento: false })
  return MESES.map(mes => {
    const orcamento = countStatus(db, scope, mes, 'Orçamento')
    const pedido = countStatus(db, scope, mes, 'Pedido')
    const pedidoAprovadoSemFaturamento = countStatus(
      db,
      scope,
      mes,
      'Pedido Aprovado Sem Faturamento',
    )
    const pedidoCancelado = countStatus(db, scope, mes, 'Pedido Cancelado')
    const pedidoFaturado = countStatus(db, scope, mes, 'Pedido Faturado')
    const pedidoNaoFaturado = countStatus(db, scope, mes, 'Pedido Nao Faturado')
    return {
      mes,
      orcamento,
      pedido,
      pedidoAprovadoSemFaturamento,
      pedidoCancelado,
      pedidoFaturado,
      pedidoNaoFaturado,
      total:
        orcamento +
        pedido +
        pedidoAprovadoSemFaturamento +
        pedidoCancelado +
        pedidoFaturado +
        pedidoNaoFaturado,
    } as FunnelMonth
  })
}

function numeroFechamento(
  db: SalesDatabase,
  ano: number,
  filtro?: SnapshotFilter | null,
): Record<Mes, { orcamento: number; pedido: number }> {
  const scope = escopo(ano, filtro, { faturamento: false })
  const out = {} as Record<Mes, { orcamento: number; pedido: number }>
  for (const mes of MESES) {
    const orcamento =
      countStatus(db, scope, mes, 'Orçamento') +
      countStatus(db, scope, mes, 'Pedido Aprovado Sem Faturamento')
    const pedido =
      countStatus(db, scope, mes, 'Pedido') +
      countStatus(db, scope, mes, 'Pedido Cancelado') +
      countStatus(db, scope, mes, 'Pedido Faturado')
    out[mes] = { orcamento, pedido }
  }
  return out
}

function ticketMedio(
  db: SalesDatabase,
  ano: number,
  filtro?: SnapshotFilter | null,
): TicketMedio[] {
  const scope = escopo(ano, filtro)
  const out: TicketMedio[] = []
  for (const [produto, vendedores] of Object.entries(PRODUTOS_VENDEDORES)) {
    const q = `SELECT COALESCE(SUM(valor_total), 0) AS valor, COUNT(*) AS volume FROM vendas
               ${scope.where} AND vendedor IN (${vendedores.map(() => '?').join(', ')})`
    const r = db.raw.prepare(q).get(...scope.params, ...vendedores) as {
      valor: number
      volume: number
    }
    out.push({
      produto,
      valor: r.valor,
      volume: r.volume,
      ticket: r.volume ? r.valor / r.volume : 0,
    })
  }
  return out
}

export function getSnapshot(
  db: SalesDatabase,
  ano: number,
  filtro: SnapshotFilter = {},
): KpiSnapshot {
  const faturamento = faturamentoPorMes(db, ano, filtro)
  const totalPeriodo = MESES.reduce((acc, m) => acc + faturamento[m], 0)
  const totalHistoricoClause = faturamentoClause()
  const totalHistorico = (
    db.raw
      .prepare(
        `SELECT COALESCE(SUM(valor_total),0) AS v FROM vendas WHERE ${totalHistoricoClause.sql}`,
      )
      .get(...totalHistoricoClause.params) as { v: number }
  ).v

  const baseAno = ano - 1
  const faturamentoBase = faturamentoPorMes(db, baseAno)
  const faturamentoGlobal = faturamentoPorMes(db, ano)
  const totalBase = MESES.reduce((acc, m) => acc + faturamentoBase[m], 0)
  const totalAno = MESES.reduce((acc, m) => acc + faturamentoGlobal[m], 0)
  const fator = db.getFator(ano)
  const metaAnualBase = totalBase
  const metaAnualAuto = totalBase * fator

  // Meta anual e por mês podem ser fixadas pelo usuário; sem override o mês cai
  // na meta automática (ano anterior × fator) ou na anual distribuída pela
  // participação do mês no ano anterior.
  const anualCustom = db.getMetaAnual(ano)
  const mesesCustom = db.getMetasMesOverride(ano)
  const shareDeBase = (mes: Mes): number =>
    totalBase ? faturamentoBase[mes] / totalBase : 1 / MESES.length

  const metasPorMes: MetasMes[] = MESES.map(mes => {
    const faturamentoAnoAnterior = faturamentoBase[mes]
    const meta =
      mesesCustom[mes] ?? (anualCustom ?? metaAnualAuto) * shareDeBase(mes)
    const atual = faturamentoGlobal[mes]
    return {
      mes,
      faturamentoAnoAnterior,
      meta,
      acima: atual >= meta ? atual : 0,
      abaixo: atual <= meta ? atual : 0,
      restanteMes: meta - atual,
    }
  })

  const metaAnual = metasPorMes.reduce((acc, mes) => acc + mes.meta, 0)
  const metaPersonalizada =
    anualCustom !== null || Object.keys(mesesCustom).length > 0

  const acumuladoPorMes = {} as Record<Mes, number>
  const restanteAnoPorMes = {} as Record<Mes, number>
  let acc = 0
  for (const mes of MESES) {
    acc += faturamento[mes]
    acumuladoPorMes[mes] = acc
    restanteAnoPorMes[mes] = metaAnual - acc
  }

  return {
    ano,
    totalPeriodo,
    totalHistorico,
    participacaoAno: totalHistorico ? totalAno / totalHistorico : 0,
    participacaoEscopo: totalHistorico ? totalPeriodo / totalHistorico : 0,
    faturamentoPorMes: faturamento,
    quantidadePorMes: quantidadePorMes(db, ano, filtro),
    porVendedor: porVendedor(
      db,
      escopo(ano, { ...filtro, vendedor: null }),
      totalAno,
    ),
    porEstado: porEstado(db, escopo(ano, filtro), totalAno),
    porRegiao: porRegiao(db, escopo(ano, filtro), totalAno),
    funilPorMes: funilPorMes(db, ano, filtro),
    numeroFechamento: numeroFechamento(db, ano, filtro),
    ticketMedio: ticketMedio(db, ano, filtro),
    metaAnual: Number(metaAnual.toFixed(2)),
    metaAnualBase: Number(metaAnualBase.toFixed(2)),
    metaAnualAuto: Number(metaAnualAuto.toFixed(2)),
    metaPersonalizada,
    fator,
    metasPorMes,
    acumuladoPorMes,
    restanteAnoPorMes,
  }
}

export function getMetaConfig(db: SalesDatabase, ano: number): MetaConfigView {
  const baseAno = ano - 1
  const faturamentoBase = faturamentoPorMes(db, baseAno)
  const totalBase = MESES.reduce((acc, mes) => acc + faturamentoBase[mes], 0)
  const fator = db.getFator(ano)
  const metaAnualAuto = totalBase * fator
  const anualCustom = db.getMetaAnual(ano)
  const mesesCustom = db.getMetasMesOverride(ano)
  const shareDeBase = (mes: Mes): number =>
    totalBase ? faturamentoBase[mes] / totalBase : 1 / MESES.length

  const metasEfetivas = MESES.map(
    mes =>
      mesesCustom[mes] ?? (anualCustom ?? metaAnualAuto) * shareDeBase(mes),
  )
  const metasAuto = Object.fromEntries(
    MESES.map(mes => [mes, faturamentoBase[mes] * fator]),
  ) as Record<Mes, number>

  return {
    ano,
    fator,
    baseAno: totalBase,
    metaAnual: Number(
      metasEfetivas.reduce((acc, mes) => acc + mes, 0).toFixed(2),
    ),
    metaAnualAuto: Number(metaAnualAuto.toFixed(2)),
    anualCustom,
    mesesCustom,
    metasAuto,
    metasEfetivas: Object.fromEntries(
      MESES.map((mes, index) => [mes, metasEfetivas[index]]),
    ) as Record<Mes, number>,
  }
}

export function setMetaConfig(
  db: SalesDatabase,
  ano: number,
  input: MetasSetInput,
): void {
  db.setMetaAnual(ano, input.anual)
  db.setMetasMesOverride(ano, input.meses)
}
