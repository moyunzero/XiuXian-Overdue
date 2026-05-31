import type { ChapterOutcomeId } from '~/types/chapter'
import type {
  ChapterCollapseTriggerId,
  ChapterFailurePostMortem,
  PlayRunState
} from '~/types/play'
import {
  analyzeChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD,
  CHAPTER_DEBT_DELINQUENCY_COLLAPSE,
  CHAPTER_DEBT_STRESS_DELINQUENCY,
  CHAPTER_DEBT_STRESS_RATIO
} from '~/logic/play/chapterCollapse'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { formatGateLabel } from '~/logic/play/playerFacingCopy'

const LOG_KEYWORDS = ['断供', '逾期', '强制收束', '抵押', '完整度', '审判', '月考', '筑基', '不可续贷', '清盘']

function chapterWeek(run: PlayRunState): number {
  return run.chapter?.chapterWeekIndex ?? run.chapter?.weekBudget ?? 0
}

function debtCashRatio(debt: number, cash: number): string {
  if (cash <= 0) return '现金已耗尽'
  const ratio = debt / cash
  return `负债约为现金 ${ratio.toFixed(1)} 倍（收束线 ${CHAPTER_DEBT_STRESS_RATIO} 倍）`
}

function pickLogTimeline(run: PlayRunState, limit = 3): string[] {
  return run.logs.filter((line) => LOG_KEYWORDS.some((kw) => line.includes(kw))).slice(0, limit)
}

function supplyCutTimeline(run: PlayRunState): string[] {
  const streak = run.mandate?.supplyCutStreak ?? 0
  const del = run.econ?.delinquency ?? 0
  const lines: string[] = []
  if (streak > 0) {
    lines.push(`断供链累计 ${streak} 周——多周未达最低还款，洞府灵气配额被削减。`)
  }
  if (streak >= 2 && del > 0) {
    lines.push(`连续断供触发逾期登记，征信逾期档现为 ${del}。`)
  }
  return lines
}

function bodyPlanHint(run: PlayRunState): string | undefined {
  const plan = run.lastWeekPlan
  if (!plan) return undefined
  const workLoad = plan.studyHours + plan.tunaHours + plan.parttimeHours + plan.workHours
  if (!plan.rest && workLoad >= 40) {
    return '近期周计划过劳（休息不足、工时偏高），完整度持续下滑。'
  }
  return undefined
}

function headlineForTrigger(
  triggerId: ChapterCollapseTriggerId,
  run: PlayRunState,
  week: number
): string {
  const del = run.econ?.delinquency ?? 0
  const debt = fullDebtFromRun(run)
  const cash = run.econ?.cash ?? 0
  const integrity = run.bodyIntegrity ?? 1
  const pct = (integrity * 100).toFixed(0)

  switch (triggerId) {
    case 'debt_delinquency':
      return `第 ${week} 周 · 逾期档 ${del} 触达收束线，灵贷契约强制终止。`
    case 'debt_stress_ratio':
      return `第 ${week} 周 · 负债远超现金缓冲（逾期档 ${del}），灵贷中心拒绝展期。`
    case 'body_integrity':
      return `第 ${week} 周 · 身体完整度 ${pct}% 跌破底线，抵押清算启动。`
    case 'body_exhaustion':
      return `第 ${week} 周 · 逾期 ${del} 档叠过劳，完整度 ${pct}% 触发双轨清盘。`
    case 'review_gate':
      return `第 ${week} 周 · 审判关未过且无降级路，契约强制收束。`
    default:
      return `第 ${week} 周 · 契约强制收束。`
  }
}

