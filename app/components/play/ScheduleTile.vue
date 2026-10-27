<script setup lang="ts">
import { computed } from 'vue'
import type { TileIntensity } from '~/logic/play/weekPlanTiles'

const props = defineProps<{
  label: string
  accent: string
  disabled?: boolean
  disabledReason?: string | null
  variant?: 'intensity' | 'rest'
  intensity?: TileIntensity
  restActive?: boolean
}>()

const emit = defineEmits<{
  tap: []
}>()

const INTENSITY_LABELS = ['无', '低', '中', '高'] as const

const badgeLabel = computed(() => {
  if (props.variant === 'rest') return props.restActive ? '休' : '关'
  return INTENSITY_LABELS[props.intensity ?? 0]
})

function onTap() {
  if (props.disabled) return
  emit('tap')
}
</script>

<template>
  <button
    type="button"
    class="ScheduleTile AgGlassSubcard"
    :class="{
      'ScheduleTile--disabled': disabled,
      'ScheduleTile--restOn': variant === 'rest' && restActive,
      [`ScheduleTile--intensity-${intensity ?? 0}`]: variant !== 'rest'
    }"
    :style="{ '--tile-accent': accent }"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :aria-label="
      disabled && disabledReason
        ? `${label}，${disabledReason}`
        : `${label}，强度${badgeLabel}，点击切换`
    "
    @click="onTap"
  >
    <span class="ScheduleTile__label">{{ label }}</span>
    <span
      class="ScheduleTile__badge"
      :class="{ 'ScheduleTile__badge--pulse': !disabled && variant !== 'rest' && intensity === 3 }"
    >
      {{ badgeLabel }}
    </span>
    <span v-if="disabled && disabledReason" class="ScheduleTile__reason">{{ disabledReason }}</span>
  </button>
</template>

<style scoped>
.ScheduleTile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  min-width: 0;
  min-height: 64px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--ag-glass-border, rgba(255, 255, 255, 0.08));
  border-left: 3px solid var(--tile-accent);
  background: rgba(0, 0, 0, 0.32);
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.15s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.ScheduleTile:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}
.ScheduleTile:active:not(:disabled) {
  transform: scale(1.02);
}
.ScheduleTile--intensity-0:not(.ScheduleTile--disabled) {
  border-left-color: rgba(120, 140, 160, 0.45);
}
.ScheduleTile--intensity-1:not(.ScheduleTile--disabled) {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.38), color-mix(in srgb, var(--tile-accent) 12%, transparent));
}
.ScheduleTile--intensity-2:not(.ScheduleTile--disabled) {
  border-color: color-mix(in srgb, var(--tile-accent) 45%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--tile-accent) 18%, transparent);
}
.ScheduleTile--intensity-3:not(.ScheduleTile--disabled) {
  border-color: color-mix(in srgb, var(--tile-accent) 55%, transparent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--tile-accent) 22%, transparent);
}
.ScheduleTile--restOn:not(.ScheduleTile--disabled) {
  border-color: color-mix(in srgb, var(--tile-accent) 50%, transparent);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.35), color-mix(in srgb, var(--tile-accent) 16%, transparent));
}
.ScheduleTile--disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}
.ScheduleTile__label {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-primary);
  letter-spacing: 0.04em;
}
.ScheduleTile__badge {
  font-family: var(--mono);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--tile-accent);
  line-height: 1.1;
}
.ScheduleTile__badge--pulse {
  text-shadow: 0 0 8px var(--neon-cyan);
}
.ScheduleTile__reason {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 480px) {
  .ScheduleTile {
    min-height: 72px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ScheduleTile {
    transition: none;
  }
  .ScheduleTile:active:not(:disabled) {
    transform: none;
  }
}
</style>
