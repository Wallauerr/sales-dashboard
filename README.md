# Sulmag Dashboard

> Dashboard desktop do time comercial. Substitui o workbook **Metas Comercial.xlsx** do SIGE Cloud por um app que importa a planilha, calcula faturamento, metas, funil e ticket médio, e desenha tudo numa TV.

`Electron 44 · React 19 · TypeScript · Vite (electron-vite) · Tailwind CSS 4 · SQLite (node:sqlite) · Recharts`

---

## Visão geral

O comercial vivia de uma planilha do SIGE: colunas, filtros e fórmulas que ninguém mais sabia manter. O **Sulmag Dashboard** pega essa planilha, guarda os pedidos num banco local e serve os números num painel pensado para ficar numa TV de 60" — uma tela só, cards arrastáveis, gráficos grandes.

- **Zero nuvem.** Os dados ficam num arquivo SQLite dentro da máquina do usuário (`metas.db`), não saem de lá.
- **Importa o SIGE como ele é.** Aceita a aba `Base` do relatório ou um relatório de pedidos (`Código`/`Data`) — sem precisar ajustar a planilha na mão.
- **Reconciliação por código.** Reimportar a mesma planilha atualiza as linhas existentes em vez de duplicar. O código do SIGE não muda quando um orçamento vira pedido.

---

## Como funciona

```
[SIGE Cloud] ──exporta──▶ Metas Comercial.xlsx / relatório de pedidos
                                        │  "Importar dados do SIGE"
                                        ▼
                          ingest  →  normaliza  →  upsert por código
                                        ▼
                          SQLite (metas.db) — vendas, metas, fotos
                                        ▼
                          KPIs (SQL)  →  IPC (kpis:get)  →  React
                                        ▼
                    Dashboard (cards) · Histórico (por código) · Configurações
```

### Regra de faturamento

É a regra que sustenta todas as métricas, e não dá para deduzir lendo o resto do código:

```
faturamento = status "Pedido"
            + status "Pedido Faturado"
            + status "Pedido Aprovado Sem Faturamento",
              mas só quando a categoria NÃO é remessa nem amostra
```

`Remessa*` e `Amostra*` (ex.: "Remessa amostra grátis") ficam **fora** do faturamento mesmo aprovadas. `Orçamento` e `Pedido Cancelado` nunca faturam. O status é normalizado em minúsculo (`pedido` → `Pedido`) na ingestão.

O **funil** faz o contrário: conta cada status **separadamente** (`Orçamento`, `Pedido`, `Pedido Aprovado Sem Faturamento`, `Pedido Cancelado`, `Pedido Faturado`, `Pedido Nao Faturado`), para mostrar o funil inteiro sem esconder etapas.

---

## Stack