function ruleLineForTrigger(triggerId: ChapterCollapseTriggerId, run: PlayRunState): string {
  const del = run.econ?.delinquency ?? 0
  const debt = fullDebtFromRun(run)
  const cash = run.econ?.cash ?? 0
  const integrity = run.bodyIntegrity ?? 1
  const pct = (integrity * 100).toFixed(0)

  switch (triggerId) {
    case 'debt_delinquency':
      return `灵贷章程：逾期档 ≥ ${CHAPTER_DEBT_DELINQUENCY_COLLAPSE} 即启动强制收束与征信预冻结。`
    case 'debt_stress_ratio':
      return `灵贷章程：逾期 ≥ ${CHAPTER_DEBT_STRESS_DELINQUENCY} 且总负债 ≥ 现金 × ${CHAPTER_DEBT_STRESS_RATIO} 时判定不可续贷（当前 ${debtCashRatio(debt, cash)}）。`
    case 'body_integrity':
      return `体检贷章程：完整度低于 ${(CHAPTER_BODY_COLLAPSE_THRESHOLD * 100).toFixed(0)}% 即启动抵押清算（当前 ${pct}%）。`
    case 'body_exhaustion':
      return `双轨清盘：逾期 ≥ ${CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY} 且完整度 < ${(CHAPTER_BODY_EXHAUSTION_THRESHOLD * 100).toFixed(0)}%（当前 ${pct}%）。`
    case 'review_gate': {
      const gateId = run.chapter?.pendingGateId
      const gateLabel = gateId ? formatGateLabel(gateId) : '关键审判关'
      return `${gateLabel}未通过且无降级路径——征信写入审查挂科档。`
    }
    default:
      return '契约条款触线，灵贷中心启动强制收束。'
  }
}

function nearMissForTrigger(triggerId: ChapterCollapseTriggerId, run: PlayRunState): string | undefined {
  const del = run.econ?.delinquency ?? 0
  const debt = fullDebtFromRun(run)
  const cash = run.econ?.cash ?? 0
  const integrity = run.bodyIntegrity ?? 1
  const streak = run.mandate?.supplyCutStreak ?? 0

  switch (triggerId) {
    case 'debt_delinquency':
      return undefined
    case 'debt_stress_ratio':
      if (streak > 0) {
        return '若在断供链抬档前任意一周达成最低还款，逾期档可停止上升，负债/现金比也可能避开收束线。'
      }
      return '提高手头现金或压低滚动负债，可避免「负债远超现金缓冲」判定。'
    case 'body_integrity':
      return `完整度再维持 ${((integrity - CHAPTER_BODY_COLLAPSE_THRESHOLD) * 100).toFixed(0)} 个百分点以上，可推迟抵押清算（仍须处理债务）。`
    case 'body_exhaustion':
      return '在逾期档抬升的同时增加休息、减少过劳周计划，可打断双轨清盘路径。'
    case 'review_gate':
      return '审判关失败时若债务/身体未临界，通常写入降级档而非当场收束——本次已无降级路。'
    default:
      return undefined
  }
}

function progressHintForTrigger(triggerId: ChapterCollapseTriggerId, run: PlayRunState): string | undefined {
  const del = run.econ?.delinquency ?? 0
  const debt = fullDebtFromRun(run)
  const cash = run.econ?.cash ?? 0
  const integrity = run.bodyIntegrity ?? 1

  switch (triggerId) {
    case 'debt_delinquency':
      return `逾期档 ${del} / 收束线 ${CHAPTER_DEBT_DELINQUENCY_COLLAPSE}`
    case 'debt_stress_ratio':
      return debtCashRatio(debt, cash)
    case 'body_integrity':
      return `完整度 ${(integrity * 100).toFixed(0)}% / 底线 ${(CHAPTER_BODY_COLLAPSE_THRESHOLD * 100).toFixed(0)}%`
    case 'body_exhaustion':
      return `完整度 ${(integrity * 100).toFixed(0)}% / 过劳线 ${(CHAPTER_BODY_EXHAUSTION_THRESHOLD * 100).toFixed(0)}% · 逾期档 ${del}`
    case 'review_gate':
      return undefined
    default:
      return undefined
  }
}

