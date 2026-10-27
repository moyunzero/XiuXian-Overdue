<script setup lang="ts">
import type { WeekPlan } from '~/types/chapter'
import type { WeekRepayTierFlags } from '~/logic/play/mandatePsy'
import BloodDrawGritLink from '~/components/play/BloodDrawGritLink.vue'

const props = defineProps<{
  repay: WeekPlan['repay']
  repayTiers: WeekRepayTierFlags
  disabled?: boolean
  showRepay?: boolean
  showBloodDraw?: boolean
  bloodDrawDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:repay': [WeekPlan['repay']]
  bloodDraw: []
}>()

const repayOptions: Array<{ id: WeekPlan['repay']; label: string; hint: string }> = [
  { id: 'min', label: '最低还款', hint: '约 5% 总负债' },
  { id: 'partial', label: '部分提前', hint: '约 12% 或双倍最低' },
  { id: 'extra', label: '多还一截', hint: '约 25% 总负债' },
  { id: 'skip', label: '本周不还', hint: '逾期档位由日引擎计提' }
]
</script>

<template>
  <fieldset
    v-if="showRepay"
    class="RepayHeroTile AgGlassSubcard"
    :disabled="disabled"
    :style="{ '--tile-repay': 'rgba(255, 0, 120, 0.85)' }"
  >
    <legend class="RepayHeroTile__legend">还灵贷</legend>
    <div class="RepayHeroTile__repayGrid WeekPlan__repayGrid">
      <label
        v-for="opt in repayOptions"
        :key="opt.id"
        class="WeekPlan__repayOpt"
        :class="{
          'WeekPlan__repayOpt--on': repay === opt.id,
          'WeekPlan__repayOpt--muted': !repayTiers[opt.id]
        }"
      >
        <input
          type="radio"
          name="week-repay"
          :value="opt.id"
          :checked="repay === opt.id"
          :disabled="!repayTiers[opt.id] || disabled"
          @change="emit('update:repay', opt.id)"
        />
        <span class="WeekPlan__repayLabel">{{ opt.label }}</span>
        <span class="WeekPlan__repayHint">{{ opt.hint }}</span>
      </label>
    </div>
    <BloodDrawGritLink
      v-if="showBloodDraw"
      :disabled="bloodDrawDisabled || disabled"
      @activate="emit('bloodDraw')"
    />
  </fieldset>
</template>

<style scoped>
.RepayHeroTile {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--ag-glass-border, rgba(255, 255, 255, 0.08));
  border-left: 3px solid var(--tile-repay, rgba(255, 0, 120, 0.85));
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.32);
  min-width: 0;
  min-height: 88px;
}
.RepayHeroTile:disabled {
  opacity: 0.55;
}
.RepayHeroTile__legend {
  padding: 0 0 0.5rem;
  font-family: var(--mono);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--tile-repay, rgba(255, 0, 120, 0.95));
  letter-spacing: 0.04em;
}
.RepayHeroTile__repayGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
@media (min-width: 768px) {
  .RepayHeroTile__repayGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 480px) {
  .RepayHeroTile {
    min-height: 72px;
  }
}
@media (min-width: 640px) {
  .RepayHeroTile {
    min-height: 112px;
  }
}
:deep(.WeekPlan__repayOpt) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(100, 180, 220, 0.22);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  min-width: 0;
}
:deep(.WeekPlan__repayOpt--on) {
  background: rgba(40, 90, 120, 0.25);
  box-shadow: inset 0 0 0 1px rgba(255, 0, 120, 0.45);
  border-color: rgba(255, 0, 120, 0.35);
}
:deep(.WeekPlan__repayOpt--muted) {
  opacity: 0.42;
  cursor: not-allowed;
  border-color: rgba(120, 120, 120, 0.25);
  background: rgba(20, 20, 20, 0.35);
}
:deep(.WeekPlan__repayOpt input) {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
:deep(.WeekPlan__repayLabel) {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(210, 240, 255, 0.95);
}
:deep(.WeekPlan__repayHint) {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.35;
}
</style>
