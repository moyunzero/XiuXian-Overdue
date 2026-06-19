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
import { STAGE_M0_PRE, STAGE_M1_CONTRACT, STAGE_M2_HS } from '~/logic/play/stageDefs'
import type { PlayRunState } from '~/types/play'

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
    it('M0/M1 占位常量字段完整', () => {
      expect(STAGE_M0_PRE.id).toBe('stage-m0-pre')
      expect(STAGE_M0_PRE.contentPack).toBe('m0-pre')
      expect(STAGE_M1_CONTRACT.id).toBe('stage-m1-contract')
      expect(STAGE_M1_CONTRACT.weekRange).toEqual([1, 40])
      expect(STAGE_M1_CONTRACT.contentPack).toBe('m1-contract')
    })

    it('deriveStageIdFromRun：pre 或无 chapter → M0，否则 M1', () => {
      const chapterRun = settledChapterRun()
      expect(deriveStageIdFromRun(chapterRun)).toBe(STAGE_M1_CONTRACT.id)

      const noChapter = { ...chapterRun, chapter: undefined }
      expect(deriveStageIdFromRun(noChapter)).toBe(STAGE_M0_PRE.id)

      const preRun = { ...chapterRun, lifeStage: 'pre' as const }
      expect(deriveStageIdFromRun(preRun)).toBe(STAGE_M0_PRE.id)
    })

    it('deriveStageIdFromRun：week 41 → M2', () => {
      const run = settledChapterRun()
      run.chapter!.chapterWeekIndex = 41
      expect(deriveStageIdFromRun(run)).toBe(STAGE_M2_HS.id)
    })
  })

  describe('defaultFateFieldsForRun (FATE-01)', () => {
    it('新档默认 human + 空 institutionalTags + 推导 stageId', () => {
      const run = settledChapterRun()
      const defaults = defaultFateFieldsForRun(run)
      expect(defaults.primaryFate).toBe('human')
      expect(defaults.institutionalTags).toEqual([])
      expect(defaults.stageId).toBe(STAGE_M1_CONTRACT.id)
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
    it('身体线 → mortgaged；债务线 → human + tags', () => {
      expect(mapCollapseTriggerToFate('body_integrity').primaryFate).toBe('mortgaged')
      const debt = mapCollapseTriggerToFate('debt_delinquency')
      expect(debt.primaryFate).toBe('human')
      expect(debt.tags.map((t) => t.id)).toEqual(
        expect.arrayContaining(['credit_blacklist', 'supply_cut'])
      )
    })
  })

  describe('upgradeRunToSchemaV5 (SAVE-01/02 helper)', () => {
    it('缺 fate 字段的 v4 run 补全 schema v5 默认值', () => {
      const run = settledChapterRun()
      const { primaryFate: _pf, institutionalTags: _it, stageId: _sid, ...rest } = run
      const legacy = { ...rest, schemaVersion: 4 } as PlayRunState
      const upgraded = upgradeRunToSchemaV5(legacy)
      expect(upgraded.schemaVersion).toBe(5)
      expect(upgraded.primaryFate).toBe('human')
      expect(upgraded.institutionalTags).toEqual([])
      expect(upgraded.stageId).toBe(STAGE_M1_CONTRACT.id)
      expect(upgraded.runStatus).toBe('active')
    })
  })
})
