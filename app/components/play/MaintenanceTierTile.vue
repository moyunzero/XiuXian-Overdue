<script setup lang="ts">
import type { MaintenanceTier } from '~/types/chapter'

const props = defineProps<{
  selected?: MaintenanceTier
  disabled?: boolean
  tierCosts: { sustain: number; austerity: number }
}>()

const emit = defineEmits<{
  select: [tier: MaintenanceTier]
}>()

const tiers: Array<{ id: MaintenanceTier; label: string }> = [
  { id: 'sustain', label: '维持' },
  { id: 'austerity', label: '紧缩' }
]
</script>

<template>
  <fieldset
    class="MaintenanceTierTile AgGlassSubcard"
    role="radiogroup"
    aria-labelledby="maintenance-tier-label"
    :disabled="disabled"
  >
    <legend id="maintenance-tier-label" class="MaintenanceTierTile__legend">维生缴费</legend>
    <div class="MaintenanceTierTile__grid">
      <button
        v-for="tier in tiers"
        :key="tier.id"
        type="button"
        class="MaintenanceTierTile__btn"
        :class="{ 'MaintenanceTierTile__btn--on': selected === tier.id }"
        :aria-checked="selected === tier.id"
        role="radio"
        :disabled="disabled"
        @click="emit('select', tier.id)"
      >
        <span class="MaintenanceTierTile__label">{{ tier.label }}</span>
        <span class="MaintenanceTierTile__cost">¥{{ tierCosts[tier.id].toLocaleString() }}</span>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.MaintenanceTierTile {
  margin: 0;
  min-width: 0;
  min-height: 96px;
  padding: 12px 14px;
  border: 1px solid var(--fate-tile-accent-maintenance, rgba(0, 200, 220, 0.35));
  border-radius: 10px;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .MaintenanceTierTile {
    min-height: 112px;
  }
}

.MaintenanceTierTile__legend {
  padding: 0 0 0.5rem;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fate-tile-accent-maintenance, rgba(0, 200, 220, 0.95));
}

.MaintenanceTierTile__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2, 8px);
}

.MaintenanceTierTile__btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 200, 220, 0.25);
  background: rgba(0, 0, 0, 0.28);
  color: inherit;
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.MaintenanceTierTile__btn--on {
  border-color: var(--fate-tile-accent-maintenance, rgba(0, 200, 220, 0.85));
  box-shadow: inset 0 0 0 1px rgba(0, 200, 220, 0.35);
}

.MaintenanceTierTile__btn:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 2px;
}

.MaintenanceTierTile__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.MaintenanceTierTile__label {
  font-family: var(--mono);
  font-size: var(--text-base);
  font-weight: 600;
}

.MaintenanceTierTile__cost {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .MaintenanceTierTile__btn {
    transition: none;
  }
}
</style>
