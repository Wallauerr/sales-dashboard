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
import { photoUrl } from '@/lib/photo-url'

interface Props {
  active: string[]
  disabled: string[]
  photos: Set<string>
  onPick: (seller: string) => Promise<void>
  onRemove: (seller: string) => Promise<void>
  onToggle: (seller: string, disable: boolean) => Promise<void>
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function SellersCard({
  active,
  disabled,
  photos,
  onPick,
  onRemove,
  onToggle,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const withPhoto = active.filter(v => photos.has(v)).length

  const run = async (
    key: string,
    action: () => Promise<void>,
  ): Promise<void> => {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedores</CardTitle>
        <CardDescription>
          {active.length === 0
            ? 'Nenhum vendedor encontrado — importe a planilha do SIGE.'
            : `${withPhoto} de ${active.length} com foto. Escolha um arquivo do computador; quem sai da empresa pode ser desativado e as vendas dele passam a contar como VENDAS.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p className="mb-2 text-xs text-destructive">Erro: {error}</p>
        ) : null}

        <section className="flex flex-col gap-0.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ativos · {active.length}
          </p>
          {active.length === 0 ? null : (
            <ul className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-3">
              {active.map(v => {
                const hasPhoto = photos.has(v)
                return (
                  <li
                    key={v}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <Avatar className="size-8 shrink-0 border">
                      {hasPhoto ? (
                        <AvatarImage src={photoUrl(v)} alt="" />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold tracking-wide text-primary">
                        {initials(v)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{v}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {hasPhoto ? 'Com foto' : 'Sem foto'}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={busy === `photo:${v}`}
                      onClick={() => void run(`photo:${v}`, () => onPick(v))}>
                      {busy === `photo:${v}` ? 'Abrindo…' : 'Trocar'}
                    </Button>
                    {hasPhoto ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Remover foto"
                        disabled={busy === `photo:${v}`}
                        onClick={() =>
                          void run(`photo:${v}`, () => onRemove(v))
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
                        void run(`toggle:${v}`, () => onToggle(v, true))
                      }>
                      <PowerIcon />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {disabled.length > 0 ? (
          <section className="flex flex-col gap-0.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Desativados · {disabled.length} — vendedores desativados contam
              como VENDAS
            </p>
            <ul className="flex flex-col gap-0.5">
              {disabled.map(v => (
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
                      void run(`toggle:${v}`, () => onToggle(v, false))
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
