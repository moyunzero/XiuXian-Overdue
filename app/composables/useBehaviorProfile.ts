/**
 * 用户画像构建器
 * 根据用户历史行为数据，计算各维度画像等级并生成行为标签
 */
import type { GameState } from '~/types/game'

export type FinancialRiskLevel = 'low' | 'medium' | 'high' | 'extreme'
export type EducationCreditLevel = 'excellent' | 'good' | 'fair' | 'poor'
export type ComplianceLevel = 'rebel' | 'neutral' | 'compliant' | 'domesticated'
export type BodyAssetLevel = 'intact' | 'partial' | 'severe'

export type ProfileTagId =
  | 'workaholic'       // 打工党
  | 'cultivator'       // 修仙党
  | 'defaulter'        // 违约惯犯
  | 'good_student'     // 模范学生
  | 'rebel'            // 反抗者
  | 'contract_slave'   // 契约奴隶
  | 'body_seller'      // 身体出卖者

export interface BehaviorProfile {
  financialRisk: FinancialRiskLevel
  educationCredit: EducationCreditLevel
  compliance: ComplianceLevel
  bodyAsset: BodyAssetLevel
  tags: ProfileTagId[]
}

function calculateFinancialRisk(econ: GameState['econ']): FinancialRiskLevel {
  const totalDebt = econ.debtPrincipal + econ.debtInterestAccrued + econ.collectionFee
  const delinquency = econ.delinquency || 0
  
  if (delinquency >= 4 || totalDebt > 50000) return 'extreme'
  if (delinquency >= 2 || totalDebt > 20000) return 'high'
  if (delinquency >= 1 || totalDebt > 5000) return 'medium'
  return 'low'
}

function calculateEducationCredit(school: GameState['school']): EducationCreditLevel {
  const tier = school.classTier
  
  if (tier === '示范班') return 'excellent'
  if (tier === '普通班') return 'good'
  if (school.lastExamScore >= 60) return 'fair'
  return 'poor'
}

function calculateComplianceLevel(gameState: GameState): ComplianceLevel {
  const history = gameState.eventHistory ?? {}
  const contractProgress = gameState.contract?.progress ?? 0
  const contractVigilance = gameState.contract?.vigilance ?? 0
  const domestication = gameState.domestication ?? 0
  
  // 计算顺从度：基于契约状态和驯化程度
  const obedience = (contractProgress * 0.4 + domestication * 0.6) / 100
  
  if (obedience > 0.8) return 'domesticated'
  if (obedience > 0.5) return 'compliant'
  if (obedience > 0.2) return 'neutral'
  return 'rebel'
}

function calculateBodyAssetLevel(gameState: GameState): BodyAssetLevel {
  const integrity = gameState.bodyIntegrity ?? 1.0
  const bodyParts = gameState.bodyPartRepayment ?? {}
  const partsRepaid = Object.values(bodyParts).filter(Boolean).length
  
  if (partsRepaid >= 3 || integrity < 0.5) return 'severe'
  if (partsRepaid >= 1 || integrity < 0.8) return 'partial'
  return 'intact'
}

function calculateBehaviorTags(gameState: GameState): ProfileTagId[] {
  const history = gameState.eventHistory ?? {}
  const metrics = gameState.sessionMetrics ?? {}
  const tags: ProfileTagId[] = []
  
  // 打工党：parttime 行动占比 > 40%
  const totalActions = Object.values(metrics.actionCounts ?? {}).reduce((sum: number, v: any) => sum + v, 0) as number
  const parttimeCount = (metrics.actionCounts as any)?.parttime ?? 0
  if (totalActions > 0 && parttimeCount / totalActions > 0.4) {
    tags.push('workaholic')
  }
  
  // 修仙党：study + tuna 行动占比 > 60%
  const studyCount = (metrics.actionCounts as any)?.study ?? 0
  const tunaCount = (metrics.actionCounts as any)?.tuna ?? 0
  const cultivateCount = studyCount + tunaCount
  if (totalActions > 0 && cultivateCount / totalActions > 0.6) {
    tags.push('cultivator')
  }
  
  // 违约惯犯：delinquency 经常 >= 2
  const econ = gameState.econ
  if (econ.delinquency >= 2) {
    tags.push('defaulter')
  }
  
  // 模范学生：示范班 + 无逾期
  if (gameState.school.classTier === '示范班' && econ.delinquency === 0) {
    tags.push('good_student')
  }
  
  // 反抗者：契约 vigilance 高且 progress 低
  if (gameState.contract?.vigilance > 60 && gameState.contract.progress < 30) {
    tags.push('rebel')
  }
  
  // 契约奴隶：契约 progress 高
  if (gameState.contract?.progress > 70) {
    tags.push('contract_slave')
  }
  
  // 身体出卖者：有身体偿还记录
  const bodyParts = gameState.bodyPartRepayment ?? {}
  if (Object.values(bodyParts).some(Boolean)) {
    tags.push('body_seller')
  }
  
  return tags
}

export function calculateBehaviorProfile(gameState: GameState): BehaviorProfile {
  return {
    financialRisk: calculateFinancialRisk(gameState.econ),
    educationCredit: calculateEducationCredit(gameState.school),
    compliance: calculateComplianceLevel(gameState),
    bodyAsset: calculateBodyAssetLevel(gameState),
    tags: calculateBehaviorTags(gameState)
  }
}
