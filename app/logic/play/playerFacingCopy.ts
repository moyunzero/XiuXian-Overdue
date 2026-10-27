import { formatProfileTags, formatProfileTagsLine } from '~/logic/act1/profileTagLabels'
import type { EmploymentTrack } from '~/types/chapter'
import type { InstitutionalTagId, LifeStage, PlayAiTrigger, PrimaryFate } from '~/types/play'
import { lifeStageLabel } from '~/logic/play/chapterFlow'
import { resolveOverlayCopy } from '~/logic/play/fateCatalog'

/** kebab-case 内部档案标签 ID（如 hs-graduated、tier-tail） */
const INTERNAL_TAG_ID = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)+$/

const RAW_RUN_MODE_CODES = new Set(['sprint', 'campaign', 'endless'])

const RAW_LIFE_STAGE_CODES = new Set(['pre', 'hs', 'uni', 'work'])

const RAW_EMPLOYMENT_TRACK_CODES = new Set(['company', 'gig', 'startup'])

/** 常见内部标签 — 若出现在玩家可见整段文案中视为泄漏 */
const KNOWN_INTERNAL_TAG_TOKENS =
  /\b(hs-graduated|uni-enrolled|tier-tail|tier-elite|tier-normal|work-enrolled|prior-debt|body-marked|sect-cloud|sect-iron|sect-ash|track-company|track-gig|track-startup|foundation-failed|uni-foundation-pass)\b/

const PRESSURE_CARD_TAG_LABELS: Record<string, string> = {
  study: '修习',
  rest: '休整',
  train: '炼体',
  work: '劳作',
  buy: '消费',
  risk: '风险',
  social: '社交',
  'lie-flat': '躺平'
}

const GATE_LABELS: Record<string, string> = {
  'gate-w16-foundation': '第16周 · 筑基关口',
  'gate-w17-sect': '第17周 · 择宗关口',
  'gate-w28-uni-exit': '第28周 · 预科结业',
  'gate-w29-track': '第29周 · 择轨关口',
  'gate-w40-finale': '第40周 · 终审判'
}

const PLAY_AI_TRIGGER_LABELS: Record<PlayAiTrigger, string> = {
  'post-exam': '月考后',
  'delinquency-spike': '逾期抬头',
  breakthrough: '破境后'
}

const EMPLOYMENT_TRACK_LABELS: Record<EmploymentTrack, string> = {
  company: '进公司',
  gig: '散修零工',
  startup: '挂靠工作室'
}

const PRIMARY_FATE_LABELS: Record<PrimaryFate, string> = {
  human: '肉身修士',
  indentured: '肉身修士',
  mortgaged: '抵押运行',
  ghost_voluntary: '自愿幽影',
  head_jar: '器藏维生',
  ghost_bound: '绑定幽影',
  shattered: '碎裂态'
}

const INSTITUTIONAL_TAG_STAMP_LABELS: Partial<Record<InstitutionalTagId, string>> = {
  supply_cut: '断供',
  credit_blacklist: '征信黑',
  family_leverage: '连坐'
}

/** D-112: other slot head_jar while starting fresh human */
export const META_NEW_HUMAN_OTHER_SLOT_HINT =
  '新档仍从人类身份签约；上周目的命运态已收入账号档案。'

/** D-110: Continue CTA when slot fate ≠ human */
export function formatContinuePlayLabel(
  fate: PrimaryFate | undefined,
  detailLabel?: string
): string {
  if (fate && fate !== 'human' && fate !== 'indentured') {
    return `继续 · ${formatPrimaryFateLabel(fate)}档`
  }
  if (detailLabel) return `继续修行 · ${detailLabel}`
  return '继续修行'
}

/** D-125：delegation_two 面板 copy（禁止 raw fate id） */
export function delegationPanelCopy(fate: PrimaryFate): {
  panelTag: string
  panelTitle: string
  confirmLabel: string
} {
  if (fate === 'ghost_bound') {
    return {
      panelTag: '冥籍绑定',
      panelTitle: '本周阴司工单',
      confirmLabel: '开本周'
    }
  }
  return {
    panelTag: '器藏维生',
    panelTitle: '本周委托',
    confirmLabel: '开本周'
  }
}

/** D-127：灵籍更新 overlay 正文（禁止 raw fate id） */
export function fateUpdateOverlayBodyLine(
  trigger: string | undefined,
  toFate: PrimaryFate
): string {
  const fromCatalog = resolveOverlayCopy(trigger, toFate)
  if (fromCatalog) return fromCatalog
  if (toFate === 'ghost_bound') {
    return '阳债未清，阴司将你编入绑定幽影档——双账并行结算。'
  }
  switch (trigger) {
    case 'body_mortgage':
      return '抵押登记完成——制度将你编入抵押运行档。'
    case 'body_integrity':
      return '完整度跌破制度线——灵贷契约改写为抵押运行。'
    case 'integrity_threshold':
      return '完整度跌破器藏阈值——维生容器登记启动。'
    case 'maintenance_failure':
      return '维生欠账连周——制度将你编入器藏维生档。'
    default:
      return '灵籍档案已更新，请签收后继续本周排程。'
  }
}

