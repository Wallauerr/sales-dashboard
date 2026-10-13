# Agentes

## Git / commits

- Sempre fazer commits **granulares, por arquivo** (ou por grupo lógico de arquivos), nunca um commit gigante misturando tudo — facilita achar um commit específico depois.
- Seguir o estilo de mensagens já usado no repo (Conventional Commits: `feat(...)`, `fix(...)`, `refactor(...)`, `build(...)`, `style(...)`, `revert(...)`).
- **Nunca commitar sem autorização explícita do usuário.** Após concluir um trabalho, deixe tudo **uncommitted** e apresente o resumo para revisão; só faça `git commit` quando o usuário pedir (ex.: "pode commitar").
- pt-BR nas conversas com o usuário; mensagens de commit em inglês.

## Comentários

- **Não comentar o código.** O padrão é zero comentário. Só entra quando for **extremamente essencial**, e "essencial" aqui é um listão curto:
  1. regra de negócio que não se deduz lendo o código (ex.: a regra de faturamento em `src/main/kpis/index.ts:45`);
  2. ordem ou timing que quebra **em silêncio** se mudar (ex.: esquema privilegiado antes do app ready, em `src/main/index.ts:19`);
  3. o porquê de um workaround, limite ou escolha de segurança (ex.: `src/main/photos/pick.ts`, `src/renderer/src/index.css`).
- Não repetir o que o código, o nome da função ou o tipo já dizem. Não narrar a mudança ("ajustado para", "adicionado", "antes era"). Não deixar TODO no código. Não comentário decorativo ("Format:", "Helper to...").
- Comentário longo é sinal de que o código está errado: 1–2 linhas no máximo. Se são 5 linhas para explicar uma função, extraia uma função com nome que diga aquilo.
- Ao tocar um arquivo, revise os comentários que já estavam nele e corte o que não passar no listão acima.
- `// biome-ignore`, `/// <reference>` e afins são **diretivas**, não comentários: nunca remover.

## TODOS (ordem de execução)

### Fase 1 — Números (confiança das métricas)

1. ✅ Regra de faturamento (7+12+18): manter `Pedido` + `Pedido Faturado` — o comercial considera o pedido como faturamento (já saiu de orçamento, o cliente está prestes a pagar e senão vira cancelado) — e somar `Pedido Aprovado Sem Faturamento` cuja `categoria` seja diferente de `Remessa%`/`Amostra%`. Normalizar status minúsculo (`pedido`) no ingest. Cancelados e Orçamento já estão fora (a suspeita do antigo item 7 não se confirmou).
   No funil de vendas, confirmar que `Pedido` continua contando como pedido e não como faturado: `funilPorMes` (`src/main/kpis/index.ts:174`) e `funnelItems` (`src/renderer/src/components/charts/horizontal-bars.tsx:14`) já contam cada status separadamente com `{ faturamento: false }`, então deve ser só validação depois da mudança.
2. ✅ Sem estado (6): rotular "Não informado" no chart de estados/regiões — são 192 pedidos faturados sem UF — mantendo o total batendo.
3. ✅ Sem vendedor (5): exibir `VENDAS` quando o nome vier vazio (10 linhas); base para o item 11.

### Fase 2 — TV (1080p, 60pol, uma tela)

4. ✅ Caber tudo em 1 tela (0): gráficos de 280/260/220 → ~150/150/130, KpiCard mais compacto, SellerCards viram botão+popover, novo layout padrão 3×3 e bump da chave para `sd:dashboard-layout:v3`. Drag/resize/persistência já estão prontos.
5. ✅ Largura total quando maximizado (3): remover `max-w-7xl` e os cantos arredondados.
6. ✅ Ícone da title bar no build win (4): CSP sem `img-src 'self' data:` em `src/renderer/index.html` + `renderer.build.assetsInlineLimit: 0` em `electron.vite.config.ts` (sem isso o Vite embutia o PNG como `data:` e o CSP o bloqueava).
7. ✅ Maximizar/restaurar janela em multi-monitor (2): **snap de borda descartado** — sequestrava o gesto de arrastar para o outro monitor, que no comercial é rotina. Ficou só o botão/duplo clique da title bar; o `maximize` mira a tela do cursor (`window-maximize.ts`, geometria pura testada no smoke) e o `unmaximize` volta ao último tamanho antes de maximizar, ignorando esse tamanho se o monitor tiver sido desligado. Arrastar a janela continua livre e é o que atualiza o "último tamanho".
8. ✅ Abrir junto com o Windows (15): `app.setLoginItemSettings` + toggle na tela de ajustes (`src/main/autostart.ts`, Windows-only; fora do Windows o card se esconde).
9. ✅ Foto dos vendedores (achado durante o item 6): o `fotos:list` entregava `data:` URL e o CSP novo bloqueava, então o avatar caía nas iniciais sem aviso. Agora a foto é servida por `foto://` (`src/main/photos/protocol.ts`, `img-src 'self' foto:`) e Configurações → Geral tem a troca inline no `vendedores-card.tsx` com validação por assinatura e limite de 2MB. A planilha do SIGE **não** traz foto de vendedor: a extração do `.xlsx` foi removida junto com o leitor de zip, então a foto sempre vem do arquivo escolhido na mão.

