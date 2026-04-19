<script setup lang="ts">
import { computed } from 'vue'
import type { SocialProfile, ProfileTagId } from '~/types/game'

export interface FateCardData {
  schoolDay: number
  schoolWeek: number
  totalDebt: number
  cash: number
  classTier: string
  finalProfile: SocialProfile
  dominantDimension: string
  dominantLabel: string
  primaryTag: string
  fateLabel: string
  institutionalSummary: string
}

const props = defineProps<{
  profile: SocialProfile
  schoolDay: number
  schoolWeek: number
  totalDebt: number
  cash: number
  classTier: string
}>()

const dimensionLabels: Record<string, string> = {
  financialRisk: '财务风险',
  educationCredit: '教育信用',
  compliance: '制度顺从',
  bodyAsset: '身体资产'
}

const levelLabels: Record<string, string> = {
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

const fateLabels: Record<string, string> = {
  'domesticated': '驯化样本',
  'obedient': '合规工具',
  'softened': '摇摆个体',
  'resistant': '待规训对象',
  'depleted': '残值资产',
  'mortgaged': '抵押品',
  'marked': '降级资产',
  'intact': '待处理资产',
  'extreme': '高危债务人',
  'high': '风险关注对象',
  'medium': '普通债务人',
  'low': '低风险账户'
}

const institutionalSummaries: Record<string, string> = {
  'domesticated': '系统已完成对该个体的全面驯化。其行为模式已与制度预期高度对齐。',
  'obedient': '该个体表现出稳定的制度服从性，具备可持续剥削价值。',
  'softened': '制度渗透有效，个体抵抗意志正在瓦解。',
  'resistant': '该个体仍保持显著抵抗特征，需加强监控与干预。',
  'depleted': '身体资产已接近枯竭，剩余残值有限。',
  'mortgaged': '主要身体资产已被抵押，剩余可用身体资源受限。',
  'marked': '身体资产存在降级记录，价值评估已做修正。',
  'intact': '身体资产暂无损耗记录，维持标准估值。',
  'extreme': '财务风险已达最高等级，系统将其标记为高优先级催收对象。',
  'high': '债务规模与逾期等级显示持续恶化趋势。',
  'medium': '财务状况处于可接受范围，系统将维持常规监控。',
  'low': '该账户目前处于低风险状态，但系统将持续评估。'
}

const cardData = computed<FateCardData>(() => {
  const { financialRisk, educationCredit, compliance, bodyAsset, tags } = props.profile

  const riskOrder = ['extreme', 'high', 'medium', 'low', 'depleted', 'mortgaged', 'marked', 'intact', 'domesticated', 'obedient', 'softened', 'resistant', 'discarded', 'unstable', 'investable', 'preferred']
  
  const allLevels = { financialRisk, educationCredit, compliance, bodyAsset }
  const sortedDimensions = Object.entries(allLevels)
    .sort((a, b) => riskOrder.indexOf(a[1]) - riskOrder.indexOf(b[1]))
  
  const dominantDimension = sortedDimensions[0][0]
  const dominantLevel = sortedDimensions[0][1]

  const fateKey = dominantDimension === 'financialRisk' || dominantDimension === 'bodyAsset'
    ? dominantLevel
    : compliance
  const fateLabel = fateLabels[fateKey] || '未定型个体'

  const primaryTag = tags.length > 0 ? tags[0] : '暂无标签'
  const institutionalSummary = institutionalSummaries[fateKey] || institutionalSummaries['low']

  return {
    schoolDay: props.schoolDay,
    schoolWeek: props.schoolWeek,
    totalDebt: props.totalDebt,
    cash: props.cash,
    classTier: props.classTier,
    finalProfile: props.profile,
    dominantDimension,
    dominantLabel: `${dimensionLabels[dominantDimension]}：${levelLabels[dominantLevel] || dominantLevel}`,
    primaryTag,
    fateLabel,
    institutionalSummary
  }
})

defineExpose({ cardData })
</script>

<template>
  <div class="FateCardGenerator">
    <slot :card-data="cardData" />
  </div>
</template>

<style scoped>
.FateCardGenerator {
  display: contents;
}
</style>
