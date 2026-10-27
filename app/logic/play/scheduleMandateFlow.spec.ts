import { describe, expect, it } from 'vitest'
import type { MandateDeliveryDef } from '~/types/chapter'
import { DEFAULT_WEEK_PLAN, tickChapterWeek } from '~/logic/play/chapterWeekFlow'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import {
  eligibleMandates,
  MAX_MANDATE_QUEUE,
  mandateQueueBlocksWeekAdvance,
  rollMandatesForWeek
} from '~/logic/play/mandateDelivery'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import { tilesToWeekPlan } from '~/logic/play/weekPlanTiles'
import {
  advanceScheduleWeek,
  buildWeekSettlementSummary,
  finalizeWeek,
  respondMandateAndMaybeFinalize,
  weekSettlementAlreadyApplied
} from '~/logic/play/scheduleMandateFlow'
import { buildHeadJarWeekPlan } from '~/logic/play/chapterTestHelpers'
import { buildMandateInboxPending } from '~/logic/play/mandateDelivery'
import type { PlayRunState } from '~/types/play'

function runWithPending(run: PlayRunState, ids: string[]): PlayRunState {
  return {
    ...run,
    mandate: {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: ids,
      supplyCutStreak: 0
    }
  }
}

function clearAllMandates(run: PlayRunState): PlayRunState {
  let next = run
  while ((next.mandate?.pendingDeliveryIds.length ?? 0) > 0) {
    const pending = buildMandateInboxPending(next)
    if (!pending) break
    const responseId = pending.responses[0]?.id
    if (!responseId) break
    next = respondMandateAndMaybeFinalize(next, responseId)
  }
  return next
}

