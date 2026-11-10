import { ExternalLinkIcon, NewspaperIcon } from 'lucide-react'
import { useState } from 'react'
import { ReleaseNotesBody } from '@/components/release-notes'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type ReleaseNote, recentReleases } from '../../../../shared/releases'

interface Props {
  releases: ReleaseNote[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function ReleasesCard({ releases, loading, error, onRefresh }: Props) {
  const [open, setOpen] = useState(false)
  const recent = recentReleases(releases, 3)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Novidades</CardTitle>
          <CardDescription>
            As 3 atualizações mais recentes do app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-2 pt-0">
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Carregando novidades…'
                : error
                  ? 'Não foi possível carregar as novidades.'
                  : 'Nenhuma novidade publicada ainda.'}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}>
              <NewspaperIcon />
              Ver últimas atualizações
            </Button>
            {recent.length === 0 && error ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRefresh}>
                Tentar de novo
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void window.api?.openRepo()}>
              <ExternalLinkIcon />
              GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Últimas atualizações</DialogTitle>
            <DialogDescription>
              As 3 versões mais recentes do Sulmag Dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
            {recent.length > 0 ? (
              recent.map((release, index) => (
                <div
                  key={release.version}
                  className={index > 0 ? 'border-t pt-5' : undefined}>
                  <ReleaseNotesBody release={release} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Carregando novidades…'
                  : error
                    ? 'Não foi possível carregar as novidades.'
                    : 'Nenhuma novidade publicada ainda.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
