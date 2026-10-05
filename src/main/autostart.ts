import { app } from 'electron'

// Só Windows: no Linux exigiria um .desktop em ~/.config/autostart, que em dev
// apontaria para o binário do Electron em vez do app empacotado.
export const AUTOSTART_SUPPORTED = process.platform === 'win32'

export function isAutoStartEnabled(): boolean {
  if (!AUTOSTART_SUPPORTED) return false
  // O registro do Windows é por executável.
  return app.getLoginItemSettings({ path: process.execPath, args: [] })
    .openAtLogin
}

export function setAutoStartEnabled(enabled: boolean): boolean {
  if (!AUTOSTART_SUPPORTED) return false
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: [],
  })
  return isAutoStartEnabled()
}
