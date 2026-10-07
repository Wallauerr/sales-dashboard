# Agentes

## Git / commits

- Sempre fazer commits **granulares, por arquivo** (ou por grupo lógico de arquivos), nunca um commit gigante misturando tudo — facilita achar um commit específico depois.
- Seguir o estilo de mensagens já usado no repo (Conventional Commits: `feat(...)`, `fix(...)`, `refactor(...)`, `build(...)`, `style(...)`, `revert(...)`).
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

4. ✅ Caber tudo em 1 tela (0): gráficos de 280/260/220 → ~150/150/130, KpiCard mais compacto, SellerCards viram botão+popover, novo layout padrão 3×3 e bump da chave para `sd:dashboard-layout:v2`. Drag/resize/persistência já estão prontos.
5. ✅ Largura total quando maximizado (3): remover `max-w-7xl` e os cantos arredondados.
6. ✅ Ícone da title bar no build win (4): CSP sem `img-src 'self' data:` em `src/renderer/index.html` + `renderer.build.assetsInlineLimit: 0` em `electron.vite.config.ts` (sem isso o Vite embutia o PNG como `data:` e o CSP o bloqueava).
7. ✅ Maximizar/restaurar janela em multi-monitor (2): **snap de borda descartado** — sequestrava o gesto de arrastar para o outro monitor, que no comercial é rotina. Ficou só o botão/duplo clique da title bar; o `maximize` mira a tela do cursor (`window-maximize.ts`, geometria pura testada no smoke) e o `unmaximize` volta ao último tamanho antes de maximizar, ignorando esse tamanho se o monitor tiver sido desligado. Arrastar a janela continua livre e é o que atualiza o "último tamanho".
8. ✅ Abrir junto com o Windows (15): `app.setLoginItemSettings` + toggle na tela de ajustes (`src/main/autostart.ts`, Windows-only; fora do Windows o card se esconde).
9. ✅ Foto dos vendedores (achado durante o item 6): o `fotos:list` entregava `data:` URL e o CSP novo bloqueava, então o avatar caía nas iniciais sem aviso. Agora a foto é servida por `foto://` (`src/main/photos/protocol.ts`, `img-src 'self' foto:`) e Configurações → Geral tem a troca inline no `vendedores-card.tsx` com validação por assinatura e limite de 2MB. A planilha do SIGE **não** traz foto de vendedor: a extração do `.xlsx` foi removida junto com o leitor de zip, então a foto sempre vem do arquivo escolhido na mão.

### Fase 3 — Filtros

10. ✅ Anos dinâmicos (1): os anos do selector vêm de `SELECT DISTINCT ano FROM vendas ORDER BY ano` (`listAnos` em `src/main/db/database.ts`, exposto por `anos:list`), então 2022/2023 aparecem sozinhos. O ano padrão é o atual (`new Date().getFullYear()`) e, se ele não existir no banco, o app cai para o ano mais recente. Lista vazia (instalação nova) deixa o selector sem nenhum ano.
11. ✅ Esconder vendedores no filtro da aba histórico (9): o `SellerCards` (`src/renderer/src/app.tsx`) só renderiza na aba Dashboard; no Histórico o filtro por vendedor não faz sentido. A seleção é preservada (não limpa, só escondida).
12. ✅ Desativar vendedores sem perder métricas (10): tabela `vendedor_desativado` (schema v9). Quando um vendedor sai da empresa (ex.: Bruno), o comercial o desativa: o nome some do ranking e de `listVendedores`, mas as vendas dele **passam a contar como `VENDAS`** — o `somaPor` (`src/main/kpis/index.ts`) funde o desativado no mesmo balde dos pedidos sem vendedor, então dá pra filtrar por `VENDAS` (o `escopo` trata o label como `vendedor = '' OR vendedor IN (desativados)`) e o filtro do vendedor selecionado é limpo. Totais de faturamento/funil/ticket não mudam. Gestão + foto num card único em Configurações → Geral (`vendedores-card.tsx`); o popover de vendedores avisa quantos estão desativados.
13. Multi-seleção de vendedores e meses (11).

### Fase 4 — Polish/infra

14. Migrar `smoke.ts` para vitest (14) + testes da regra de faturamento.
15. Ambientes `dev`, `prod` e `test` (base para e2e), usando Faker pt-BR para gerar os dados fictícios; avaliar usar o Faker também nos dados mock do app.
16. Campos de meta formatados em BRL, com zod (00).
17. Meta em % configurável (ano e meses), com seletor de unidade: hoje o `fator` já existe no banco (`fator:<ano>`, default `1.15`) mas `setFator` (`src/main/db/database.ts:376`) nunca é chamado, então o 115% está travado sem nenhum campo na UI. Expor o % do ano e dos 12 meses (base do mês em {ano-1} × %) com **seletor único por ano** entre `%` e valor fixo em R$ — nada de misturar unidade: o ano é todo % ou todo R$. O vazio continua sendo automático, sem chave extra para isso. % uniforme no ano equivale a distribuir pela participação de cada mês no ano anterior, então ano e mês em % não se contradizem e a meta anual continua sendo a soma dos 12 meses (`src/main/kpis/index.ts:314`). Mesmo trabalho do item 16: os inputs de meta mudam de outra vez.
18. Fundo no gráfico de acumulado anual × meta (8).
19. Releases versionadas no GitHub / auto-update (13).

### Quick win

20. Cursor pointer no modal de ajustes: botão X do `ui/dialog.tsx` (nunca foi coberto pelos commits de cursor). Ver também o overlay.
