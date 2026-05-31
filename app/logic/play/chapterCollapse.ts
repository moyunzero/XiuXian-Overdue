import type { ChapterOutcomeId } from '~/types/chapter'
import type { ChapterCollapseTriggerId, PlayRunState } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

export const CHAPTER_BODY_COLLAPSE_THRESHOLD = 0.28
/** 逾期叠过劳：完整度跌破该线且逾期 ≥ MIN 时 collapse_body（先于债务 stress 路径） */
export const CHAPTER_BODY_EXHAUSTION_THRESHOLD = 0.86
export const CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY = 3
export const CHAPTER_DEBT_DELINQUENCY_COLLAPSE = 6
export const CHAPTER_DEBT_STRESS_DELINQUENCY = 3
export const CHAPTER_DEBT_STRESS_RATIO = 12

export type { ChapterCollapseTriggerId } from '~/types/play'

export interface ChapterCollapseCheck {
  outcomeId: ChapterOutcomeId
  triggerId: ChapterCollapseTriggerId
  logLine: string
}

function analyzeChapterCollapseMetrics(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.runMode !== 'chapter' || !run.chapter || !run.econ) return null

  const integrity = run.bodyIntegrity ?? 1
  const del = run.econ.delinquency
  const debt = fullDebtFromRun(run)
  const cash = run.econ.cash

  if (integrity < CHAPTER_BODY_COLLAPSE_THRESHOLD) {
    return {
      outcomeId: 'collapse_body',
      triggerId: 'body_integrity',
      logLine: `身体完整度 ${(integrity * 100).toFixed(0)}% 跌破底线——抵押清算启动，契约强制终止。`
    }
  }

  if (
    del >= CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY &&
    integrity < CHAPTER_BODY_EXHAUSTION_THRESHOLD
  ) {
    return {
      outcomeId: 'collapse_body',
      triggerId: 'body_exhaustion',
      logLine: `逾期 ${del} 档叠过劳损耗，完整度 ${(integrity * 100).toFixed(0)}%——双轨清盘启动。`
    }
  }

  if (del >= CHAPTER_DEBT_DELINQUENCY_COLLAPSE) {
    return {
      outcomeId: 'collapse_debt',
      triggerId: 'debt_delinquency',
      logLine: `逾期档位 ${del} 触线——灵贷中心启动强制收束，征信灵籍冻结。`
    }
  }

  if (
    del >= CHAPTER_DEBT_STRESS_DELINQUENCY &&
    cash > 0 &&
    debt >= cash * CHAPTER_DEBT_STRESS_RATIO
  ) {
    return {
      outcomeId: 'collapse_debt',
      triggerId: 'debt_stress_ratio',
      logLine: `总负债 ¥${debt.toLocaleString()} 远超现金缓冲——灵贷中心判定不可续贷。`
    }
  }

  return null
}

/** 按当前数值推断崩盘触发（已 collapsed 时用于归档复盘） */
export function analyzeChapterCollapse(run: PlayRunState): ChapterCollapseCheck | null {
  const outcome = run.chapter?.outcomeId
  if (outcome === 'collapse_review') {
    return {
      outcomeId: 'collapse_review',
      triggerId: 'review_gate',
      logLine: '关键审判关未过且无降级路——征信灵籍写入审查挂科档，契约强制终止。'
    }
  }
  return analyzeChapterCollapseMetrics(run)
}

/** 债务/身体/断供链是否已达章节崩盘（不含审查关，审查由 gate 处理） */
export function detectChapterCollapse(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.runMode !== 'chapter' || !run.chapter || !run.econ) return null
  if (run.runStatus === 'collapsed' || run.runStatus === 'archived' || run.runStatus === 'ended') {
    return null
  }
  return analyzeChapterCollapseMetrics(run)
}

export function applyChapterCollapse(run: PlayRunState): PlayRunState {
  const hit = detectChapterCollapse(run)
  if (!hit) return run

  return {
    ...run,
    runStatus: 'collapsed',
    chapter: {
      ...run.chapter!,
      outcomeId: hit.outcomeId,
      pendingGateId: undefined
    },
    logs: [hit.logLine, ...run.logs].slice(0, 80)
  }
}
