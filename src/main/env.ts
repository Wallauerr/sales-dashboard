import { join } from 'node:path'

export type AppEnv = 'dev' | 'prod' | 'test'

export const APP_DIR_NAME = 'sales-dashboard'

const APP_ENVS: readonly AppEnv[] = ['dev', 'prod', 'test']

function isAppEnv(value: string | undefined): value is AppEnv {
  return APP_ENVS.includes(value as AppEnv)
}

export interface AppEnvInput {
  isPackaged: boolean
  env?: string | undefined
  nodeEnv?: string | undefined
}

export function resolveAppEnv(input: AppEnvInput): AppEnv {
  if (isAppEnv(input.env)) return input.env
  if (input.nodeEnv === 'test') return 'test'
  return input.isPackaged ? 'prod' : 'dev'
}

export function databasePath(
  userData: string,
  env: AppEnv,
  userDataOverride?: string,
): string {
  const base = userDataOverride ?? userData
  return env === 'prod' ? join(base, 'metas.db') : join(base, env, 'metas.db')
}

export function canSeed(env: AppEnv): boolean {
  return env !== 'prod'
}

export interface DefaultUserDataInput {
  platform: string
  home: string
  appData?: string | undefined
  xdgConfig?: string | undefined
}

export function defaultUserData(input: DefaultUserDataInput): string {
  if (input.platform === 'win32') {
    return join(input.appData ?? input.home, APP_DIR_NAME)
  }
  if (input.platform === 'darwin') {
    return join(input.home, 'Library', 'Application Support', APP_DIR_NAME)
  }
  return join(input.xdgConfig ?? join(input.home, '.config'), APP_DIR_NAME)
}
