# Conversão de Design para Componentes React

Analise o design anexado (screenshot ou frame do Figma) e converta para componentes React seguindo os padrões abaixo.

---

## Stack

- **React 19** (sem `forwardRef`)
- **TypeScript** strict
- **Tailwind CSS v4** com `@theme inline` e CSS variables (ver `src/renderer/src/index.css`)
- **shadcn/ui** (`components/ui/*`) — componentes headless via Radix + wrappers com `data-slot`
- **class-variance-authority** (`cva`) para variantes
- **`cn()`** (`tailwind-merge` + `clsx`, via `@/lib/utils`) para merge de classes
- **Lucide React** para ícones
- **Gráficos**: sempre usar o componente **shadcn `ui/chart`** (`ChartContainer`, `ChartTooltip`, `ChartLegend`, `ChartStyle` / `chartConfig`) — **nunca recharts cru** nem SVG à mão

---

## Nomenclatura

- Arquivos: **lowercase com hífens** → `user-card.tsx`, `use-modal.ts`
- **Sempre named exports**, nunca default export (`export { Button, buttonVariants }`)
- Não criar barrel files (`index.ts`) para pastas internas

---

## Estrutura de Componente

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

---

## Compound Components

```tsx
import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("text-lg leading-none font-semibold", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent };
```

---

## Cores (CSS Variables — ver `index.css`)

```
bg-background, bg-card, bg-popover        → fundos
bg-primary, bg-secondary, bg-muted, bg-accent → ações/estados
bg-destructive                            → erros/danger

text-foreground                           → texto principal
text-muted-foreground                     → texto secundário/desabilitado
text-primary-foreground / text-secondary-foreground / text-accent-foreground / text-card-foreground

border-border, border-input               → bordas padrão
border-primary, border-destructive        → bordas de destaque

ring-ring                                 → focus ring

chart-1 … chart-5                         → cores de dados (gráficos)
```

Para dados programáticos de SVG (charts), resolva a cor com `chartColor(n)` (`@/lib/colors`, retorna `var(--chart-N)`); em componentes passados por `chartConfig`/`ChartStyle`, use `var(--chart-N)`.

---

## TypeScript

```tsx
// ✅ Estender React.ComponentProps + VariantProps
export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

// ✅ Import type para tipos
import type { VariantProps } from "class-variance-authority";

// ❌ Não usar React.FC nem any
```

---

## Padrões Importantes

```tsx
// Sempre usar cn()
className={cn("classes-base", className)}

// Sempre usar data-slot
<div data-slot="card">

// Estados com data-attributes
data-disabled={disabled ? "" : undefined}
className="data-[disabled]:opacity-50 data-[selected]:bg-primary"

// Focus visible
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

// Ícones com tamanho
<Check className="size-4" />
"[&_svg]:size-4" // em variantes

// Botões de ícone precisam de aria-label
<button aria-label="Fechar"><X className="size-4" /></button>

// Composição de primitivas com asChild
<Button asChild><a href="/...">...</a></Button>

// Props spread no final
{...props}
```

---

## Radix / shadcn (componentes headless)

```tsx
// Dialog — via components/ui/dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Tabs — via components/ui/tabs.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Select — via components/ui/select.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Dropdown Menu — via components/ui/dropdown-menu.tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Chart — via components/ui/chart.tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
```

Trate todos como **primitivas headless do Radix**: use `asChild` para composição, `Portal`/`Content` para posicionamento e estados via `data-*`.

---

## Checklist

- [ ] Arquivo lowercase com hífens
- [ ] Named export (`export { X }`)
- [ ] `React.ComponentProps<'elemento'>` + `VariantProps`
- [ ] Variantes com `cva()`, classes com `cn()`
- [ ] `data-slot` para identificação
- [ ] Estados via `data-[state]:`
- [ ] Cores do tema (nunca hardcoded) — `bg-*`, `text-*`, `chart-1..5`
- [ ] Gráficos via `ui/chart` (`ChartContainer`/`chartConfig`), não recharts cru
- [ ] Focus visible em interativos
- [ ] `aria-label` em botões de ícone
- [ ] `{...props}` no final

---

Agora analise o design anexado e gere o código do componente.