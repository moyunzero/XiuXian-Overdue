import { ref } from 'vue'
import type { SocialProfile } from '~/types/game'
import FateCardGenerator from '~/components/share/FateCardGenerator.vue'

export interface ShareData {
  profile: SocialProfile
  schoolDay: number
  schoolWeek: number
  totalDebt: number
  cash: number
  classTier: string
}

export function useShare() {
  const shareText = ref('')
  const shareCardRef = ref<InstanceType<typeof FateCardGenerator> | null>(null)

  function generateShareContent(data: ShareData): string {
    const { profile, schoolDay, schoolWeek, totalDebt, cash, classTier } = data

    const riskLabels: Record<string, string> = {
      low: '低风险', medium: '中风险', high: '高风险', extreme: '极高风险'
    }
    const complianceLabels: Record<string, string> = {
      resistant: '抵抗', softened: '软化', obedient: '顺从', domesticated: '驯化'
    }
    const bodyLabels: Record<string, string> = {
      intact: '完整', marked: '已标记', mortgaged: '已抵押', depleted: '枯竭'
    }
    const fateLabels: Record<string, string> = {
      domesticated: '驯化样本', obedient: '合规工具', softened: '摇摆个体',
      resistant: '待规训对象', depleted: '残值资产', mortgaged: '抵押品',
      marked: '降级资产', intact: '待处理资产', extreme: '高危债务人',
      high: '风险关注对象', medium: '普通债务人', low: '低风险账户'
    }

    const riskOrder = ['extreme', 'high', 'medium', 'low', 'depleted', 'mortgaged', 'marked', 'intact', 'domesticated', 'obedient', 'softened', 'resistant']
    const allLevels = {
      financialRisk: profile.financialRisk,
      educationCredit: profile.educationCredit,
      compliance: profile.compliance,
      bodyAsset: profile.bodyAsset
    }
    const sorted = Object.entries(allLevels).sort((a, b) => riskOrder.indexOf(a[1]) - riskOrder.indexOf(b[1]))
    const dominantLevel = sorted[0][1]
    const fateKey = ['financialRisk', 'bodyAsset'].includes(sorted[0][0]) ? dominantLevel : profile.compliance

    const lines = [
      '【修仙欠费中·制度档案】',
      '',
      `游戏日：第${schoolDay}日 · 第${schoolWeek}周`,
      `分班：${classTier}`,
      `总债务：¥${totalDebt.toLocaleString()}`,
      `现金：¥${Math.floor(cash).toLocaleString()}`,
      '',
      '━━━━━━━━━━━━━━━',
      '',
      `财务风险：${riskLabels[profile.financialRisk] || profile.financialRisk}`,
      `教育信用：${profile.educationCredit}`,
      `制度顺从：${complianceLabels[profile.compliance] || profile.compliance}`,
      `身体资产：${bodyLabels[profile.bodyAsset] || profile.bodyAsset}`,
      '',
      `主要标签：${profile.tags.slice(0, 3).join('、') || '暂无'}`,
      '',
      '━━━━━━━━━━━━━━━',
      '',
      `命运判定：${fateLabels[fateKey] || '未定型个体'}`,
      '',
      '—— 系统归档 · 修仙欠费中'
    ]

    return lines.join('\n')
  }

  async function shareToClipboard(data: ShareData): Promise<boolean> {
    try {
      const text = generateShareContent(data)
      await navigator.clipboard.writeText(text)
      shareText.value = text
      return true
    } catch {
      return false
    }
  }

  async function nativeShare(data: ShareData): Promise<boolean> {
    try {
      if (!navigator.share) return false
      const text = generateShareContent(data)
      await navigator.share({
        title: '修仙欠费中·制度档案',
        text
      })
      return true
    } catch {
      return false
    }
  }

  return {
    shareText,
    shareCardRef,
    generateShareContent,
    shareToClipboard,
    nativeShare
  }
}
