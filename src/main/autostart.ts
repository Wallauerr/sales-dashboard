import { app } from 'electron'

// O TODO pede autostart no Windows. app.setLoginItemSettings no Linux exigiria
// um .desktop em ~/.config/autostart (e em dev apontaria para o binário do
// Electron, não para o app empacotado), então fora do Windows devolvemos false
// e a UI esconde o toggle.
export const AUTOSTART_SUPPORTED = process.platform === 'win32'

export function isAutoStartEnabled(): boolean {
  if (!AUTOSTART_SUPPORTED) return false
  // No Windows o registro é por executável, então o path precisa bater com o do
  // app empacotado.
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
