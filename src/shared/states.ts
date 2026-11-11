export const UF_LIST = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const STATE_REGION: Record<string, string> = {
  AC: 'Norte',
  AP: 'Norte',
  AM: 'Norte',
  PA: 'Norte',
  RO: 'Norte',
  RR: 'Norte',
  TO: 'Norte',
  AL: 'Nordeste',
  BA: 'Nordeste',
  CE: 'Nordeste',
  MA: 'Nordeste',
  PB: 'Nordeste',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RN: 'Nordeste',
  SE: 'Nordeste',
  GO: 'Centro-Oeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  DF: 'Centro-Oeste',
  ES: 'Sudeste',
  MG: 'Sudeste',
  RJ: 'Sudeste',
  SP: 'Sudeste',
  PR: 'Sul',
  RS: 'Sul',
  SC: 'Sul',
  Exterior: 'Exterior',
}

const NORMALIZED_REGION: Record<string, string> = {
  sul: 'Sul',
  sudeste: 'Sudeste',
  nordeste: 'Nordeste',
  norte: 'Norte',
  'centro-oeste': 'Centro-Oeste',
  exterior: 'Exterior',
}

export function canonicalState(state: string): string {
  const e = String(state).trim().toUpperCase().replace(/\s+/g, '')
  return e === '' ? '' : e
}

export function canonicalRegion(state: string, region: string): string {
  const r = String(region).trim().toLowerCase().replace(/\s+/g, ' ')
  if (r && NORMALIZED_REGION[r]) return NORMALIZED_REGION[r]
  const uf = canonicalState(state)
  if (STATE_REGION[uf]) return STATE_REGION[uf]
  return String(region).trim()
}

export function isValidState(state: string): boolean {
  return (UF_LIST as readonly string[]).includes(canonicalState(state))
}
