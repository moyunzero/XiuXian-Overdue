<template>
  <div class="identity-summary">
    <div class="summary-header">
      <h2>身份摘要</h2>
      <RiskMeter :score="riskScore" />
    </div>

    <div class="profile-dimensions">
      <div class="dimension-card financial-risk">
        <div class="dimension-label">财务风险</div>
        <div class="dimension-value">{{ levelLabels.financialRisk[profile.financialRisk] }}</div>
      </div>

      <div class="dimension-card education-credit">
        <div class="dimension-label">教育信用</div>
        <div class="dimension-value">{{ levelLabels.educationCredit[profile.educationCredit] }}</div>
      </div>

      <div class="dimension-card compliance">
        <div class="dimension-label">制度顺从</div>
        <div class="dimension-value">{{ levelLabels.compliance[profile.compliance] }}</div>
      </div>

      <div class="dimension-card body-asset">
        <div class="dimension-label">身体资产</div>
        <div class="dimension-value">{{ levelLabels.bodyAsset[profile.bodyAsset] }}</div>
      </div>
    </div>

    <div class="system-note">
      <div class="note-label">系统评语</div>
      <p class="note-text">{{ systemNote }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SocialProfile } from '~/types/game'
import RiskMeter from './RiskMeter.vue'

defineProps<{
  profile: SocialProfile
  riskScore: number
  systemNote: string
}>()

const levelLabels = {
  financialRisk: {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    extreme: '极高风险'
  },
  educationCredit: {
    discarded: '已放弃',
    unstable: '不稳定',
    investable: '可投资',
    preferred: '优选'
  },
  compliance: {
    resistant: '抵抗',
    softened: '软化',
    obedient: '顺从',
    domesticated: '驯化'
  },
  bodyAsset: {
    intact: '完整',
    marked: '已标记',
    mortgaged: '已抵押',
    depleted: '枯竭'
  }
}
</script>

<style scoped>
.identity-summary {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.summary-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.profile-dimensions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.dimension-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  text-align: center;
}

.dimension-card.financial-risk {
  border-left: 3px solid var(--color-danger);
}

.dimension-card.education-credit {
  border-left: 3px solid var(--color-info);
}

.dimension-card.compliance {
  border-left: 3px solid var(--color-success);
}

.dimension-card.body-asset {
  border-left: 3px solid var(--color-purple);
}

.dimension-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dimension-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.system-note {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
}

.note-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.note-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  line-height: 1.6;
  font-style: italic;
}

@media (max-width: 768px) {
  .profile-dimensions {
    grid-template-columns: repeat(2, 1fr);
  }

  .summary-header {
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .profile-dimensions {
    grid-template-columns: 1fr;
  }
}
</style>
