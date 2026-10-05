import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import * as XLSX from 'xlsx'

import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import {
  getMetaConfig,
  getSnapshot,
  setMetaConfig,
} from '../src/main/kpis/index.ts'
import { FOTO_MAX_BYTES, lerFotoEscolhida } from '../src/main/photos/pick.ts'
import {
  boundsDaTelaDoCursor,
  boundsVisiveis,
  telaDoPonto,
  telaDosBounds,
} from '../src/main/window-maximize.ts'

const HEADERS = [
  'Código',
  'Data',
  'Data Aprov Orçamento',
  'Empresa',
  'Status Sistema',
  'Vendedor',
  'Categoria',
  'Status',
  'Origem',
  'Cliente',
  'Cidade',
  'Estado',
  'Região',
  'Transportadora',
  'Frete (R$)',
  'Desconto (R$)',
  'Comissão (R$)',
  'Valor Total(R$)',
  'NF-e/NFS-e',
  'Data Aprov Pedido',
  'Data Aprov Faturamento',
  'Data Emissão Fiscal',
]

const ROWS: unknown[][] = [
  [
    '1',
    '05/01/2025',
    '',
    'X',
    'Pedido Faturado',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'A',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '2',
    '10/02/2025',
    '',
    'X',
    'Pedido Faturado',
    'Rosemeri',
    'Neodimio',
    '',
    '',
    'B',
    'Porto',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '10',
    '15/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'C1',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    1000,
    '',
  ],
  [
    '11',
    '16/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Rosemeri',
    'Neodimio',
    '',
    '',
    'C2',
    'Porto',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    2000,
    '',
  ],
  [
    '12',
    '17/01/2026',
    '',
    'X',
    'Pedido Faturado',
    'Stephani Strack da Silva',
    'Follow-Up',
    '',
    '',
    'C3',
    'Lins',
    'SP',
    'Sudeste',
    '',
    0,
    0,
    0,
    3000,
    '',
  ],
  [
    '13',
    '20/01/2026',
    '20/01/2026',
    'X',
    'Orçamento',
    'Bruno Keller',
    'Equipamentos',
    '',
    '',
    'C4',
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    500,
    '',
  ],
  [
    '14',
    '05/02/2026',
    '',
    'X',
    'Pedido',
    'Ursula',
    'Neodimio',
    '',
    '',
    'C5',
    'Curitiba',
    'PR',
    'Sul',
    '',
    0,
    0,
    0,
    4000,
    '',
  ],
]

function writeWorkbook(rows: unknown[][]): string {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Base')
  const filePath = join(
    tmpdir(),
    `smoke-base-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`,
  )
  writeFileSync(filePath, XLSX.write(wb, { type: 'buffer' }))
  return filePath
}

function check(label: string, got: unknown, expected: unknown): void {
  assert.deepEqual(
    got,
    expected,
    `${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`,
  )
  console.log(`PASS ${label}`)
}

