<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    @click="handleClick"
    @pointerdown="handlePointerDown"
  >
    <span v-if="loading" class="ButtonSpinner"></span>
    <span v-if="icon && !loading" class="ButtonIcon">{{ icon }}</span>
    <slot />
    <span v-if="ripples.length" class="ButtonRipples">
      <span
        v-for="ripple in ripples"
        :key="ripple.id"
        class="ButtonRipple"
        :style="ripple.style"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

interface Ripple {
  id: number
  style: string
}

const ripples = ref<Ripple[]>([])
let rippleId = 0

const buttonClasses = computed(() => [
  'Button',
  `Button--${props.variant}`,
  `Button--${props.size}`,
  {
    'Button--fullWidth': props.fullWidth,
    'Button--loading': props.loading
  }
])

const handlePointerDown = (e: PointerEvent) => {
  if (props.disabled || props.loading) return
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  const id = ++rippleId
  ripples.value.push({
    id,
    style: `width:${size}px;height:${size}px;left:${x}px;top:${y}px`
  })

  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 600)
}

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}
</script>

<style scoped>
.Button {
  position: relative;
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
  overflow: hidden;
  touch-action: manipulation;
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

/* Sizes — Phase 5（SAVE-03）：触控目标底线 40px（D-14） */
.Button--sm {
  min-height: 40px;
  height: auto;
  padding: 8px 12px;
  font-size: var(--text-sm);
}

.Button--md {
  min-height: 40px;
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

/* Ripple Effect */
.ButtonRipples {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.ButtonRipple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0);
  animation: ripple 0.6s ease-out forwards;
}

@keyframes ripple {
  to {
    transform: scale(2.5);
    opacity: 0;
  }
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
