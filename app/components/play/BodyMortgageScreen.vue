<script setup lang="ts">
import type { BodyMortgageOffer, BodyMortgagePending } from '~/types/play'

const props = defineProps<{
  pending: BodyMortgagePending
}>()

const emit = defineEmits<{
  accept: [partId: BodyMortgageOffer['partId']]
  refuse: []
}>()

const MORTGAGE_TYPE_LABEL: Record<BodyMortgageOffer['mortgageType'], string> = {
  debt_reduction: '减债型',
  access_grant: '准入型',
  cultivation_boost: '修行加速型'
}

function offerHint(offer: BodyMortgageOffer): string {
  if (offer.mortgageType === 'debt_reduction' && offer.repaymentValue > 0) {
    return `可冲减约 ¥${offer.repaymentValue.toLocaleString()}`
  }
  return offer.narrative
}
</script>

<template>
  <div class="BodyMortgage" role="dialog" aria-labelledby="body-mortgage-title">
    <div class="BodyMortgage__panel">
      <header class="BodyMortgage__head">
        <span class="BodyMortgage__tag">{{ pending.mandatory ? '强制执行' : '最后的选择' }}</span>
        <h2 id="body-mortgage-title" class="BodyMortgage__title">身体抵押</h2>
        <p class="BodyMortgage__lead">
          {{
            pending.mandatory
              ? '你已经没有选择的余地。合同已签好，偿还后的部位无法恢复。'
              : '债务压垮了最后一道防线。他们提出了一个「解决方案」。'
          }}
        </p>
      </header>

      <ul class="BodyMortgage__offers">
        <li v-for="offer in pending.offers" :key="offer.partId" class="BodyMortgage__offer">
          <div class="BodyMortgage__offer-main">
            <span class="BodyMortgage__part">{{ offer.label }}</span>
            <span class="BodyMortgage__type">{{ MORTGAGE_TYPE_LABEL[offer.mortgageType] }}</span>
          </div>
          <p class="BodyMortgage__hint">{{ offerHint(offer) }}</p>
          <button
            type="button"
            class="BodyMortgage__accept"
            @click="emit('accept', offer.partId)"
          >
            抵押 {{ offer.label }}
          </button>
        </li>
      </ul>

      <button
        v-if="!pending.mandatory"
        type="button"
        class="BodyMortgage__refuse"
        @click="emit('refuse')"
      >
        拒绝（继续承受压力）
      </button>
    </div>
  </div>
</template>

<style scoped>
.BodyMortgage {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(6px);
}
.BodyMortgage__panel {
  width: min(520px, 100%);
  max-height: min(90vh, 720px);
  overflow: auto;
  border: 1px solid rgba(255, 80, 80, 0.45);
  border-radius: 12px;
  padding: clamp(20px, 3vw, 28px);
  background: linear-gradient(165deg, rgba(28, 8, 12, 0.98), rgba(8, 4, 6, 0.99));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}
.BodyMortgage__head {
  margin-bottom: 20px;
}
.BodyMortgage__tag {
  display: block;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  color: #ff6b6b;
  margin-bottom: 6px;
}
.BodyMortgage__title {
  margin: 0 0 10px;
  font-size: var(--text-lg);
}
.BodyMortgage__lead {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}
.BodyMortgage__offers {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.BodyMortgage__offer {
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}
.BodyMortgage__offer-main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}
.BodyMortgage__part {
  font-weight: 600;
  color: var(--text-primary);
}
.BodyMortgage__type {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: #ff9f9f;
}
.BodyMortgage__hint {
  margin: 0 0 10px;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-secondary);
}
.BodyMortgage__accept {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 80, 80, 0.6);
  background: rgba(255, 60, 60, 0.12);
  color: #ffb4b4;
  font-family: var(--mono);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: 4px;
}
.BodyMortgage__accept:hover {
  box-shadow: 0 0 12px rgba(255, 80, 80, 0.35);
}
.BodyMortgage__refuse {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--mono);
  cursor: pointer;
  border-radius: 4px;
}
</style>
