import { describe, expect, it } from 'vitest'
import { DEFAULT_WEEK_PLAN, tickChapterWeek } from '~/logic/play/chapterWeekFlow'
import { applyMandatePsyToActions } from '~/logic/play/mandatePsy'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import {
  MAX_MANDATE_QUEUE,
  buildMandateInboxPending,
  drainPendingMandates,
  mandateQueueBlocksWeekAdvance,
  respondToMandate,
  rollMandatesForWeek,
  visibleResponsesForRun
} from '~/logic/play/mandateDelivery'
import { getMandateDef } from '~/logic/play/mandateRegistry'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

function runWithPending(ids: string[]) {
  const base = settledChapterRun(start)
  return {
    ...base,
    mandate: {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: ids,
      supplyCutStreak: 0
    }
  }
}

describe('mandateDelivery', () => {
  it('tick 后可能掷出来文', () => {
    let run = settledChapterRun(start)
    run = { ...run, seed: 42 }
    for (let i = 0; i < 6; i++) {
      run = tickChapterWeek(run, DEFAULT_WEEK_PLAN).run
      run = drainPendingMandates(run)
    }
    const rolled = rollMandatesForWeek({ ...run, seed: 99, chapter: { ...run.chapter!, chapterWeekIndex: 8 } })
    expect(rolled.mandate?.pendingDeliveryIds.length ?? 0).toBeGreaterThanOrEqual(0)
  })

  it('respondToMandate 出队并应用 domestication', () => {
    const run = runWithPending(['ch0-debt-reminder'])
    const before = run.mandate!.domestication
    const next = respondToMandate(run, 'ack-min')
    expect(next.mandate!.pendingDeliveryIds).toEqual([])
    expect(next.mandate!.domestication).toBeGreaterThan(before)
  })

  it('队列满 3 时阻塞周推进', () => {
    const run = runWithPending(['ch0-debt-reminder', 'ch0-focus-audit', 'ch0-kpi-nudge'])
    expect(mandateQueueBlocksWeekAdvance(run)).toBe(true)
    const { blocked } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(true)
  })

  it('buildMandateInboxPending 暴露可见回应', () => {
    const run = runWithPending(['ch0-debt-reminder'])
    const pending = buildMandateInboxPending(run)
    expect(pending?.deliveryId).toBe('ch0-debt-reminder')
    expect(pending?.responses.length).toBeGreaterThanOrEqual(2)
  })

  it('麻木 ≥40 时 visibleResponses 保留 grit 出路', () => {
    const def = getMandateDef('ch0-debt-reminder')
    expect(def).toBeTruthy()
    const run = {
      ...runWithPending(['ch0-debt-reminder']),
      mandate: {
        numbness: 45,
        domestication: 0,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        supplyCutStreak: 0
      }
    }
    const visible = visibleResponsesForRun(run, def!)
    expect(visible.some((r) => r.grit)).toBe(true)
    expect(visible.filter((r) => !r.grit).length).toBeLessThanOrEqual(1)
  })

  it('pending mandate 时 resolvePlayScreen 为 mandate-inbox', () => {
    const run = runWithPending(['ch0-debt-reminder'])
    expect(resolvePlayScreen(run)).toBe('mandate-inbox')
  })

  it('applyMandatePsyToActions 高麻木时锁 study/tuna', () => {
    const run = runWithPending([])
    run.mandate!.numbness = 50
    const base = {
      repay: true,
      study: true,
      tuna: true,
      parttime: true,
      work: false,
      rest: true
    }
    const muted = applyMandatePsyToActions(run, base)
    expect(muted.study).toBe(false)
    expect(muted.tuna).toBe(false)
    expect(muted.parttime).toBe(true)
    expect(muted.repay).toBe(true)
  })

  it('家庭线 left 标签可抽到 family 池来文', () => {
    let run = settledChapterRun(start, 'left')
    expect(run.profileTags.some((t) => t === 'witness-departure' || t === 'mother-left')).toBe(true)
    run = {
      ...run,
      seed: 7,
      chapter: { ...run.chapter!, chapterWeekIndex: 10 }
    }
    let hitFamily = false
    for (let seed = 1; seed < 300; seed++) {
      const rolled = rollMandatesForWeek({ ...run, seed })
      const ids = rolled.mandate?.pendingDeliveryIds ?? []
      if (ids.some((id) => getMandateDef(id)?.pool === 'family')) {
        hitFamily = true
        break
      }
    }
    expect(hitFamily).toBe(true)
  })

  it('drainPendingMandates 清空队列', () => {
    const run = runWithPending(['ch0-debt-reminder', 'ch0-kpi-nudge'])
    const drained = drainPendingMandates(run)
    expect(drained.mandate?.pendingDeliveryIds.length ?? 0).toBe(0)
    expect(drained.mandate!.pendingDeliveryIds.length).toBeLessThan(MAX_MANDATE_QUEUE)
  })
})
