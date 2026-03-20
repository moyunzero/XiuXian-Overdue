<template>
  <div class="RepaymentInfo">
    <div class="RepaymentInfo__debt">
      当前总债务：<span class="RepaymentInfo__amount">¥{{ Math.floor(totalDebt).toLocaleString() }}</span>
    </div>
    <div class="RepaymentInfo__payment">
      <span>需还款：¥{{ Math.floor(accumulatedPayment).toLocaleString() }}</span>
      <span>· 现金：¥{{ Math.floor(currentCash).toLocaleString() }}</span>
      <span v-if="deficit > 0" class="RepaymentInfo__deficit">
        · 差额：¥{{ Math.floor(deficit).toLocaleString() }}
      </span>
    </div>
    <div class="RepaymentInfo__warning">
      偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  totalDebt: number
  accumulatedPayment: number
  currentCash: number
}

const props = defineProps<Props>()

const deficit = computed(() =>
  props.currentCash < props.accumulatedPayment
    ? props.accumulatedPayment - props.currentCash
    : 0
)
</script>

<style scoped>
.RepaymentInfo {
  padding: 0 var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.RepaymentInfo__debt {
  font-size: var(--text-sm);
  color: var(--muted);
}

.RepaymentInfo__amount {
  color: #ff6b6b;
  font-weight: 600;
}

.RepaymentInfo__payment {
  font-size: var(--text-xs);
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.RepaymentInfo__deficit {
  color: #ff6b6b;
}

.RepaymentInfo__warning {
  font-size: var(--text-sm);
  color: rgba(255, 107, 107, 0.8);
  font-style: italic;
}
</style>
