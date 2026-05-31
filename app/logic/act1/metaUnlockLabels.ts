import type { Act1PermanentModifiers } from '~/types/act1'

/** meta 词条 ID → 玩家可见中文（制度档案 / 首页摘要） */
const META_UNLOCK_LABELS: Record<string, string> = {
  'witness-departure': '见证离场（制度备注可见）',
  'family-guarantor': '家庭担保合约（利率追溯）',
  'family-false-hope': '家庭周转贷（假希望档案）',
  'price-aware': '比价阅读记录',
  'ad-resistant': '广告抗拒档位',
  'special-track-memo': '特招轨道备忘'
}

/** 二周目面试顶栏「制度备注」 */
const META_INSTITUTIONAL_NOTES: Record<string, string> = {
  'witness-departure':
    '制度备注：档案显示上一周目存在「监护人迁出」见证记录。本回合问卷将附加风控追问字段。',
  'family-guarantor':
    '制度备注：家庭担保合约已归档。灵贷中心将按担保档位重算你的可比产品列表。',
  'family-false-hope':
    '制度备注：家庭周转贷条目仍有效。催收线程可能提前进入联系人档位。',
  'price-aware': '制度备注：系统记录你曾在产品对比表停留 ≥30 秒。',
  'ad-resistant': '制度备注：你曾多次关闭灵贷推广，推送档位已上调。',
  'special-track-memo': '制度备注：特招轨道邀请已写入预审样本库。'
}

const FAMILY_OUTCOME_LABELS: Record<string, string> = {
  left: '家人离场',
  'saved-costly': '挽留成功（金钱代价）',
  'saved-false-hope': '假希望 · 周转贷'
}

export function formatMetaUnlock(id: string): string {
  return META_UNLOCK_LABELS[id] ?? `制度词条（${id}）`
}

export function formatMetaUnlocks(ids: string[], limit?: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const label = formatMetaUnlock(id)
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
    if (limit !== undefined && out.length >= limit) break
  }
  return out
}

export function formatMetaUnlocksLine(ids: string[], limit = 8): string {
  const labels = formatMetaUnlocks(ids, limit)
  return labels.length ? labels.join(' · ') : '（无）'
}

export function buildInstitutionalNotes(metaUnlocks: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of metaUnlocks) {
    const note = META_INSTITUTIONAL_NOTES[id]
    if (!note || seen.has(note)) continue
    seen.add(note)
    out.push(note)
  }
  return out
}

const LOAN_INSTITUTIONAL_UNLOCK_IDS = new Set([
  'family-guarantor',
  'family-false-hope',
  'price-aware',
  'ad-resistant',
  'special-track-memo'
])

/** 二周目灵贷模块顶栏制度备注（过滤面试专属条目）。 */
export function buildLoanInstitutionalNotes(metaUnlocks: string[]): string[] {
  return buildInstitutionalNotes(metaUnlocks.filter((id) => LOAN_INSTITUTIONAL_UNLOCK_IDS.has(id)))
}

const BREAKTHROUGH_INSTITUTIONAL_NOTES: Record<string, string> = {
  'witness-departure':
    '制度备注：上周目「监护人迁出」已写入破境风控样本。庆典账单将附加见证字段。',
  'family-guarantor':
    '制度备注：家庭担保合约仍挂账。破境后维护费草案将按担保档位重算。',
  'family-false-hope':
    '制度备注：家庭周转贷条目有效。破境贺礼到账前，催收线程可能抬头。',
  'special-track-memo': '制度备注：特招轨道备忘已同步至境界登记处。'
}

/** 破境关口顶栏制度备注（二周目+） */
export function buildBreakthroughInstitutionalNotes(metaUnlocks: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of metaUnlocks) {
    const note = BREAKTHROUGH_INSTITUTIONAL_NOTES[id]
    if (!note || seen.has(note)) continue
    seen.add(note)
    out.push(note)
  }
  return out
}

export function formatFamilyOutcome(outcome: string | undefined): string {
  if (!outcome) return '未结案'
  return FAMILY_OUTCOME_LABELS[outcome] ?? outcome
}

export function formatPermanentModifierSummary(mods: Act1PermanentModifiers): string {
  const mult = mods.interestRateMultiplier
  if (!mult || mult <= 1) return '永久金钱修正：无'
  const pct = Math.round((mult - 1) * 100)
  return `永久金钱修正：全周目日利率 +${pct}%（×${mult.toFixed(2)}）`
}
