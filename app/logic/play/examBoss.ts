import type { GameState } from '~/types/game'
import type { ExamBossResult, PlayRunState, SetpieceState } from '~/types/play'
import * as Engine from '~/logic/gameEngine'
import { clamp, mulberry32 } from '~/utils/rng'

function gameSliceForExam(run: PlayRunState): GameState {
  const school = run.school!
  const econ = run.econ!
  const stats = run.stats!
  return {
    started: true,
    seed: run.seed ?? 1,
    stats: { ...stats },
    econ: { ...econ },
    school: { ...school },
    cashDayStreak: 0,
    scoreDayStreak: 0,
    contract: {
      active: false,
      name: '',
      patron: '',
      progress: 0,
      vigilance: 0,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    bodyPartRepayment: {},
    bodyIntegrity: 1,
    bodyReputation: 'clean',
    buyDebasement: 0,
    daySlotActions: {},
    domestication: 0,
    numbness: 0
  }
}

export function examRankFromScore(score: number): number {
  return clamp(201 - Math.floor((score - 480) / 1.2), 1, 200)
}

export function shouldTriggerExamBoss(run: PlayRunState): boolean {
  if (run.lifeStage !== 'hs') return false
  const day = run.school?.day
  if (!day || day <= 1) return false
  return (day - 1) % 7 === 0
}

export function runExamBoss(run: PlayRunState, rand: () => number): ExamBossResult {
  const g = gameSliceForExam(run)
  const tierBefore = g.school.classTier
  const perksBefore = { ...g.school.perks }
  const score = Engine.scoreForExam(g, rand)
  const tierAfter = Engine.determineTier(score)
  const perksAfter = Engine.perksForTier(tierAfter)
  const rank = examRankFromScore(score)
  const week = run.school?.week ?? 1

  return {
    score,
    rank,
    classTier: tierAfter,
    tierBefore,
    tierAfter,
    perksDelta: {
      mealSubsidy: perksAfter.mealSubsidy - perksBefore.mealSubsidy,
      focusBonus: perksAfter.focusBonus - perksBefore.focusBonus
    },
    week,
    perkSummary: Engine.describePerkChange(perksBefore, perksAfter)
  }
}

export function applyExamBossToRun(run: PlayRunState, result: ExamBossResult): PlayRunState {
  if (!run.school) return run
  const perks = Engine.perksForTier(result.classTier)
  const logLine = `月考（第${result.week}周）：总分 ${result.score}，约第 ${result.rank} 名；${result.tierBefore}→${result.tierAfter}。${result.perkSummary}`
  const logs = [...run.logs, logLine].slice(-80)

  const setpiece: SetpieceState = {
    ...run.setpiece,
    examBoss: {
      lastScore: result.score,
      lastRank: result.rank,
      tierBefore: result.tierBefore,
      tierAfter: result.tierAfter
    },
    examsCompleted: (run.setpiece?.examsCompleted ?? 0) + 1,
    examBossPending: undefined
  }

  return {
    ...run,
    logs,
    setpiece,
    school: {
      ...run.school,
      lastExamScore: result.score,
      lastRank: result.rank,
      classTier: result.classTier,
      perks
    }
  }
}

export function scheduleExamBossIfDue(run: PlayRunState): PlayRunState {
  if (!shouldTriggerExamBoss(run)) return run
  if (run.setpiece?.examBossPending) return run

  const week = run.school?.week ?? 1
  const rand = mulberry32((run.seed ?? 1) + week * 777)
  const result = runExamBoss(run, rand)

  return {
    ...run,
    setpiece: {
      ...run.setpiece,
      examBossPending: result
    }
  }
}

export function dismissExamBoss(run: PlayRunState): PlayRunState {
  const pending = run.setpiece?.examBossPending
  if (!pending) return run
  return applyExamBossToRun(run, pending)
}
