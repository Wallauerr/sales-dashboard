# Agentes

## Git / commits

- Sempre fazer commits **granulares, por arquivo** (ou por grupo lógico de arquivos), nunca um commit gigante misturando tudo — facilita achar um commit específico depois.
- Seguir o estilo de mensagens já usado no repo (Conventional Commits: `feat(...)`, `fix(...)`, `refactor(...)`, `build(...)`, `style(...)`, `revert(...)`).
- pt-BR nas conversas com o usuário; mensagens de commit em inglês.

## TODOS (ordem de execução)

### Fase 1 — Números (confiança das métricas)

1. ✅ Regra de faturamento (7+12+18): manter `Pedido` + `Pedido Faturado` — o comercial considera o pedido como faturamento (já saiu de orçamento, o cliente está prestes a pagar e senão vira cancelado) — e somar `Pedido Aprovado Sem Faturamento` cuja `categoria` seja diferente de `Remessa%`/`Amostra%`. Normalizar status minúsculo (`pedido`) no ingest. Cancelados e Orçamento já estão fora (a suspeita do antigo item 7 não se confirmou).
   No funil de vendas, confirmar que `Pedido` continua contando como pedido e não como faturado: `funilPorMes` (`src/main/kpis/index.ts:174`) e `funnelItems` (`src/renderer/src/components/charts/horizontal-bars.tsx:14`) já contam cada status separadamente com `{ faturamento: false }`, então deve ser só validação depois da mudança.
2. ✅ Sem estado (6): rotular "Não informado" no chart de estados/regiões — são 192 pedidos faturados sem UF — mantendo o total batendo.
3. ✅ Sem vendedor (5): exibir `VENDAS` quando o nome vier vazio (10 linhas); base para o item 11.

### Fase 2 — TV (1080p, 60pol, uma tela)

4. ✅ Caber tudo em 1 tela (0): gráficos de 280/260/220 → ~150/150/130, KpiCard mais compacto, SellerCards viram botão+popover, novo layout padrão 3×3 e bump da chave para `sd:dashboard-layout:v2`. Drag/resize/persistência já estão prontos.
5. ✅ Largura total quando maximizado (3): remover `max-w-7xl` e os cantos arredondados.
6. ✅ Ícone da title bar no build win (4): CSP sem `img-src 'self' data:` em `src/renderer/index.html` + `renderer.build.assetsInlineLimit: 0` em `electron.vite.config.ts` (sem isso o Vite embutia o PNG como `data:` e o CSP o bloqueava).
7. Maximizar/restaurar janela em multi-monitor (2): **snap de borda descartado** — sequestrava o gesto de arrastar para o outro monitor, que no comercial é rotina. Decidido: nenhum gesto de arrasto (maximiza só pelo botão/duplo clique da title bar), o `maximize` mira o monitor do cursor, e o `unmaximize` volta ao último tamanho antes de maximizar.
8. ✅ Abrir junto com o Windows (15): `app.setLoginItemSettings` + toggle na tela de ajustes (`src/main/autostart.ts`, Windows-only; fora do Windows o card se esconde).

### Fase 3 — Filtros

9. Anos dinâmicos (1): hoje `[2024, 2025, 2026]` hardcoded; 2022 e 2023 já ficam de fora.
10. Esconder vendedores no filtro da aba histórico (9).
11. Desativar vendedores sem perder métricas (10) — ex.: "Sul Magnéticos ... Eireli" (R$ 7,9M).
12. Multi-seleção de vendedores e meses (11).

### Fase 4 — Polish/infra

13. Migrar `smoke.ts` para vitest (14) + testes da regra de faturamento.
14. Ambientes `dev`, `prod` e `test` (base para e2e), usando Faker pt-BR para gerar os dados fictícios; avaliar usar o Faker também nos dados mock do app.
15. Campos de meta formatados em BRL, com zod (00).
16. Fundo no gráfico de acumulado anual × meta (8).
17. Releases versionadas no GitHub / auto-update (13).

### Quick win

18. Cursor pointer no modal de ajustes: botão X do `ui/dialog.tsx` (nunca foi coberto pelos commits de cursor). Ver também o overlay.
