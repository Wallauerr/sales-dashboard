import { LayoutDashboardIcon, PowerIcon, RotateCcwIcon } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { errorMessage } from '@/lib/errors'
import type { AutoStartView } from '../../../../shared/types'

function SettingRow({
  icon: Icon,
  title,
  description,
  control,
}: {
  icon: typeof PowerIcon
  title: string
  description: string
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </div>
  )
}

function AutoStartRow() {
  const [view, setView] = useState<AutoStartView | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!window.api) return
    let cancelled = false
    void window.api
      .getAutoStart()
      .then(v => {
        if (!cancelled) setView(v)
      })
      .catch(e => {
        if (!cancelled)
          toast.error('Não foi possível ler a configuração de autostart', {
            description: errorMessage(e),
          })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (view && !view.supported) return null

  const toggle = async (checked: boolean): Promise<void> => {
    if (!window.api) return
    setBusy(true)
    try {
      const v = await window.api.setAutoStart(checked)
      setView(v)
      toast.success(
        v.enabled
          ? 'Vai abrir junto com o Windows'
          : 'Não abre mais junto com o Windows',
      )
    } catch (e) {
      toast.error('Não foi possível alterar o autostart', {
        description: errorMessage(e),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingRow
      icon={PowerIcon}
      title="Abrir junto com o Windows"
      description="Inicia o dashboard automaticamente ao ligar o PC."
      control={
        <Switch
          checked={view?.enabled ?? false}
          disabled={busy || !view?.supported}
          onCheckedChange={checked => void toggle(checked)}
          aria-label="Abrir junto com o Windows"
        />
      }
    />
  )
}

export function PreferencesCard({
  onResetLayout,
}: {
  onResetLayout: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Preferências</CardTitle>
        <CardDescription>
          Comportamento do app neste computador.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y border-t">
          <AutoStartRow />
          <SettingRow
            icon={LayoutDashboardIcon}
            title="Layout da dashboard"
            description="Volta a posição e o tamanho padrão dos cartões."
            control={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetLayout}>
                <RotateCcwIcon />
                Restaurar padrão
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
