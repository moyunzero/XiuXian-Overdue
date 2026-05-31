/** Legacy /game 社会画像四维 — 玩家可见等级中文映射 */

export const SOCIAL_PROFILE_DIMENSION_LABELS: Record<string, string> = {
  financialRisk: '财务风险',
  educationCredit: '教育信用',
  compliance: '制度顺从',
  bodyAsset: '身体资产'
}

export const SOCIAL_PROFILE_LEVEL_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险',
  discarded: '已放弃',
  unstable: '不稳定',
  investable: '可投资',
  preferred: '优选',
  resistant: '抵抗',
  softened: '软化',
  obedient: '顺从',
  domesticated: '驯化',
  intact: '完整',
  marked: '已标记',
  mortgaged: '已抵押',
  depleted: '枯竭'
}

export function formatSocialProfileDimension(key: string): string {
  return SOCIAL_PROFILE_DIMENSION_LABELS[key] ?? '制度维度'
}

export function formatSocialProfileLevel(level: string): string {
  return SOCIAL_PROFILE_LEVEL_LABELS[level] ?? '未评级'
}
