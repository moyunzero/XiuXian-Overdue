<script setup lang="ts">
import { computed } from 'vue'
import type { WeekPlan } from '~/types/chapter'
import type { LifeStage } from '~/types/play'
import type { WeekActionFlags, WeekRepayTierFlags } from '~/logic/play/mandatePsy'

const props = defineProps<{
  plan: WeekPlan
  disabled?: boolean
  lifeStage: LifeStage
  segmentActions: WeekActionFlags
  actions: WeekActionFlags
  repayTiers: WeekRepayTierFlags
  psyNotice?: string | null
  repeatHint?: string | null
  canRepeatLast?: boolean
  weeksRemaining?: number
  segmentLabel?: string
}>()

const emit = defineEmits<{
  'update:plan': [WeekPlan]
  confirm: []
  repeatLast: []
}>()

const repayOptions: Array<{ id: WeekPlan['repay']; label: string; hint: string }> = [
  { id: 'min', label: '最低还款', hint: '约 5% 总负债' },
  { id: 'partial', label: '部分提前', hint: '约 12% 或双倍最低' },
  { id: 'extra', label: '多还一截', hint: '约 25% 总负债' },
  { id: 'skip', label: '本周不还', hint: '逾期档位由日引擎计提' }
]

const visibleRepayOptions = computed(() =>
  repayOptions.filter((opt) => props.segmentActions.repay)
)

/** 仅用于周负荷可视化，规则层仍按单项 0–40 计 */
const WEEK_REFERENCE_HOURS = 168
const HOUR_MAX = 40

const ACTIVITY_ACCENT: Record<
  'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours',
  string
> = {
  studyHours: 'var(--week-study, #5eb8ff)',
  tunaHours: 'var(--week-tuna, #7ee0b8)',
  parttimeHours: 'var(--week-parttime, #e8c66a)',
  workHours: 'var(--week-work, #c9a0ff)'
}

const hourFields = computed(() => {
  const rows: Array<{
    key: 'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours'
    label: string
    segmentOn: boolean
    enabled: boolean
  }> = [
    {
      key: 'studyHours',
      label: '刷题',
      segmentOn: props.segmentActions.study,
      enabled: props.actions.study && !props.plan.rest
    },
    {
      key: 'tunaHours',
      label: '吐纳',
      segmentOn: props.segmentActions.tuna,
      enabled: props.actions.tuna && !props.plan.rest
    },
    {
      key: 'parttimeHours',
      label: '零工',
      segmentOn: props.segmentActions.parttime,
      enabled: props.actions.parttime && !props.plan.rest
    },
    {
      key: 'workHours',
      label: '主业',
      segmentOn: props.segmentActions.work || props.lifeStage === 'work',
      enabled: props.actions.work && !props.plan.rest
    }
  ]
  return rows.filter((r) => r.segmentOn)
})

const totalScheduledHours = computed(() => {
  if (props.plan.rest) return 0
  return hourFields.value.reduce((sum, row) => sum + (props.plan[row.key] ?? 0), 0)
})

const timeStackSegments = computed(() => {
  if (props.plan.rest || totalScheduledHours.value <= 0) return []
  return hourFields.value
    .map((row) => ({
      key: row.key,
      hours: props.plan[row.key] ?? 0,
      color: ACTIVITY_ACCENT[row.key]
    }))
    .filter((s) => s.hours > 0)
})

const weekLoadRatio = computed(() =>
  Math.min(100, Math.round((totalScheduledHours.value / WEEK_REFERENCE_HOURS) * 100))
)

function patch(partial: Partial<WeekPlan>) {
  emit('update:plan', { ...props.plan, ...partial })
}

function clampHour(n: number) {
  return Math.max(0, Math.min(HOUR_MAX, n))
}

function onHourInput(key: 'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours', raw: string) {
  patch({ [key]: clampHour(Number.parseInt(raw, 10) || 0) })
}

function bumpHour(key: 'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours', delta: number) {
  patch({ [key]: clampHour((props.plan[key] ?? 0) + delta) })
}

function onRestToggle() {
  const rest = !props.plan.rest
  patch(
    rest
      ? { rest: true, studyHours: 0, tunaHours: 0, parttimeHours: 0, workHours: 0 }
      : { rest: false }
  )
}
</script>

