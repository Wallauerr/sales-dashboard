import { KpiCard, KpiCardContent, KpiCardHeader, KpiCardTitle, KpiCardValue } from "@/components/kpi/KpiCard";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas Comercial</h1>
          <p className="text-sm text-muted-foreground">Dashboard que substitui o workbook do SIGE Cloud</p>
        </div>
        <Button>Importar export do SIGE</Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard>
          <KpiCardHeader>
            <KpiCardTitle>Faturamento</KpiCardTitle>
          </KpiCardHeader>
          <KpiCardContent>
            <KpiCardValue value="R$ —" hint="período selecionado" />
          </KpiCardContent>
        </KpiCard>
        <KpiCard>
          <KpiCardHeader>
            <KpiCardTitle>Acumulado</KpiCardTitle>
          </KpiCardHeader>
          <KpiCardContent>
            <KpiCardValue value="R$ —" hint="ano corrente" />
          </KpiCardContent>
        </KpiCard>
        <KpiCard>
          <KpiCardHeader>
            <KpiCardTitle>% da Meta</KpiCardTitle>
          </KpiCardHeader>
          <KpiCardContent>
            <KpiCardValue value="—" hint="meta = 115% do ano anterior" />
          </KpiCardContent>
        </KpiCard>
        <KpiCard>
          <KpiCardHeader>
            <KpiCardTitle>Restante/Ano</KpiCardTitle>
          </KpiCardHeader>
          <KpiCardContent>
            <KpiCardValue value="R$ —" hint="para bater a meta" />
          </KpiCardContent>
        </KpiCard>
      </section>

      <footer className="mt-auto text-xs text-muted-foreground">
        Electron {window.versions.electron()} · Node {window.versions.node()} · Chrome {window.versions.chrome()}
      </footer>
    </main>
  );
}
