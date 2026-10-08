import { brl0, brlCompact, int, pct } from '@/lib/format'
import { MES_LABEL } from '@/lib/labels'
import type { KpiSnapshot, Mes } from '../../../../shared/types'
import { MESES } from '../../../../shared/types'

export type KpiDef = { title: string; value: string; hint?: string }

function variacao(atual: number, anterior: number): string | null {
  if (anterior <= 0) return null
  const v = (atual - anterior) / anterior
  return `${v >= 0 ? '+' : '-'}${pct(Math.abs(v))}`
}

export function periodoLabel(meses: Mes[]): string {
  if (meses.length === 1) return MES_LABEL[meses[0]]
  if (meses.length <= 3) return meses.map(m => MES_LABEL[m]).join('·')
  return `${meses.length} meses`
}

function vendNome(vendedores: string[]): string {
  if (vendedores.length === 1) return vendedores[0]
  return `${vendedores.length} vendedores`
}

export function buildKpis({
  ano,
  meses,
  vendedores,
  snap,
}: {
  ano: number
  meses: Mes[]
  vendedores: string[]
  snap: KpiSnapshot | null
}): { kpis: KpiDef[]; kgrid: string } {
  const mesAtivo = meses.length > 0
  const vendedorFiltro = vendedores.length > 0
  const kgrid = vendedorFiltro
    ? 'lg:grid-cols-3'
    : mesAtivo
      ? 'lg:grid-cols-6'
      : 'lg:grid-cols-7'

  const kpis: KpiDef[] = []
  if (!snap) return { kpis, kgrid }

  const mesLabel = periodoLabel(meses)
  const vendLabel = vendNome(vendedores)
  const mesIndexes = meses.map(m => MESES.indexOf(m))
  const metaPeriodo = mesAtivo
    ? mesIndexes.reduce((acc, i) => acc + snap.metasPorMes[i].meta, 0)
    : 0
  const metaPct =
    !vendedorFiltro && !mesAtivo && snap.metaAnual > 0
      ? snap.totalPeriodo / snap.metaAnual
      : 0
  const metaPeriodoPct =
    mesAtivo && !vendedorFiltro && metaPeriodo > 0
      ? snap.totalPeriodo / metaPeriodo
      : 0
  const restanteAno = snap.restanteAnoPorMes.dez
  const restanteMes =
    mesAtivo && !vendedorFiltro
      ? Math.max(metaPeriodo - snap.totalPeriodo, 0)
      : 0

  const totalQtd = mesAtivo
    ? mesIndexes.reduce((acc, i) => acc + snap.quantidadePorMes[MESES[i]], 0)
    : MESES.reduce((acc, m) => acc + snap.quantidadePorMes[m], 0)

  const mesesComDados = (() => {
    for (let i = MESES.length - 1; i >= 0; i--) {
      if (snap.faturamentoPorMes[MESES[i]] > 0) return i + 1
    }
    return 0
  })()

  const runRate =
    !mesAtivo && !vendedorFiltro && snap.totalPeriodo > 0 && mesesComDados > 0
      ? {
          projection: (snap.totalPeriodo / mesesComDados) * 12,
          elapsed: mesesComDados,
        }
      : null

  const quantHint = vendedorFiltro
    ? mesAtivo
      ? `vendas de ${vendLabel} em ${mesLabel}`
      : `vendas de ${vendLabel}`
    : mesAtivo
      ? `vendas em ${mesLabel}`
      : 'vendas no ano'

  const prevAno = ano - 1
  const prevPeriodo =
    mesAtivo && !vendedorFiltro
      ? mesIndexes.reduce(
          (acc, i) => acc + snap.metasPorMes[i].faturamentoAnoAnterior,
          0,
        )
      : MESES.slice(0, mesesComDados).reduce(
          (acc, _m, i) => acc + snap.metasPorMes[i].faturamentoAnoAnterior,
          0,
        )
  const shareVendedores =
    vendedorFiltro && snap.porVendedor.length > 0
      ? snap.porVendedor
          .filter(v => vendedores.includes(v.vendedor))
          .reduce((acc, v) => acc + v.share, 0)
      : undefined
  const faturamentoHint = (() => {
    if (vendedorFiltro) {
      return shareVendedores === undefined
        ? undefined
        : `part. ${pct(shareVendedores)} do ${mesAtivo ? mesLabel : ano}`
    }
    if (mesAtivo) {
      const delta = variacao(snap.totalPeriodo, prevPeriodo)
      return `${mesLabel} ${prevAno}: ${brlCompact(prevPeriodo)}${delta ? ` · ${delta}` : ''}`
    }
    const periodo =
      mesesComDados > 0 && mesesComDados < 12
        ? ` (${MES_LABEL[MESES[0]]}–${MES_LABEL[MESES[mesesComDados - 1]]})`
        : ''
    const delta = variacao(snap.totalPeriodo, prevPeriodo)
    return `vs ${prevAno}${periodo}: ${brlCompact(prevPeriodo)}${delta ? ` · ${delta}` : ''}`
  })()

  kpis.push({
    title: vendedorFiltro
      ? `Faturamento ${vendLabel}${mesAtivo ? ` · ${mesLabel}` : ''}`
      : mesAtivo
        ? `Faturamento ${mesLabel} ${ano}`
        : `Faturamento ${ano}`,
    value: brl0(snap.totalPeriodo),
    hint: faturamentoHint,
  })
  if (!vendedorFiltro) {
    kpis.push(
      mesAtivo
        ? {
            title: `Meta ${mesLabel}`,
            value: brl0(metaPeriodo),
            hint: 'meta do período (empresa)',
          }
        : {
            title: 'Meta anual',
            value: brl0(snap.metaAnual),
            hint: `base ${ano - 1} × ${(snap.fator * 100).toFixed(0)}%`,
          },
      {
        title: '% da meta',
        value: pct(mesAtivo ? metaPeriodoPct : metaPct),
        hint: mesAtivo ? 'realizado do período ÷ meta' : 'realizado ÷ meta',
      },
      {
        title: mesAtivo ? 'Restante p/ meta do período' : 'Restante p/ meta',
        value: mesAtivo
          ? restanteMes > 0
            ? brl0(restanteMes)
            : '—'
          : restanteAno > 0
            ? brl0(restanteAno)
            : '—',
        hint: mesAtivo
          ? restanteMes > 0
            ? 'no período'
            : 'meta atingida'
          : restanteAno > 0
            ? 'no acumulado de dez'
            : 'meta atingida',
      },
    )
    if (!mesAtivo) {
      kpis.push({
        title: 'Projeção (run-rate)',
        value: runRate ? brl0(runRate.projection) : '—',
        hint: runRate
          ? `${brl0(snap.totalPeriodo / runRate.elapsed)}/mês med em ${runRate.elapsed === 12 ? 'ano fechado' : `${runRate.elapsed} meses`}`
          : 'sem dados',
      })
    }
  }
  kpis.push(
    {
      title: 'Quantidade',
      value: int(totalQtd),
      hint: quantHint,
    },
    {
      title: 'Participação',
      value: pct(snap.participacaoEscopo),
      hint: `de ${brlCompact(snap.totalHistorico)}`,
    },
  )

  return { kpis, kgrid }
}
