import type { UpdateState } from '../../shared/types.ts'
import type { AppEnv } from '../env.ts'

export function shouldAutoUpdate(
  env: AppEnv,
  isPackaged: boolean,
  platform: NodeJS.Platform = process.platform,
): boolean {
  return env === 'prod' && isPackaged && platform === 'win32'
}

export function idleUpdateState(): UpdateState {
  return { status: 'idle', version: null, percent: null, message: null }
}
