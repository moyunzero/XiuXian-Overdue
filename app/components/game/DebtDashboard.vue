<template>
  <div class="DebtDashboard">
    <div class="DebtHeader">
      <div class="DebtTotal">
        <span class="DebtLabel">总债务</span>
        <span class="DebtAmount">¥{{ totalDebt.toFixed(2) }}</span>
      </div>
      <div class="DebtCoreSummary">
        <span class="DebtInfoText">现金: ¥{{ cash.toFixed(2) }}</span>
        <span class="DebtInfoText">最低周还款: ¥{{ minPayment.toFixed(2) }}</span>
      </div>
    </div>

    <ProgressBar
      :value="debtPressure"
      :max="100"
      variant="danger"
      height="md"
      :animated="delinquency >= 2"
    />

    <div class="DebtActions">
      <Button variant="danger" size="sm" @click="emit('repay')">还款</Button>
      <Button variant="ghost" size="sm" @click="emit('borrow')">借贷</Button>
      <span class="Spacer" />
      <button class="ExpandToggle" :class="{ 'ExpandToggle--active': expanded }" @click="expanded = !expanded">
        <span class="ExpandToggle__text">{{ expanded ? '收起详情' : '展开详情' }}</span>
        <span class="ExpandToggle__arrow" :class="{ 'ExpandToggle__arrow--up': expanded }">▼</span>
      </button>
    </div>

    <Transition name="detail">
      <div v-if="expanded" class="DebtDetail">
        <div class="DebtDetailRow">
          <span class="DebtDetailLabel" :title="TOOLTIPS.coreLoan">制度欠款</span>
          <span class="DebtDetailValue">¥{{ coreDebt.toFixed(2) }}</span>
        </div>
        <div class="DebtDetailRow">
          <span class="DebtDetailLabel" :title="TOOLTIPS.rollingDebt">可偿还债务</span>
          <span class="DebtDetailValue">¥{{ rollingDebt.toFixed(2) }}</span>
        </div>
        <div class="DebtDetailRow DebtDetailRow--sub">
          <span class="DebtDetailLabel">┗ 管理费</span>
          <span class="DebtDetailValue">¥{{ collectionFee.toFixed(2) }}</span>
        </div>
        <div class="DebtDetailRow DebtDetailRow--sub">
          <span class="DebtDetailLabel">┗ 利息</span>
          <span class="DebtDetailValue">¥{{ interest.toFixed(2) }}</span>
        </div>
        <div class="DebtDetailRow DebtDetailRow--sub">
          <span class="DebtDetailLabel">┗ 本金</span>
          <span class="DebtDetailValue">¥{{ principal.toFixed(2) }}</span>
        </div>
        <div class="DebtDetailSep" />
        <div class="DebtDetailRow">
          <span class="DebtDetailLabel">日利率</span>
          <span class="DebtDetailValue">{{ (dailyRate * 100).toFixed(2) }}%</span>
        </div>
        <div class="DebtDetailRow">
          <span class="DebtDetailLabel">逾期等级</span>
          <span :class="delinquencyClasses">{{ delinquency }} / 5</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '../ui/Button.vue'
import ProgressBar from '../ui/ProgressBar.vue'

interface DebtDashboardProps {
  coreDebt?: number
  collectionFee?: number
  principal?: number
  interest?: number
  dailyRate?: number
  delinquency?: number
  minPayment?: number
  cash?: number
}

const TOOLTIPS = {
  coreLoan: '学籍许可费、授信保留金等制度性费用，无法直接偿还',
  rollingDebt: '管理费 + 利息 + 本金，可通过日常还款或身体偿还减少'
}

const props = withDefaults(defineProps<DebtDashboardProps>(), {
  coreDebt: 0,
  collectionFee: 0,
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

const expanded = ref(false)

const rollingDebt = computed(() => props.collectionFee + props.principal + props.interest)
const totalDebt = computed(() => props.coreDebt + rollingDebt.value)

const debtPressure = computed(() => {
  const ratio = totalDebt.value / Math.max(props.cash, 1)
  return Math.min(100, ratio * 20)
})

const delinquencyClasses = computed(() => ({
  'DebtDetailValue': true,
  'DebtDetailValue--danger': props.delinquency >= 2,
  'DebtDetailValue--warning': props.delinquency === 1
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
  align-items: flex-end;
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

.DebtCoreSummary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.DebtInfoText {
  font-size: var(--text-sm);
  color: var(--muted);
}

.DebtActions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.Spacer {
  flex: 1;
}

.ExpandToggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--muted);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s, border-color 0.15s, transform 0.1s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 44px;
}
.ExpandToggle:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}
.ExpandToggle:active {
  transform: scale(0.97);
}
.ExpandToggle--active {
  color: var(--neon-cyan);
  border-color: rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.05);
}
.ExpandToggle__arrow {
  transition: transform 0.2s ease;
}
.ExpandToggle__arrow--up {
  transform: rotate(180deg);
}

.DebtDetail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: var(--space-2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.DebtDetailRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.DebtDetailRow--sub {
  padding-left: 12px;
  opacity: 0.75;
}

.DebtDetailLabel {
  font-size: var(--text-sm);
  color: var(--muted);
  cursor: default;
}

.DebtDetailLabel[title] {
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
}

.DebtDetailValue {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text);
  font-family: var(--mono);
}

.DebtDetailValue--warning {
  color: var(--warn);
}

.DebtDetailValue--danger {
  color: var(--danger);
  animation: pulse 2s ease-in-out infinite;
}

.DebtDetailSep {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 2px 0;
}

.detail-enter-active,
.detail-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.detail-enter-from,
.detail-leave-to {
  opacity: 0;
  max-height: 0;
}
.detail-enter-to,
.detail-leave-from {
  opacity: 1;
  max-height: 300px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (max-width: 767px) {
  .DebtDashboard {
    gap: var(--space-3);
    padding: 14px;
    backdrop-filter: blur(4px);
  }
  .DebtHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .DebtCoreSummary {
    flex-direction: row;
    align-items: flex-start;
    width: 100%;
    justify-content: space-between;
  }
  .DebtLabel { font-size: 11px; }
  .DebtAmount { font-size: 24px; }
  .DebtInfoText { font-size: 11px; }
  .DebtDetailLabel { font-size: 11px; }
  .DebtDetailValue { font-size: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .DebtDetailValue--danger { animation: none; }
  .detail-enter-active,
  .detail-leave-active { transition: none; }
}
</style>
