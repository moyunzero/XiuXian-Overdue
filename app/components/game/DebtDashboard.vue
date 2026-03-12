<template>
  <div class="DebtDashboard">
    <div class="DebtHeader">
      <div class="DebtTotal">
        <span class="DebtLabel">总债务</span>
        <span class="DebtAmount">¥{{ totalDebt.toFixed(2) }}</span>
      </div>
      <div class="DebtMeta">
        <div class="DebtMetaItem">
          <span class="DebtMetaLabel">日利率</span>
          <span class="DebtMetaValue">{{ (dailyRate * 100).toFixed(2) }}%</span>
        </div>
        <div class="DebtMetaItem">
          <span class="DebtMetaLabel">逾期等级</span>
          <span :class="delinquencyClasses">{{ delinquency }}</span>
        </div>
      </div>
    </div>
    
    <ProgressBar
      :value="debtPressure"
      :max="100"
      variant="danger"
      height="md"
      :animated="delinquency >= 2"
    />
    
    <div class="DebtInfo">
      <span class="DebtInfoText">最低还款: ¥{{ minPayment.toFixed(2) }}</span>
      <span class="DebtInfoText">现金: ¥{{ cash.toFixed(2) }}</span>
    </div>
    
    <div class="DebtActions">
      <Button variant="danger" size="sm" @click="emit('repay')">
        还款
      </Button>
      <Button variant="ghost" size="sm" @click="emit('borrow')">
        借贷
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from '../ui/Button.vue'
import ProgressBar from '../ui/ProgressBar.vue'

interface DebtDashboardProps {
  principal?: number
  interest?: number
  dailyRate?: number
  delinquency?: number
  minPayment?: number
  cash?: number
}

const props = withDefaults(defineProps<DebtDashboardProps>(), {
  principal: 0,
  interest: 0,
  dailyRate: 0,
  delinquency: 0,
  minPayment: 0,
  cash: 0
})

const emit = defineEmits<{
  borrow: []
  repay: []
}>()

const totalDebt = computed(() => props.principal + props.interest)

const debtPressure = computed(() => {
  const ratio = totalDebt.value / Math.max(props.cash, 1)
  return Math.min(100, ratio * 20)
})

const delinquencyClasses = computed(() => ({
  'DebtMetaValue': true,
  'DebtMetaValue--danger': props.delinquency >= 2,
  'DebtMetaValue--warning': props.delinquency === 1
}))
</script>

<style scoped>
.DebtDashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
  border-radius: 16px;
  border: 1px solid rgba(255, 59, 59, 0.25);
  background: linear-gradient(180deg, rgba(255, 59, 59, 0.08), rgba(255, 59, 59, 0.03));
  backdrop-filter: blur(10px);
}

.DebtHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.DebtTotal {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.DebtLabel {
  font-size: var(--text-sm);
  color: var(--muted);
  font-weight: var(--font-medium);
}

.DebtAmount {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--danger);
  font-family: var(--mono);
}

.DebtMeta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-end;
}

.DebtMetaItem {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.DebtMetaLabel {
  font-size: var(--text-xs);
  color: var(--muted);
}

.DebtMetaValue {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.DebtMetaValue--warning {
  color: var(--warn);
}

.DebtMetaValue--danger {
  color: var(--danger);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.DebtInfo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.DebtInfoText {
  font-size: var(--text-sm);
  color: var(--muted);
}

.DebtActions {
  display: flex;
  gap: var(--space-2);
}

/* Responsive */
@media (max-width: 767px) {
  .DebtDashboard {
    gap: var(--space-3);
    padding: 14px;
    /* Reduce backdrop-filter for performance */
    backdrop-filter: blur(4px);
  }
  
  .DebtHeader {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .DebtLabel {
    font-size: 11px;
  }
  
  .DebtAmount {
    font-size: 24px;
  }
  
  .DebtMeta {
    flex-direction: row;
    align-items: flex-start;
    width: 100%;
    justify-content: space-between;
  }
  
  .DebtMetaItem {
    align-items: flex-start;
  }
  
  .DebtMetaLabel {
    font-size: 10px;
  }
  
  .DebtMetaValue {
    font-size: 13px;
  }
  
  .DebtInfo {
    padding-top: var(--space-1);
  }
  
  .DebtInfoText {
    font-size: 11px;
  }
  
  .DebtActions {
    gap: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .DebtMetaValue--danger {
    animation: none;
  }
}
</style>
