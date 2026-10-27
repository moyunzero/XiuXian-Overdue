<script setup lang="ts">
import { computed } from 'vue'
import type { WeekPlan } from '~/types/chapter'
import type { LifeStage } from '~/types/play'
import type { WeekActionFlags, WeekRepayTierFlags } from '~/logic/play/mandatePsy'
import {
  cycleIntensity,
  INTENSITY_HOURS,
  tilesToWeekPlan,
  weekPlanToTiles,
  type TileIntensity,
  type TileState
} from '~/logic/play/weekPlanTiles'
import RepayHeroTile from '~/components/play/RepayHeroTile.vue'
import ScheduleTile from '~/components/play/ScheduleTile.vue'
import type { ScheduleMode } from '~/types/play'

const props = withDefaults(
  defineProps<{
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
    scheduleMode?: ScheduleMode
    integrityCap?: number
    showBloodDraw?: boolean
    bloodDrawDisabled?: boolean
  }>(),
  {
    scheduleMode: 'four_tile'
  }
)

const emit = defineEmits<{
  'update:plan': [WeekPlan]
  confirm: []
  repeatLast: []
  bloodDraw: []
}>()

const WEEK_REFERENCE_HOURS = 168

const TILE_ACCENTS = {
  study: 'var(--week-study, #5eb8ff)',
  parttime: 'var(--week-parttime, #e8c66a)',
  rest: 'var(--tile-rest, rgba(126, 224, 184, 0.75))'
} as const

const tiles = computed(() => weekPlanToTiles(props.plan))

function emitTiles(next: TileState) {
  emit('update:plan', tilesToWeekPlan(next))
}

function patchRepay(repay: WeekPlan['repay']) {
  emitTiles({ ...tiles.value, repay })
}

function disabledReason(key: 'study' | 'parttime' | 'rest'): string | null {
  if (props.disabled) return '须先回应来文'
  if (key !== 'rest' && tiles.value.rest) return '休息中'
  if (!props.segmentActions[key]) return '本段不可用'
  if (!props.actions[key]) {
    if (key === 'study') return '麻木偏高'
    if (key === 'rest') return '麻木偏高'
  }
  return null
}

function onStudyTap() {
  if (disabledReason('study')) return
  const study = cycleIntensity(tiles.value.study) as TileIntensity
  emitTiles({ ...tiles.value, study, rest: false })
}

function onParttimeTap() {
  if (disabledReason('parttime')) return
  const parttime = cycleIntensity(tiles.value.parttime) as TileIntensity
  emitTiles({ ...tiles.value, parttime, rest: false })
}

function onRestTap() {
  if (disabledReason('rest')) return
  if (tiles.value.rest) {
    emitTiles({ ...tiles.value, rest: false })
    return
  }
  emitTiles({
    ...tiles.value,
    rest: true,
    study: 0,
    parttime: 0
  })
}

const totalScheduledHours = computed(() => {
  if (tiles.value.rest) return 0
  return INTENSITY_HOURS[tiles.value.study] + INTENSITY_HOURS[tiles.value.parttime]
})

const timeStackSegments = computed(() => {
  if (tiles.value.rest) return []
  const segs: Array<{ key: string; hours: number; color: string }> = []
  const studyH = INTENSITY_HOURS[tiles.value.study]
  const partH = INTENSITY_HOURS[tiles.value.parttime]
  if (studyH > 0) segs.push({ key: 'study', hours: studyH, color: TILE_ACCENTS.study })
  if (partH > 0) segs.push({ key: 'parttime', hours: partH, color: TILE_ACCENTS.parttime })
  return segs
})

const weekLoadRatio = computed(() =>
  Math.min(100, Math.round((totalScheduledHours.value / WEEK_REFERENCE_HOURS) * 100))
)

const showStudy = computed(() => props.segmentActions.study)
const showParttime = computed(() => props.segmentActions.parttime)
const showRest = computed(() => props.segmentActions.rest)
const showRepay = computed(() => props.segmentActions.repay)

const secondaryTileCount = computed(() => {
  let n = 0
  if (showStudy.value) n++
  if (showParttime.value) n++
  if (showRest.value) n++
  return n
})
</script>

