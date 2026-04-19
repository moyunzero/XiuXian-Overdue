<script setup lang="ts">
import { computed } from 'vue'
import type { FateCardData } from './FateCardGenerator.vue'

const props = defineProps<{
  cardData: FateCardData
}>()

const riskColor = computed(() => {
  const risk = props.cardData.finalProfile.financialRisk
  if (risk === 'extreme') return 'var(--danger)'
  if (risk === 'high') return 'var(--warn)'
  if (risk === 'medium') return 'var(--neon-cyan)'
  return 'var(--ok)'
})

const complianceColor = computed(() => {
  const c = props.cardData.finalProfile.compliance
  if (c === 'domesticated') return 'var(--danger)'
  if (c === 'obedient') return 'var(--warn)'
  if (c === 'softened') return 'var(--neon-cyan)'
  return 'var(--muted)'
})

const bodyColor = computed(() => {
  const b = props.cardData.finalProfile.bodyAsset
  if (b === 'depleted') return 'var(--danger)'
  if (b === 'mortgaged') return 'var(--warn)'
  if (b === 'marked') return 'var(--neon-cyan)'
  return 'var(--ok)'
})

function generateShareText(): string {
  const d = props.cardData
  return [
    `【修仙欠费中·制度档案】`,
    ``,
    `游戏日：第${d.schoolDay}日 · 第${d.schoolWeek}周`,
    `分班：${d.classTier}`,
    `总债务：¥${d.totalDebt.toLocaleString()}`,
    `现金：¥${Math.floor(d.cash).toLocaleString()}`,
    ``,
    `━━━━━━━━━━━━━━━`,
    ``,
    `制度画像：${d.dominantLabel}`,
    `主要标签：${d.primaryTag}`,
    ``,
    `━━━━━━━━━━━━━━━`,
    ``,
    `命运判定：${d.fateLabel}`,
    ``,
    `${d.institutionalSummary}`,
    ``,
    `—— 系统归档 · 修仙欠费中`
  ].join('\n')
}

defineExpose({
  generateShareText
})
</script>

<template>
  <div class="FateCard">
    <div class="FateCard__header">
      <div class="FateCard__title">制度档案</div>
      <div class="FateCard__subtitle">修仙欠费中</div>
    </div>

    <div class="FateCard__period">
      第{{ cardData.schoolDay }}日 · 第{{ cardData.schoolWeek }}周
    </div>

    <div class="FateCard__tier">
      {{ cardData.classTier }}
    </div>

    <div class="FateCard__divider" />

    <div class="FateCard__profile">
      <div class="ProfileRow">
        <span class="ProfileLabel">财务风险</span>
        <span class="ProfileValue" :style="{ color: riskColor }">
          {{ cardData.finalProfile.financialRisk }}
        </span>
      </div>
      <div class="ProfileRow">
        <span class="ProfileLabel">教育信用</span>
        <span class="ProfileValue">
          {{ cardData.finalProfile.educationCredit }}
        </span>
      </div>
      <div class="ProfileRow">
        <span class="ProfileLabel">制度顺从</span>
        <span class="ProfileValue" :style="{ color: complianceColor }">
          {{ cardData.finalProfile.compliance }}
        </span>
      </div>
      <div class="ProfileRow">
        <span class="ProfileLabel">身体资产</span>
        <span class="ProfileValue" :style="{ color: bodyColor }">
          {{ cardData.finalProfile.bodyAsset }}
        </span>
      </div>
    </div>

    <div class="FateCard__tags">
      <span v-for="tag in cardData.finalProfile.tags.slice(0, 4)" :key="tag" class="Tag">
        {{ tag }}
      </span>
    </div>

    <div class="FateCard__divider" />

    <div class="FateCard__fate">
      <div class="FateLabel">命运判定</div>
      <div class="FateValue">{{ cardData.fateLabel }}</div>
    </div>

    <div class="FateCard__summary">
      {{ cardData.institutionalSummary }}
    </div>

    <div class="FateCard__footer">
      <span>系统归档</span>
      <span>·</span>
      <span>修仙欠费中</span>
    </div>
  </div>
</template>

<style scoped>
.FateCard {
  width: 320px;
  background: linear-gradient(180deg, rgba(10, 10, 15, 0.95), rgba(20, 20, 30, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 20px;
  font-family: var(--font-mono, monospace);
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.FateCard__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.FateCard__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.05em;
}

.FateCard__subtitle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.FateCard__period {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.FateCard__tier {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 12px;
  color: var(--neon-cyan);
  margin-bottom: 12px;
}

.FateCard__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 12px 0;
}

.FateCard__profile {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ProfileRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.ProfileLabel {
  color: rgba(255, 255, 255, 0.5);
}

.ProfileValue {
  font-weight: 500;
  text-transform: capitalize;
}

.FateCard__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.Tag {
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.6);
}

.FateCard__fate {
  text-align: center;
  margin-bottom: 8px;
}

.FateLabel {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.FateValue {
  font-size: 16px;
  font-weight: 600;
  color: var(--neon-cyan);
  letter-spacing: 0.1em;
}

.FateCard__summary {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  text-align: center;
}

.FateCard__footer {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
