import type { Act1PermanentModifiers, Act1State, FamilyOutcome } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import type { ClassTier, LifeStage, PlayRunState, RunArchive } from '~/types/play'
import {
  buildAct1SettlementLines,
  FAMILY_GUARANTOR_RATE_BUMP,
  FAMILY_FALSE_HOPE_RATE_BUMP
} from '~/logic/act1/act1Settlement'
import { totalDebtPrincipal } from '~/logic/act1/moduleProgress'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { formatArchiveTopTags, formatBodyLiensForArchive } from '~/logic/play/archiveDisplay'

const VERDICT_BY_OUTCOME: Record<FamilyOutcome, string> = {
  left: '你独自进了通道，档案里少了紧急联系人。',
  'saved-costly': '家人还在，但担保合约已写入下一阶段的利率。',
  'saved-false-hope': '周转贷入账当天，利息就开始走动。'
}

const EPILOGUE_BY_OUTCOME: Record<FamilyOutcome, string[]> = {
  left: [
    '你醒来时窗外是污水街的灰光。',
    '墙上投影滚动着「新用户三十天免息」——与你无关。',
    '灵信未读：7。第一条仍是还款提醒。'
  ],
  'saved-costly': [
    '你醒来听见厨房有动静——他们还在。',
    '手机弹出担保合约生效通知，日息数字比昨天更长。',
    '你算不清这是挽留，还是另一种签约。'
  ],
  'saved-false-hope': [
    '你醒来时家里灯还亮着，像什么都没发生。',
    '灵信里多了一条「周转成功」——利息从下一秒开始算。',
    '你知道这不是缓解，只是把崩盘往后推了几天。'
  ]
}

export interface BuildRunArchiveInput {
  run: PlayRunState
  act1: Act1State
  startConfig: StartConfig
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
}

export interface BuildSprintFinaleArchiveInput extends BuildRunArchiveInput {
  collapseReason?: string
}

function sprintFinaleEpilogue(
  exam: { score: number; rank: number; tierBefore: ClassTier; tierAfter: ClassTier },
  collapsed: boolean,
  collapseReason?: string
): string[] {
  if (collapsed) {
    if (collapseReason?.includes('逾期')) {
      return [
        '逾期档位触顶，所有可选路径同时变灰。',
        '系统把你的权限从「学生」改成「待处置资产」。',
        '你还坐在寝室，但门已经从外面锁上了。'
      ]
    }
    return [
      '抵押回执写入档案时，你看到余额少了一截。',
      '完整性指标下降，走廊摄像头把识别框调成了黄色。',
      '他们还没来取走什么，但留置登记已经生效。'
    ]
  }
  const tierUp = exam.tierAfter !== exam.tierBefore
  return [
    '升学公示屏亮过三十秒，预科通道费已经写入下一档账单。',
    tierUp
      ? `分班从 ${exam.tierBefore} 升到 ${exam.tierAfter}——待遇涨了，维护费也跟着涨。`
      : `你在 ${exam.tierAfter} 原地踏步，但利息从未原地踏步。`,
    '灵信推送：本局短局结算完成。你考上了，账单也升层了。'
  ]
}

function sprintFinaleVerdict(
  exam: { score: number; rank: number; tierAfter: ClassTier },
  collapsed: boolean,
  collapseReason?: string
): string {
  if (collapsed && collapseReason) return collapseReason
  return `升学关口已确认：月考 ${exam.score} 分（约第 ${exam.rank} 名），${exam.tierAfter} 档案盖章——债务同步升层。`
}

function sprintDebtOwedSummary(
  run: PlayRunState,
  act1: Act1State,
  debtTotal: number,
  exam: { score: number; rank: number; tierBefore: ClassTier; tierAfter: ClassTier },
  permanentModifiers: Act1PermanentModifiers
): [string, string, string] {
  const pre = debtOwedSummary(act1, run.start, debtTotal, permanentModifiers)
  const line1 = `本局终局负债 ¥${debtTotal.toLocaleString()}（入学前夜结转 + 高中卷计息）`
  const line2 = `月考 ${exam.score} 分 · 约第 ${exam.rank} 名 · ${exam.tierBefore}→${exam.tierAfter}`
  const liens = run.bodyLiens?.length ?? 0
  const delinq = run.econ?.delinquency ?? 0
  let line3 = pre[2]
  if (liens > 0) {
    line3 = `${liens} 处身体留置写入档案，后续周目不可撤销`
  } else if (delinq >= 3) {
    line3 = `逾期档位 ${delinq}，催收话术已接入高中维护费`
  }
  return [line1, line2, line3]
}

function debtOwedSummary(
  act1: Act1State,
  startConfig: StartConfig,
  debtTotal: number,
  permanentModifiers: Act1PermanentModifiers
): [string, string, string] {
  const line1 = `入学前夜结转负债 ¥${debtTotal.toLocaleString()}（含既有征信与灵贷动用）`

  const activeLoans = act1.loans.filter((l) => l.drawn > 0 || l.principal > 0)
  const line2 =
    activeLoans.length > 0
      ? `${activeLoans.length} 笔灵贷合同仍计息，逾期档位 ${act1.delinquency}`
      : startConfig.initialDebt > 0
        ? `开局征信 ¥${startConfig.initialDebt.toLocaleString()} 已并入滚动债`
        : '无额外合同，但制度通道费仍按日累积'

  let line3 = '催收档位将随逾期同步升级'
  if (permanentModifiers.interestRateMultiplier && permanentModifiers.interestRateMultiplier > 1) {
    const pct = Math.round((permanentModifiers.interestRateMultiplier - 1) * 100)
    line3 = `家庭担保抬升全周目贷款利率 +${pct}%（×${permanentModifiers.interestRateMultiplier.toFixed(2)}）`
  } else if (act1.familyOutcome === 'left') {
    line3 = '家庭担保额度已失效（监护人迁出）'
  } else if (act1.familyOutcome === 'saved-false-hope') {
    line3 = `家庭周转贷已入账，周息系数 +${Math.round(FAMILY_FALSE_HOPE_RATE_BUMP * 100)}%`
  } else if (act1.familyOutcome === 'saved-costly') {
    line3 = `挽留金已扣，担保利率 +${Math.round(FAMILY_GUARANTOR_RATE_BUMP * 100)}% 写入后续周目`
  }

  return [line1, line2, line3]
}

