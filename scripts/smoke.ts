import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import * as XLSX from 'xlsx'

import { SalesDatabase } from '../src/main/db/database.ts'
import { importWorkbook } from '../src/main/ingest/index.ts'
import {
  getGoalConfig,
  getSnapshot,
  setGoalConfig,
} from '../src/main/kpis/index.ts'
import { PHOTO_MAX_BYTES, readChosenPhoto } from '../src/main/photos/pick.ts'
import {
  cursorScreenBounds,
  screenOfBounds,
  screenOfPoint,
  visibleBounds,
} from '../src/main/window-maximize.ts'
import { NO_SELLER_LABEL } from '../src/shared/types.ts'

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
  check('anos distintos', db.listYears(), [2025, 2026])

  const s = await getSnapshot(db, 2026)
  check('periodTotal 2026', s.periodTotal, 10000)
  check('historyTotal', s.historyTotal, 12000)
  check('annualGoal 2026', s.annualGoal, 2300)
  check('quantity jan', s.quantityByMonth.jan, 3)
  check('quantity fev', s.quantityByMonth.fev, 1)
  check('billing jan', s.billingByMonth.jan, 6000)
  check('billing fev', s.billingByMonth.fev, 4000)
  check(
    'funnel jan',
    {
      quote: s.funnelByMonth[0].quote,
      invoiced: s.funnelByMonth[0].invoiced,
    },
    { quote: 1, invoiced: 3 },
  )
  check('closing jan', s.closingCounts.jan, { quote: 1, order: 3 })
  check(
    'ticket Equipamentos',
    s.averageTickets.find(t => t.product === 'Equipamentos')?.ticket,
    1000,
  )
  check(
    'ticket Follow-Up',
    s.averageTickets.find(t => t.product === 'Follow-Up')?.ticket,
    3000,
  )

  const sorted = [...s.bySeller].sort((a, b) => b.value - a.value)
  check('sellers top', sorted[0], {
    seller: 'Ursula',
    value: 4000,
    share: 0.4,
  })

  console.log('\n— Metas personalizadas (configuração) —')
  db.setAnnualGoal(2026, 4600)
  const sAnual = await getSnapshot(db, 2026)
  check(
    'meta anual personalizada reflete no snapshot',
    {
      annualGoal: sAnual.annualGoal,
      annualGoalAuto: sAnual.annualGoalAuto,
      customGoal: sAnual.customGoal,
    },
    { annualGoal: 4600, annualGoalAuto: 2300, customGoal: true },
  )
  const cfg = getGoalConfig(db, 2026)
  check(
    'config view com meta anual custom',
    {
      annual: cfg.annualCustom,
      annualGoal: cfg.annualGoal,
      annualGoalAuto: cfg.annualGoalAuto,
      baseYear: cfg.baseYear,
      factor: cfg.factor,
    },
    {
      annual: 4600,
      annualGoal: 4600,
      annualGoalAuto: 2300,
      baseYear: 2000,
      factor: 1.15,
    },
  )
  check(
    'meta anual distribui proporcional ao ano anterior',
    {
      jan: cfg.effectiveGoals.jan,
      fev: cfg.effectiveGoals.fev,
      autoJan: cfg.autoGoals.jan,
    },
    { jan: 2300, fev: 2300, autoJan: 1150 },
  )

  setGoalConfig(db, 2026, { annual: null, months: { jan: 3000 } })
  const sMes = await getSnapshot(db, 2026)
  check(
    'meta mensal override soma com automática dos demais',
    {
      annualGoal: sMes.annualGoal,
      jan: sMes.monthlyGoals[0].goal,
      fev: sMes.monthlyGoals[1].goal,
    },
    { annualGoal: 4150, jan: 3000, fev: 1150 },
  )

  setGoalConfig(db, 2026, { annual: null, months: {} })
  const sRestaurada = await getSnapshot(db, 2026)
  check(
    'restaurar automático zera personalização',
    {
      annualGoal: sRestaurada.annualGoal,
      customGoal: sRestaurada.customGoal,
      jan: sRestaurada.monthlyGoals[0].goal,
    },
    { annualGoal: 2300, customGoal: false, jan: 1150 },
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
    s2.billingByMonth.mai,
    0,
  )
  check('faturamento julho inclui venda aprovada', s2.billingByMonth.jul, 5000)
  check(
    'funnel julho',
    {
      quote: s2.funnelByMonth[6].quote,
      invoiced: s2.funnelByMonth[6].invoiced,
    },
    { quote: 1, invoiced: 1 },
  )
  check('quantity julho', s2.quantityByMonth.jul, 1)
  check('periodTotal 2026', s2.periodTotal, 7000)

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

  const h900 = db2.getCodeHistory('900')
  check(
    'codigo 900: estado atual',
    { sale: h900.sale?.systemStatus, value: h900.sale?.totalValue },
    { sale: 'Pedido Faturado', value: 5000 },
  )
  check(
    'codigo 900: evolução nos imports',
    h900.events.map(e => `${e.op}:${e.systemStatus}`),
    ['inserted:Orçamento', 'updated:Pedido Faturado'],
  )
  check(
    'codigo 900: primeiro evento guarda valor/mês',
    {
      value: h900.events[0]?.totalValue,
      month: h900.events[0]?.month,
      year: h900.events[0]?.year,
    },
    { value: 5000, month: 'mai', year: 2026 },
  )
  check(
    'codigo 901 reexportado sem mudança gera 1 só evento',
    db2.getCodeHistory('901').events.length,
    1,
  )
  const h999 = db2.getCodeHistory('999')
  check(
    'codigo inexistente',
    { sale: h999.sale, events: h999.events.length },
    { sale: null, events: 0 },
  )

  console.log('\n— Filtros de escopo (meses e vendedores) —')
  const sUrsula = await getSnapshot(db, 2026, { sellers: ['Ursula'] })
  check('filtro vendedor faturamento', sUrsula.periodTotal, 4000)
  check(
    'filtro vendedor mantém lista completa',
    sUrsula.bySeller.some(v => v.seller === 'Ursula'),
    true,
  )
  const sFev = await getSnapshot(db, 2026, { months: ['fev'] })
  check('filtro mês faturamento', sFev.periodTotal, 4000)
  check(
    'filtro mês zera outros meses',
    Object.values(sFev.billingByMonth).filter(v => v > 0).length,
    1,
  )
  const sUrsulaFev = await getSnapshot(db, 2026, {
    months: ['fev'],
    sellers: ['Ursula'],
  })
  check('filtro mês+vendedor', sUrsulaFev.periodTotal, 4000)
  const sJanFev = await getSnapshot(db, 2026, { months: ['jan', 'fev'] })
  check('filtro multi-mês soma', sJanFev.periodTotal, 10000)
  check(
    'filtro multi-mês esconde fora do escopo',
    Object.values(sJanFev.billingByMonth).filter(v => v > 0).length,
    2,
  )
  const sDuas = await getSnapshot(db, 2026, {
    sellers: ['Ursula', 'Rosemeri'],
  })
  check('filtro multi-vendedor soma', sDuas.periodTotal, 6000)
  const sDuasMeses = await getSnapshot(db, 2026, {
    months: ['jan', 'fev'],
    sellers: ['Ursula', 'Stephani Strack da Silva'],
  })
  check('filtro multi-mês+vendedor', sDuasMeses.periodTotal, 7000)

  console.log('\n— Vendedores desativados —')
  check('lista de desativados começa vazia', db.listDisabledSellers(), [])
  db.setSellerDisabled('Bruno Keller', true)
  db.setSellerDisabled('Bruno Keller', true)
  check('desativar é idempotente', db.listDisabledSellers(), ['Bruno Keller'])
  check(
    'listSellers esconde o desativado',
    db.listSellers().includes('Bruno Keller'),
    false,
  )
  check(
    'listSellers mantém os demais',
    db.listSellers().includes('Ursula'),
    true,
  )
  const sSemBruno = await getSnapshot(db, 2026)
  check('totais seguem contando o desativado', sSemBruno.periodTotal, 10000)
  check(
    'ranking esconde o desativado',
    sSemBruno.bySeller.some(v => v.seller === 'Bruno Keller'),
    false,
  )
  check(
    'desativado engorda o VENDAS',
    sSemBruno.bySeller.find(v => v.seller === NO_SELLER_LABEL)?.value,
    1000,
  )
  const sVendas = await getSnapshot(db, 2026, {
    sellers: [NO_SELLER_LABEL],
  })
  check('filtro VENDAS pega o desativado', sVendas.periodTotal, 1000)
  check(
    'filtro VENDAS mantém o ranking completo',
    sVendas.bySeller.some(v => v.seller === 'Ursula'),
    true,
  )
  db.setSellerDisabled('Bruno Keller', false)
  check(
    'reativar devolve o vendedor ao ranking',
    (await getSnapshot(db, 2026)).bySeller.some(
      v => v.seller === 'Bruno Keller',
    ),
    true,
  )

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
    sRule.billingByMonth.jan,
    4800,
  )
  check('regra: periodTotal consistente', sRule.periodTotal, 4800)
  check('regra: quantidade conta só as incluídas', sRule.quantityByMonth.jan, 5)
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
      quote: sRule.funnelByMonth[0].quote,
      order: sRule.funnelByMonth[0].order,
      approvedWithoutInvoicing: sRule.funnelByMonth[0].approvedWithoutInvoicing,
      invoiced: sRule.funnelByMonth[0].invoiced,
      cancelled: sRule.funnelByMonth[0].cancelled,
    },
    {
      quote: 1,
      order: 2,
      approvedWithoutInvoicing: 5,
      invoiced: 1,
      cancelled: 1,
    },
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
    sLabel.byState.find(e => e.state === 'Não informado'),
    { state: 'Não informado', value: 1200, share: 0.6 },
  )
  check(
    'rótulo região ausente',
    sLabel.byRegion.find(r => r.region === 'Não informado'),
    { region: 'Não informado', value: 1200, share: 0.6, x: 0, y: 0 },
  )
  check(
    'rótulo vendedor ausente',
    sLabel.bySeller.find(v => v.seller === 'VENDAS'),
    { seller: 'VENDAS', value: 1200, share: 0.6 },
  )

  console.log('\n— Foto escolhida em Configurações —')
  db.setSellerPhoto('Rosemeri', 'image/jpeg', Buffer.from([1, 2, 3, 4]))
  check(
    'foto gravada',
    db.listSellerPhotos().map(f => f.seller),
    ['Rosemeri'],
  )
  check('mime gravado', db.getSellerPhoto('Rosemeri')?.mime, 'image/jpeg')
  check(
    'bytes no banco',
    (db.getSellerPhoto('Rosemeri')?.img.length ?? 0) > 0,
    true,
  )
  db.setSellerPhoto('Rosemeri', 'image/png', Buffer.from([9, 9]))
  check(
    'trocar foto sobrescreve',
    db.getSellerPhoto('Rosemeri')?.mime,
    'image/png',
  )
  check('trocar foto nao duplica', db.listSellerPhotos().length, 1)

  db.removeSellerPhoto('Rosemeri')
  check(
    'remover foto volta ao avatar de iniciais',
    db.getSellerPhoto('Rosemeri'),
    null,
  )

  console.log('\n— Lista de vendedores para Configurações —')
  const nomes = db.listSellers()
  check('lista sem o pseudo-vendedor VENDAS', nomes.includes('VENDAS'), false)
  check('lista traz quem tem venda', nomes.includes('Rosemeri'), true)

  console.log('\n— Validação da foto escolhida —')
  const naoImagem = join(tmpdir(), `smoke-nao-imagem-${Date.now()}.txt`)
  writeFileSync(naoImagem, 'isto nao e uma imagem')
  await assert.rejects(() => readChosenPhoto(naoImagem), /não é uma imagem/)
  const grande = join(tmpdir(), `smoke-grande-${Date.now()}.png`)
  writeFileSync(grande, Buffer.alloc(PHOTO_MAX_BYTES + 1))
  await assert.rejects(() => readChosenPhoto(grande), /limite é/)
  const jpg = join(tmpdir(), `smoke-foto-${Date.now()}.jpg`)
  writeFileSync(jpg, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))
  check(
    'jpg reconhecido pela assinatura',
    (await readChosenPhoto(jpg)).mime,
    'image/jpeg',
  )

  console.log('\n— Maximizar/restaurar em multi-monitor —')
  const screens = [
    { id: 1, workArea: { x: 0, y: 0, width: 1280, height: 800 } },
    { id: 2, workArea: { x: 1280, y: 0, width: 2560, height: 1440 } },
  ]
  const windowOnLeft = { x: 40, y: 60, width: 1280, height: 840 }

  check(
    'janela pega a tela pela maior área em comum',
    screenOfBounds(windowOnLeft, screens)?.id,
    1,
  )
  check(
    'janela quase toda na direita fica na direita',
    screenOfBounds({ x: 1240, y: 100, width: 1280, height: 840 }, screens)?.id,
    2,
  )
  check(
    'janela quase toda na esquerda fica na esquerda',
    screenOfBounds({ x: 30, y: 100, width: 1280, height: 840 }, screens)?.id,
    1,
  )
  check('cursor na esquerda', screenOfPoint({ x: 300, y: 400 }, screens)?.id, 1)
  check('cursor na direita', screenOfPoint({ x: 3000, y: 700 }, screens)?.id, 2)
  check(
    'cursor no canto inferior direito da tela esquerda',
    screenOfPoint({ x: 1279, y: 799 }, screens)?.id,
    1,
  )

  check(
    'mesma tela: não mexe em nada',
    cursorScreenBounds(
      { x: 300, y: 400 },
      screenOfBounds(windowOnLeft, screens),
      screens,
    ),
    null,
  )
  check(
    'cursor na outra tela: maximiza na outra',
    cursorScreenBounds(
      { x: 3000, y: 700 },
      screenOfBounds(windowOnLeft, screens),
      screens,
    ),
    screens[1].workArea,
  )
  check(
    'sem tela da janela, ainda mira o cursor',
    cursorScreenBounds({ x: 3000, y: 700 }, null, screens),
    screens[1].workArea,
  )
  check(
    'tela nenhuma não move a janela',
    cursorScreenBounds({ x: 1, y: 1 }, null, []),
    null,
  )

  check(
    'restaura se o último tamanho ainda encosta em tela',
    visibleBounds(windowOnLeft, screens),
    true,
  )
  check(
    'monitor desligado: não restaura para fora de tela',
    visibleBounds({ x: -3000, y: 0, width: 1280, height: 840 }, screens),
    false,
  )
  check(
    'sem tela nenhuma, o último tamanho não vale',
    visibleBounds(windowOnLeft, []),
    false,
  )

  console.log('SMOKE PASS')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
