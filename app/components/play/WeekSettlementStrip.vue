<script setup lang="ts">
import { computed } from 'vue'
import type { WeekSettlementSummary } from '~/logic/play/scheduleMandateFlow'

const props = defineProps<{
  summary: WeekSettlementSummary
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const ledgerLines = computed(() =>
  props.summary.details.filter((line) => line.startsWith('人账：') || line.startsWith('鬼账：'))
)

const otherDetails = computed(() =>
  props.summary.details.filter((line) => !line.startsWith('人账：') && !line.startsWith('鬼账：'))
)

const hasLedgerLines = computed(() => ledgerLines.value.length > 0)
</script>

<template>
  <section class="WeekSettlementStrip ag-fade-up" role="status" aria-live="polite">
    <div class="WeekSettlementStrip__head">
      <span class="WeekSettlementStrip__tag">周末结算</span>
      <button type="button" class="WeekSettlementStrip__close" @click="emit('dismiss')">收起</button>
    </div>
    <p class="WeekSettlementStrip__headline">{{ summary.headline }}</p>
    <div v-if="hasLedgerLines" class="WeekSettlementStrip__ledger">
      <p v-for="(line, i) in ledgerLines" :key="`ledger-${i}`" class="WeekSettlementStrip__ledgerLine">
        {{ line }}
      </p>
    </div>
    <details
      v-if="otherDetails.length"
      class="WeekSettlementStrip__details"
      :open="hasLedgerLines"
    >
      <summary>展开明细</summary>
      <ul>
        <li v-for="(line, i) in otherDetails" :key="i">{{ line }}</li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
.WeekSettlementStrip {
  width: 100%;
  min-width: 0;
  max-height: min(22vh, 180px);
  overflow: auto;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(120, 210, 255, 0.35);
  background: rgba(20, 40, 60, 0.55);
  animation: weekSettlementFade 280ms ease-out;
}
@keyframes weekSettlementFade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.WeekSettlementStrip__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.WeekSettlementStrip__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 210, 255, 0.95);
}
.WeekSettlementStrip__close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
}
.WeekSettlementStrip__headline {
  margin: 8px 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--text-primary);
}
.WeekSettlementStrip__ledger {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 100, 200, 0.35);
  background: rgba(40, 20, 60, 0.25);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.WeekSettlementStrip__ledgerLine {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(200, 180, 255, 0.95);
  line-height: 1.45;
}
.WeekSettlementStrip__details {
  margin-top: 8px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
.WeekSettlementStrip__details ul {
  margin: 6px 0 0;
  padding-left: 1rem;
}
@media (prefers-reduced-motion: reduce) {
  .WeekSettlementStrip {
    animation: none;
  }
}
</style>
