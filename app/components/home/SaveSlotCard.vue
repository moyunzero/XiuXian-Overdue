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
        <span v-if="isActive" class="SaveSlotCard__active-badge">
          <svg class="SaveSlotCard__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          当前
        </span>
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
          <div class="SaveSlotCard__debt-info">
            <span class="SaveSlotCard__debt-label">现金</span>
            <span class="SaveSlotCard__debt-value SaveSlotCard__debt-value--cash">
              ¥{{ slot.cash.toLocaleString() }}
            </span>
          </div>
          <div class="SaveSlotCard__debt-info">
            <span class="SaveSlotCard__debt-label">债务</span>
            <span class="SaveSlotCard__debt-value SaveSlotCard__debt-value--debt">
              ¥{{ slot.debt.toLocaleString() }}
            </span>
          </div>
        </div>
        <div class="SaveSlotCard__progress">
          <div
            class="SaveSlotCard__progress-fill"
            :style="{ width: debtPressure + '%' }"
          />
        </div>
      </div>
    </div>

    <div v-else class="SaveSlotCard__empty">
      <div class="SaveSlotCard__empty-icon-wrapper">
        <svg class="SaveSlotCard__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
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
  width: 100%;
  min-width: 0;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--border-default);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  cursor: pointer;
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  min-height: 130px;
}

.SaveSlotCard:hover {
  border-color: rgba(0, 255, 255, 0.35);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.SaveSlotCard:active {
  transform: translateY(-1px);
}

.SaveSlotCard--active {
  border-color: rgba(56, 248, 208, 0.5);
  box-shadow: 
    inset 3px 0 0 0 rgba(56, 248, 208, 0.7),
    0 4px 16px rgba(56, 248, 208, 0.15);
}

.SaveSlotCard--danger {
  border-color: rgba(255, 59, 59, 0.35);
  background: linear-gradient(
    180deg,
    rgba(255, 59, 59, 0.06) 0%,
    rgba(255, 59, 59, 0.02) 100%
  );
}

.SaveSlotCard--warning {
  border-color: rgba(255, 210, 74, 0.35);
  background: linear-gradient(
    180deg,
    rgba(255, 210, 74, 0.06) 0%,
    rgba(255, 210, 74, 0.02) 100%
  );
}

.SaveSlotCard--empty {
  border-style: dashed;
  opacity: 0.6;
}

.SaveSlotCard--empty:hover {
  opacity: 1;
  border-color: rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.03);
}

.SaveSlotCard__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  letter-spacing: 0.3px;
}

.SaveSlotCard__active-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(56, 248, 208, 0.15);
  color: var(--neon-cyan);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.SaveSlotCard__badge-icon {
  width: 12px;
  height: 12px;
}

.SaveSlotCard__stats {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
}

.SaveSlotCard__stat {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.SaveSlotCard__stat-value {
  font-size: var(--text-xl);
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text-primary);
  line-height: 1;
}

.SaveSlotCard__stat-value--tier {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.SaveSlotCard__stat-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 400;
}

.SaveSlotCard__divider {
  width: 1px;
  height: 20px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--border-default) 50%,
    transparent 100%
  );
}

.SaveSlotCard__debt-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.SaveSlotCard__debt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.SaveSlotCard__debt-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.SaveSlotCard__debt-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.SaveSlotCard__debt-value {
  font-size: var(--text-sm);
  font-family: var(--mono);
  font-weight: 600;
}

.SaveSlotCard__debt-value--cash {
  color: var(--neon-cyan);
}

.SaveSlotCard__debt-value--debt {
  color: var(--danger);
  text-align: right;
}

.SaveSlotCard__progress {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-top: 2px;
}

.SaveSlotCard__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta));
  transition: width 0.4s ease;
}

.SaveSlotCard--danger .SaveSlotCard__progress-fill {
  background: linear-gradient(90deg, var(--warning), var(--danger));
}

.SaveSlotCard--warning .SaveSlotCard__progress-fill {
  background: linear-gradient(90deg, var(--neon-cyan), var(--warning));
}

.SaveSlotCard__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 0;
}

.SaveSlotCard__empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.SaveSlotCard__empty-icon {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
  opacity: 0.6;
}

.SaveSlotCard__empty-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-weight: 500;
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
    padding: 14px 16px;
    min-height: 110px;
    border-radius: 14px;
  }

  .SaveSlotCard__action svg {
    opacity: 1;
    transform: none;
  }

  .SaveSlotCard__stat-value {
    font-size: var(--text-lg);
  }
}

@media (max-width: 480px) {
  .SaveSlotCard {
    padding: 12px 14px;
    min-height: 100px;
  }
  
  .SaveSlotCard__stats {
    gap: 10px;
  }
  
  .SaveSlotCard__debt-row {
    gap: 8px;
  }
}
</style>
