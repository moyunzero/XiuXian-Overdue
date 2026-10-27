<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PrimaryFate } from '~/types/play'
import { formatPrimaryFateLabel } from '~/logic/play/playerFacingCopy'

export interface FateTransitionPending {
  fromFate: PrimaryFate
  toFate: PrimaryFate
  titleLine: string
  bodyLine: string
  logLine?: string
}

const props = withDefaults(
  defineProps<{
    pending: FateTransitionPending
    /** Auto-complete duration 8000–12000ms (default 10000) */
    durationMs?: number
    /** Skip button visible after this many ms (default 3000) */
    skipAfterMs?: number
  }>(),
  {
    durationMs: 10_000,
    skipAfterMs: 3_000
  }
)

const emit = defineEmits<{
  complete: []
  skip: []
}>()

const reducedMotion = ref(false)
const skipVisible = ref(false)
const showContinue = ref(false)
const progressPct = ref(0)

let skipTimer: ReturnType<typeof setTimeout> | null = null
let completeTimer: ReturnType<typeof setTimeout> | null = null
let continueTimer: ReturnType<typeof setTimeout> | null = null
let progressRaf: number | null = null
let startedAt = 0

const fateLabel = computed(() => formatPrimaryFateLabel(props.pending.toFate))

const effectiveDuration = computed(() =>
  reducedMotion.value ? 3_000 : Math.min(12_000, Math.max(8_000, props.durationMs))
)

const effectiveSkipAfter = computed(() =>
  reducedMotion.value ? 0 : props.skipAfterMs
)

function clearTimers() {
  if (skipTimer) clearTimeout(skipTimer)
  if (completeTimer) clearTimeout(completeTimer)
  if (continueTimer) clearTimeout(continueTimer)
  if (progressRaf != null) cancelAnimationFrame(progressRaf)
  skipTimer = completeTimer = continueTimer = null
  progressRaf = null
}

function finish(skipped: boolean) {
  clearTimers()
  if (skipped) emit('skip')
  else emit('complete')
}

function onSkip() {
  finish(true)
}

function tickProgress() {
  const elapsed = Date.now() - startedAt
  progressPct.value = Math.min(100, Math.round((elapsed / effectiveDuration.value) * 100))
  if (elapsed < effectiveDuration.value) {
    progressRaf = requestAnimationFrame(tickProgress)
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  startedAt = Date.now()
  progressRaf = requestAnimationFrame(tickProgress)

  skipTimer = setTimeout(() => {
    skipVisible.value = true
  }, effectiveSkipAfter.value)

  continueTimer = setTimeout(() => {
    showContinue.value = true
  }, Math.max(0, effectiveDuration.value - 1_000))

  completeTimer = setTimeout(() => {
    finish(false)
  }, effectiveDuration.value)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <div
    class="FateUpdateOverlay AgGate AgGate--fate"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fate-update-stamp"
  >
    <div class="FateUpdateOverlay__panel AgGlassPanel">
      <h2 id="fate-update-stamp" class="FateUpdateOverlay__stamp">灵籍更新</h2>

      <div class="FateUpdateOverlay__lines AgStagger">
        <p class="FateUpdateOverlay__fateLine">主形态：{{ fateLabel }}</p>
        <p v-if="pending.titleLine" class="FateUpdateOverlay__titleLine">{{ pending.titleLine }}</p>
        <p v-if="pending.bodyLine" class="FateUpdateOverlay__bodyLine">{{ pending.bodyLine }}</p>
      </div>

      <div
        class="FateUpdateOverlay__progress"
        role="progressbar"
        :aria-valuenow="progressPct"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="灵籍更新进度"
      >
        <span class="FateUpdateOverlay__progressFill" :style="{ width: `${progressPct}%` }" />
      </div>

      <div class="FateUpdateOverlay__actions">
        <button
          v-if="skipVisible"
          type="button"
          class="FateUpdateOverlay__skip"
          aria-live="polite"
          @click="onSkip"
        >
          跳过
        </button>
        <span v-if="showContinue && !skipVisible" class="FateUpdateOverlay__continue">继续本周</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.FateUpdateOverlay__panel {
  text-align: center;
  padding: var(--spacing-8, 32px) var(--spacing-6, 24px);
  box-sizing: border-box;
}

.FateUpdateOverlay__stamp {
  margin: 0 0 var(--spacing-6, 24px);
  font-family: var(--serif);
  font-size: var(--text-3xl, 28px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.12em;
  animation: fateStampIn 0.4s ease both;
}

.FateUpdateOverlay__lines {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2, 8px);
  margin-bottom: var(--spacing-6, 24px);
}

.FateUpdateOverlay__fateLine {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-base);
  color: var(--neon-cyan);
}

.FateUpdateOverlay__titleLine {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.FateUpdateOverlay__bodyLine {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
}

.FateUpdateOverlay__progress {
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: var(--spacing-4, 16px);
}

.FateUpdateOverlay__progressFill {
  display: block;
  height: 100%;
  background: var(--neon-cyan);
  transition: width 0.12s linear;
}

.FateUpdateOverlay__actions {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.FateUpdateOverlay__skip {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.55);
  background: rgba(0, 255, 255, 0.08);
  color: var(--neon-cyan);
  font-family: var(--mono);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.FateUpdateOverlay__skip:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.FateUpdateOverlay__continue {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

@keyframes fateStampIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .FateUpdateOverlay__stamp {
    animation: none;
  }
  .FateUpdateOverlay__progressFill {
    transition: none;
  }
}
</style>
