import { Trash2Icon } from 'lucide-react'
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
import type { FotoOrigem } from '../../../../shared/types'

interface Props {
  vendedores: string[]
  fotos: Record<string, FotoOrigem>
  onEscolher: (vendedor: string) => Promise<void>
  onRemover: (vendedor: string) => Promise<void>
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function SellerPhotosCard({
  vendedores,
  fotos,
  onEscolher,
  onRemover,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const comFoto = vendedores.filter(v => fotos[v]).length

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
        <CardTitle>Fotos dos vendedores</CardTitle>
        <CardDescription>
          {vendedores.length === 0
            ? 'Nenhum vendedor encontrado — importe a planilha do SIGE.'
            : `${comFoto} de ${vendedores.length} com foto. A da planilha é usada por padrão; a escolhida aqui tem prioridade e sobrevive aos próximos imports.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {erro ? <p className="mb-2 text-xs text-destructive">{erro}</p> : null}
        {vendedores.length === 0 ? null : (
          <ul className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-3">
            {vendedores.map(v => {
              const origem = fotos[v]
              return (
                <li
                  key={v}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                  <Avatar className="size-8 shrink-0 border">
                    {origem ? <AvatarImage src={fotoUrl(v)} alt="" /> : null}
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold tracking-wide text-primary">
                      {initials(v)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{v}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {origem === 'manual'
                        ? 'Escolhida aqui'
                        : origem === 'excel'
                          ? 'Da planilha'
                          : 'Sem foto'}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={busy === v}
                    onClick={() => void rodar(v, () => onEscolher(v))}>
                    {busy === v ? 'Abrindo…' : 'Trocar'}
                  </Button>
                  {origem ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Remover foto"
                      disabled={busy === v}
                      onClick={() => void rodar(v, () => onRemover(v))}>
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
