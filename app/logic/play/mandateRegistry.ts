import ch0Routine from '../../../data/mandates/ch0-routine.json'
import ch0Node from '../../../data/mandates/ch0-node.json'
import ch0Family from '../../../data/mandates/ch0-family.json'
import type { ChapterConfig, MandateDeliveryDef, MandatePoolKey } from '~/types/chapter'

const POOL_BY_PATH: Record<string, MandateDeliveryDef[]> = {
  'data/mandates/ch0-routine.json': ch0Routine as MandateDeliveryDef[],
  'data/mandates/ch0-node.json': ch0Node as MandateDeliveryDef[],
  'data/mandates/ch0-family.json': ch0Family as MandateDeliveryDef[]
}

const ALL_MANDATES: MandateDeliveryDef[] = [
  ...(ch0Routine as MandateDeliveryDef[]),
  ...(ch0Node as MandateDeliveryDef[]),
  ...(ch0Family as MandateDeliveryDef[])
]

const BY_ID = new Map(ALL_MANDATES.map((m) => [m.id, m]))

export function getMandateDef(id: string): MandateDeliveryDef | undefined {
  return BY_ID.get(id)
}

export function listMandatesForPool(config: ChapterConfig, pool: MandatePoolKey): MandateDeliveryDef[] {
  const path = config.mandatePools[pool]
  if (!path) return []
  return POOL_BY_PATH[path] ?? []
}

export function allMandateDefs(): MandateDeliveryDef[] {
  return ALL_MANDATES
}
