<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <span v-if="loading" class="ButtonSpinner"></span>
    <span v-if="icon && !loading" class="ButtonIcon">{{ icon }}</span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
  fullWidth?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: []
}>()

const buttonClasses = computed(() => [
  'Button',
  `Button--${props.variant}`,
  `Button--${props.size}`,
  {
    'Button--fullWidth': props.fullWidth,
    'Button--loading': props.loading
  }
])

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}
</script>

<style scoped>
.Button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: var(--mono);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: transform 0.08s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.Button:focus-visible {
  box-shadow: 0 0 0 3px rgba(56, 248, 208, 0.25);
}

.Button:active:not(:disabled) {
  transform: translateY(1px);
}

.Button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Sizes */
.Button--sm {
  height: 32px;
  padding: 0 12px;
  font-size: var(--text-sm);
}

.Button--md {
  height: 40px;
  padding: 0 14px;
  font-size: var(--text-base);
}

.Button--lg {
  height: 48px;
  padding: 0 18px;
  font-size: var(--text-lg);
}

/* Variants */
.Button--secondary {
  background: rgba(255, 255, 255, 0.03);
}

.Button--secondary:hover:not(:disabled) {
  border-color: rgba(56, 248, 208, 0.35);
  background: rgba(56, 248, 208, 0.06);
}

.Button--primary {
  border-color: rgba(56, 248, 208, 0.35);
  background: linear-gradient(180deg, rgba(56, 248, 208, 0.18), rgba(56, 248, 208, 0.08));
}

.Button--primary:hover:not(:disabled) {
  border-color: rgba(56, 248, 208, 0.5);
  background: linear-gradient(180deg, rgba(56, 248, 208, 0.24), rgba(56, 248, 208, 0.12));
}

.Button--danger {
  border-color: rgba(255, 59, 59, 0.35);
  background: linear-gradient(180deg, rgba(255, 59, 59, 0.16), rgba(255, 59, 59, 0.06));
}

.Button--danger:hover:not(:disabled) {
  border-color: rgba(255, 59, 59, 0.5);
  background: linear-gradient(180deg, rgba(255, 59, 59, 0.22), rgba(255, 59, 59, 0.10));
}

.Button--ghost {
  background: transparent;
}

.Button--ghost:hover:not(:disabled) {
  border-color: rgba(124, 92, 255, 0.35);
  background: rgba(124, 92, 255, 0.06);
}

/* Full Width */
.Button--fullWidth {
  width: 100%;
}

/* Loading State */
.ButtonSpinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ButtonIcon {
  display: inline-flex;
  font-size: 1.1em;
}

/* Mobile Responsive Adjustments */
@media (max-width: 767px) {
  .Button {
    /* Ensure minimum touch target size of 44x44px */
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }
  
  .Button--sm {
    height: 44px;
    padding: 0 14px;
    font-size: 13px;
  }
  
  .Button--md {
    height: 44px;
    padding: 0 16px;
    font-size: 13px;
  }
  
  .Button--lg {
    height: 48px;
    padding: 0 20px;
    font-size: var(--text-base);
  }
}
</style>
