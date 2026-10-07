import { PowerIcon, RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  ativos: string[]
  desativados: string[]
  onToggle: (vendedor: string, desativar: boolean) => Promise<void>
}

export function VendedoresCard({ ativos, desativados, onToggle }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const rodar = async (
    vendedor: string,
    acao: () => Promise<void>,
  ): Promise<void> => {
    setBusy(vendedor)
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedores</CardTitle>
        <CardDescription>
          Desativar esconde o vendedor do filtro e do ranking, mas as vendas
          dele continuam contando nas métricas do dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {erro ? <p className="text-xs text-destructive">Erro: {erro}</p> : null}
        <section className="flex flex-col gap-0.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ativos · {ativos.length}
          </p>
          {ativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum vendedor ativo.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {ativos.map(v => (
                <li
                  key={v}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{v}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-destructive"
                    disabled={busy === v}
                    onClick={() => void rodar(v, () => onToggle(v, true))}>
                    <PowerIcon />
                    {busy === v ? 'Desativando…' : 'Desativar'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {desativados.length > 0 ? (
          <section className="flex flex-col gap-0.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Desativados · {desativados.length}
            </p>
            <ul className="flex flex-col gap-0.5">
              {desativados.map(v => (
                <li
                  key={v}
                  className="flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 opacity-80">
                  <span className="min-w-0 flex-1 truncate text-sm">{v}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={busy === v}
                    onClick={() => void rodar(v, () => onToggle(v, false))}>
                    <RotateCcwIcon />
                    {busy === v ? 'Reativando…' : 'Reativar'}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
