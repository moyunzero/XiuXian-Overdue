import { formatProfileTags, formatProfileTagsLine } from '~/logic/act1/profileTagLabels'
import type { EmploymentTrack } from '~/types/chapter'
import type { LifeStage, PlayAiTrigger } from '~/types/play'
import { lifeStageLabel } from '~/logic/play/chapterFlow'

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