### Fase 3 — Filtros

10. ✅ Anos dinâmicos (1): os anos do selector vêm de `SELECT DISTINCT ano FROM vendas ORDER BY ano` (`listAnos` em `src/main/db/database.ts`, exposto por `anos:list`), então 2022/2023 aparecem sozinhos. O ano padrão é o atual (`new Date().getFullYear()`) e, se ele não existir no banco, o app cai para o ano mais recente. Lista vazia (instalação nova) deixa o selector sem nenhum ano.
11. ✅ Esconder vendedores no filtro da aba histórico (9): o `SellerCards` (`src/renderer/src/app.tsx`) só renderiza na aba Dashboard; no Histórico o filtro por vendedor não faz sentido. A seleção é preservada (não limpa, só escondida).
12. ✅ Desativar vendedores sem perder métricas (10): tabela `vendedor_desativado` (schema v9). Quando um vendedor sai da empresa (ex.: Bruno), o comercial o desativa: o nome some do ranking e de `listVendedores`, mas as vendas dele **passam a contar como `VENDAS`** — o `somaPor` (`src/main/kpis/index.ts`) funde o desativado no mesmo balde dos pedidos sem vendedor, então dá pra filtrar por `VENDAS` (o `escopo` trata o label como `vendedor = '' OR vendedor IN (desativados)`) e o filtro do vendedor selecionado é limpo. Totais de faturamento/funil/ticket não mudam. Gestão + foto num card único em Configurações → Geral (`vendedores-card.tsx`); o popover de vendedores avisa quantos estão desativados.
13. ✅ Multi-seleção de vendedores e meses (11): o filtro (aba Dashboard e Histórico) aceita vários meses e vendedores de uma vez — `SnapshotFilter` virou `meses: Mes[]`/`vendedores: string[]` (vazio = sem filtro) e o `escopo` (`src/main/kpis/index.ts:65`) monta `IN (...)`; o label `VENDAS` expande para `('' , desativados)` dentro do mesmo IN. O dropdown de meses (`dashboard-header.tsx`) usa `DropdownMenuCheckboxItem` com `preventDefault` no `onSelect` para não fechar a cada toque, e o `SellerCards` virou um popover de checkboxes que permanece aberto. No gráfico mensal, clicar numa barra alterna o mês (só aparece quando nenhum mês está selecionado). Kpis/títulos/hints agregam os meses selecionados (meta do período, run-rate só sem filtro) e o funil agrega o ano inteiro (ou só os meses/vendedores filtrados).

### Fase 4 — Migração para inglês

14. ✅ Refac geral do projeto para **inglês no código**: o padrão hoje é pt-br em identificadores/nomes misturado com inglês (shadcn, `db.raw`, `WHERE ...` no SQL), ex.: `somaPor`, `escopo`, `faturamentoClause`, `funilPorMes`, `vendas:list`, `vendas`/`mesesPor` — converter funções, tipos, variáveis, arquivos/módulos e canais de IPC para inglês (`sumBy`, `scope`, `billingClause`, `funnelPerMonth`, `sales:list`...). **Só as strings de UI ficam em pt-BR** (o comercial é brasileiro). O banco (`vendas`, `ano`, `mes`, colunas) não muda — schema é dado, não código. `Mes/MESES → Month/MONTHS`, `foto:// → photo://`, `brl*` mantidos, layout `sd:dashboard-layout:v3 → v4`.

### Fase 5 — Polish/infra