<template>
  <section class="WeekPlan WeekPlan--float" aria-labelledby="week-plan-title">
    <header class="WeekPlan__head">
      <span class="WeekPlan__tag">本周分配</span>
      <h2 id="week-plan-title" class="WeekPlan__title">周仪表盘</h2>
      <p v-if="segmentLabel" class="WeekPlan__meta">
        {{ segmentLabel }}
        <template v-if="weeksRemaining != null"> · 剩余 {{ weeksRemaining }} 周</template>
      </p>
    </header>

    <p v-if="psyNotice" class="WeekPlan__psy" role="status">{{ psyNotice }}</p>
    <p v-if="repeatHint" class="WeekPlan__repeatHint" role="status">{{ repeatHint }}</p>

    <fieldset v-if="visibleRepayOptions.length" class="WeekPlan__block AgGlassSubcard" :disabled="disabled">
      <legend class="WeekPlan__legend">还灵贷</legend>
      <div class="WeekPlan__repayGrid">
        <label
          v-for="opt in visibleRepayOptions"
          :key="opt.id"
          class="WeekPlan__repayOpt"
          :class="{
            'WeekPlan__repayOpt--on': plan.repay === opt.id,
            'WeekPlan__repayOpt--muted': !repayTiers[opt.id]
          }"
        >
          <input
            type="radio"
            name="week-repay"
            :value="opt.id"
            :checked="plan.repay === opt.id"
            :disabled="!repayTiers[opt.id]"
            @change="patch({ repay: opt.id })"
          />
          <span class="WeekPlan__repayLabel">{{ opt.label }}</span>
          <span class="WeekPlan__repayHint">{{ opt.hint }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset
      v-if="hourFields.length"
      class="WeekPlan__block WeekPlan__block--time AgGlassSubcard"
      :disabled="disabled || plan.rest"
    >
      <legend class="WeekPlan__legend">时间分配</legend>
      <p class="WeekPlan__timeHint">
        拖动滑杆或点 ± 排本周工时；色条为各事项占比。负荷条仅供感知忙碌程度——规则层仍按单项 0–40h
        计效，总和不必凑满 {{ WEEK_REFERENCE_HOURS }}h。
      </p>

      <div class="WeekPlan__timeSummary" aria-live="polite">
        <div
          class="WeekPlan__timeTrack"
          role="img"
          :aria-label="`本周已排 ${totalScheduledHours} 小时`"
        >
          <div
            v-for="seg in timeStackSegments"
            :key="seg.key"
            class="WeekPlan__timeSeg"
            :style="{ flexGrow: seg.hours, background: seg.color }"
          />
          <div
            v-if="!timeStackSegments.length"
            class="WeekPlan__timeSeg WeekPlan__timeSeg--empty"
          />
        </div>
        <div class="WeekPlan__timeMeta">
          <span class="WeekPlan__timeTotal">
            已排 <strong>{{ totalScheduledHours }}</strong> h
          </span>
          <span class="WeekPlan__timeRef">参考一周 {{ WEEK_REFERENCE_HOURS }}h</span>
          <span
            class="WeekPlan__timeLoad"
            :class="{ 'WeekPlan__timeLoad--heavy': weekLoadRatio >= 85 }"
          >
            负荷 {{ weekLoadRatio }}%
          </span>
        </div>
      </div>

      <ul class="WeekPlan__timeCards">
        <li
          v-for="row in hourFields"
          :key="row.key"
          class="WeekPlan__timeCard"
          :class="{ 'WeekPlan__timeCard--muted': !row.enabled }"
          :style="{ '--time-accent': ACTIVITY_ACCENT[row.key] }"
        >
          <div class="WeekPlan__timeCardHead">
            <label class="WeekPlan__timeCardLabel" :for="`hour-range-${row.key}`">
              {{ row.label }}
            </label>
            <span class="WeekPlan__timeCardValue">{{ plan[row.key] }}h</span>
          </div>
          <input
            :id="`hour-range-${row.key}`"
            class="WeekPlan__timeRange"
            type="range"
            min="0"
            :max="HOUR_MAX"
            step="1"
            :value="plan[row.key]"
            :disabled="!row.enabled"
            @input="onHourInput(row.key, ($event.target as HTMLInputElement).value)"
          />
          <div class="WeekPlan__timeStepper">
            <button
              type="button"
              class="WeekPlan__stepBtn"
              :disabled="!row.enabled || plan[row.key] <= 0"
              :aria-label="`减少${row.label}工时`"
              @click="bumpHour(row.key, -1)"
            >
              −
            </button>
            <button
              type="button"
              class="WeekPlan__stepBtn"
              :disabled="!row.enabled || plan[row.key] >= HOUR_MAX"
              :aria-label="`增加${row.label}工时`"
              @click="bumpHour(row.key, 1)"
            >
              +
            </button>
          </div>
        </li>
      </ul>
    </fieldset>

    <label
      v-if="segmentActions.rest"
      class="WeekPlan__rest"
      :class="{
        'WeekPlan__rest--on': plan.rest,
        'WeekPlan__rest--muted': !actions.rest
      }"
    >
      <input type="checkbox" :checked="plan.rest" :disabled="disabled || !actions.rest" @change="onRestToggle" />
      <span>休息一周（不排工时，专注恢复）</span>
    </label>

    <div class="WeekPlan__actions">
      <button type="button" class="WeekPlan__btn" :disabled="disabled" @click="emit('confirm')">
        确认本周计划
      </button>
      <button
        type="button"
        class="WeekPlan__btn WeekPlan__btn--ghost"
        :disabled="disabled || !canRepeatLast"
        @click="emit('repeatLast')"
      >
        沿用上周
      </button>
    </div>
  </section>
</template>