async function main(): Promise<void> {
  const db = SalesDatabase.open(new DatabaseSync(':memory:'))
  const filePath = writeWorkbook(ROWS)

  const result = await importWorkbook(db, filePath)
  check('import inserted', result.inserted, ROWS.length)

  const s = await getSnapshot(db, 2026)
  check('totalPeriodo 2026', s.totalPeriodo, 10000)
  check('totalHistorico', s.totalHistorico, 12000)
  check('metaAnual 2026', s.metaAnual, 2300)
  check('quantidade jan', s.quantidadePorMes.jan, 3)
  check('quantidade fev', s.quantidadePorMes.fev, 1)
  check('faturamento jan', s.faturamentoPorMes.jan, 6000)
  check('faturamento fev', s.faturamentoPorMes.fev, 4000)
  check(
    'funil jan',
    {
      orcamento: s.funilPorMes[0].orcamento,
      faturado: s.funilPorMes[0].pedidoFaturado,
    },
    { orcamento: 1, faturado: 3 },
  )
  check('fechamento jan', s.numeroFechamento.jan, { orcamento: 1, pedido: 3 })
  check(
    'ticket Equipamentos',
    s.ticketMedio.find(t => t.produto === 'Equipamentos')?.ticket,
    1000,
  )
  check(
    'ticket Follow-Up',
    s.ticketMedio.find(t => t.produto === 'Follow-Up')?.ticket,
    3000,
  )

  const sorted = [...s.porVendedor].sort((a, b) => b.valor - a.valor)
  check('vendedores top', sorted[0], {
    vendedor: 'Ursula',
    valor: 4000,
    share: 0.4,
  })

  console.log('\n— Metas personalizadas (configuração) —')
  db.setMetaAnual(2026, 4600)
  const sAnual = await getSnapshot(db, 2026)
  check(
    'meta anual personalizada reflete no snapshot',
    {
      metaAnual: sAnual.metaAnual,
      metaAnualAuto: sAnual.metaAnualAuto,
      metaPersonalizada: sAnual.metaPersonalizada,
    },
    { metaAnual: 4600, metaAnualAuto: 2300, metaPersonalizada: true },
  )
  const cfg = getMetaConfig(db, 2026)
  check(
    'config view com meta anual custom',
    {
      anual: cfg.anualCustom,
      metaAnual: cfg.metaAnual,
      metaAnualAuto: cfg.metaAnualAuto,
      baseAno: cfg.baseAno,
      fator: cfg.fator,
    },
    {
      anual: 4600,
      metaAnual: 4600,
      metaAnualAuto: 2300,
      baseAno: 2000,
      fator: 1.15,
    },
  )
  check(
    'meta anual distribui proporcional ao ano anterior',
    {
      jan: cfg.metasEfetivas.jan,
      fev: cfg.metasEfetivas.fev,
      autoJan: cfg.metasAuto.jan,
    },
    { jan: 2300, fev: 2300, autoJan: 1150 },
  )

  setMetaConfig(db, 2026, { anual: null, meses: { jan: 3000 } })
  const sMes = await getSnapshot(db, 2026)
  check(
    'meta mensal override soma com automática dos demais',
    {
      metaAnual: sMes.metaAnual,
      metaJan: sMes.metasPorMes[0].meta,
      metaFev: sMes.metasPorMes[1].meta,
    },
    { metaAnual: 4150, metaJan: 3000, metaFev: 1150 },
  )

  setMetaConfig(db, 2026, { anual: null, meses: {} })
  const sRestaurada = await getSnapshot(db, 2026)
  check(
    'restaurar automático zera personalização',
    {
      metaAnual: sRestaurada.metaAnual,
      metaPersonalizada: sRestaurada.metaPersonalizada,
      metaJan: sRestaurada.metasPorMes[0].meta,
    },
    { metaAnual: 2300, metaPersonalizada: false, metaJan: 1150 },
  )
  check(
    'limpa chaves de meta',
    db.getMeta('metas_mes:2026') === null &&
      db.getMeta('meta_anual:2026') === null,
    true,
  )

  console.log(
    '\n— Reconciliação diária por codigo (orçamento evolui para pedido) —',
  )
  const db2 = SalesDatabase.open(new DatabaseSync(':memory:'))
  const dayA = writeWorkbook([
    [
      '900',
      '10/05/2026',
      '10/05/2026',
      '',
      'Orçamento',
      'V1',
      'Equipamentos',
      '',
      '',
      'CA',
      'Alegre',
      'RS',
      'Sul',
      '',
      0,
      0,
      0,
      5000,
      '',
      '',
      '',
      '',
    ],
    [
      '901',
      '01/01/2026',
      '',
      '',
      'Pedido Faturado',
      'V2',
      'Neodimio',
      '',
      '',
      'CB',
      'Porto',
      'RS',
      'Sul',
      '',
      0,
      0,
      0,
      2000,
      '',
      '',
      '',
      '',
    ],
  ])
  const dayB = writeWorkbook([
    [
      '900',
      '12/07/2026',
      '10/05/2026',
      '',
      'Pedido Faturado',
      'V1',
      'Equipamentos',
      '',
      '',
      'CA',
      'Alegre',
      'RS',
      'Sul',
      '',
      0,
      0,
      0,
      5000,
      '',
      '',
      '12/07/2026',
      '',
    ],
    [
      '902',
      '11/07/2026',
      '11/07/2026',
      '',
      'Orçamento',
      'V3',
      'Follow-Up',
      '',
      '',
      'CC',
      'Lins',
      'SP',
      'Sudeste',
      '',
      0,
      0,
      0,
      400,
      '',
      '',
      '',
      '',
    ],
  ])

  const rA = await importWorkbook(db2, dayA)
  check('dia A: 2 inseridos', rA.inserted, 2)
  const rB = await importWorkbook(db2, dayB)
  check(
    'dia B: 1 novo + 1 atualizado',
    { inserted: rB.inserted, updated: rB.updated },
    { inserted: 1, updated: 1 },
  )
  check(
    'total de linhas sem duplicar',
    (db2.raw.prepare('SELECT COUNT(*) AS n FROM vendas').get() as { n: number })
      .n,
    3,
  )

  const s2 = await getSnapshot(db2, 2026)
  check(
    'faturamento maio zerado (900 saiu do orçamento)',
    s2.faturamentoPorMes.mai,
    0,
  )
  check(
    'faturamento julho inclui venda aprovada',
    s2.faturamentoPorMes.jul,
    5000,
  )
  check(
    'funil julho',
    {
      orcamento: s2.funilPorMes[6].orcamento,
      faturado: s2.funilPorMes[6].pedidoFaturado,
    },
    { orcamento: 1, faturado: 1 },
  )
  check('quantidade julho', s2.quantidadePorMes.jul, 1)
  check('total do período 2026', s2.totalPeriodo, 7000)

  console.log('\n— Histórico de imports e evolução por codigo —')
  const imports = db2.listImports()
  check('log de imports: 2 registros', imports.length, 2)
  check(
    'log import dia A',
    {
      totalRows: imports[1]?.totalRows,
      inserted: imports[1]?.inserted,
      updated: imports[1]?.updated,
      discarded: imports[1]?.discarded,
    },
    { totalRows: 2, inserted: 2, updated: 0, discarded: 0 },
  )
  check(
    'log import dia B',
    {
      totalRows: imports[0]?.totalRows,
      inserted: imports[0]?.inserted,
      updated: imports[0]?.updated,
    },
    { totalRows: 2, inserted: 1, updated: 1 },
  )

  const h900 = db2.getCodigoHistory('900')
  check(
    'codigo 900: estado atual',
    { venda: h900.venda?.statusSistema, valor: h900.venda?.valorTotal },
    { venda: 'Pedido Faturado', valor: 5000 },
  )
  check(
    'codigo 900: evolução nos imports',
    h900.events.map(e => `${e.op}:${e.statusSistema}`),
    ['inserted:Orçamento', 'updated:Pedido Faturado'],
  )
  check(
    'codigo 900: primeiro evento guarda valor/mês',
    {
      valor: h900.events[0]?.valorTotal,
      mes: h900.events[0]?.mes,
      ano: h900.events[0]?.ano,
    },
    { valor: 5000, mes: 'mai', ano: 2026 },
  )
  check(
    'codigo 901 reexportado sem mudança gera 1 só evento',
    db2.getCodigoHistory('901').events.length,
    1,
  )
  const h999 = db2.getCodigoHistory('999')
  check(
    'codigo inexistente',
    { venda: h999.venda, eventos: h999.events.length },
    { venda: null, eventos: 0 },
  )

  console.log('\n— Filtros de escopo (mês e vendedor) —')
  const sUrsula = await getSnapshot(db, 2026, { vendedor: 'Ursula' })
  check('filtro vendedor faturamento', sUrsula.totalPeriodo, 4000)
  check(
    'filtro vendedor mantém lista completa',
    sUrsula.porVendedor.some(v => v.vendedor === 'Ursula'),
    true,
  )
  const sFev = await getSnapshot(db, 2026, { mes: 'fev' })
  check('filtro mês faturamento', sFev.totalPeriodo, 4000)
  check(
    'filtro mês zera outros meses',
    Object.values(sFev.faturamentoPorMes).filter(v => v > 0).length,
    1,
  )
  const sUrsulaFev = await getSnapshot(db, 2026, {
    mes: 'fev',
    vendedor: 'Ursula',
  })
  check('filtro mês+vendedor', sUrsulaFev.totalPeriodo, 4000)

  console.log('\n— Regra de faturamento (pedido aprovado S/F por categoria) —')
  const db3 = SalesDatabase.open(new DatabaseSync(':memory:'))
  const ruleRow = (
    codigo: string,
    status: string,
    categoria: string,
    valor: number,
  ): unknown[] => [
    codigo,
    '05/01/2026',
    '',
    'X',
    status,
    'V1',
    categoria,
    '',
    '',
    codigo,
    'Alegre',
    'RS',
    'Sul',
    '',
    0,
    0,
    0,
    valor,
    '',
  ]
  const ruleRows: unknown[][] = [
    ruleRow('R1', 'Pedido Faturado', '', 1000),
    ruleRow('R2', 'Pedido', '', 2000),
    ruleRow('R3', 'Pedido Aprovado Sem Faturamento', 'Remessa', 5000),
    ruleRow('R4', 'Pedido Aprovado Sem Faturamento', 'Amostra', 3000),
    ruleRow(
      'R5',
      'Pedido Aprovado Sem Faturamento',
      'Remessa amostra grátis',
      7000,
    ),
    ruleRow('R6', 'Pedido Aprovado Sem Faturamento', 'Operacional', 400),
    ruleRow('R7', 'Pedido Aprovado Sem Faturamento', '', 600),
    ruleRow('R8', 'pedido', '', 800),
    ruleRow('R9', 'Pedido Cancelado', '', 9000),
    ruleRow('R10', 'Orçamento', '', 10000),
  ]
  await importWorkbook(db3, writeWorkbook(ruleRows))
  const sRule = await getSnapshot(db3, 2026)
  check(
    'regra: faturamento soma S/F sem remessa/amostra',
    sRule.faturamentoPorMes.jan,
    4800,
  )
  check('regra: totalPeriodo consistente', sRule.totalPeriodo, 4800)
  check(
    'regra: quantidade conta só as incluídas',
    sRule.quantidadePorMes.jan,
    5,
  )
  check(
    'regra: status minúsculo normalizado no ingest',
    (
      db3.raw
        .prepare("SELECT status_sistema AS s FROM vendas WHERE codigo = 'R8'")
        .get() as { s: string }
    ).s,
    'Pedido',
  )
  check(
    'regra: funil separa pedido de faturado',
    {
      orcamento: sRule.funilPorMes[0].orcamento,
      pedido: sRule.funilPorMes[0].pedido,
      aprovadoSF: sRule.funilPorMes[0].pedidoAprovadoSemFaturamento,
      faturado: sRule.funilPorMes[0].pedidoFaturado,
      cancelado: sRule.funilPorMes[0].pedidoCancelado,
    },
    { orcamento: 1, pedido: 2, aprovadoSF: 5, faturado: 1, cancelado: 1 },
  )

  console.log('\n— Rótulos de dados ausentes (UF/região/vendedor) —')
  const db4 = SalesDatabase.open(new DatabaseSync(':memory:'))
  const labelRow = (
    codigo: string,
    estado: string,
    regiao: string,
    vendedor: string,
    valor: number,
  ): unknown[] => [
    codigo,
    '05/01/2026',
    '',
    'X',
    'Pedido Faturado',
    vendedor,
    'Equipamentos',
    '',
    '',
    codigo,
    'Cidade',
    estado,
    regiao,
    '',
    0,
    0,
    0,
    valor,
    '',
  ]
  await importWorkbook(
    db4,
    writeWorkbook([
      labelRow('L1', '', '', '', 1200),
      labelRow('L2', 'SP', 'Sudeste', 'Ana', 800),
    ]),
  )
  const sLabel = await getSnapshot(db4, 2026)
  check(
    'rótulo estado ausente',
    sLabel.porEstado.find(e => e.estado === 'Não informado'),
    { estado: 'Não informado', valor: 1200, share: 0.6 },
  )
  check(
    'rótulo região ausente',
    sLabel.porRegiao.find(r => r.regiao === 'Não informado'),
    { regiao: 'Não informado', valor: 1200, share: 0.6, x: 0, y: 0 },
  )
  check(
    'rótulo vendedor ausente',
    sLabel.porVendedor.find(v => v.vendedor === 'VENDAS'),
    { vendedor: 'VENDAS', valor: 1200, share: 0.6 },
  )

  console.log('\n— Foto escolhida em Configurações —')
  db.setVendedorFoto('Rosemeri', 'image/jpeg', Buffer.from([1, 2, 3, 4]))
  check(
    'foto gravada',
    db.listVendedorFotos().map(f => f.vendedor),
    ['Rosemeri'],
  )
  check('mime gravado', db.getVendedorFoto('Rosemeri')?.mime, 'image/jpeg')
  check(
    'bytes no banco',
    (db.getVendedorFoto('Rosemeri')?.img.length ?? 0) > 0,
    true,
  )
  db.setVendedorFoto('Rosemeri', 'image/png', Buffer.from([9, 9]))
  check(
    'trocar foto sobrescreve',
    db.getVendedorFoto('Rosemeri')?.mime,
    'image/png',
  )
  check('trocar foto nao duplica', db.listVendedorFotos().length, 1)

  db.removeVendedorFoto('Rosemeri')
  check(
    'remover foto volta ao avatar de iniciais',
    db.getVendedorFoto('Rosemeri'),
    null,
  )

  console.log('\n— Lista de vendedores para Configurações —')
  const nomes = db.listVendedores()
  check('lista sem o pseudo-vendedor VENDAS', nomes.includes('VENDAS'), false)
  check('lista traz quem tem venda', nomes.includes('Rosemeri'), true)

  console.log('\n— Validação da foto escolhida —')
  const naoImagem = join(tmpdir(), `smoke-nao-imagem-${Date.now()}.txt`)
  writeFileSync(naoImagem, 'isto nao e uma imagem')
  await assert.rejects(() => lerFotoEscolhida(naoImagem), /não é uma imagem/)
  const grande = join(tmpdir(), `smoke-grande-${Date.now()}.png`)
  writeFileSync(grande, Buffer.alloc(FOTO_MAX_BYTES + 1))
  await assert.rejects(() => lerFotoEscolhida(grande), /limite é/)
  const jpg = join(tmpdir(), `smoke-foto-${Date.now()}.jpg`)
  writeFileSync(jpg, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))
  check(
    'jpg reconhecido pela assinatura',
    (await lerFotoEscolhida(jpg)).mime,
    'image/jpeg',
  )

  console.log('\n— Maximizar/restaurar em multi-monitor —')
  // Dois monitores lado a lado: o da esquerda é menor, como um notebook + monitor.
  const telas = [
    { id: 1, workArea: { x: 0, y: 0, width: 1280, height: 800 } },
    { id: 2, workArea: { x: 1280, y: 0, width: 2560, height: 1440 } },
  ]
  const janelaNaEsquerda = { x: 40, y: 60, width: 1280, height: 840 }

  check(
    'janela pega a tela pela maior área em comum',
    telaDosBounds(janelaNaEsquerda, telas)?.id,
    1,
  )
  // Uma janela bem em cima da emenda fica com a tela que ela cobre mais.
  check(
    'janela quase toda na direita fica na direita',
    telaDosBounds({ x: 1240, y: 100, width: 1280, height: 840 }, telas)?.id,
    2,
  )
  check(
    'janela quase toda na esquerda fica na esquerda',
    telaDosBounds({ x: 30, y: 100, width: 1280, height: 840 }, telas)?.id,
    1,
  )
  check('cursor na esquerda', telaDoPonto({ x: 300, y: 400 }, telas)?.id, 1)
  check('cursor na direita', telaDoPonto({ x: 3000, y: 700 }, telas)?.id, 2)
  check(
    'cursor no canto inferior direito da tela esquerda',
    telaDoPonto({ x: 1279, y: 799 }, telas)?.id,
    1,
  )

  check(
    'mesma tela: não mexe em nada',
    boundsDaTelaDoCursor(
      { x: 300, y: 400 },
      telaDosBounds(janelaNaEsquerda, telas),
      telas,
    ),
    null,
  )
  check(
    'cursor na outra tela: maximiza na outra',
    boundsDaTelaDoCursor(
      { x: 3000, y: 700 },
      telaDosBounds(janelaNaEsquerda, telas),
      telas,
    ),
    telas[1].workArea,
  )
  check(
    'sem tela da janela, ainda mira o cursor',
    boundsDaTelaDoCursor({ x: 3000, y: 700 }, null, telas),
    telas[1].workArea,
  )
  check(
    'tela nenhuma não move a janela',
    boundsDaTelaDoCursor({ x: 1, y: 1 }, null, []),
    null,
  )

  check(
    'restaura se o último tamanho ainda encosta em tela',
    boundsVisiveis(janelaNaEsquerda, telas),
    true,
  )
  check(
    'monitor desligado: não restaura para fora de tela',
    boundsVisiveis({ x: -3000, y: 0, width: 1280, height: 840 }, telas),
    false,
  )
  check(
    'sem tela nenhuma, o último tamanho não vale',
    boundsVisiveis(janelaNaEsquerda, []),
    false,
  )

  console.log('SMOKE PASS')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
