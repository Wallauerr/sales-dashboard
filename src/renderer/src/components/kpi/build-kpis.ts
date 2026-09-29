import { brl0, brlCompact, int, pct } from '@/lib/format'
import { MES_LABEL } from '@/lib/labels'
import type { KpiSnapshot, Mes } from '../../../../shared/types'
import { MESES, STATUS_FATURAMENTO } from '../../../../shared/types'

export type KpiDef = { title: string; value: string; hint?: string }

export function buildKpis({
  ano,
  mes,
  vendedor,
  snap,
}: {
  ano: number
  mes: Mes | 'todos'
  vendedor: string | null
  snap: KpiSnapshot | null
}): { kpis: KpiDef[]; kgrid: string } {
  const mesAtivo = mes !== 'todos'
  const kgrid = vendedor
    ? 'lg:grid-cols-3'
    : mesAtivo
      ? 'lg:grid-cols-6'
      : 'lg:grid-cols-7'

  const kpis: KpiDef[] = []
  if (!snap) return { kpis, kgrid }

  const mesIndex = mesAtivo ? MESES.indexOf(mes as Mes) : -1
  const metaMes = mesAtivo ? snap.metasPorMes[mesIndex].meta : 0
  const faturamentoMes = mesAtivo ? snap.faturamentoPorMes[mes as Mes] : 0
  const metaPct =
    !vendedor && !mesAtivo && snap.metaAnual > 0
      ? snap.totalPeriodo / snap.metaAnual
      : 0
  const metaMesPct =
    mesAtivo && metaMes > 0 ? (faturamentoMes ?? 0) / metaMes : 0
  const restanteAno = snap.restanteAnoPorMes.dez
  const restanteMes = mesAtivo
    ? Math.max(metaMes - (faturamentoMes ?? 0), 0)
    : 0

  const totalQtd = mesAtivo
    ? snap.quantidadePorMes[mes as Mes]
    : MESES.reduce((acc, m) => acc + snap.quantidadePorMes[m], 0)

  const runRate =
    !mesAtivo && !vendedor && snap.totalPeriodo > 0
      ? (() => {
          const now = new Date()
          const elapsed = now.getFullYear() === ano ? now.getMonth() + 1 : 12
          return elapsed > 0
            ? { projection: (snap.totalPeriodo / elapsed) * 12, elapsed }
            : null
        })()
      : null

  const quantHint = vendedor
    ? mesAtivo
      ? `vendas de ${vendedor} em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : `vendas de ${vendedor} (1 por linha)`
    : mesAtivo
      ? `vendas em ${MES_LABEL[mes as Mes]} (1 por linha)`
      : 'vendas no ano (1 por linha)'

  kpis.push({
    title: vendedor
      ? `Faturamento ${vendedor}${mesAtivo ? ` · ${MES_LABEL[mes as Mes]}` : ''}`
      : mesAtivo
        ? `Faturamento ${MES_LABEL[mes as Mes]} ${ano}`
        : `Faturamento ${ano}`,
    value: brl0(snap.totalPeriodo),
    hint: `status ${STATUS_FATURAMENTO.join(' + ')}`,
  })
  if (!vendedor) {
    kpis.push(
      mesAtivo
        ? {
            title: `Meta ${MES_LABEL[mes as Mes]}`,
            value: brl0(metaMes),
            hint: 'meta do mês (empresa)',
          }
        : {
            title: 'Meta anual',
            value: brl0(snap.metaAnual),
            hint: `base ${ano - 1} × ${(snap.fator * 100).toFixed(0)}%`,
          },
      {
        title: '% da meta',
        value: pct(mesAtivo ? metaMesPct : metaPct),
        hint: mesAtivo ? 'realizado do mês ÷ meta' : 'realizado ÷ meta',
      },
      {
        title: mesAtivo ? 'Restante p/ meta do mês' : 'Restante p/ meta',
        value: mesAtivo
          ? restanteMes > 0
            ? brl0(restanteMes)
            : '—'
          : restanteAno > 0
            ? brl0(restanteAno)
            : '—',
        hint: mesAtivo
          ? restanteMes > 0
            ? 'no mês'
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
