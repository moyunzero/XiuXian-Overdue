import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { applyFamilyOutcomeEffects } from '~/logic/act1/familyLedger'
import { assertArchiveDisplayStringsAreLocalized } from '~/logic/play/archiveDisplay'
import {
  buildRunArchive,
  buildSprintFinaleArchive,
  lifeStagesVisitedForArchive
} from '~/logic/play/buildRunArchive'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 8000,
  startingCity: '昆墟'
}

describe('buildRunArchive', () => {
  it('档案含三条可复述的「欠了什么」', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'saved-costly')
    const run = createPlayRunFromStartConfig(cfg, 'slot1')
    const archive = buildRunArchive({
      run,
      act1,
      startConfig: cfg,
      metaUnlocks: ['family-guarantor'],
      permanentModifiers: { interestRateMultiplier: 1.08 }
    })

    expect(archive.debtOwedSummary).toHaveLength(3)
    expect(archive.archivePhase).toBe('pre-enrollment')
    expect(archive.debtOwedSummary.every((line) => line.length > 4)).toBe(true)
    expect(archive.debtOwedSummary[2]).toContain('担保')
    expect(archive.oneLineVerdict).toContain('担保')
    expect(archive.nextStageTeaser).toContain('账单')
    expect(archive.epilogue.length).toBeGreaterThanOrEqual(3)
    expect(archive.fullReportLines?.some((l) => l.includes('制度档案'))).toBe(true)
    assertArchiveDisplayStringsAreLocalized(archive.topTags)
    expect(archive.topTags.some((t) => t.includes('family-guarantor'))).toBe(false)
    expect(archive.fullReportLines?.some((l) => l.includes('family-guarantor'))).toBe(false)
    expect(archive.fullReportLines?.some((l) => l.includes('七、下周目解锁'))).toBe(true)
  })

  it('迁出结局 epilogue 与 familyOutcome 对齐', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'left')
    const run = createPlayRunFromStartConfig(cfg, 'slot1')
    const archive = buildRunArchive({
      run,
      act1,
      startConfig: cfg,
      metaUnlocks: ['witness-departure'],
      permanentModifiers: {}
    })

    expect(archive.familyOutcome).toBe('left')
    expect(archive.debtOwedSummary[2]).toContain('迁出')
    expect(archive.epilogue[0]).toContain('污水街')
  })

  it('战役高中未升学时档案不含 uni 阶段', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'left')
    const hs = createHsFieldsFromStart(cfg, undefined, act1)
    const run = {
      ...createPlayRunFromStartConfig(cfg, 'slot1'),
      runMode: 'endless' as const,
      lifeStage: 'hs' as const,
      act1,
      ...hs,
      setpiece: { hsPromotionGateResolved: true }
    }
    expect(lifeStagesVisitedForArchive(run)).toEqual(['pre', 'hs'])
  })

  it('已进入 uni 时档案含 uni 阶段', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'left')
    const hs = createHsFieldsFromStart(cfg, undefined, act1)
    const run = {
      ...createPlayRunFromStartConfig(cfg, 'slot1'),
      runMode: 'endless' as const,
      lifeStage: 'uni' as const,
      act1,
      ...hs,
      setpiece: { uniFoundationGateResolved: true }
    }
    expect(lifeStagesVisitedForArchive(run)).toEqual(['pre', 'hs', 'uni'])
  })

  it('短局终章档案标签与身体留置为中文展示', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'saved-costly')
    const hs = createHsFieldsFromStart(cfg, undefined, act1)
    const run = {
      ...createPlayRunFromStartConfig(cfg, 'slot1'),
      runMode: 'endless' as const,
      lifeStage: 'hs' as const,
      act1,
      ...hs,
      profileTags: ['hs-graduated', 'sect-ash'],
      bodyLiens: ['lien-LeftPalm-5'],
      setpiece: {
        examBoss: {
          lastScore: 72,
          lastRank: 120,
          tierBefore: '普通班',
          tierAfter: '重点班'
        }
      }
    }
    const archive = buildSprintFinaleArchive({
      run,
      act1,
      startConfig: cfg,
      metaUnlocks: ['family-guarantor'],
      permanentModifiers: { interestRateMultiplier: 1.08 }
    })

    assertArchiveDisplayStringsAreLocalized(archive.topTags)
    assertArchiveDisplayStringsAreLocalized(archive.bodyLiens)
    expect(archive.topTags.some((t) => t.includes('灰炉院'))).toBe(true)
    expect(archive.bodyLiens[0]).toContain('左手掌')
    expect(archive.fullReportLines?.some((l) => l.includes('lien-'))).toBe(false)
  })
})
