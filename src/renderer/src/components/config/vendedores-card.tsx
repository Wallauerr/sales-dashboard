import { PowerIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fotoUrl } from '@/lib/foto-url'

interface Props {
  ativos: string[]
  desativados: string[]
  fotos: Set<string>
  onEscolher: (vendedor: string) => Promise<void>
  onRemover: (vendedor: string) => Promise<void>
  onToggle: (vendedor: string, desativar: boolean) => Promise<void>
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function VendedoresCard({
  ativos,
  desativados,
  fotos,
  onEscolher,
  onRemover,
  onToggle,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const comFoto = ativos.filter(v => fotos.has(v)).length

  const rodar = async (
    chave: string,
    acao: () => Promise<void>,
  ): Promise<void> => {
    setBusy(chave)
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
          {ativos.length === 0
            ? 'Nenhum vendedor encontrado — importe a planilha do SIGE.'
            : `${comFoto} de ${ativos.length} com foto. Escolha um arquivo do computador; quem sai da empresa pode ser desativado e as vendas dele passam a contar como VENDAS.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro ? (
          <p className="mb-2 text-xs text-destructive">Erro: {erro}</p>
        ) : null}

        <section className="flex flex-col gap-0.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ativos · {ativos.length}
          </p>
          {ativos.length === 0 ? null : (
            <ul className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-3">
              {ativos.map(v => {
                const temFoto = fotos.has(v)
                return (
                  <li
                    key={v}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <Avatar className="size-8 shrink-0 border">
                      {temFoto ? <AvatarImage src={fotoUrl(v)} alt="" /> : null}
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold tracking-wide text-primary">
                        {initials(v)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{v}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {temFoto ? 'Com foto' : 'Sem foto'}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={busy === `foto:${v}`}
                      onClick={() =>
                        void rodar(`foto:${v}`, () => onEscolher(v))
                      }>
                      {busy === `foto:${v}` ? 'Abrindo…' : 'Trocar'}
                    </Button>
                    {temFoto ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Remover foto"
                        disabled={busy === `foto:${v}`}
                        onClick={() =>
                          void rodar(`foto:${v}`, () => onRemover(v))
                        }>
                        <Trash2Icon />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      title="Desativar vendedor"
                      disabled={busy === `toggle:${v}`}
                      onClick={() =>
                        void rodar(`toggle:${v}`, () => onToggle(v, true))
                      }>
                      <PowerIcon />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {desativados.length > 0 ? (
          <section className="flex flex-col gap-0.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Desativados · {desativados.length} — vendedores desativados contam
              como VENDAS
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
                    disabled={busy === `toggle:${v}`}
                    onClick={() =>
                      void rodar(`toggle:${v}`, () => onToggle(v, false))
                    }>
                    <RotateCcwIcon />
                    {busy === `toggle:${v}` ? 'Reativando…' : 'Reativar'}
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
