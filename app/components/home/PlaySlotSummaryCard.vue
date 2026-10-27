<script setup lang="ts">
import { computed } from 'vue'
import type { PlayRunState, PrimaryFate, SaveSlotId } from '~/types/play'
import { formatPrimaryFateLabel } from '~/logic/play/playerFacingCopy'

const props = withDefaults(
  defineProps<{
    slotId: SaveSlotId
    run: PlayRunState | null
    isActive?: boolean
    playerName?: string
  }>(),
  {
    isActive: false,
    playerName: ''
  }
)

const emit = defineEmits<{
  click: []
}>()

const displayName = computed(() => {
  if (props.playerName) return props.playerName
  if (props.run?.start?.playerName) return props.run.start.playerName
  return '你'
})

const fateLabel = computed(() => {
  if (!props.run) return ''
  return formatPrimaryFateLabel(props.run.primaryFate)
})

const fateBadgeModifier = computed(() => {
  if (!props.run) return null
  return badgeModifierForFate(props.run.primaryFate)
})

const weekLine = computed(() => {
  if (!props.run || props.run.runMode !== 'chapter') return ''
  const week = props.run.chapter?.chapterWeekIndex
  if (week == null || week < 0) return ''
  return `第 ${week} 周`
})

function badgeModifierForFate(fate: PrimaryFate): string | null {
  if (fate === 'human' || fate === 'indentured') return 'human'
  if (fate === 'mortgaged') return 'mortgaged'
  if (fate === 'head_jar') return 'head-jar'
  return null
}

function handleClick() {
  emit('click')
}
</script>

<template>
  <div
    class="PlaySlotSummaryCard"
    :class="{
      'PlaySlotSummaryCard--empty': !run,
      'PlaySlotSummaryCard--active': isActive
    }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div v-if="run" class="PlaySlotSummaryCard__content">
      <div class="PlaySlotSummaryCard__header">
        <span class="PlaySlotSummaryCard__title">{{ displayName }}</span>
        <span
          v-if="fateBadgeModifier"
          class="IndexPage__slotFateBadge"
          :class="`IndexPage__slotFateBadge--${fateBadgeModifier}`"
        >
          {{ fateLabel }}
        </span>
        <span v-else-if="fateLabel" class="PlaySlotSummaryCard__fateFallback">
          {{ fateLabel }}
        </span>
        <span v-if="isActive" class="PlaySlotSummaryCard__activeBadge">当前</span>
      </div>
      <p v-if="weekLine" class="PlaySlotSummaryCard__week">{{ weekLine }}</p>
      <p class="PlaySlotSummaryCard__slotId">{{ slotId }}</p>
    </div>

    <div v-else class="PlaySlotSummaryCard__empty">
      <span class="PlaySlotSummaryCard__emptyIcon" aria-hidden="true">+</span>
      <span class="PlaySlotSummaryCard__emptyText">新建游戏</span>
    </div>

    <div class="PlaySlotSummaryCard__action" aria-hidden="true">
      <span class="PlaySlotSummaryCard__chevron">›</span>
    </div>
  </div>
</template>

<style scoped>
.PlaySlotSummaryCard {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-default);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  cursor: pointer;
  transition:
    border-color 0.25s ease,
    transform 0.25s ease,
    box-shadow 0.25s ease;
  min-height: 96px;
  box-sizing: border-box;
}

.PlaySlotSummaryCard:hover {
  border-color: rgba(0, 255, 255, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
}

.PlaySlotSummaryCard--active {
  border-color: rgba(56, 248, 208, 0.5);
  box-shadow:
    inset 3px 0 0 0 rgba(56, 248, 208, 0.7),
    0 4px 16px rgba(56, 248, 208, 0.12);
}

.PlaySlotSummaryCard--empty {
  border-style: dashed;
  opacity: 0.65;
}

.PlaySlotSummaryCard--empty:hover {
  opacity: 1;
}

.PlaySlotSummaryCard__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.PlaySlotSummaryCard__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.PlaySlotSummaryCard__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.PlaySlotSummaryCard__fateFallback {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.PlaySlotSummaryCard__activeBadge {
  font-family: var(--mono);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(56, 248, 208, 0.15);
  color: var(--neon-cyan);
  letter-spacing: 0.04em;
}

.PlaySlotSummaryCard__week {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.PlaySlotSummaryCard__slotId {
  margin: 0;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

.PlaySlotSummaryCard__empty {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.PlaySlotSummaryCard__emptyIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  font-size: var(--text-lg);
  color: var(--text-muted);
}

.PlaySlotSummaryCard__emptyText {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.PlaySlotSummaryCard__action {
  flex-shrink: 0;
  padding-left: 8px;
}

.PlaySlotSummaryCard__chevron {
  font-size: var(--text-lg);
  color: var(--text-muted);
  opacity: 0.6;
}

.PlaySlotSummaryCard:hover .PlaySlotSummaryCard__chevron {
  opacity: 1;
}
</style>
