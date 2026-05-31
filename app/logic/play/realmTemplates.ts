import realmData from '../../../data/realmTemplates.json'
import type { RealmTierId } from '~/types/play'

export interface RealmTemplate {
  id: RealmTierId
  displayName: string
  order: number
  capitalismSkin: {
    rankingLabel: string
    employerLabel: string
    loanProductNames: string[]
    maintenanceLabels: string[]
  }
  maintenanceCoeff: number
  harvestRate: number
  pressureDeckId: string
  breakthroughKpi: {
    minDaoXin?: number
    minFaLi?: number
    minRouTi?: number
    minDaysInRealm?: number
  }
  loanProducts: {
    id: string
    maxDraw: number
    dailyRate: number
    teaseCopy: string
  }[]
  celebrationCopy: string
  billCopy: string
}

const REALMS = (realmData as { realms: RealmTemplate[] }).realms.sort(
  (a, b) => a.order - b.order
)

export function listRealmTemplates(): RealmTemplate[] {
  return REALMS
}

export function getRealmTemplate(id: RealmTierId): RealmTemplate | undefined {
  return REALMS.find((r) => r.id === id)
}

export function getNextRealmTemplate(
  currentId: RealmTierId
): RealmTemplate | undefined {
  const current = getRealmTemplate(currentId)
  if (!current) return undefined
  return REALMS.find((r) => r.order === current.order + 1)
}

export function endlessRealmOrder(): RealmTierId[] {
  return REALMS.map((r) => r.id)
}