| Camada | Tecnologia |
|---|---|
| App desktop | [Electron 44](https://www.electronjs.org) + [electron-vite](https://electron-vite.org) |
| Interface | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (strict) |
| Componentes | [shadcn/ui](https://ui.shadcn.com) sobre [Radix UI](https://www.radix-ui.com) |
| Estilo | [Tailwind CSS 4](https://tailwindcss.com) (variáveis CSS, tema claro/escuro) |
| Gráficos | [Recharts 3](https://recharts.org) via wrapper `ui/chart` |
| Layout da dashboard | [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) (arrastar/redimensionar) |
| Planilha | [SheetJS (xlsx)](https://sheetjs.com) |
| Validação | [Zod](https://zod.dev) (fronteiras de IPC e da planilha) |
| Banco | SQLite nativo do Node (`node:sqlite`, `DatabaseSync`) |
| Feedback | [sonner](https://sonner.emilkowal.ski) (toasts) · Lucide (ícones) |
| Lint / Formatação | [Biome](https://biomejs.dev) |
| Testes | [Vitest](https://vitest.dev) |
| Runtime / Package manager | [Node.js 24+](https://nodejs.org) / [pnpm 10](https://pnpm.io) |

---

## Estrutura do projeto

```
src/
├── main/                     # processo principal (Electron + Node)
│   ├── index.ts                  # janela, ciclo de vida, maximizar multi-monitor
│   ├── ipc.ts                    # canais IPC (ingest, kpis, metas, fotos, autostart)
│   ├── window-maximize.ts        # geometria pura de maximizar por monitor
│   ├── autostart.ts              # "abrir com o Windows" (só win32)
│   ├── db/
│   │   ├── database.ts           # schema, migrations e queries (classe SalesDatabase)
│   │   └── rows.ts               # linha SQL → tipo Sale
│   ├── ingest/
│   │   ├── index.ts              # lê a planilha e faz upsert por código
│   │   └── normalize.ts          # datas, UF/região, status, vendor
│   ├── kpis/index.ts             # snapshot (faturamento, funil, metas, ticket)
│   └── photos/
│       ├── protocol.ts           # protocolo photo:// (foto do vendedor)
│       └── pick.ts               # valida e lê a imagem escolhida
├── preload/                  # ponte segura (contextBridge)
│   ├── index.ts                  # expõe `window.api`
│   └── index.d.ts                # tipos do `window.api`
├── shared/                   # tipos e schemas usados pelo main e pelo renderer
│   ├── types.ts
│   └── schemas.ts
└── renderer/                 # processo de renderização (React)
    ├── index.html
    └── src/
        ├── app.tsx               # abas Dashboard/Histórico + dialog de Configurações
        ├── components/
        │   ├── ui/               # primitivos shadcn (não editar à mão)
        │   ├── charts/           # bars, donut, linha de acumulado
        │   ├── kpi/              # KpiCard + build-kpis
        │   ├── config/           # metas, vendedores, autostart
        │   ├── history/          # histórico por código
        │   ├── sellers/          # cards de vendedor
        │   ├── dashboard-grid.tsx    # grid arrastável com persistência
        │   ├── dashboard-header.tsx  # seletor de ano e filtros
        │   └── title-bar.tsx         # barra de título própria (janela frameless)
        ├── lib/                  # formatação BRL, rótulos, cores, layout
        └── index.css             # tema (variáveis CSS) + Tailwind
tests/                        # Vitest (main, kpis, ingest, renderer puro)
docs/                         # documentação
```

O alias `@` aponta para `src/renderer/src` (main usa caminhos relativos).

---

## Arquitetura

Três processos com uma fronteira só — o IPC:

| Módulo | Papel |
|---|---|
| `src/main/index.ts` | Abre o banco (`userData/metas.db`), registra IPC e o protocolo de foto, cria a janela frameless e cuida de maximizar/restaurar |
| `src/main/ipc.ts` | Um `ipcMain.handle` por operação; valida a entrada com Zod antes de tocar no banco |
| `src/main/db/database.ts` | Todo o SQL, o schema (`SCHEMA_VERSION`) e as migrations |
| `src/main/ingest` | Lê o `.xlsx`, normaliza cada linha e reconcilia por código dentro de uma transação |
| `src/main/kpis/index.ts` | Monta o `KpiSnapshot` do ano/filtro pedido |
| `src/preload/index.ts` | Expõe `window.api` via `contextBridge` — nada de `nodeIntegration` |
| `src/renderer` | React puro; só fala com o main através de `window.api` |

Decisões que valem registrar:

- **SQLite nativo, sem dependência.** O banco usa o `node:sqlite` embutido (`DatabaseSync`), então não há módulo nativo para compilar no `electron-builder`.
- **Foto por protocolo próprio.** O CSP é estrito (`img-src 'self'`) e não aceita `data:`. A foto do vendedor é servida por `photo://img/<vendedor>` a partir do BLOB no SQLite, em vez de trafegar base64 pelo IPC a cada refresh.
- **Import tudo-ou-nada.** A ingestão roda numa transação: se uma linha falha, nada é gravado.
- **Layout persistido localmente.** Arrastar/redimensionar cards grava em `localStorage` (`sd:dashboard-layout:v4`).
- **Sem aceleração de hardware.** `app.disableHardwareAcceleration()` — o alvo é uma máquina de escritório, e isso evita dor de cabeça de driver.

---

## Regras de negócio

- **Meta anual.** Nasce da base do ano anterior (`base × fator`, fator padrão `1.15` = +15%). Pode ser sobrescrita por ano, em **R$** (meta anual + ajustes por mês) ou em **%** (aplica o mesmo percentual sobre o mesmo mês do ano anterior). A meta anual é sempre a soma dos 12 meses.
- **Filtros.** O ano vem do próprio banco (`SELECT DISTINCT ano`); dá para combinar vários meses e vários vendedores. Kpis, títulos e hints agregam o período selecionado.
- **VENDAS.** Pedido sem vendedor ganha o rótulo `VENDAS`. Vendedor desativado some do ranking e do filtro, mas as vendas dele continuam contando como `VENDAS` — o total nunca muda.
- **Regra de faturamento / funil.** Detalhadas em [Como funciona](#como-funciona).

---

## Começando

### Pré-requisitos

- [Node.js 24+](https://nodejs.org) — o app usa o `node:sqlite` nativo
- [pnpm](https://pnpm.io) (versão fixada em `packageManager`)

### Instalação

```bash
pnpm install
```

### Desenvolvimento

```bash
pnpm dev      # sobe o Electron com hot reload do renderer
```

O banco é criado sozinho no primeiro boot, na pasta de dados do usuário (`metas.db`). Sem dados, o dashboard mostra o convite para rodar **Importar dados do SIGE**.

---

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Desenvolvimento (Electron + Vite) |
| `pnpm build` | Build de produção (main, preload e renderer em `out/`) |
| `pnpm start` | Pré-visualiza o build de produção |
| `pnpm typecheck` | `tsc` nos projetos node e web |
| `pnpm lint` | Checa o código com Biome |
| `pnpm lint:fix` | Lint + correções automáticas |
| `pnpm format` | Formata o código com Biome |
| `pnpm check:ci` | Tudo o que o CI roda (Biome + TypeScript) |
| `pnpm test` | Roda os testes (Vitest) |
| `pnpm dist:linux` | Empacota o AppImage (Linux) |
| `pnpm dist:win` | Empacota o instalador NSIS (Windows) |

---

## Testes

`pnpm test` roda o Vitest sem Playwright — testes puros de regra de negócio, sem UI nem browser.

| Suíte | Cobre |
|---|---|
| `tests/billing-rule.test.ts` | A regra de faturamento (categorias, status, normalização) |
| `tests/ingest.test.ts` | Leitura da planilha e reconciliação por código |
| `tests/database.test.ts` | Schema, migrations, metas, vendedores |
| `tests/kpis.test.ts` | Snapshot: faturamento, funil, filtros, escopo |
| `tests/photos.test.ts` | Foto do vendedor (assinatura, limite) |
| `tests/window-maximize.test.ts` | Geometria de maximizar em multi-monitor |
| `tests/renderer/*` | Módulos puros do renderer (formatação, `buildKpis`, rótulos, cores, foto) |

A planilha dos testes é gerada por `tests/fixtures/workbook.ts` e os dados fictícios por `tests/fixtures/factories.ts` (Faker pt-BR; com `seed` fixa os agregados se mantêm estáveis). Os testes do renderer rodam sem DOM/jsdom.

---

## Distribuição

O empacotamento usa `electron-builder` (`electron-builder.yml`):

```bash
pnpm dist:linux   # release/*.AppImage
pnpm dist:win     # release/*.exe (instalador NSIS)
```

- **Nome:** Sulmag Dashboard · **App ID:** `com.wallauer.sales-dashboard`
- Só o pacote pt-BR é embutido (`electronLanguages: pt_BR`), para o app ficar leve.
- O ícone vem de `resources/icon.png` (e do `assetsInlineLimit: 0` no renderer, para não virar `data:` e ser bloqueado pelo CSP).

> Cada sistema gera o seu próprio pacote: o `.exe` precisa ser gerado no Windows e o AppImage no Linux.

---

## Documentação

| Documento | Descrição |
|---|---|
| [docs/design-to-component.md](docs/design-to-component.md) | Como converter um design (screenshot/Figma) em componentes React neste projeto |
| [AGENTS.md](AGENTS.md) | Convenções de código, comentários e o roadmap por fases |

---

## Contribuindo

1. Crie uma branch a partir de `main` (`git checkout -b feat/minha-mudanca`).
2. Rode `pnpm check:ci` e `pnpm test` antes de commitar.
3. Sem comentários no código, exceto quando a regra de negócio ou o motivo de um workaround não for dedutível (ver `AGENTS.md`).
4. Commits em inglês, no imperativo, seguindo Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`), granulares por arquivo ou grupo lógico.
5. Abra um Pull Request descrevendo a mudança.

---

Feito por [Wallauer](https://github.com/Wallauerr).
