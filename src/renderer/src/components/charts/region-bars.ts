import { chartColor } from '@/lib/colors'
import type { KpiSnapshot } from '../../../../shared/types'
import { NO_STATE_LABEL } from '../../../../shared/types'

const REGION_COLORS: Record<string, string> = {
  Norte: chartColor(1),
  Nordeste: chartColor(4),
  'Centro-Oeste': chartColor(3),
  Sudeste: chartColor(2),
  Sul: chartColor(5),
  Exterior: 'var(--muted-foreground)',
  [NO_STATE_LABEL]: 'var(--muted-foreground)',
}

export interface RegionDatum {
  label: string
  value: number
  color?: string
}

export function regionBarData(snap: KpiSnapshot): RegionDatum[] {
  return snap.byRegion.map(region => ({
    label: region.region,
    value: region.value,
    color: REGION_COLORS[region.region],
  }))
}
