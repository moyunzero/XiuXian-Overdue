<script setup lang="ts">
import type { PressureCardDef } from '~/types/play'

const props = defineProps<{
  cards: PressureCardDef[]
  selectedIds: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [cardId: string]
  confirm: []
}>()

function isSelected(id: string) {
  return props.selectedIds.includes(id)
}

function onCardClick(id: string) {
  if (props.disabled) return
  emit('toggle', id)
}
</script>

<template>
  <section class="PressureDeck" aria-label="压力牌：四选二">
    <header class="PressureDeck__head">
      <span class="PressureDeck__label">本回合 · 四选二</span>
      <span class="PressureDeck__count">{{ selectedIds.length }} / 2</span>
    </header>
    <div class="PressureDeck__grid">
      <button
        v-for="(card, index) in cards"
        :key="`${index}-${card.id}`"
        type="button"
        class="PressureDeck__card"
        :class="{ 'PressureDeck__card--selected': isSelected(card.id) }"
        :disabled="disabled"
        @click="onCardClick(card.id)"
      >
        <span class="PressureDeck__tags">{{ card.tags.join(' · ') }}</span>
        <span class="PressureDeck__title">{{ card.title }}</span>
        <span class="PressureDeck__desc">{{ card.description }}</span>
      </button>
    </div>
    <footer class="PressureDeck__foot">
      <button
        type="button"
        class="PressureDeck__confirm"
        :disabled="disabled || selectedIds.length !== 2"
        @click="emit('confirm')"
      >
        确认出牌
      </button>
    </footer>
  </section>
</template>

<style scoped>
.PressureDeck {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px clamp(14px, 2vw, 24px) 16px;
  border-top: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.85);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.PressureDeck__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  letter-spacing: 0.08em;
}
.PressureDeck__label {
  color: var(--neon-cyan);
}
.PressureDeck__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(8px, 1.2vw, 14px);
  min-width: 0;
}
.PressureDeck__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  min-height: 88px;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.PressureDeck__card:hover:not(:disabled) {
  border-color: rgba(0, 255, 255, 0.35);
  background: rgba(0, 255, 255, 0.06);
}
.PressureDeck__card--selected {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px rgba(0, 255, 255, 0.35);
  background: rgba(0, 255, 255, 0.1);
}
.PressureDeck__card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.PressureDeck__tags {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}
.PressureDeck__title {
  font-family: var(--sans);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.25;
}
.PressureDeck__desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.PressureDeck__foot {
  display: flex;
  justify-content: flex-end;
}
.PressureDeck__confirm {
  padding: 8px 20px;
  border: 1px solid var(--neon-cyan);
  border-radius: 6px;
  background: rgba(0, 255, 255, 0.12);
  color: var(--neon-cyan);
  font-family: var(--mono);
  font-size: var(--text-sm);
  cursor: pointer;
}
.PressureDeck__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (max-width: 900px) {
  .PressureDeck__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
