<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DebtDashboardVM } from '~/types/play'
import ProgressBar from '~/components/ui/ProgressBar.vue'

const props = defineProps<{
  model: DebtDashboardVM
}>()

const expanded = ref(false)

const debtPressure = computed(() => {
  const cash = Math.max(1, props.model.cash)
  return Math.min(100, Math.round((props.model.totalDue / (props.model.totalDue + cash)) * 100))
})

const showFullPressureBar = computed(
  () => expanded.value || props.model.delinquencyLevel >= 2
)

const delinquencyClasses = computed(() => {
  const d = props.model.delinquencyLevel
  if (d >= 3) return 'DebtDash__val DebtDash__val--danger'
  if (d >= 1) return 'DebtDash__val DebtDash__val--warn'
  return 'DebtDash__val'
})
</script>

<template>
  <div class="DebtDash" :class="{ 'DebtDash--expanded': expanded }">
    <button
      type="button"
      class="DebtDash__strip"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <div class="DebtDash__stripPrimary">
        <span class="DebtDash__label">总债务</span>
        <span class="DebtDash__total">¥{{ model.totalDue.toLocaleString() }}</span>
      </div>
      <div class="DebtDash__meta DebtDash__meta--strip">
        <span>现金 ¥{{ model.cash.toLocaleString() }}</span>
        <span>最低 ¥{{ model.minPayment.toLocaleString() }}</span>
        <span v-if="model.billingPeriodLabel">{{ model.billingPeriodLabel }}</span>
        <span v-else>账单 {{ model.daysUntilPayment }} 日</span>
        <span
          v-if="model.delinquencyLevel > 0"
          class="DebtDash__badge"
          :class="{ 'DebtDash__badge--danger': model.delinquencyLevel >= 3 }"
        >
          逾期 {{ model.delinquencyLevel }}
        </span>
      </div>
      <span class="DebtDash__chev">{{ expanded ? '收起' : '明细' }}</span>
    </button>

    <div
      v-if="!showFullPressureBar"
      class="DebtDash__pressure"
      role="presentation"
      aria-hidden="true"
    >
      <span class="DebtDash__pressureFill" :style="{ width: `${debtPressure}%` }" />
    </div>

    <p
      v-if="model.compoundWarning && !expanded"
      class="DebtDash__compoundWarn DebtDash__compoundWarn--strip"
    >
      {{ model.compoundWarning }}
    </p>

    <div
      v-if="model.workCollectionTitle && !expanded"
      class="DebtDash__collection DebtDash__collection--strip"
      role="status"
    >
      <span class="DebtDash__collectionTitle">{{ model.workCollectionTitle }}</span>
    </div>

    <template v-if="expanded">
      <p v-if="model.compoundWarning" class="DebtDash__compoundWarn">{{ model.compoundWarning }}</p>
      <div v-if="model.workCollectionTitle" class="DebtDash__collection">
        <span class="DebtDash__collectionTitle">{{ model.workCollectionTitle }}</span>
        <span class="DebtDash__collectionBody">{{ model.workCollectionBody }}</span>
      </div>
    </template>

    <ProgressBar
      v-if="showFullPressureBar"
      :value="debtPressure"
      :max="100"
      variant="danger"
      :height="expanded ? 'md' : 'sm'"
      :animated="model.delinquencyLevel >= 2"
    />

    <div v-if="expanded" class="DebtDash__detail">
      <template v-if="model.sectDisplayName">
        <div class="DebtDash__row"><span>宗门</span><span>{{ model.sectDisplayName }}</span></div>
        <div v-if="model.subscriptionMonthly" class="DebtDash__row">
          <span>订阅月费</span><span>¥{{ model.subscriptionMonthly.toLocaleString() }}</span>
        </div>
        <div v-if="model.maintenanceCoeff" class="DebtDash__row">
          <span>维护费系数</span><span>×{{ model.maintenanceCoeff.toFixed(2) }}</span>
        </div>
      </template>
      <div class="DebtDash__row"><span>本金</span><span>¥{{ model.principal.toLocaleString() }}</span></div>
      <div class="DebtDash__row"><span>利息</span><span>¥{{ model.interestAccrued.toLocaleString() }}</span></div>
      <div class="DebtDash__row">
        <span>{{ model.collectionFeeLabel ?? '管理费' }}</span>
        <span>¥{{ model.collectionFee.toLocaleString() }}</span>
      </div>
      <div v-if="model.projectedWeeklyInterest" class="DebtDash__row">
        <span>本周预估利息</span>
        <span class="DebtDash__val DebtDash__val--warn">¥{{ model.projectedWeeklyInterest.toLocaleString() }}</span>
      </div>
      <div v-if="model.contractWeeksRemaining != null" class="DebtDash__row">
        <span>契约剩余</span><span>{{ model.contractWeeksRemaining }} 周</span>
      </div>
      <div v-else class="DebtDash__row">
        <span>日利率</span><span>{{ (model.dailyRate * 100).toFixed(2) }}%</span>
      </div>
      <div class="DebtDash__row">
        <span>逾期等级</span>
        <span :class="delinquencyClasses">{{ model.delinquencyLevel }} / 5</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.DebtDash {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px clamp(14px, 2vw, 20px);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.DebtDash:not(.DebtDash--expanded) {
  gap: 6px;
  padding: 10px clamp(12px, 2vw, 16px);
}

.DebtDash__strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.DebtDash__stripPrimary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  min-width: 0;
}

.DebtDash__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--mono);
}

.DebtDash:not(.DebtDash--expanded) .DebtDash__total {
  font-size: var(--text-base);
}

.DebtDash__total {
  font-size: var(--text-lg);
  color: var(--danger);
  font-weight: 600;
  font-family: var(--mono);
}

.DebtDash__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-family: var(--mono);
}

.DebtDash__meta--strip {
  flex: 1;
  min-width: 0;
}

.DebtDash__badge {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 180, 80, 0.35);
  color: var(--warning);
}

.DebtDash__badge--danger {
  border-color: rgba(255, 80, 80, 0.45);
  color: var(--danger);
}

.DebtDash__chev {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}

.DebtDash__pressure {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.DebtDash__pressureFill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 100, 80, 0.55), var(--danger));
  transition: width 0.35s ease;
}

.DebtDash__compoundWarn {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--danger);
  font-family: var(--mono);
  line-height: 1.45;
}

.DebtDash__compoundWarn--strip {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.DebtDash__collection {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 80, 80, 0.25);
  background: rgba(255, 60, 60, 0.06);
}

.DebtDash__collection--strip {
  padding: 6px 10px;
}

.DebtDash__collectionTitle {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--warning);
  font-weight: 600;
}

.DebtDash__collectionBody {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.45;
}

.DebtDash__detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.DebtDash__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.DebtDash__val--warn {
  color: var(--warning);
}

.DebtDash__val--danger {
  color: var(--danger);
}
</style>
