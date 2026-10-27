import m0Pre from '../../../data/stages/m0-pre/stage.json'
import m1Contract from '../../../data/stages/m1-contract/stage.json'
import m2Hs from '../../../data/stages/m2-hs/stage.json'
import m3Uni from '../../../data/stages/m3-uni/stage.json'
import m4Work from '../../../data/stages/m4-work/stage.json'
import type { MandatePoolKey } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import type { StageManifest } from '~/types/stage'

const RAW_MANIFESTS = [m0Pre, m1Contract, m2Hs, m3Uni, m4Work] as StageManifest[]

function assertStageManifest(raw: StageManifest): StageManifest {
  const required = [
    'id',
    'displayName',
    'weekRange',
    'contentPack',
    'chapterId',
    'mandatePools',
    'lifeStages',
    'defaultFate',
    'tagPools',
    'eventPack',
    'unlockMeta'
  ] as const
  for (const key of required) {
    if (raw[key] === undefined) {
      throw new Error(`stage manifest ${raw.id ?? '(unknown)'} missing ${key}`)
    }
  }
  return raw
}

const STAGES_BY_ID = new Map<string, StageManifest>(
  RAW_MANIFESTS.map((m) => {
    const manifest = assertStageManifest(m)
    return [manifest.id, manifest] as const
  })
)

export function getStageDef(id: string): StageManifest | undefined {
  return STAGES_BY_ID.get(id)
}

export function listStageDefs(): StageManifest[] {
  return [...STAGES_BY_ID.values()]
}

export function getStageManifestForRun(
  run: Pick<PlayRunState, 'stageId' | 'lifeStage' | 'chapter'>
): StageManifest | undefined {
  if (run.stageId) {
    return getStageDef(run.stageId)
  }
  return undefined
}

/** Manifest-only pool path resolution (D-137 cutover — no chapter fallback). */
export function resolveMandatePoolPath(
  stageId: string,
  poolKey: MandatePoolKey,
  _chapterId?: string | null
): string | undefined {
  const manifest = STAGES_BY_ID.get(stageId)
  if (!manifest) return undefined
  const path = manifest.mandatePools[poolKey]
  if (typeof path === 'string' && path.trim()) {
    return path
  }
  return undefined
}
