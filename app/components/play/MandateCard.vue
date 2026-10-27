<script setup lang="ts">
import type { MandateOptionView } from '~/logic/play/mandateCostHints'
import { gritLinkLabel } from '~/logic/play/mandateCostHints'

const props = defineProps<{
  issuerLabel: string
  title: string
  body: string
  left: MandateOptionView | null
  right: MandateOptionView | null
  grit: MandateOptionView[]
  issuerFuzzed?: boolean
  exitDirection?: 'left' | 'right' | null
}>()

const emit = defineEmits<{
  choose: [responseId: string, direction: 'left' | 'right' | 'grit']
}>()

function onZone(direction: 'left' | 'right', option: MandateOptionView | null) {
  if (!option || props.exitDirection) return
  emit('choose', option.id, direction)
}

function onGrit(option: MandateOptionView) {
  if (props.exitDirection) return
  emit('choose', option.id, 'grit')
}

function gritDisplay(option: MandateOptionView, index: number) {
  return gritLinkLabel({ id: option.id, label: option.label, effects: [] }, index)
}

function zoneAria(option: MandateOptionView) {
  const parts = [option.label]
  if (option.costHint) parts.push(option.costHintFuzzed ? '代价约略' : option.costHint)
  if (option.timingTag) parts.push(option.timingTag)
  return parts.join(' · ')
}
</script>

<template>
  <article
    class="MandateCard AgGlassSubcard"
    :class="{
      'MandateCard--exit-left': exitDirection === 'left',
      'MandateCard--exit-right': exitDirection === 'right',
      'MandateCard--exit-grit': exitDirection === 'grit'
    }"
    aria-labelledby="mandate-card-title"
    aria-describedby="mandate-card-body"
  >
    <header class="MandateCard__head">
      <span
        class="MandateCard__issuer"
        :class="{ 'MandateCard__issuer--fuzz': issuerFuzzed }"
      >
        {{ issuerLabel }}
      </span>
      <h3 id="mandate-card-title" class="MandateCard__title">{{ title }}</h3>
    </header>

    <p id="mandate-card-body" class="MandateCard__body">{{ body }}</p>

    <div
      class="MandateCard__zones"
      :class="{ 'MandateCard__zones--solo': left && !right }"
    >
      <button
        v-if="left"
        type="button"
        class="MandateCard__zone MandateCard__zone--left"
        :aria-label="zoneAria(left)"
        :disabled="!!exitDirection"
        @click="onZone('left', left)"
      >
        <span class="MandateCard__zoneLabel">{{ left.label }}</span>
        <span
          v-if="left.costHint"
          class="MandateCard__hint"
          :class="{ 'MandateCard__hint--fuzz': left.costHintFuzzed }"
        >
          {{ left.costHint }}
        </span>
        <span v-if="left.timingTag" class="MandateCard__timing">{{ left.timingTag }}</span>
      </button>

      <button
        v-if="right"
        type="button"
        class="MandateCard__zone MandateCard__zone--right"
        :class="{ 'MandateCard__zone--gritAlt': right.isGrit }"
        :aria-label="zoneAria(right)"
        :disabled="!!exitDirection"
        @click="onZone('right', right)"
      >
        <span class="MandateCard__zoneLabel">{{ right.label }}</span>
        <span
          v-if="right.costHint"
          class="MandateCard__hint"
          :class="{ 'MandateCard__hint--fuzz': right.costHintFuzzed }"
        >
          {{ right.costHint }}
        </span>
        <span v-if="right.timingTag" class="MandateCard__timing">{{ right.timingTag }}</span>
      </button>
    </div>

    <div v-if="grit.length" class="MandateCard__gritRow">
      <button
        v-for="(option, index) in grit"
        :key="option.id"
        type="button"
        class="MandateCard__grit"
        :aria-label="gritDisplay(option, index)"
        :disabled="!!exitDirection"
        @click="onGrit(option)"
      >
        {{ gritDisplay(option, index) }}
        <span
          v-if="option.costHint"
          class="MandateCard__hint MandateCard__hint--inline"
          :class="{ 'MandateCard__hint--fuzz': option.costHintFuzzed }"
        >
          {{ option.costHint }}
        </span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.MandateCard {
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  border: 1px solid rgba(100, 180, 220, 0.28);
  background: var(--ag-glass-solid, rgba(12, 16, 28, 0.88));
  transform-origin: center center;
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.MandateCard--exit-left {
  transform: translateX(-120%) rotate(-8deg);
  opacity: 0;
}

.MandateCard--exit-right {
  transform: translateX(120%) rotate(8deg);
  opacity: 0;
}

.MandateCard--exit-grit {
  transform: translateY(12%) scale(0.96);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .MandateCard {
    transition-duration: 80ms;
  }
  .MandateCard--exit-left,
  .MandateCard--exit-right {
    transform: none;
  }
  .MandateCard--exit-grit {
    transform: none;
  }
}

.MandateCard__head {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.MandateCard__issuer {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 210, 255, 0.95);
  letter-spacing: 0.06em;
}

.MandateCard__issuer--fuzz {
  filter: blur(2px);
  opacity: 0.65;
}

.MandateCard__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.2;
}

.MandateCard__body {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.MandateCard__zones {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2);
  min-height: 120px;
}

.MandateCard__zones--solo {
  grid-template-columns: minmax(0, 1fr);
}

.MandateCard__zone {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(100, 180, 220, 0.35);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(210, 240, 255, 0.95);
  font-family: var(--mono);
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
}

.MandateCard__zone--left:hover:not(:disabled) {
  background: rgba(0, 255, 255, 0.06);
}

.MandateCard__zone--right:hover:not(:disabled) {
  background: rgba(255, 0, 120, 0.06);
}

.MandateCard__zone--gritAlt {
  border-color: rgba(255, 140, 90, 0.45);
  color: rgba(255, 200, 160, 0.95);
}

.MandateCard__zone--gritAlt:hover:not(:disabled) {
  background: rgba(255, 80, 40, 0.08);
}

.MandateCard__zone:disabled {
  cursor: default;
}

.MandateCard__zoneLabel {
  font-size: var(--text-base);
  line-height: 1.35;
}

.MandateCard__hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.MandateCard__hint--inline {
  margin-left: 6px;
}

.MandateCard__hint--fuzz {
  filter: blur(3px);
  opacity: 0.55;
}

.MandateCard__timing {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.MandateCard__gritRow {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.MandateCard__grit {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 140, 90, 0.45);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 200, 160, 0.95);
  font-family: var(--mono);
  font-size: var(--text-xs);
  cursor: pointer;
}

.MandateCard__grit:hover:not(:disabled) {
  background: rgba(255, 80, 40, 0.08);
}

.MandateCard__grit:disabled {
  cursor: default;
}
</style>
