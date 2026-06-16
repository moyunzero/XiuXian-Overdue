/** v5 stage 里程碑定义（Phase 1 最小常量；完整表见 Phase 7） */
export interface StageDef {
  id: string
  displayName: string
  weekRange?: [number, number]
  contentPack?: string
}

export const STAGE_M0_PRE: StageDef = {
  id: 'stage-m0-pre',
  displayName: '入学前夜',
  weekRange: [0, 0],
  contentPack: 'm0-pre'
}

export const STAGE_M1_CONTRACT: StageDef = {
  id: 'stage-m1-contract',
  displayName: '灵贷契约章',
  weekRange: [1, 40],
  contentPack: 'm1-contract'
}
