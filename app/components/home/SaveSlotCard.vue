<template>
  <div
    class="SaveSlotCard"
    :class="{
      'SaveSlotCard--empty': !slot,
      'SaveSlotCard--active': isActive,
      'SaveSlotCard--danger': isDanger,
      'SaveSlotCard--warning': isWarning
    }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div v-if="slot" class="SaveSlotCard__content">
      <div class="SaveSlotCard__header">
        <span class="SaveSlotCard__title">{{ title }}</span>
        <span v-if="isActive" class="SaveSlotCard__active-badge">当前</span>
      </div>

      <div class="SaveSlotCard__stats">
        <div class="SaveSlotCard__stat">
          <span class="SaveSlotCard__stat-value">{{ slot.day }}</span>
          <span class="SaveSlotCard__stat-label">天</span>
        </div>
        <div class="SaveSlotCard__divider" />
        <div class="SaveSlotCard__stat">
          <span class="SaveSlotCard__stat-value SaveSlotCard__stat-value--tier">
            {{ slot.tier }}
          </span>
          <span class="SaveSlotCard__stat-label">班级</span>
        </div>
      </div>

      <div class="SaveSlotCard__debt-section">
        <div class="SaveSlotCard__debt-row">
          <span class="SaveSlotCard__debt-label">现金</span>
          <span class="SaveSlotCard__debt-value SaveSlotCard__debt-value--cash">
            ¥{{ slot.cash.toLocaleString() }}
          </span>
        </div>
        <div class="SaveSlotCard__debt-row">
          <span class="SaveSlotCard__debt-label">债务</span>
          <span class="SaveSlotCard__debt-value SaveSlotCard__debt-value--debt">
            ¥{{ slot.debt.toLocaleString() }}
          </span>
        </div>
        <div class="SaveSlotCard__progress">
          <div
            class="SaveSlotCard__progress-fill"
            :style="{ width: debtPressure + '%' }"
          />
        </div>
        <span class="SaveSlotCard__pressure-label">
          压力 {{ debtPressure }}%
        </span>
      </div>
    </div>

    <div v-else class="SaveSlotCard__empty">
      <svg class="SaveSlotCard__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      <span class="SaveSlotCard__empty-text">新建游戏</span>
    </div>

    <div class="SaveSlotCard__action">
      <svg v-if="slot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SaveSlotMeta {
  day: number
  tier: string
  cash: number
  debt: number
}

interface Props {
  slot: SaveSlotMeta | null
  title: string
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<{
  click: []
}>()

const debtPressure = computed(() => {
  if (!props.slot) return 0
  const ratio = props.slot.debt / Math.max(props.slot.cash, 1)
  return Math.min(100, Math.round(ratio * 20))
})

const isDanger = computed(() => debtPressure.value >= 80)
const isWarning = computed(() => debtPressure.value >= 50 && debtPressure.value < 80)

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.SaveSlotCard {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-default);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 120px;
}

.SaveSlotCard:hover {
  border-color: rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.SaveSlotCard--active {
  border-color: rgba(56, 248, 208, 0.4);
  box-shadow: inset 3px 0 0 0 rgba(56, 248, 208, 0.6);
}

.SaveSlotCard--danger {
  border-color: rgba(255, 59, 59, 0.3);
  background: linear-gradient(
    180deg,
    rgba(255, 59, 59, 0.05) 0%,
    rgba(255, 59, 59, 0.02) 100%
  );
}

.SaveSlotCard--warning {
  border-color: rgba(255, 210, 74, 0.3);
  background: linear-gradient(
    180deg,
    rgba(255, 210, 74, 0.05) 0%,
    rgba(255, 210, 74, 0.02) 100%
  );
}

.SaveSlotCard--empty {
  border-style: dashed;
  opacity: 0.7;
}

.SaveSlotCard--empty:hover {
  opacity: 1;
}

.SaveSlotCard__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.SaveSlotCard__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.SaveSlotCard__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.SaveSlotCard__active-badge {
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(56, 248, 208, 0.2);
  color: var(--neon-cyan);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.SaveSlotCard__stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.SaveSlotCard__stat {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.SaveSlotCard__stat-value {
  font-size: var(--text-lg);
  font-weight: 600;
  font-family: var(--mono);
  color: var(--text-primary);
}

.SaveSlotCard__stat-value--tier {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.SaveSlotCard__stat-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.SaveSlotCard__divider {
  width: 1px;
  height: 16px;
  background: var(--border-default);
}

.SaveSlotCard__debt-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.SaveSlotCard__debt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.SaveSlotCard__debt-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.SaveSlotCard__debt-value {
  font-size: var(--text-xs);
  font-family: var(--mono);
  font-weight: 500;
}

.SaveSlotCard__debt-value--cash {
  color: var(--text-secondary);
}

.SaveSlotCard__debt-value--debt {
  color: var(--danger);
}

.SaveSlotCard__progress {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-top: 4px;
}

.SaveSlotCard__progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta));
  transition: width 0.3s ease;
}

.SaveSlotCard--danger .SaveSlotCard__progress-fill {
  background: linear-gradient(90deg, var(--warning), var(--danger));
}

.SaveSlotCard__pressure-label {
  font-size: 10px;
  color: var(--text-muted);
  text-align: right;
}

.SaveSlotCard__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.SaveSlotCard__empty-icon {
  width: 32px;
  height: 32px;
  color: var(--text-muted);
  opacity: 0.5;
}

.SaveSlotCard__empty-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.SaveSlotCard__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 24px;
}

.SaveSlotCard__action svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.SaveSlotCard:hover .SaveSlotCard__action svg {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 640px) {
  .SaveSlotCard {
    padding: 12px 14px;
    min-height: 100px;
  }

  .SaveSlotCard__action svg {
    opacity: 1;
    transform: none;
  }
}
</style>
