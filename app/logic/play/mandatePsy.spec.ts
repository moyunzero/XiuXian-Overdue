import { describe, expect, it } from 'vitest'
import type { WeekPlan } from '~/types/chapter'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import { isWeekActionAllowed } from '~/logic/play/chapterWeekFlow'
import { visibleResponsesForRun } from '~/logic/play/mandateDelivery'
import { getMandateDef } from '~/logic/play/mandateRegistry'
import {
  DOMESTICATION_MUTE_THRESHOLD,
  NUMBNESS_MUTE_THRESHOLD,
  applyMandatePsyToActions,
  applyMandatePsyToRepayTiers,
  clampWeekPlanToPsy,
  hasInferiorWeekOutlet,
  weekPlanPsyNotice
} from '~/logic/play/mandatePsy'

function segmentFlags(run: ReturnType<typeof settledChapterRun>) {
  return {
    repay: isWeekActionAllowed(run, 'repay'),
    study: isWeekActionAllowed(run, 'study'),
    tuna: isWeekActionAllowed(run, 'tuna'),
    parttime: isWeekActionAllowed(run, 'parttime'),
    work: isWeekActionAllowed(run, 'work'),
    rest: isWeekActionAllowed(run, 'rest')
  }
}

describe('mandatePsy · V4-4', () => {
  it('麻木 ≥40 时灰掉 study/tuna，保留 parttime 与 repay', () => {
    const run = settledChapterRun()
    run.mandate = { numbness: 45, domestication: 0, pendingDeliveryIds: [], supplyCutStreak: 0 }
    const base = segmentFlags(run)
    const muted = applyMandatePsyToActions(run, base)
    expect(muted.study).toBe(false)
    expect(muted.tuna).toBe(false)
    expect(muted.parttime).toBe(true)
    expect(muted.repay).toBe(true)
  })

  it('驯化 ≥50 时灰掉 partial/extra 还款，保留 min 与 skip', () => {
    const run = settledChapterRun()
    run.mandate = { numbness: 0, domestication: 55, pendingDeliveryIds: [], supplyCutStreak: 0 }
    const tiers = applyMandatePsyToRepayTiers(run)
    expect(tiers.min).toBe(true)
    expect(tiers.skip).toBe(true)
    expect(tiers.partial).toBe(false)
    expect(tiers.extra).toBe(false)
  })

  it('麻木+驯化双高时灰掉休息，仍保留 skip 与零工劣质出路', () => {
    const run = settledChapterRun()
    run.mandate = {
      numbness: NUMBNESS_MUTE_THRESHOLD,
      domestication: DOMESTICATION_MUTE_THRESHOLD,
      pendingDeliveryIds: [],
      supplyCutStreak: 0
    }
    const muted = applyMandatePsyToActions(run, segmentFlags(run))
    expect(muted.rest).toBe(false)
    expect(muted.parttime).toBe(true)
    const repayTiers = applyMandatePsyToRepayTiers(run)
    expect(hasInferiorWeekOutlet(muted, repayTiers)).toBe(true)
  })

  it('clampWeekPlanToPsy 清除被锁字段并回退非法还款档位', () => {
    const run = settledChapterRun()
    run.mandate = { numbness: 50, domestication: 60, pendingDeliveryIds: [], supplyCutStreak: 0 }
    const plan: WeekPlan = {
      repay: 'extra',
      studyHours: 12,
      tunaHours: 6,
      parttimeHours: 8,
      workHours: 0,
      rest: true
    }
    const clamped = clampWeekPlanToPsy(run, plan)
    expect(clamped.studyHours).toBe(0)
    expect(clamped.tunaHours).toBe(0)
    expect(clamped.repay).toBe('skip')
    expect(clamped.rest).toBe(false)
    expect(clamped.parttimeHours).toBe(8)
  })

  it('useChapterSession 等价链路：段内动作经 PSY 后仍有劣质出路', () => {
    const run = settledChapterRun()
    run.mandate = { numbness: 60, domestication: 70, pendingDeliveryIds: [], supplyCutStreak: 0 }
    const actions = applyMandatePsyToActions(run, segmentFlags(run))
    const repayTiers = applyMandatePsyToRepayTiers(run)
    expect(hasInferiorWeekOutlet(actions, repayTiers)).toBe(true)
    expect(weekPlanPsyNotice(run)).toContain('灰化')
  })

  it('来文 visibleResponses 与仪表盘共用麻木阈值，保留 grit 出路', () => {
    const def = getMandateDef('ch0-debt-reminder')
    expect(def).toBeTruthy()
    const run = settledChapterRun()
    run.mandate = {
      numbness: NUMBNESS_MUTE_THRESHOLD + 5,
      domestication: 0,
      pendingDeliveryIds: ['ch0-debt-reminder'],
      supplyCutStreak: 0
    }
    const visible = visibleResponsesForRun(run, def!)
    expect(visible.some((r) => r.grit)).toBe(true)
    expect(visible.length).toBeGreaterThanOrEqual(2)
  })
})
