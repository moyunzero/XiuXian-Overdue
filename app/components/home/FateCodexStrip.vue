<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PrimaryFate } from '~/types/play'
import { getFateCodexBlurb } from '~/logic/play/metaProgressCopy'
import { formatPrimaryFateLabel } from '~/logic/play/playerFacingCopy'

const props = withDefaults(
  defineProps<{
    unlockedFatesSeen: PrimaryFate[]
    mvpFates?: PrimaryFate[]
  }>(),
  {
    mvpFates: () => ['human', 'mortgaged', 'head_jar']
  }
)

const focusedFate = ref<PrimaryFate | null>(null)

const unlockedSet = computed(() => new Set(props.unlockedFatesSeen))

const activeBlurb = computed(() => {
  if (!focusedFate.value) return ''
  return getFateCodexBlurb(focusedFate.value)
})

function isUnlocked(fate: PrimaryFate): boolean {
  return unlockedSet.value.has(fate)
}

function fateModifier(fate: PrimaryFate): string {
  if (fate === 'human' || fate === 'indentured') return 'human'
  if (fate === 'mortgaged') return 'mortgaged'
  if (fate === 'head_jar') return 'head-jar'
  return 'other'
}

function onStampActivate(fate: PrimaryFate) {
  if (!isUnlocked(fate)) return
  focusedFate.value = focusedFate.value === fate ? null : fate
}

function onStampKeydown(event: KeyboardEvent, fate: PrimaryFate) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onStampActivate(fate)
  }
}
</script>

<template>
  <div class="FateCodexStrip">
    <ul class="FateCodexStrip__row" role="list">
      <li
        v-for="fate in mvpFates"
        :key="fate"
        class="FateCodexStrip__item"
        role="listitem"
      >
        <button
          type="button"
          class="FateCodexStrip__stamp"
          :class="[
            `FateCodexStrip__stamp--${fateModifier(fate)}`,
            {
              'FateCodexStrip__stamp--locked': !isUnlocked(fate),
              'FateCodexStrip__stamp--active': focusedFate === fate
            }
          ]"
          :aria-label="formatPrimaryFateLabel(fate)"
          :aria-pressed="focusedFate === fate"
          :disabled="!isUnlocked(fate)"
          @click="onStampActivate(fate)"
          @keydown="onStampKeydown($event, fate)"
        >
          <span class="FateCodexStrip__glyph" aria-hidden="true">
            {{ formatPrimaryFateLabel(fate).slice(0, 1) }}
          </span>
        </button>
      </li>
    </ul>
    <p
      v-if="activeBlurb"
      class="FateCodexStrip__blurb"
      role="note"
    >
      {{ activeBlurb }}
    </p>
  </div>
</template>

<style scoped>
.FateCodexStrip {
  width: 100%;
  min-width: 0;
}

.FateCodexStrip__row {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: thin;
}

.FateCodexStrip__item {
  flex: 0 0 auto;
}

.FateCodexStrip__stamp {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--fate-codex-accent-human, rgba(0, 255, 255, 0.45));
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--serif);
  font-size: var(--text-lg);
  line-height: 1;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.FateCodexStrip__stamp--human {
  border-color: var(--fate-codex-accent-human, rgba(0, 255, 255, 0.45));
}

.FateCodexStrip__stamp--mortgaged {
  border-color: var(--fate-codex-accent-mortgaged, rgba(255, 80, 100, 0.5));
}

.FateCodexStrip__stamp--head-jar {
  border-color: var(--fate-codex-accent-head-jar, rgba(0, 200, 220, 0.5));
}

.FateCodexStrip__stamp--other {
  border-color: var(--fate-rail-border, rgba(255, 255, 255, 0.2));
}

.FateCodexStrip__stamp--locked {
  opacity: 0.35;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.18);
  cursor: default;
  color: var(--text-muted);
}

.FateCodexStrip__stamp--active:not(.FateCodexStrip__stamp--locked) {
  box-shadow: inset 0 0 0 1px currentColor;
}

.FateCodexStrip__stamp:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.FateCodexStrip__glyph {
  opacity: 0.9;
}

.FateCodexStrip__blurb {
  margin: 8px 0 0;
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-secondary);
  max-width: 36rem;
}
</style>
