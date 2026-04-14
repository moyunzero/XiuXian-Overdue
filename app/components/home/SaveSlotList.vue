<template>
  <div class="SaveSlotList">
    <div class="SaveSlotList__header">
      <span class="SaveSlotList__title">已有存档</span>
      <span class="SaveSlotList__count">{{ activeSlots }} / {{ totalSlots }}</span>
    </div>
    <div
      ref="listContainer"
      class="SaveSlotList__grid"
    >
      <SaveSlotCard
        v-for="slot in slots"
        :key="slot.id"
        :slot="slot.meta"
        :title="getSlotTitle(slot.id)"
        :is-active="activeSlot === slot.id"
        @click="onSlotClick(slot.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SaveSlotCard from './SaveSlotCard.vue'
import type { SaveSlotId } from '~/composables/useGameStorage'

interface SlotData {
  id: SaveSlotId
  meta: {
    day: number
    tier: string
    cash: number
    debt: number
  } | null
}

interface Props {
  slots: SlotData[]
  activeSlot?: string
  totalSlots?: number
}

const props = withDefaults(defineProps<Props>(), {
  activeSlot: '',
  totalSlots: 4
})

const emit = defineEmits<{
  select: [slotId: SaveSlotId]
}>()

const listContainer = ref<HTMLElement | null>(null)

const activeSlots = computed(() => props.slots.filter(s => s.meta !== null).length)

const slotTitles: Record<SaveSlotId, string> = {
  autosave: '自动存档',
  slot1: '存档 1',
  slot2: '存档 2',
  slot3: '存档 3'
}

const getSlotTitle = (id: SaveSlotId): string => {
  if (props.slots.find(s => s.id === id)?.meta) {
    const meta = props.slots.find(s => s.id === id)?.meta
    return meta ? `${slotTitles[id]} · 第${meta.day}天` : slotTitles[id]
  }
  return slotTitles[id]
}

const onSlotClick = (slotId: SaveSlotId) => {
  emit('select', slotId)
}
</script>

<style scoped>
.SaveSlotList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.SaveSlotList__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.SaveSlotList__title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.SaveSlotList__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--mono);
}

.SaveSlotList__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 1024px) {
  .SaveSlotList__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .SaveSlotList__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .SaveSlotList__grid {
    grid-template-columns: 1fr;
  }
}
</style>