<template>
  <section
    v-if="scheduleMode === 'four_tile'"
    class="WeekPlan WeekPlan--float"
    aria-labelledby="week-plan-title"
  >
    <header class="WeekPlan__head">
      <span class="WeekPlan__tag">本周分配</span>
      <h2 id="week-plan-title" class="WeekPlan__title">周排程</h2>
      <p v-if="segmentLabel" class="WeekPlan__meta">
        {{ segmentLabel }}
        <template v-if="weeksRemaining != null"> · 剩余 {{ weeksRemaining }} 周</template>
      </p>
    </header>

    <p v-if="psyNotice" class="WeekPlan__psy" role="status">{{ psyNotice }}</p>
    <p v-if="repeatHint" class="WeekPlan__repeatHint" role="status">{{ repeatHint }}</p>

    <div
      class="WeekPlan__tileGrid"
      :class="{
        'WeekPlan__tileGrid--cols1': secondaryTileCount <= 1,
        'WeekPlan__tileGrid--cols2': secondaryTileCount === 2,
        'WeekPlan__tileGrid--cols3': secondaryTileCount >= 3
      }"
    >
      <RepayHeroTile
        class="WeekPlan__hero"
        :repay="tiles.repay"
        :repay-tiers="repayTiers"
        :disabled="disabled"
        :show-repay="showRepay"
        :show-blood-draw="showBloodDraw"
        :blood-draw-disabled="bloodDrawDisabled"
        @update:repay="patchRepay"
        @blood-draw="emit('bloodDraw')"
      />

      <ScheduleTile
        v-if="showStudy"
        class="WeekPlan__secondaryTile"
        label="刷题卷"
        :accent="TILE_ACCENTS.study"
        :intensity="tiles.study"
        :disabled="!!disabledReason('study')"
        :disabled-reason="disabledReason('study')"
        @tap="onStudyTap"
      />

      <ScheduleTile
        v-if="showParttime"
        class="WeekPlan__secondaryTile"
        label="零工"
        :accent="TILE_ACCENTS.parttime"
        :intensity="tiles.parttime"
        :disabled="!!disabledReason('parttime')"
        :disabled-reason="disabledReason('parttime')"
        @tap="onParttimeTap"
      />

      <ScheduleTile
        v-if="showRest"
        class="WeekPlan__secondaryTile"
        label="休息"
        variant="rest"
        :accent="TILE_ACCENTS.rest"
        :rest-active="tiles.rest"
        :disabled="!!disabledReason('rest')"
        :disabled-reason="disabledReason('rest')"
        @tap="onRestTap"
      />
    </div>

    <div
      v-if="showStudy || showParttime"
      class="WeekPlan__timeSummary AgGlassSubcard"
      aria-live="polite"
    >
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

    <div class="WeekPlan__actions">
      <button type="button" class="WeekPlan__btn WeekPlan__btn--primary" :disabled="disabled" @click="emit('confirm')">
        开本周
      </button>
      <button
        type="button"
        class="WeekPlan__btn WeekPlan__btn--ghost"
        :disabled="disabled || !canRepeatLast"
        @click="emit('repeatLast')"
      >
        和上周一样
      </button>
    </div>
  </section>
</template>

<style scoped>
.WeekPlan {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
.WeekPlan__tileGrid {
  display: grid;
  gap: 8px;
  margin-bottom: 1rem;
  min-width: 0;
  flex: 1;
}
@media (min-width: 900px) {
  .WeekPlan__hero {
    min-height: 108px;
  }
  .WeekPlan__secondaryTile :deep(.ScheduleTile) {
    min-height: 80px;
  }
}
.WeekPlan__hero {
  grid-column: 1 / -1;
}
.WeekPlan__tileGrid--cols1 {
  grid-template-columns: minmax(0, 1fr);
}
.WeekPlan__tileGrid--cols2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.WeekPlan__tileGrid--cols3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 639px) {
  .WeekPlan__tileGrid--cols2,
  .WeekPlan__tileGrid--cols3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
.WeekPlan__secondaryTile {
  min-width: 0;
}
.WeekPlan__timeSummary {
  margin: 0 0 1rem;
  padding: 12px 14px;
  min-width: 0;
  --week-study: #5eb8ff;
  --week-parttime: #e8c66a;
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
.WeekPlan__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  flex-shrink: 0;
}
.WeekPlan__btn {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-xs);
  background: rgba(100, 200, 255, 0.18);
  color: rgba(200, 235, 255, 0.95);
  border: 1px solid rgba(100, 200, 255, 0.35);
}
.WeekPlan__btn--primary {
  flex: 1 1 auto;
  min-width: min(200px, 100%);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(0, 255, 255, 0.12);
  color: rgba(220, 255, 255, 0.98);
  border-color: rgba(0, 255, 255, 0.55);
}
.WeekPlan__btn--primary:hover:not(:disabled) {
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.28);
  background: rgba(0, 255, 255, 0.18);
}
.WeekPlan__btn--ghost {
  flex: 0 0 auto;
  background: transparent;
}
.WeekPlan__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: reduce) {
  .WeekPlan__timeSeg {
    transition: none;
  }
}
</style>