describe('scheduleMandateFlow', () => {
  it('advanceScheduleWeek defers compound settlement until mandate queue cleared', () => {
    let run = settledFateRun()
    run = { ...run, seed: 17, chapter: { ...run.chapter!, chapterWeekIndex: 6 } }
    const { run: afterAdvance, blocked } = advanceScheduleWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(false)
    const pendingCount = afterAdvance.mandate?.pendingDeliveryIds.length ?? 0
    if (pendingCount > 0) {
      expect(weekSettlementAlreadyApplied(afterAdvance)).toBe(false)
      const cleared = clearAllMandates(afterAdvance)
      expect(cleared.mandate?.pendingDeliveryIds.length ?? 0).toBe(0)
      expect(weekSettlementAlreadyApplied(cleared)).toBe(true)
    }
  })

  it('respondMandateAndMaybeFinalize runs finalizeWeek when queue empties', () => {
    const run = runWithPending(settledFateRun(), ['ch0-debt-reminder'])
    const next = respondMandateAndMaybeFinalize(run, 'ack-min')
    expect(next.mandate?.pendingDeliveryIds.length ?? 0).toBe(0)
    expect(weekSettlementAlreadyApplied(next)).toBe(true)
  })

  it('tilesToWeekPlan feeds advanceScheduleWeek on fate_run', () => {
    const plan = tilesToWeekPlan({
      repay: 'min',
      study: 2,
      parttime: 1,
      rest: false
    })
    const { run: after, blocked } = advanceScheduleWeek(settledFateRun(), plan)
    expect(blocked).toBe(false)
    expect(after.chapter?.chapterWeekIndex).toBe(2)
  })

  it('full four-beat path lands on week-dashboard after mandates + finalize', () => {
    let run = settledFateRun()
    run = { ...run, seed: 17, chapter: { ...run.chapter!, chapterWeekIndex: 6 } }
    const { run: advanced } = advanceScheduleWeek(run, DEFAULT_WEEK_PLAN)
    const cleared = clearAllMandates(advanced)
    expect(resolvePlayScreen(cleared)).toBe('week-dashboard')
    const summary = buildWeekSettlementSummary(cleared)
    expect(summary.headline.length).toBeGreaterThan(0)
  })

  it('mandate queue full blocks 开本周 until cleared', () => {
    const ids = ['ch0-debt-reminder', 'ch0-focus-audit', 'ch0-kpi-nudge']
    const run = runWithPending(settledFateRun(), ids)
    expect(mandateQueueBlocksWeekAdvance(run)).toBe(true)
    const { blocked } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(true)
  })

  it('LOOP-04 excludes mortgaged-only defs for human primaryFate', () => {
    const run = settledFateRun()
    run.primaryFate = 'human'
    const mortgagedOnly: MandateDeliveryDef = {
      id: 'test-mortgaged-only',
      title: '抵押登记 · 追偿',
      body: '抵押资产追偿通知。',
      lifeStages: ['hs'],
      pool: 'routine',
      primaryFates: ['mortgaged'],
      responses: [
        { id: 'a', label: '配合', effects: [{ kind: 'log', message: 'test' }] },
        { id: 'b', label: '拖', grit: true, effects: [{ kind: 'numbness', value: 1 }] }
      ]
    }
    const humanOk: MandateDeliveryDef = {
      ...mortgagedOnly,
      id: 'test-human-ok',
      primaryFates: ['human']
    }
    const eligible = eligibleMandates(run, [mortgagedOnly, humanOk])
    expect(eligible.map((d) => d.id)).toEqual(['test-human-ok'])
  })

  it('setpiece preempts mandate-inbox screen', () => {
    const run = runWithPending(settledFateRun(), ['ch0-debt-reminder'])
    run.setpiece = {
      examBossPending: {
        score: 600,
        rank: 50,
        classTier: '重点班',
        tierBefore: '普通班',
        tierAfter: '重点班',
        perksDelta: { mealSubsidy: 0, focusBonus: 0 },
        week: 4,
        perkSummary: 'test'
      }
    }
    expect(resolvePlayScreen(run)).toBe('exam-boss')
  })

  it('rollMandatesForWeek on fate_run yields 0–3 mandates', () => {
    const base = settledFateRun()
    const counts: number[] = []
    for (let seed = 1; seed <= 80; seed++) {
      const rolled = rollMandatesForWeek({
        ...base,
        seed,
        chapter: { ...base.chapter!, chapterWeekIndex: 12 }
      })
      const n = rolled.mandate?.pendingDeliveryIds.length ?? 0
      counts.push(n)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(MAX_MANDATE_QUEUE)
    }
    expect(counts.some((n) => n >= 1)).toBe(true)
  })

  it('finalizeWeek is explicit escape hatch when advance deferred settlement', () => {
    const run = settledFateRun()
    run.chapter!.chapterWeekIndex = 10
    const finalized = finalizeWeek(run)
    expect(weekSettlementAlreadyApplied(finalized)).toBe(true)
  })

  it('head_jar incomplete plan blocks advanceScheduleWeek', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.runStatus = 'fated'
    const { blocked, blockReason } = advanceScheduleWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(true)
    expect(blockReason).toBe('请选择维生档位后再开本周。')
    expect(run.chapter?.chapterWeekIndex).toBe(1)
  })

  it('head_jar complete plan advances and finalize includes maintenance settlement log', () => {
    let run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.runStatus = 'fated'
    run.econ!.cash = 50_000
    run.chapter!.chapterWeekIndex = 10
    const plan = buildHeadJarWeekPlan('austerity', 'yang_patrol')
    const { run: after, blocked } = advanceScheduleWeek(run, plan)
    expect(blocked).toBe(false)
    const cleared = clearAllMandates(after)
    expect(cleared.logs.some((l) => l.includes('维生') || l.includes('账期'))).toBe(true)
    expect(cleared.chapter?.chapterWeekIndex).toBe(11)
  })

  it('human four-tile plan still advances without head_jar validation', () => {
    const plan = tilesToWeekPlan({
      repay: 'min',
      study: 1,
      parttime: 0,
      rest: false
    })
    const { run: after, blocked } = advanceScheduleWeek(settledFateRun(), plan)
    expect(blocked).toBe(false)
    expect(after.primaryFate).toBe('human')
    expect(after.chapter?.chapterWeekIndex).toBe(2)
  })
})
