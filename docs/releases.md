# Releases e auto-update

Guia para publicar uma versão do Sulmag Dashboard e liberar a atualização automática.

O fluxo é: **versão no `package.json` → commit → tag `vX.Y.Z` → workflow no GitHub → draft → notas → publicação → auto-update**.

## Pré-requisitos

- Estar na `main` atualizada e com o CI verde.
- Ter acesso de escrita ao repositório `Wallauerr/sales-dashboard`.
- `gh` autenticado (`gh auth status`) se for publicar pelo terminal.

## Passo a passo

### 1. Suba a versão

```bash
npm version patch --no-git-tag-version   # ou minor/major
```

Isso altera `package.json` e `package-lock.json`. A versão precisa ser **maior** que a última publicada e igual à tag.

### 2. Commite e envie a `main`

```bash
git add package.json package-lock.json
git commit -m "build: release 1.0.2"
git push origin main
```

### 3. Crie e envie a tag

```bash
git tag v1.0.2
git push origin v1.0.2
```

Push normal na `main` roda só o CI. O workflow `Release` (`.github/workflows/release.yml`) dispara **apenas em tag `v*`**.

### 4. Acompanhe o workflow

```bash
gh run watch
```

O workflow valida se `v${package.version}` é igual à tag. Se não for, falha antes de buildar. Depois ele roda `check:ci` + `test`, cria o **release draft** com o template de notas e sobe o instalador, o `.blockmap` e o `latest.yml`.

### 5. Escreva as notas no draft

Abra o draft no GitHub (Releases → o draft da tag) e preencha o corpo seguindo o template:

```markdown
## Novidades
- Item novo 1
- Item novo 2

## Melhorias
- Melhoria 1

## Correções
- Correção 1

## Removido
- Item removido 1
```

Regras do formato:

- Os títulos reconhecidos são **Novidades**, **Melhorias**, **Correções** e **Removido** (aceita variações de caixa/acento e `#`, `##`, `###`).
- Use `-`, `*` ou `+` para os itens.
- Se não houver título, os itens caem em **Novidades**.
- Markdown inline é removido na exibição (`**negrito**`, `[link](url)`, `` `código` ``).
- Seções vazias podem ser omitidas.

O app **não lê o draft**: ele só enxerga releases **publicadas**. Por isso as notas precisam estar no corpo antes de publicar.

### 6. Teste o instalador

Baixe o `.exe` do draft e instale em uma máquina de teste. Confira se o app abre na versão nova.

### 7. Publique o draft

Pela interface do GitHub ou pelo terminal:

```bash
gh release edit v1.0.2 --draft=false
```

Só depois de publicar o auto-update enxerga a versão.

### 8. Valide o auto-update

Em uma máquina com a versão anterior:

1. Abra o app.
2. Deve aparecer o toast **Nova versão 1.0.2 disponível** com a ação **Baixar**.
3. Clique em **Baixar** e depois em **Reiniciar e atualizar**.
4. O app deve reiniciar na 1.0.2 e mostrar o modal de novidades na primeira abertura.

## Como o app lê as notas

- `src/main/releases/notes.ts` consulta `https://api.github.com/repos/Wallauerr/sales-dashboard/releases` (até 10 releases, só publicadas).
- `src/shared/releases.ts` converte o corpo Markdown em seções (`parseReleaseBody`) e monta o `ReleaseNote` (`releaseFromApi`).
- O renderer usa `useReleases` (`src/renderer/src/lib/use-releases.ts`), que guarda um cache em `localStorage['sd:release-notes']` para funcionar offline.
- O modal de atualização mostra as notas da versão instalada.
- O card **Novidades** (Configurações → Geral) mostra no máximo **as 3 releases mais recentes**; as mais antigas continuam no GitHub, mas somem do card.
- O modal de boas-vindas é local (`src/renderer/src/lib/welcome.ts`) e não depende da rede.

## Checklist rápido

- [ ] `package.json` com a versão nova
- [ ] commit `build: release X.Y.Z` na `main`
- [ ] tag `vX.Y.Z` enviada
- [ ] workflow `Release` verde
- [ ] notas preenchidas no draft (template acima)
- [ ] instalador testado
- [ ] draft publicado
- [ ] auto-update validado na versão anterior

## Problemas comuns

- **Workflow falhou em "Check version matches tag"**: a tag não bate com o `package.json`. Corrija a versão, refaça o commit e mova a tag (`git tag -f vX.Y.Z` + `git push -f origin vX.Y.Z`).
- **O app não vê a atualização**: o release ainda está em draft ou o `latest.yml` não foi publicado. Publique o draft.
- **Card sem novidades**: sem internet e sem cache, o card fica vazio. As notas voltam na próxima consulta online.
- **Rate limit do GitHub**: a API pública permite 60 requisições por hora por IP. O app consulta uma vez por abertura e mantém cache de 5 minutos no processo principal.
