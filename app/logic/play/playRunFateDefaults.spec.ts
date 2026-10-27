import { describe, expect, it } from 'vitest'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import {
  defaultFateFieldsForRun,
  deriveStageIdFromRun,
  isPlayableRunStatus,
  mapCollapseTriggerToFate,
  mergeTagRecords,
  upgradeRunToSchemaV5
} from '~/logic/play/playRunFateDefaults'
import { getStageDef } from '~/logic/play/stageRegistry'
import type { PlayRunState } from '~/types/play'

const M0_ID = 'stage-m0-pre'
const M1_ID = 'stage-m1-contract'
const M2_ID = 'stage-m2-hs'

describe('playRunFateDefaults', () => {
  describe('isPlayableRunStatus', () => {
    it('active 与 fated 可续玩周程', () => {
      expect(isPlayableRunStatus('active')).toBe(true)
      expect(isPlayableRunStatus('fated')).toBe(true)
    })

    it('collapsed / ended / archived 不可续玩', () => {
      expect(isPlayableRunStatus('collapsed')).toBe(false)
      expect(isPlayableRunStatus('ended')).toBe(false)
      expect(isPlayableRunStatus('archived')).toBe(false)
    })
  })

  describe('stage ladder (LADDER-01/02)', () => {
    it('M0/M1 registry defs完整', () => {
      expect(getStageDef(M0_ID)?.id).toBe(M0_ID)
      expect(getStageDef(M0_ID)?.contentPack).toBe('m0-pre')
      expect(getStageDef(M1_ID)?.id).toBe(M1_ID)
      expect(getStageDef(M1_ID)?.weekRange).toEqual([1, 40])
      expect(getStageDef(M1_ID)?.contentPack).toBe('m1-contract')
    })

    it('deriveStageIdFromRun：pre 或无 chapter → M0，否则 M1', () => {
      const chapterRun = settledChapterRun()
      expect(deriveStageIdFromRun(chapterRun)).toBe(M1_ID)

      const noChapter = { ...chapterRun, chapter: undefined }
      expect(deriveStageIdFromRun(noChapter)).toBe(M0_ID)

      const preRun = { ...chapterRun, lifeStage: 'pre' as const }
      expect(deriveStageIdFromRun(preRun)).toBe(M0_ID)
    })

    it('deriveStageIdFromRun：week 41 → M2', () => {
      const run = settledChapterRun()
      run.chapter!.chapterWeekIndex = 41
      expect(deriveStageIdFromRun(run)).toBe(M2_ID)
    })
  })

  describe('defaultFateFieldsForRun (FATE-01)', () => {
    it('新档默认 human + 空 institutionalTags + 推导 stageId', () => {
      const run = settledChapterRun()
      const defaults = defaultFateFieldsForRun(run)
      expect(defaults.primaryFate).toBe('human')
      expect(defaults.institutionalTags).toEqual([])
      expect(defaults.stageId).toBe(M1_ID)
    })
  })

  describe('mergeTagRecords (FATE-02)', () => {
    it('同 id 合并时 incoming 覆盖 appliedAtWeek / source', () => {
      const merged = mergeTagRecords(
        [{ id: 'credit_blacklist', appliedAtWeek: 1, source: 'legacy' }],
        [{ id: 'credit_blacklist', appliedAtWeek: 5, source: 'continuity' }]
      )
      expect(merged).toHaveLength(1)
      expect(merged[0]?.appliedAtWeek).toBe(5)
      expect(merged[0]?.source).toBe('continuity')
    })

    it('不同 id 叠加保留', () => {
      const merged = mergeTagRecords(
        [{ id: 'credit_blacklist' }],
        [{ id: 'supply_cut' }, { id: 'exam_probation' }]
      )
      expect(merged.map((t) => t.id).sort()).toEqual([
        'credit_blacklist',
        'exam_probation',
        'supply_cut'
      ])
    })
  })

  describe('mapCollapseTriggerToFate', () => {
    it('body_integrity → mortgaged', () => {
      expect(mapCollapseTriggerToFate('body_integrity').primaryFate).toBe('mortgaged')
    })
  })

  describe('upgradeRunToSchemaV5', () => {
    it('collapsed chapter → fated 续玩', () => {
      const run = settledChapterRun() as PlayRunState
      run.runStatus = 'collapsed'
      run.stageId = M1_ID
      run.chapter!.outcomeId = 'collapse_debt'
      const upgraded = upgradeRunToSchemaV5(run)
      expect(upgraded.runStatus).toBe('fated')
      expect(upgraded.stageId).toBe(M1_ID)
    })
  })
})
