# Componentes React

O padrão canônico agora vive na skill global `react-component`, com a referência de shadcn em `references/shadcn.md`.

Este projeto usa:

- **shadcn/ui (Radix)** + `cva` + `cn` (`cn = twMerge + clsx`)
- **Tailwind CSS v4** com CSS variables em `src/renderer/src/index.css`
- **React 19** + TypeScript strict
- **Lucide React** para ícones
- **Gráficos** via `src/renderer/src/components/ui/chart.tsx`; nunca Recharts cru

Regras específicas:

- Reuse `src/renderer/src/components/ui/*` antes de criar.
- Cores via tokens do tema; para SVG programático use `chartColor(n)` (`@/lib/colors`).
- Se houver screenshot/Figma, use como referência visual; sem design, siga o pedido.

Para o padrão completo (`export function`, `ComponentProps`, `cva`, `cn`, checklist), carregue a skill `react-component`.
