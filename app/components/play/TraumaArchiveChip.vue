<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import type { PrimaryFate } from '~/types/play'
import { formatPrimaryFateLabel } from '~/logic/play/playerFacingCopy'

const props = withDefaults(
  defineProps<{
    fate: PrimaryFate
    visible: boolean
    durationMs?: number
    skippable?: boolean
  }>(),
  {
    durationMs: 3000,
    skippable: true
  }
)

const emit = defineEmits<{
  dismiss: []
}>()

let dismissTimer: ReturnType<typeof setTimeout> | null = null

const fateLabel = computed(() => formatPrimaryFateLabel(props.fate))

const archiveLine = computed(() => `创伤档案归档：${fateLabel.value}`)

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function dismiss() {
  clearDismissTimer()
  emit('dismiss')
}

function scheduleDismiss() {
  clearDismissTimer()
  if (!props.visible) return

  const duration =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : props.durationMs

  if (duration <= 0) {
    dismiss()
    return
  }

  dismissTimer = setTimeout(dismiss, duration)
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) scheduleDismiss()
    else clearDismissTimer()
  },
  { immediate: true }
)

onBeforeUnmount(clearDismissTimer)
</script>

<template>
  <div
    v-if="visible"
    class="TraumaArchiveChip"
    role="status"
    aria-live="polite"
  >
    <p class="TraumaArchiveChip__line">{{ archiveLine }}</p>
    <button
      v-if="skippable"
      type="button"
      class="TraumaArchiveChip__skip"
      @click="dismiss"
    >
      跳过
    </button>
  </div>
</template>

<style scoped>
.TraumaArchiveChip {
  position: fixed;
  bottom: clamp(12px, 3vw, 24px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 215;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(520px, calc(100% - 32px));
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--fate-rail-border, rgba(255, 255, 255, 0.12));
  background: rgba(8, 12, 18, 0.92);
  box-shadow: var(--ag-elev-2);
  animation: traumaChipFade 0.25s ease both;
}

.TraumaArchiveChip__line {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.45;
}

.TraumaArchiveChip__skip {
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: var(--text-xs);
  cursor: pointer;
}

.TraumaArchiveChip__skip:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

@keyframes traumaChipFade {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .TraumaArchiveChip {
    animation: none;
  }
}
</style>
