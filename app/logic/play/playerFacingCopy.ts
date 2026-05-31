import { formatProfileTags, formatProfileTagsLine } from '~/logic/act1/profileTagLabels'

/** kebab-case 内部档案标签 ID（如 hs-graduated、tier-tail） */
const INTERNAL_TAG_ID = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)+$/

const RAW_RUN_MODE_CODES = new Set(['sprint', 'campaign', 'endless'])

/** 常见内部标签 — 若出现在玩家可见整段文案中视为泄漏 */
const KNOWN_INTERNAL_TAG_TOKENS =
  /\b(hs-graduated|uni-enrolled|tier-tail|tier-elite|tier-normal|work-enrolled|prior-debt|body-marked|sect-cloud|sect-iron|sect-ash)\b/

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
