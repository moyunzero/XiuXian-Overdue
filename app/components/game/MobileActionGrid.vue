<template>
  <div class="MobileActionGrid">
    <button
      v-for="action in actions"
      :key="action.id"
      class="MobileActionGrid__btn"
      :class="[
        `MobileActionGrid__btn--${action.variant}`,
        { 'MobileActionGrid__btn--disabled': disabled }
      ]"
      :disabled="disabled"
      @click="emit('action', action.id)"
    >
      <span class="MobileActionGrid__label">{{ action.label }}</span>
      <span v-if="action.description" class="MobileActionGrid__desc">
        {{ action.description }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ActionId } from '~/types/game'

interface ActionEntry {
  id: ActionId
  label: string
  variant: 'primary' | 'secondary'
  description?: string
}

interface Props {
  actions: ActionEntry[]
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  action: [actionId: ActionId]
}>()
</script>

<style scoped>
.MobileActionGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
}

.MobileActionGrid__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 64px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-default);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.1s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.MobileActionGrid__btn:active:not(:disabled) {
  transform: scale(0.97);
}

.MobileActionGrid__btn--primary {
  border-color: rgba(0, 255, 255, 0.3);
  background: linear-gradient(
    180deg,
    rgba(0, 255, 255, 0.1) 0%,
    rgba(0, 255, 255, 0.05) 100%
  );
}

.MobileActionGrid__btn--primary:active:not(:disabled) {
  border-color: rgba(0, 255, 255, 0.5);
  background: linear-gradient(
    180deg,
    rgba(0, 255, 255, 0.15) 0%,
    rgba(0, 255, 255, 0.08) 100%
  );
}

.MobileActionGrid__btn--secondary {
  border-color: rgba(255, 255, 255, 0.1);
}

.MobileActionGrid__btn--secondary:active:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
}

.MobileActionGrid__btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.MobileActionGrid__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.MobileActionGrid__desc {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  display: none;
}

@media (max-width: 400px) {
  .MobileActionGrid {
    gap: 8px;
  }

  .MobileActionGrid__btn {
    min-height: 56px;
    padding: 10px 12px;
  }

  .MobileActionGrid__label {
    font-size: var(--text-xs);
  }
}
</style>