/** D-123：双账只读标签（禁止「制度」二字） */
export function dualLedgerLabelYang(): string {
  return '人账阳债'
}

export function dualLedgerLabelMing(): string {
  return '鬼账冥币'
}

/** 主形态 → 玩家可见灵籍标签（禁止 raw primaryFate ID） */
export function formatPrimaryFateLabel(fate: PrimaryFate | string | null | undefined): string {
  if (!fate) return '肉身修士'
  if (fate in PRIMARY_FATE_LABELS) {
    return PRIMARY_FATE_LABELS[fate as PrimaryFate]
  }
  return '肉身修士'
}

/** 制度 tag → 状态栏 stamp 短标签 */
export function formatInstitutionalTagStamp(tagId: InstitutionalTagId | string): string {
  if (tagId in INSTITUTIONAL_TAG_STAMP_LABELS) {
    return INSTITUTIONAL_TAG_STAMP_LABELS[tagId as InstitutionalTagId]!
  }
  return '制度标记'
}

/** 档案标签 ID 列表 → 玩家可见中文标签数组（须经本模块或 profileTagLabels 格式化）。 */
export function formatPlayerFacingTags(tagIds: string[], limit?: number): string[] {
  return formatProfileTags(tagIds, limit)
}

/** 默认顿号拼接；空列表时返回 `fallback`（默认「无」） */
export function formatPlayerFacingTagLine(
  tagIds: string[],
  options?: { separator?: string; limit?: number; fallback?: string }
): string {
  const separator = options?.separator ?? '、'
  const fallback = options?.fallback ?? '无'
  const labels = formatPlayerFacingTags(tagIds, options?.limit)
  return labels.length ? labels.join(separator) : fallback
}

/** 与 Act1 结算一致的分隔符 */
export function formatPlayerFacingTagLineWide(tagIds: string[], limit = 12): string {
  return formatProfileTagsLine(tagIds, limit)
}

/** 压力牌分类 tag → 中文（禁止 card.tags 直接 join） */
export function formatPressureCardTag(tag: string): string {
  return PRESSURE_CARD_TAG_LABELS[tag] ?? '杂项'
}

export function formatPressureCardTagLine(tags: string[], separator = ' · '): string {
  const labels = tags.map(formatPressureCardTag)
  return labels.length ? labels.join(separator) : ''
}

/** 日引擎 / 效果日志行 */
export function formatPlayLogLine(day: number, title: string, detail: string): string {
  const body = detail ? `${title}：${detail}` : title
  return `第 ${day} 日 · ${body}`
}

/** AI 瞬间日志行 */
export function formatPlayAiMomentLogLine(trigger: PlayAiTrigger, title: string, detail: string): string {
  const tag = PLAY_AI_TRIGGER_LABELS[trigger] ?? '制度瞬间'
  return `[${tag}] ${title}：${detail}`
}

/** 择轨 / 履约档 */
export function formatEmploymentTrackLabel(track: EmploymentTrack | string | null | undefined): string {
  if (!track) return '未择轨'
  if (track in EMPLOYMENT_TRACK_LABELS) {
    return EMPLOYMENT_TRACK_LABELS[track as EmploymentTrack]
  }
  return '未择轨'
}

/** 人生段落链 */
export function formatLifeStageChain(stages: LifeStage[]): string {
  return stages.map(lifeStageLabel).join(' → ')
}

/** 章节闸门 id → 玩家可见短标签 */
export function formatGateLabel(gateId: string): string {
  return GATE_LABELS[gateId] ?? '制度闸门'
}

/**
 * 断言「已是展示用字符串」的数组不含内部 ID、留置原始串、周目模式代码。
 * 用于档案字段、HUD 标签列表等。
 */
export function assertPlayerFacingStringsAreLocalized(labels: string[]): void {
  for (const label of labels) {
    if (INTERNAL_TAG_ID.test(label)) {
      throw new Error(`玩家可见文案含内部标签 ID：${label}`)
    }
    if (/^lien-/.test(label)) {
      throw new Error(`玩家可见文案含留置原始 ID：${label}`)
    }
    if (RAW_RUN_MODE_CODES.has(label)) {
      throw new Error(`玩家可见文案含周目模式代码：${label}`)
    }
    if (RAW_LIFE_STAGE_CODES.has(label)) {
      throw new Error(`玩家可见文案含人生段落代码：${label}`)
    }
    if (RAW_EMPLOYMENT_TRACK_CODES.has(label)) {
      throw new Error(`玩家可见文案含择轨代码：${label}`)
    }
  }
}

/**
 * 断言整段玩家可见文案（标题、正文、prompt）未泄漏已知内部标签 token。
 * 用于 job 选择、关口说明等拼接后的字符串。
 */
export function assertPlayerFacingTextDoesNotLeakInternalIds(text: string): void {
  const match = KNOWN_INTERNAL_TAG_TOKENS.exec(text)
  if (match) {
    throw new Error(`玩家可见文案含内部标签 ID：${match[0]}`)
  }
}
