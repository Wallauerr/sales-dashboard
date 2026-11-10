import {
  BugIcon,
  ExternalLinkIcon,
  ListChecksIcon,
  SparklesIcon,
  Trash2Icon,
  WrenchIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WELCOME } from '@/lib/welcome'
import type { WhatsNewMode } from '@/lib/whats-new'
import {
  formatReleaseDate,
  RELEASE_SECTIONS,
  type ReleaseNote,
  type ReleaseSectionKey,
} from '../../../shared/releases'

const SECTION_ICONS: Record<ReleaseSectionKey, typeof SparklesIcon> = {
  highlights: SparklesIcon,
  improvements: WrenchIcon,
  fixes: BugIcon,
  removed: Trash2Icon,
}

function Section({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: typeof SparklesIcon
  items: string[]
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map(item => (
          <li key={item} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ReleaseNotesBody({ release }: { release: ReleaseNote }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Versão {release.version}</span>
        <span>{formatReleaseDate(release.date)}</span>
      </div>
      {RELEASE_SECTIONS.map(({ key, title }) => (
        <Section
          key={key}
          title={title}
          icon={SECTION_ICONS[key]}
          items={release[key] ?? []}
        />
      ))}
    </div>
  )
}

function WelcomeBody() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{WELCOME.summary}</p>
      <Section
        title="O que o app faz"
        icon={SparklesIcon}
        items={WELCOME.features}
      />
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecksIcon className="size-4 text-muted-foreground" />
          Como usar
        </h3>
        <ol className="flex flex-col gap-1.5">
          {WELCOME.steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

interface ReleaseNotesDialogProps {
  open: boolean
  mode: WhatsNewMode
  version: string
  release: ReleaseNote | null
  loading: boolean
  onOpenChange: (open: boolean) => void
}

export function ReleaseNotesDialog({
  open,
  mode,
  version,
  release,
  loading,
  onOpenChange,
}: ReleaseNotesDialogProps) {
  const welcome = mode === 'welcome'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {welcome
              ? 'Bem-vindo ao Sulmag Dashboard'
              : `Novidades da versão ${version}`}
          </DialogTitle>
          <DialogDescription>
            {welcome
              ? 'Um resumo do app e como começar.'
              : 'O app foi atualizado. Veja o que mudou nesta versão.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {welcome ? (
            <WelcomeBody />
          ) : release ? (
            <ReleaseNotesBody release={release} />
          ) : loading ? (
            <p className="text-sm text-muted-foreground">
              Carregando novidades…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as notas da versão {version}. Veja no
              GitHub.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void window.api?.openRepo()}>
            <ExternalLinkIcon />
            GitHub
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {welcome ? 'Começar' : 'Entendi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
