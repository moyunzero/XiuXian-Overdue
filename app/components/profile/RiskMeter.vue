<template>
  <div class="risk-meter">
    <svg :viewBox="svgViewBox" class="meter-svg">
      <circle :cx="center" :cy="center" :r="radius" class="meter-bg" />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        class="meter-progress"
        :stroke="meterColor"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
      <text :x="center" :y="center - 8" class="score-value" text-anchor="middle">
        {{ score }}
      </text>
      <text :x="center" :y="center + 16" class="score-label" text-anchor="middle">
        {{ riskLabel }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
}>()

const center = 50
const radius = 40
const strokeWidth = 8
const svgViewBox = '0 0 100 100'

const circumference = computed(() => 2 * Math.PI * radius)

const dashOffset = computed(() => {
  const progress = props.score / 100
  return circumference.value * (1 - progress)
})

const meterColor = computed(() => {
  if (props.score < 30) return 'var(--color-success)'
  if (props.score < 60) return 'var(--color-warning)'
  if (props.score < 80) return 'var(--color-orange)'
  return 'var(--color-danger)'
})

const riskLabel = computed(() => {
  if (props.score < 30) return '低风险'
  if (props.score < 60) return '中风险'
  if (props.score < 80) return '高风险'
  return '极高风险'
})
</script>

<style scoped>
.risk-meter {
  width: 120px;
  height: 120px;
}

.meter-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.meter-bg {
  fill: none;
  stroke: var(--color-bg-tertiary);
  stroke-width: v-bind('strokeWidth');
}

.meter-progress {
  fill: none;
  stroke-width: v-bind('strokeWidth');
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}

.score-value {
  fill: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.score-label {
  fill: var(--color-text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
}
</style>
