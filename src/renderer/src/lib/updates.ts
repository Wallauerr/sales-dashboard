import { useEffect } from 'react'
import { toast } from 'sonner'
import type { UpdateState } from '../../../shared/types'

const AVAILABLE_ID = 'update-available'
const DOWNLOADING_ID = 'update-downloading'
const DOWNLOADED_ID = 'update-downloaded'
const ERROR_ID = 'update-error'

export function useUpdateNotifications(): void {
  useEffect(() => {
    if (!window.api) return
    let previous: UpdateState['status'] | null = null

    return window.api.onUpdateState(state => {
      const changed = state.status !== previous
      previous = state.status
      if (!changed) return

      if (state.status === 'available' && state.version) {
        toast(`Nova versão ${state.version} disponível`, {
          id: AVAILABLE_ID,
          description: 'Baixe a atualização quando quiser.',
          duration: Infinity,
          action: {
            label: 'Baixar',
            onClick: () => {
              toast.dismiss(AVAILABLE_ID)
              void window.api.downloadUpdate()
            },
          },
        })
        return
      }

      if (state.status === 'downloading') {
        toast.loading('Baixando atualização…', {
          id: DOWNLOADING_ID,
          duration: Infinity,
        })
        return
      }

      if (state.status === 'downloaded' && state.version) {
        toast.dismiss(DOWNLOADING_ID)
        toast.dismiss(AVAILABLE_ID)
        toast.success('Atualização pronta', {
          id: DOWNLOADED_ID,
          description: `Versão ${state.version} baixada.`,
          duration: Infinity,
          action: {
            label: 'Reiniciar e atualizar',
            onClick: () => {
              toast.dismiss(DOWNLOADED_ID)
              void window.api.installUpdate()
            },
          },
        })
        return
      }

      if (state.status === 'error') {
        toast.dismiss(DOWNLOADING_ID)
        toast.error('Falha ao verificar atualizações', {
          id: ERROR_ID,
          description: state.message ?? undefined,
        })
      }
    })
  }, [])
}
