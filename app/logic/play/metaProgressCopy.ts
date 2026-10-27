import { formatPrimaryFateLabel } from '~/logic/play/playerFacingCopy'
import { MVP_CODEX_FATE_COUNT, normalizeMetaProgress } from '~/logic/play/metaProgress'
import type { MetaProgress, PrimaryFate } from '~/types/play'

const FATE_CODEX_BLURBS: Record<PrimaryFate, string> = {
  human: '灵籍仍登记为肉身修士——条款尚未刻进骨髓。',
  indentured: '契约债链已写入灵籍，身份仍可读作「修士」。',
  mortgaged: '抵押运行档：身体被制度登记为可处置资产。',
  ghost_voluntary: '自愿幽影：你签过退出肉身维护的条款。',
  head_jar: '器藏维生：维生容器替肉身续命，排程权被收走。',
  ghost_bound: '绑定幽影：制度将你锁在不可撤销的幽影档。',
  shattered: '碎裂态：灵籍只剩清算与归档条目。'
}

export function formatFateStampCount(meta: MetaProgress): string {
  const normalized = normalizeMetaProgress(meta)
  const count = normalized.unlockedFatesSeen?.length ?? 0
  return `${count}/${MVP_CODEX_FATE_COUNT}`
}

export function getFateCodexBlurb(fate: PrimaryFate): string {
  return FATE_CODEX_BLURBS[fate] ?? '灵籍条目尚未解封。'
}

/** D-114: fate stamp count + latest unlock label — no raw primaryFate ids */
export function formatMetaProgressLine(meta: MetaProgress): string {
  const normalized = normalizeMetaProgress(meta)
  const seen = normalized.unlockedFatesSeen ?? []
  const latest = seen[seen.length - 1] ?? 'human'
  const stamp = formatFateStampCount(normalized)
  const label = formatPrimaryFateLabel(latest)
  return `命运档案 ${stamp} · 最新：${label}`
}
