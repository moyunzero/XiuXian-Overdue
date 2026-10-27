<script setup lang="ts">
import type { DelegationJobId } from '~/types/chapter'

export interface DelegationJobOption {
  id: DelegationJobId
  label: string
  costHint: string
  disabled?: boolean
  disabledReason?: string
}

const props = defineProps<{
  options: DelegationJobOption[]
  selectedId?: DelegationJobId
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [jobId: DelegationJobId]
}>()
</script>

<template>
  <fieldset
    class="DelegationJobTile AgGlassSubcard"
    role="listbox"
    aria-labelledby="delegation-job-label"
    :disabled="disabled"
  >
    <legend id="delegation-job-label" class="DelegationJobTile__legend">委托指令</legend>
    <div v-if="options.length" class="DelegationJobTile__list">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="DelegationJobTile__item"
        :class="{ 'DelegationJobTile__item--on': selectedId === opt.id }"
        role="option"
        :aria-selected="selectedId === opt.id"
        :disabled="disabled || opt.disabled"
        :title="opt.disabledReason"
        @click="emit('select', opt.id)"
      >
        <span class="DelegationJobTile__label">{{ opt.label }}</span>
        <span class="DelegationJobTile__hint">{{ opt.costHint }}</span>
      </button>
    </div>
    <p v-else class="DelegationJobTile__empty">本周无可用工单。</p>
  </fieldset>
</template>

<style scoped>
.DelegationJobTile {
  margin: 0;
  min-width: 0;
  min-height: 96px;
  padding: 12px 14px;
  border: 1px solid var(--fate-tile-accent-delegation, rgba(140, 180, 255, 0.35));
  border-radius: 10px;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .DelegationJobTile {
    min-height: 112px;
  }
}

.DelegationJobTile__legend {
  padding: 0 0 0.5rem;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fate-tile-accent-delegation, rgba(140, 180, 255, 0.95));
}

.DelegationJobTile__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2, 8px);
}

.DelegationJobTile__item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(140, 180, 255, 0.22);
  background: rgba(0, 0, 0, 0.28);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  width: 100%;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.DelegationJobTile__item--on {
  border-color: var(--fate-tile-accent-delegation, rgba(140, 180, 255, 0.85));
  transform: scale(1.02);
}

.DelegationJobTile__item:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.DelegationJobTile__item:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
}

.DelegationJobTile__label {
  font-family: var(--mono);
  font-size: var(--text-base);
}

.DelegationJobTile__hint {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.DelegationJobTile__empty {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .DelegationJobTile__item {
    transition: none;
  }
  .DelegationJobTile__item--on {
    transform: none;
  }
}
</style>
