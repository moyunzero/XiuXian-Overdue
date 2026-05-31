import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { applyFamilyOutcomeEffects } from '~/logic/act1/familyLedger'
import { assertArchiveDisplayStringsAreLocalized } from '~/logic/play/archiveDisplay'
import {
  buildChapterFinaleArchive,
  buildRunArchive,
  buildSprintFinaleArchive,
  lifeStagesVisitedForArchive
} from '~/logic/play/buildRunArchive'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { applyChapterCollapse } from '~/logic/play/chapterCollapse'
import { formatRunModeForArchive } from '~/logic/play/archiveDisplay'
import { simulateNaturalToW40 } from '~/logic/play/chapterNaturalSim'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import { openSegmentGate } from '~/logic/play/segmentGate'
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

  it('章节终章档案含三条可复述的「欠了什么」（债务/身体/权限）', () => {
    const run = simulateNaturalToW40('company')
    expect(run.runStatus).toBe('archived')
    expect(run.chapter?.outcomeId).toBe('fulfilled')
    const act1 = run.act1 ?? createInitialAct1State(run.start)
    const archive = buildChapterFinaleArchive({
      run,
      act1,
      startConfig: run.start,
      metaUnlocks: [],
      permanentModifiers: {}
    })

    expect(archive.archivePhase).toBe('chapter-finale')
    expect(archive.debtOwedSummary).toHaveLength(3)
    expect(archive.debtOwedSummary[0]).toContain('四十周契约负债')
    expect(archive.debtOwedSummary[1]).toContain('身体完整度')
    expect(archive.debtOwedSummary[2].length).toBeGreaterThan(4)
    expect(archive.oneLineVerdict).toContain('四十周灵贷契约')
    expect(archive.oneLineVerdict).toContain('履约')
    expect(formatRunModeForArchive(archive.runMode)).toBe('四十周契约')
    expect(archive.lifeStagesVisited).toEqual(expect.arrayContaining(['pre', 'hs']))
    assertArchiveDisplayStringsAreLocalized(archive.topTags)
    expect(archive.fullReportLines?.some((l) => l.includes('四十周契约终章'))).toBe(true)
  })

  it('章节 W40 fulfilled 闸门与 buildChapterFinaleArchive 对齐', () => {
    let run = settledChapterRun()
    run = {
      ...run,
      chapter: { ...run.chapter!, chapterWeekIndex: 40, weeksRemaining: 0, pendingGateId: 'gate-w40-finale' }
    }
    const ended = openSegmentGate(run, 'gate-w40-finale', 'pass')
    const act1 = ended.act1 ?? createInitialAct1State(ended.start)
    const archive = buildChapterFinaleArchive({
      run: ended,
      act1,
      startConfig: ended.start,
      metaUnlocks: [],
      permanentModifiers: {}
    })
    expect(archive.debtOwedSummary[2]).toMatch(/履约|KPI|岗位/)
  })

  it('章节崩盘档案 debtOwedSummary 含征信冻结语义', () => {
    let run = settledChapterRun()
    run.econ!.delinquency = 6
    run = applyChapterCollapse(run)
    const act1 = run.act1 ?? createInitialAct1State(run.start)
    const archive = buildChapterFinaleArchive({
      run,
      act1,
      startConfig: run.start,
      metaUnlocks: [],
      permanentModifiers: {}
    })

    expect(archive.debtOwedSummary[2]).toContain('预冻结')
    expect(archive.collapseReason).toBeDefined()
    expect(archive.failurePostMortem?.triggerId).toBe('debt_delinquency')
    expect(archive.failurePostMortem?.timeline.length).toBeGreaterThan(0)
    expect(archive.nextStageTeaser).toContain('冻结')
  })

  it('章节身体崩盘档案 permission 行含修炼配额冻结', () => {
    let run = settledChapterRun()
    run.bodyIntegrity = 0.27
    run = applyChapterCollapse(run)
    expect(run.chapter?.outcomeId).toBe('collapse_body')
    const act1 = run.act1 ?? createInitialAct1State(run.start)
    const archive = buildChapterFinaleArchive({
      run,
      act1,
      startConfig: run.start,
      metaUnlocks: [],
      permanentModifiers: {}
    })

    expect(archive.debtOwedSummary[2]).toContain('修炼配额冻结')
    expect(archive.failurePostMortem?.triggerId).toBe('body_integrity')
    expect(archive.epilogue.some((l) => l.includes('完整度'))).toBe(true)
  })
})
