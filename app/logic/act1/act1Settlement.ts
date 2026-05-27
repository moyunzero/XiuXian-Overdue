import type {
  Act1PermanentModifiers,
  Act1State,
  FamilyOutcome,
  InterviewResult
} from '~/types/act1'
import type { StartConfig } from '~/types/game'
import { loanBalance } from './loanProducts'
import { totalDebtPrincipal } from './moduleProgress'
import { formatProfileTagsLine } from './profileTagLabels'
import { formatMetaUnlocksLine } from './metaUnlockLabels'

const INTERVIEW_LABELS: Record<InterviewResult, string> = {
  reject: '硬拒 · 末位借读通道',
  conditional: '附条件录取',
  special: '特招邀请（仍背债）'
}

const FAMILY_OUTCOME_COPY: Record<
  FamilyOutcome,
  { heading: string; lines: string[]; epilogue: string[] }
> = {
  left: {
    heading: '结局：监护人迁出',
    lines: [
      '桌面留言文件已归档。紧急联系人字段显示「已迁出」。',
      '家庭韧性不再计入可用担保额度。',
      'meta 解锁：witness-departure（二周目可见制度备注）。'
    ],
    epilogue: [
      '你醒来时窗外是污水街的灰光。',
      '墙上投影滚动着「新用户三十天免息」——与你无关。',
      '灵信未读：7。第一条仍是还款提醒。'
    ]
  },
  'saved-costly': {
    heading: '结局：挽留成功（金钱代价）',
    lines: [
      '家人留下。现金已扣 ¥8,000 作为挽留金与通道费。',
      '新增债权人：家庭担保合约（全周目贷款利率 +8%）。',
      '档案标签：family-guarantor · family-saved-costly。'
    ],
    epilogue: [
      '你醒来听见厨房有动静——他们还在。',
      '手机弹出担保合约生效通知，日息数字比昨天更长。',
      '你算不清这是挽留，还是另一种签约。'
    ]
  },
  'saved-false-hope': {
    heading: '结局：假希望 · 家庭周转贷',
    lines: [
      '家人留下。家庭周转贷 ¥5,000 已入账，韧性锁死在 1。',
      '每周自动扣息将在后续周目继承（Act2 待接）。',
      '档案标签：family-false-hope · family-bridge。'
    ],
    epilogue: [
      '你醒来时家里灯还亮着，像什么都没发生。',
      '灵信里多了一条「周转成功」——利息从下一秒开始算。',
      '你知道这不是缓解，只是把崩盘往后推了几天。'
    ]
  }
}

export const FAMILY_SAVED_COSTLY_CASH_COST = 8_000
export const FAMILY_GUARANTOR_RATE_BUMP = 0.08
export const FAMILY_FALSE_HOPE_RATE_BUMP = 0.05

/** 周目 2 可继承的永久利率系数 */
export function derivePermanentModifiers(state: Act1State): Act1PermanentModifiers {
  if (state.familyOutcome === 'saved-costly') {
    return { interestRateMultiplier: 1 + FAMILY_GUARANTOR_RATE_BUMP }
  }
  if (state.familyOutcome === 'saved-false-hope') {
    return { interestRateMultiplier: 1 + FAMILY_FALSE_HOPE_RATE_BUMP }
  }
  return {}
}

/** 本局解锁的 meta 词条 */
export function deriveMetaUnlocks(state: Act1State): string[] {
  const unlocks = new Set<string>()

  if (state.profileTags.includes('witness-departure') || state.familyOutcome === 'left') {
    unlocks.add('witness-departure')
  }
  if (state.profileTags.includes('family-guarantor') || state.familyOutcome === 'saved-costly') {
    unlocks.add('family-guarantor')
  }
  if (state.profileTags.includes('family-false-hope') || state.familyOutcome === 'saved-false-hope') {
    unlocks.add('family-false-hope')
  }
  if (state.profileTags.includes('price-aware')) unlocks.add('price-aware')
  if (state.profileTags.includes('ad-resistant')) unlocks.add('ad-resistant')
  if (state.interview.result === 'special') unlocks.add('special-track-memo')

  return [...unlocks]
}

export function formatPermanentModifiers(mods: Act1PermanentModifiers): string[] {
  if (!mods.interestRateMultiplier || mods.interestRateMultiplier <= 1) {
    return ['永久修正：（无额外金钱类惩罚）']
  }
  const pct = Math.round((mods.interestRateMultiplier - 1) * 100)
  return [`永久修正：全周目贷款利率 ×${mods.interestRateMultiplier.toFixed(2)}（+${pct}%）`]
}

export function buildAct1SettlementLines(
  startConfig: StartConfig,
  act1: Act1State,
  debtTotal: number,
  permanentModifiers: Act1PermanentModifiers,
  metaUnlocks: string[]
): string[] {
  const debt = debtTotal || totalDebtPrincipal(act1)
  const outcome = act1.familyOutcome
  const familyBlock = outcome
    ? [FAMILY_OUTCOME_COPY[outcome].heading, ...FAMILY_OUTCOME_COPY[outcome].lines]
    : ['家庭结局：未结案。']

  const contracts =
    act1.loans.length === 0
      ? ['合同清单：（无）']
      : [
          '合同清单：',
          ...act1.loans.map(
            (l) =>
              `· ${l.lenderName} 欠款 ¥${loanBalance(l).toLocaleString()}（授信 ¥${l.principal.toLocaleString()} · 动用 ¥${l.drawn.toLocaleString()} · 日息 ${(l.dailyRate * 100).toFixed(2)}%）`
          )
        ]

  const metaLines =
    metaUnlocks.length > 0
      ? ['下周目已解锁词条：', `· ${formatMetaUnlocksLine(metaUnlocks, 12)}`]
      : ['下周目已解锁词条：（无）']

  const epilogue = outcome ? FAMILY_OUTCOME_COPY[outcome].epilogue : []

  return [
    '【昆墟进修预审 · 制度档案】',
    '',
    '一、身份摘要',
    `对象：${startConfig.playerName || '你'}`,
    `属地：${startConfig.startingCity} · ${startConfig.background} · ${startConfig.talent}`,
    startConfig.initialDebt > 0
      ? `既有征信：¥${startConfig.initialDebt.toLocaleString()}`
      : '既有征信：无',
    '',
    '二、面试结论',
    `结果：${act1.interview.result ? INTERVIEW_LABELS[act1.interview.result] : '—'}`,
    `评分：${act1.interview.score}`,
    `档案标签：${formatProfileTagsLine(act1.profileTags, 14)}`,
    '',
    '三、负债与额度',
    `负债合计：¥${debt.toLocaleString()}`,
    `已动用灵贷额度：¥${act1.creditLineUsed.toLocaleString()}`,
    `逾期档位：${act1.delinquency} · 家庭韧性终值 ${act1.familyResilience}`,
    `向家里要钱：${act1.familyMeta.moneyRequests} 次`,
    ...contracts,
    '',
    '四、家庭与结局',
    ...familyBlock,
    '',
    '五、永久代价（金钱类）',
    ...formatPermanentModifiers(permanentModifiers),
    '',
    '六、系统评语',
    '你已被纳入可计算样本。机构不承诺公平，仅承诺可追溯。',
    '制度档案已归档。下一周目将开放部分备注可见性。',
    '',
    '七、meta',
    ...metaLines,
    '',
    '【过场 · 入学前夜终】',
    ...epilogue,
    '',
    '—— 本报告仅供内部流转。返回首页可「进入昆墟高中」接入周目 2。'
  ]
}
