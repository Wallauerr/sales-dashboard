const IPC_PREFIX = /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/

const FALLBACK = 'Ocorreu um erro inesperado.'

export function errorMessage(error: unknown, fallback = FALLBACK): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  const message = raw.replace(IPC_PREFIX, '').trim()
  return message || fallback
}