<style scoped>
.WeekPlan {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
  padding: clamp(14px, 2vw, 18px);
  border-radius: 10px;
  border: 1px solid rgba(100, 200, 255, 0.28);
  background: linear-gradient(160deg, rgba(8, 18, 32, 0.92), rgba(4, 10, 18, 0.96));
  box-sizing: border-box;
}
.WeekPlan__head {
  margin-bottom: 1rem;
}
.WeekPlan__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 220, 255, 0.9);
  letter-spacing: 0.08em;
}
.WeekPlan__title {
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.WeekPlan__meta {
  margin: 0.35rem 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
.WeekPlan__psy {
  margin: 0 0 1rem;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 180, 120, 0.35);
  background: rgba(80, 40, 20, 0.25);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 200, 150, 0.95);
  line-height: 1.45;
}
.WeekPlan__repeatHint {
  margin: 0 0 1rem;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(100, 200, 255, 0.28);
  background: rgba(20, 48, 72, 0.35);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 230, 255, 0.92);
  line-height: 1.45;
}
.WeekPlan__block {
  margin: 0 0 1rem;
  padding: 0;
  border: none;
  min-width: 0;
}
.WeekPlan__block:disabled {
  opacity: 0.55;
}
.WeekPlan__legend {
  padding: 0 0 0.5rem;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}
.WeekPlan__repayGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: 8px;
}
.WeekPlan__repayOpt {
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
.WeekPlan__repayOpt--on {
  border-color: rgba(100, 220, 255, 0.55);
  background: rgba(40, 90, 120, 0.25);
}
.WeekPlan__repayOpt--muted {
  opacity: 0.42;
  cursor: not-allowed;
  border-color: rgba(120, 120, 120, 0.25);
  background: rgba(20, 20, 20, 0.35);
}
.WeekPlan__repayOpt input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.WeekPlan__repayLabel {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(210, 240, 255, 0.95);
}
.WeekPlan__repayHint {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.35;
}
.WeekPlan__block--time {
  --week-study: #5eb8ff;
  --week-tuna: #7ee0b8;
  --week-parttime: #e8c66a;
  --week-work: #c9a0ff;
}
.WeekPlan__timeHint {
  margin: 0 0 12px;
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.45;
}
.WeekPlan__timeSummary {
  margin-bottom: 14px;
}
.WeekPlan__timeTrack {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
}
.WeekPlan__timeSeg {
  min-width: 2px;
  transition: flex-grow 0.25s ease;
}
.WeekPlan__timeSeg--empty {
  flex: 1;
  background: rgba(80, 90, 110, 0.35);
}
.WeekPlan__timeMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--text-muted);
}
.WeekPlan__timeTotal strong {
  color: rgba(200, 235, 255, 0.95);
  font-size: var(--text-xs);
}
.WeekPlan__timeLoad--heavy {
  color: rgba(255, 140, 160, 0.95);
}
.WeekPlan__timeCards {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 10px;
}
.WeekPlan__timeCard {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 6px 10px;
  padding: 12px 12px 10px;
  border-radius: 10px;
  border: 1px solid var(--ag-glass-border, rgba(255, 255, 255, 0.08));
  border-left: 3px solid var(--time-accent);
  background: rgba(0, 0, 0, 0.32);
  min-width: 0;
}
.WeekPlan__timeCard--muted {
  opacity: 0.42;
  pointer-events: none;
}
.WeekPlan__timeCardHead {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.WeekPlan__timeCardLabel {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-primary);
  letter-spacing: 0.04em;
}
.WeekPlan__timeCardValue {
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--time-accent);
}
.WeekPlan__timeRange {
  grid-column: 1 / -1;
  width: 100%;
  min-width: 0;
  height: 6px;
  margin: 2px 0;
  accent-color: var(--time-accent);
  cursor: pointer;
}
.WeekPlan__timeRange:disabled {
  cursor: not-allowed;
}
.WeekPlan__timeStepper {
  display: flex;
  gap: 6px;
}
.WeekPlan__stepBtn {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(100, 180, 220, 0.35);
  background: rgba(0, 0, 0, 0.45);
  color: rgba(210, 240, 255, 0.95);
  font-family: var(--mono);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}
.WeekPlan__stepBtn:hover:not(:disabled) {
  border-color: var(--time-accent);
  transform: translateY(-1px);
}
.WeekPlan__stepBtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.WeekPlan__rest {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 1rem;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
}
.WeekPlan__rest--on {
  color: rgba(180, 220, 255, 0.95);
}
.WeekPlan__rest--muted {
  opacity: 0.42;
  cursor: not-allowed;
  text-decoration: line-through;
  text-decoration-color: rgba(180, 180, 180, 0.45);
}
.WeekPlan__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.WeekPlan__btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-xs);
  background: rgba(100, 200, 255, 0.18);
  color: rgba(200, 235, 255, 0.95);
  border: 1px solid rgba(100, 200, 255, 0.35);
}
.WeekPlan__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.WeekPlan__btn--ghost {
  background: transparent;
}
</style>