function buildTimeline(
  triggerId: ChapterCollapseTriggerId,
  run: PlayRunState,
  checkLogLine: string
): string[] {
  const week = chapterWeek(run)
  const lines: string[] = []

  lines.push(...supplyCutTimeline(run))

  const bodyHint = bodyPlanHint(run)
  if (bodyHint && (triggerId === 'body_integrity' || triggerId === 'body_exhaustion')) {
    lines.push(bodyHint)
  }

  const fromLogs = pickLogTimeline(run, 3)
  for (const line of fromLogs) {
    if (!lines.includes(line)) lines.push(line)
  }

  if (lines.length < 3) {
    lines.push(checkLogLine)
  }

  lines.push(`第 ${week} 周：灵贷中心下发强制收束通知，本局终止。`)

  return lines.slice(0, 5)
}

function collapsedOutcome(outcome: ChapterOutcomeId | undefined): boolean {
  return !!outcome?.startsWith('collapse_')
}

function fallbackCheck(run: PlayRunState): { triggerId: ChapterCollapseTriggerId; logLine: string } {
  const outcome = run.chapter?.outcomeId
  if (outcome === 'collapse_body') {
    return {
      triggerId: 'body_integrity',
      logLine: '身体完整度触线——抵押清算启动，契约强制终止。'
    }
  }
  if (outcome === 'collapse_review') {
    return {
      triggerId: 'review_gate',
      logLine: '关键审判关未过且无降级路——契约强制终止。'
    }
  }
  return {
    triggerId: 'debt_delinquency',
    logLine: '灵贷中心启动强制收束，征信灵籍冻结。'
  }
}

/** 章节崩盘 / 审查收束的可复盘说明（V4-3） */
export function buildChapterFailurePostMortem(run: PlayRunState): ChapterFailurePostMortem | undefined {
  if (run.runMode !== 'chapter' || !run.chapter) return undefined

  const outcome = run.chapter.outcomeId
  const isCollapsed =
    run.runStatus === 'collapsed' || collapsedOutcome(outcome)
  if (!isCollapsed) return undefined

  const resolved = analyzeChapterCollapse(run) ?? fallbackCheck(run)
  const { triggerId, logLine } = resolved

  return {
    triggerId,
    headline: headlineForTrigger(triggerId, run, chapterWeek(run)),
    ruleLine: ruleLineForTrigger(triggerId, run),
    timeline: buildTimeline(triggerId, run, logLine),
    nearMiss: nearMissForTrigger(triggerId, run),
    progressHint: progressHintForTrigger(triggerId, run)
  }
}

/** 与 trigger 一致的氛围过场（禁止「触顶」误用） */
export function chapterCollapseEpilogue(triggerId: ChapterCollapseTriggerId): string[] {
  switch (triggerId) {
    case 'debt_delinquency':
      return [
        '逾期档触达收束线，所有可选路径同时变灰。',
        '灵贷中心把权限从「履约样本」改成「待处置资产」。',
        '你还坐在原处，但下一账期已不再属于你。'
      ]
    case 'debt_stress_ratio':
      return [
        '负债数字仍在滚动，但手头现金已经盖不住下一期利息。',
        '灵贷中心拒绝展期——不是突然暴毙，是缓冲耗尽后的程序性收束。',
        '你还坐在原处，但下一账期已不再属于你。'
      ]
    case 'body_integrity':
      return [
        '完整度读数触线，走廊摄像头把识别框调成了黄色。',
        '体检贷提醒变成红色推送——你还没还清，系统已开始清点可抵押部位。',
        '契约终止通知与催收灵信同时到达。'
      ]
    case 'body_exhaustion':
      return [
        '逾期档叠过劳，双轨指标在同周同时亮红灯。',
        '修炼配额与灵贷展期一并冻结——身体与账单被同一套程序收束。',
        '契约终止通知与催收灵信同时到达。'
      ]
    case 'review_gate':
      return [
        '审判关裁定书在屏上闪红，降级通道已被前置条件锁死。',
        '征信灵籍写入审查挂科档，可选路径同时变灰。',
        '你还坐在原处，但下一账期已不再属于你。'
      ]
    default:
      return [
        '可选路径变灰。权限从「履约样本」改为「待处置资产」。',
        '你还坐在原处，但下一账期已不再属于你。'
      ]
  }
}