/** 制度档案「经历阶段」：仅反映已 playable 的 lifeStage，禁止高中档误标 uni */
export function lifeStagesVisitedForArchive(run: PlayRunState): LifeStage[] {
  const stages: LifeStage[] = ['pre']
  if (run.lifeStage !== 'pre' || run.econ) stages.push('hs')
  if (run.lifeStage === 'uni') stages.push('uni')
  return [...new Set(stages)]
}

function oneLineVerdict(act1: Act1State): string {
  if (act1.familyOutcome) return VERDICT_BY_OUTCOME[act1.familyOutcome]
  if (act1.interview.result === 'reject') return '末位借读通道已开，档案标签将跟随整个高中。'
  if (act1.interview.result === 'special') return '特招邀请入账，债务与待遇一并升层。'
  return '你已被纳入可计算样本。机构不承诺公平，仅承诺可追溯。'
}

/** 从入学前夜状态生成短局终章档案 */
export function buildRunArchive(input: BuildRunArchiveInput): RunArchive {
  const { run, act1, startConfig, metaUnlocks, permanentModifiers } = input
  const debtTotal = run.econ ? fullDebtFromRun(run) : totalDebtPrincipal(act1) || 0
  const fullReportLines = buildAct1SettlementLines(
    startConfig,
    act1,
    debtTotal,
    permanentModifiers,
    metaUnlocks
  )
  const outcome = act1.familyOutcome

  return {
    runId: run.runId,
    runMode: run.runMode,
    archivePhase: 'pre-enrollment',
    lifeStagesVisited: lifeStagesVisitedForArchive(run),
    totalDebtAtEnd: debtTotal,
    debtOwedSummary: debtOwedSummary(act1, startConfig, debtTotal, permanentModifiers),
    topTags: formatArchiveTopTags(act1.profileTags, 8),
    familyOutcome: outcome,
    bodyLiens: formatBodyLiensForArchive(run.bodyLiens ?? []),
    oneLineVerdict: oneLineVerdict(act1),
    nextStageTeaser: '你考上了，但账单也升层了。',
    epilogue: outcome ? EPILOGUE_BY_OUTCOME[outcome] : [],
    fullReportLines
  }
}

/** 短局 S0→S1→升学关口确认后终章档案 */
export function buildSprintFinaleArchive(input: BuildSprintFinaleArchiveInput): RunArchive {
  const { run, act1, startConfig, metaUnlocks, permanentModifiers, collapseReason } = input
  const debtTotal = fullDebtFromRun(run)
  const examBoss = run.setpiece?.examBoss
  const exam = examBoss
    ? {
        score: examBoss.lastScore,
        rank: examBoss.lastRank,
        tierBefore: examBoss.tierBefore,
        tierAfter: examBoss.tierAfter,
        week: run.school?.week ?? 1
      }
    : {
        score: run.school?.lastExamScore ?? 0,
        rank: run.school?.lastRank ?? 999,
        tierBefore: (run.school?.classTier ?? '普通班') as ClassTier,
        tierAfter: (run.school?.classTier ?? '普通班') as ClassTier,
        week: run.school?.week ?? 1
      }

  const collapsed = !!collapseReason
  const fullReportLines = buildAct1SettlementLines(
    startConfig,
    act1,
    debtTotal,
    permanentModifiers,
    metaUnlocks
  )
  fullReportLines.push(
    '',
    '--- 高中卷终章 ---',
    `月考：${exam.score} 分，约第 ${exam.rank} 名`,
    `分班：${exam.tierBefore} → ${exam.tierAfter}`,
    `终局负债：¥${debtTotal.toLocaleString()}`,
    ...(run.bodyLiens?.length
      ? [`身体留置：${formatBodyLiensForArchive(run.bodyLiens).join('、')}`]
      : [])
  )

  const tags = formatArchiveTopTags([...new Set([...act1.profileTags, ...run.profileTags])], 8)

  return {
    runId: run.runId,
    runMode: run.runMode,
    archivePhase: 'sprint-finale',
    lifeStagesVisited: ['pre', 'hs'],
    totalDebtAtEnd: debtTotal,
    debtOwedSummary: sprintDebtOwedSummary(run, act1, debtTotal, exam, permanentModifiers),
    topTags: tags,
    familyOutcome: act1.familyOutcome,
    bodyLiens: formatBodyLiensForArchive(run.bodyLiens ?? []),
    oneLineVerdict: sprintFinaleVerdict(exam, collapsed, collapseReason),
    nextStageTeaser: collapsed
      ? '通道在你还清之前不会关闭。再开一局，从另一条债务曲线开始。'
      : '你考上了，但账单也升层了。再开一局，或等待人生战役。',
    epilogue: sprintFinaleEpilogue(exam, collapsed, collapseReason),
    fullReportLines,
    collapseReason,
    examSummary: {
      score: exam.score,
      rank: exam.rank,
      tierBefore: exam.tierBefore,
      tierAfter: exam.tierAfter,
      week: exam.week
    }
  }
}
