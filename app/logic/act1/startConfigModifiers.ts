import type { Act1Modifiers } from '~/types/act1'
import type { StartConfig } from '~/types/game'

const REGION_RATE: Record<string, number> = {
  嵩阳: 1,
  昆墟: 1.05,
  郊区: 0.95
}

function regionMultiplier(city: string): number {
  const key = Object.keys(REGION_RATE).find((k) => city.includes(k))
  return key ? REGION_RATE[key]! : 1
}

/** 开局五项 → Act1 数值修饰（须有单测） */
export function deriveAct1Modifiers(cfg: StartConfig): Act1Modifiers {
  let familyResilienceBase = 55
  if (cfg.background === '中产') familyResilienceBase = 70
  if (cfg.background === '富户') familyResilienceBase = 88

  let loanRiskTier: Act1Modifiers['loanRiskTier'] = 'mid'
  if (cfg.background === '贫民' || cfg.initialDebt > 50_000) loanRiskTier = 'high'
  if (cfg.background === '富户' && cfg.initialDebt < 10_000) loanRiskTier = 'low'

  let interviewBias = 0
  if (cfg.talent === '天灵根') interviewBias += 8
  if (cfg.talent === '伪灵根') interviewBias += 3
  if (cfg.background === '贫民') interviewBias -= 5

  return {
    familyResilienceBase,
    loanRiskTier,
    interviewBias,
    regionRateMultiplier: regionMultiplier(cfg.startingCity.trim() || '嵩阳市')
  }
}
