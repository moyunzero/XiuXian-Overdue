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

const delinquencyClasses = computed(() => {
  const d = props.model.delinquencyLevel
  if (d >= 3) return 'DebtDash__val DebtDash__val--danger'
  if (d >= 1) return 'DebtDash__val DebtDash__val--warn'
  return 'DebtDash__val'
})
</script>

<template>
  <div class="DebtDash">
    <div class="DebtDash__head">
      <div>
        <span class="DebtDash__label">总债务</span>
        <span class="DebtDash__total">¥{{ model.totalDue.toLocaleString() }}</span>
      </div>
      <div class="DebtDash__meta">
        <span>现金 ¥{{ model.cash.toLocaleString() }}</span>
        <span>最低还款 ¥{{ model.minPayment.toLocaleString() }}</span>
        <span>距账单 {{ model.daysUntilPayment }} 日</span>
      </div>
    </div>
    <p v-if="model.compoundWarning" class="DebtDash__compoundWarn">{{ model.compoundWarning }}</p>
    <div v-if="model.workCollectionTitle" class="DebtDash__collection">
      <span class="DebtDash__collectionTitle">{{ model.workCollectionTitle }}</span>
      <span class="DebtDash__collectionBody">{{ model.workCollectionBody }}</span>
    </div>
    <ProgressBar
      :value="debtPressure"
      :max="100"
      variant="danger"
      height="md"
      :animated="model.delinquencyLevel >= 2"
    />
    <button type="button" class="DebtDash__toggle" @click="expanded = !expanded">
      {{ expanded ? '收起' : '债务明细' }}
    </button>
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
      <div class="DebtDash__row"><span>日利率</span><span>{{ (model.dailyRate * 100).toFixed(2) }}%</span></div>
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
.DebtDash__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  font-family: var(--mono);
  font-size: var(--text-sm);
}
.DebtDash__label {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 4px;
}
.DebtDash__total {
  font-size: var(--text-lg);
  color: var(--danger);
  font-weight: 600;
}
.DebtDash__compoundWarn {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--danger);
  font-family: var(--mono);
  line-height: 1.45;
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
.DebtDash__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
}
.DebtDash__toggle {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--neon-cyan);
  font-family: var(--mono);
  font-size: var(--text-xs);
  cursor: pointer;
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
