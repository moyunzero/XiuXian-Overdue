<template>
  <div class="QuickStartButton">
    <button
      class="QuickStartButton__btn"
      :class="{ 'QuickStartButton__btn--loading': loading }"
      :disabled="disabled || loading"
      @click="handleClick"
      @mousedown="onPress"
      @mouseup="onRelease"
      @mouseleave="onRelease"
      @touchstart.passive="onPress"
      @touchend.passive="onRelease"
    >
      <span class="QuickStartButton__ripple" :style="rippleStyle" />
      <span class="QuickStartButton__content">
        <svg v-if="!loading" class="QuickStartButton__icon" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span v-if="loading" class="QuickStartButton__spinner" />
        <span class="QuickStartButton__text">{{ loading ? '进入中...' : text }}</span>
      </span>
    </button>
    <p v-if="subtitle" class="QuickStartButton__subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  text?: string
  subtitle?: string
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '开始这局',
  subtitle: '',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const isPressed = ref(false)
const rippleStyle = computed(() => {
  if (!isPressed.value) return { opacity: 0, scale: 0 }
  return {
    opacity: 1,
    transform: 'scale(1)'
  }
})

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}

const onPress = () => {
  isPressed.value = true
}

const onRelease = () => {
  isPressed.value = false
}
</script>

<style scoped>
.QuickStartButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.QuickStartButton__btn {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 320px;
  height: 56px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 255, 0.2) 0%,
    rgba(168, 85, 247, 0.2) 100%
  );
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.QuickStartButton__btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  transition: border-color 0.2s ease;
}

.QuickStartButton__btn:hover:not(:disabled)::before {
  border-color: rgba(0, 255, 255, 0.7);
}

.QuickStartButton__btn:active:not(:disabled) {
  transform: scale(0.98);
}

.QuickStartButton__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.QuickStartButton__ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    rgba(0, 255, 255, 0.3) 0%,
    transparent 70%
  );
  opacity: 0;
  transform: scale(0);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.QuickStartButton__btn:active .QuickStartButton__ripple {
  opacity: 1;
  transform: scale(1);
}

.QuickStartButton__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
}

.QuickStartButton__icon {
  width: 20px;
  height: 20px;
  color: var(--neon-cyan);
  filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.5));
}

.QuickStartButton__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-top-color: var(--neon-cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.QuickStartButton__text {
  font-family: var(--mono);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.QuickStartButton__subtitle {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .QuickStartButton__ripple {
    display: none;
  }

  .QuickStartButton__spinner {
    animation: none;
    border-color: var(--neon-cyan);
    border-right-color: transparent;
  }
}

@media (max-width: 640px) {
  .QuickStartButton__btn {
    height: 52px;
    max-width: 280px;
  }

  .QuickStartButton__text {
    font-size: var(--text-base);
  }
}
</style>
