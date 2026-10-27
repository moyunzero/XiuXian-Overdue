/** v5 stage 里程碑 — Phase 7 JSON 驱动（registry 为真源） */
export type { StageDef, StageManifest, StageEventFilter } from '~/types/stage'
export { getStageDef, listStageDefs, getStageManifestForRun, resolveMandatePoolPath } from '~/logic/play/stageRegistry'
