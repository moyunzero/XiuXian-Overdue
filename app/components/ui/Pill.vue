<template>
  <span :class="pillClasses">
    <span v-if="icon" class="PillIcon">{{ icon }}</span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface PillProps {
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success'
  size?: 'sm' | 'md'
  icon?: string
  glowing?: boolean
}

const props = withDefaults(defineProps<PillProps>(), {
  variant: 'default',
  size: 'md',
  glowing: false
})

const pillClasses = computed(() => [
  'Pill',
  `Pill--${props.variant}`,
  `Pill--${props.size}`,
  {
    'Pill--glowing': props.glowing
  }
])
</script>

<style scoped>
.Pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: 999px;
  border: 1px solid var(--border);
  font-family: var(--mono);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

/* Sizes */
.Pill--sm {
  padding: 4px 8px;
  font-size: var(--text-xs);
}

.Pill--md {
  padding: 6px 10px;
  font-size: var(--text-sm);
}

/* Variants */
.Pill--default {
  background: rgba(0, 0, 0, 0.18);
  color: var(--muted);
}

.Pill--info {
  background: rgba(56, 248, 208, 0.12);
  border-color: rgba(56, 248, 208, 0.3);
  color: var(--aqua);
}

.Pill--warning {
  background: rgba(255, 210, 74, 0.12);
  border-color: rgba(255, 210, 74, 0.3);
  color: var(--warn);
}

.Pill--danger {
  background: rgba(255, 59, 59, 0.12);
  border-color: rgba(255, 59, 59, 0.3);
  color: var(--danger);
}

.Pill--success {
  background: rgba(68, 255, 154, 0.12);
  border-color: rgba(68, 255, 154, 0.3);
  color: var(--ok);
}

/* Glowing Effect */
.Pill--glowing {
  animation: pulse 2s ease-in-out infinite;
}

.Pill--info.Pill--glowing {
  box-shadow: 0 0 12px rgba(56, 248, 208, 0.4);
}

.Pill--warning.Pill--glowing {
  box-shadow: 0 0 12px rgba(255, 210, 74, 0.4);
}

.Pill--danger.Pill--glowing {
  box-shadow: 0 0 12px rgba(255, 59, 59, 0.4);
}

.Pill--success.Pill--glowing {
  box-shadow: 0 0 12px rgba(68, 255, 154, 0.4);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.PillIcon {
  display: inline-flex;
  font-size: 1.1em;
}

/* Responsive */
@media (max-width: 767px) {
  .Pill--sm {
    padding: 3px 6px;
    font-size: 10px;
  }
  
  .Pill--md {
    padding: 5px 8px;
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .Pill--glowing {
    animation: none;
  }
}
</style>
