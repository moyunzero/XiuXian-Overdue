import { describe, expect, it } from 'vitest'
import { CHAPTER_BODY_COLLAPSE_THRESHOLD } from '~/logic/play/chapterCollapse'
import {
  buildHeadJarWeekPlan,
  settledFateRun,
  simFateWeek
} from '~/logic/play/chapterTestHelpers'
import { DEFAULT_WEEK_PLAN, markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import { HEAD_JAR_INTEGRITY } from '~/logic/play/headJarWeekPlan'
import { isPlayableRunStatus } from '~/logic/play/playRunFateDefaults'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import type { PlayRunState, PrimaryFate } from '~/types/play'

function planForRun(run: PlayRunState) {
  if (run.primaryFate === 'head_jar') {
    return buildHeadJarWeekPlan('austerity', 'yang_patrol')
  }
  return DEFAULT_WEEK_PLAN
}

/** Scripted integrity at weeks 8 / 14 per RESEARCH A1 */
function injectIntegrityScript(run: PlayRunState): PlayRunState {
  const week = run.chapter?.chapterWeekIndex ?? 0
  if (week === 8 && run.primaryFate === 'human') {
    return {
      ...markBeatResolvedForWeek(run),
      bodyIntegrity: CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    }
  }
  if (week === 14 && run.primaryFate === 'mortgaged') {
    return {
      ...run,
      bodyIntegrity: HEAD_JAR_INTEGRITY - 0.01
    }
  }
  return run
}

describe('fateContinuityFlow', () => {
  it('≥20 weeks human → mortgaged → head_jar without archived/ended/collapsed', () => {
    let run = settledFateRun()
    run.econ!.cash = 80_000
    const fatesSeen = new Set<PrimaryFate>()
    let prevWeek = run.chapter?.chapterWeekIndex ?? 0

    for (let i = 0; i < 22; i++) {
      run = injectIntegrityScript(run)
      fatesSeen.add(run.primaryFate)

      expect(isPlayableRunStatus(run.runStatus)).toBe(true)
      expect(['archived', 'ended', 'collapsed']).not.toContain(run.runStatus)

      run = simFateWeek(run, planForRun(run))

      expect(isPlayableRunStatus(run.runStatus)).toBe(true)
      expect(['archived', 'ended', 'collapsed']).not.toContain(run.runStatus)

      const weekNow = run.chapter?.chapterWeekIndex ?? 0
      expect(weekNow).toBeGreaterThanOrEqual(prevWeek)
      prevWeek = weekNow
    }

    expect(fatesSeen.has('human')).toBe(true)
    expect(fatesSeen.has('mortgaged')).toBe(true)
    expect(fatesSeen.has('head_jar')).toBe(true)
    expect(run.chapter?.chapterWeekIndex).toBeGreaterThanOrEqual(22)
  })

  it('head_jar contract: delegation_two + disabled schedule actions + statusBarFields', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.runStatus = 'fated'
    const shell = getFateShell(run)
    expect(shell.scheduleMode).toBe('delegation_two')
    expect(shell.disabledActions).toEqual(
      expect.arrayContaining(['study', 'parttime', 'rest', 'repay_hero'])
    )
    expect(shell.statusBarFields).toEqual(['debt', 'maintenance', 'integrity'])
  })

  it('fate-update screen when fateUpdatePending', () => {
    const run = settledFateRun()
    run.setpiece = {
      fateUpdatePending: { from: 'human', to: 'mortgaged', trigger: 'body_integrity' }
    }
    expect(resolvePlayScreen(run)).toBe('fate-update')
  })
})
