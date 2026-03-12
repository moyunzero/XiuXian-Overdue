<template>
  <div :class="containerClasses">
    <div
      :class="fillClasses"
      :style="fillStyle"
    ></div>
    <span v-if="showLabel" class="ProgressLabel">{{ percentage }}%</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'gradient' | 'danger' | 'success'
  showLabel?: boolean
  animated?: boolean
  height?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<ProgressBarProps>(), {
  max: 100,
  variant: 'default',
  showLabel: false,
  animated: false,
  height: 'md'
})

const percentage = computed(() => {
  const pct = Math.min(100, Math.max(0, (props.value / props.max) * 100))
  return Math.round(pct)
})

const containerClasses = computed(() => [
  'ProgressBar',
  `ProgressBar--${props.height}`
])

const fillClasses = computed(() => [
  'ProgressFill',
  `ProgressFill--${props.variant}`,
  {
    'ProgressFill--animated': props.animated
  }
])

const fillStyle = computed(() => ({
  width: `${percentage.value}%`
}))
</script>

<style scoped>
.ProgressBar {
  position: relative;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ProgressBar--sm {
  height: 8px;
}

.ProgressBar--md {
  height: 10px;
}

.ProgressBar--lg {
  height: 14px;
}

.ProgressFill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 999px;
}

.ProgressFill--default {
  background: rgba(56, 248, 208, 0.85);
}

.ProgressFill--gradient {
  background: linear-gradient(90deg, rgba(56, 248, 208, 0.92), rgba(124, 92, 255, 0.92));
}

.ProgressFill--danger {
  background: rgba(255, 59, 59, 0.85);
}

.ProgressFill--success {
  background: rgba(68, 255, 154, 0.85);
}

.ProgressFill--animated {
  position: relative;
  overflow: hidden;
}

.ProgressFill--animated::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.ProgressLabel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

/* Responsive */
@media (max-width: 767px) {
  .ProgressBar--sm {
    height: 6px;
  }
  
  .ProgressBar--md {
    height: 8px;
  }
  
  .ProgressBar--lg {
    height: 12px;
  }
  
  .ProgressLabel {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ProgressFill {
    transition: none;
  }
  
  .ProgressFill--animated::after {
    animation: none;
  }
}
</style>