15. ✅ Cursor pointer no modal de ajustes: botão X do `ui/dialog.tsx` (nunca foi coberto pelos commits de cursor). Ver também o overlay.
16. ✅ Campos de meta formatados em BRL, com zod (00).
17. ✅ Fundo no gráfico de acumulado anual × meta (8): trocado `LineChart`/`Line` por `AreaChart`/`Area` em `accumulated-line.tsx` (mesmo motor), com um `linearGradient` (opacidade 0.26 → 0) via `fill={url(#id)}`; o `id` sai de `useId()` sanitizado (sem `:`) para não colidir se o card aparecer mais de uma vez. A `ReferenceLine` da meta continua; os dots do ponto foram removidos.
18. ✅ Cards responsivos na vertical: quando o usuário redimensiona a altura de um card (horizontal já acompanha via ResponsiveContainer), o conteúdo interno tem altura fixa (ex.: gráficos `h-[150px]` em `horizontal-bars.tsx`/`region-donut.tsx`, listas) e sobra vão embaixo. Fazer gráficos/listas acompanharem a altura do card (ex.: `height: 100%` + medir a área disponível, `KpiCard`/ticket idem). A persistência de layout ao arrastar/redimensionar já existe (`onLayoutChange` → `saveDashboardLayout` em `dashboard-grid.tsx`).
19. ✅ Migrar `scripts/smoke.ts` para vitest (sem Playwright, só vitest): a regra de faturamento tem teste próprio em `tests/billing-rule.test.ts` (categoria `Remessa`/`Amostra`/`Remessa amostra grátis` fora do faturamento, status `Orçamento`/`Pedido Cancelado` nunca faturam, minúsculo normalizado); os demais cenários — import/ingestão, reconciliação diária e histórico por código, metas, filtros escopo, vendedores desativados, rótulos ausentes, foto e maximização multi-monitor — vivem em `tests/{ingest,database,kpis,photos,window-maximize}.test.ts`, com a planilha gerada por `tests/fixtures/workbook.ts` e os dados fictícios por `tests/fixtures/factories.ts` (Faker pt-BR; com `seed` fixa o lote de 250 linhas mantém os agregados consistentes). `pnpm test` = `vitest run`; `scripts/` foi removido. Atenção: com o vitest no `package.json` o `lint:fix` do biome passou a reconhecer `fit(` como teste focado e renomeia a chamada — a função `fit` do `KpiCardValue` virou `resize`. Os módulos puros do renderer (formatação BRL, `buildKpis`, rótulos, cores e foto) têm suítes em `tests/renderer/` rodando sem jsdom (nada de DOM).
20. ✅ Hint dinâmico no card **Meta anual** (`src/renderer/src/components/kpi/build-kpis.ts`): varia pela origem real detectada no snapshot (`customGoal`): automática → `base {ano-1} × {fator}%`; manual em R$ → `base {ano-1} · meta manual R$ X`. O caso manual em % fica para o item 22.
21. Ambientes `dev`, `prod` e `test` (base para e2e), usando Faker pt-BR para gerar os dados fictícios; avaliar usar o Faker também nos dados mock do app.
22. ✅ Meta em % configurável (ano e meses), com seletor de unidade: hoje o `fator` já existe no banco (`fator:<ano>`, default `1.15`) mas `setFactor` (`src/main/db/database.ts:379`) nunca é chamado, então o 115% está travado sem nenhum campo na UI. Agora a unidade é escolhida **por ano** — `%` ou `R$`, uma só, sem misturar (`GoalUnit` em `src/shared/types.ts`; chave nova `unidade_meta:<ano>`, que **não existe no automático**): em `%`, um único valor define o ano e os 12 meses (base do mês em {ano-1} × %, via `setFactor`); em `R$`, vale o comportamento antigo (anual fixa + overrides mensais). Vazio continua sendo automático, sem chave extra. Dados antigos (sem chave de unidade) com metas R$ são tratados como `R$`. A meta anual continua sendo a soma dos 12 meses (`src/main/kpis/index.ts:345`); `customGoal` agora significa "tem unidade persistida" (`goalUnitOf`) e o hint da Meta anual distingue origem: `brl` → manual R$, default ou `pct` → `base {ano-1} × {fator}%`. UI em `config-tab.tsx`: `UnitSwitch` (%) além dos inputs do item 16; helpers de percentual em `format.ts` (`maskPctText`/`pctInputValue`/`pctDraftSchema`, % sem separador de milhar, até 1000 com 1 decimal).
23. Releases versionadas no GitHub / auto-update (13).
24. Tratativa de erros: cobrir o app de tratamento de erro com o mesmo rigor dos testes. Hoje vários fluxos engolem exceções em silêncio (ex.: `catch {}` em `loadPhotos`) ou só mostram `e.message` cru. Padronizar: erro de IPC/renderer vira toast (`sonner`) e/ou estado de erro visível; validar/reportar falhas de leitura de planilha, banco e fotos; nada de `catch {}` silencioso sem justificativa; mensagens pt-BR acionáveis.
