<template>
  <div
    :class="cardClasses"
    :style="glowStyle"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CardProps {
  variant?: 'default' | 'glass' | 'elevated' | 'danger' | 'success'
  padding?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  glowColor?: string
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  padding: 'md',
  hoverable: false,
  clickable: false
})

const emit = defineEmits<{
  click: []
}>()

const cardClasses = computed(() => [
  'Card',
  `Card--${props.variant}`,
  `Card--padding-${props.padding}`,
  {
    'Card--hoverable': props.hoverable,
    'Card--clickable': props.clickable
  }
])

const glowStyle = computed(() => {
  if (props.glowColor) {
    return {
      '--glow-color': props.glowColor
    }
  }
  return {}
})

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.Card {
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

/* Variants */
.Card--default {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(10px);
}

.Card--glass {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  backdrop-filter: blur(16px);
}

.Card--elevated {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.Card--danger {
  background: linear-gradient(180deg, rgba(255, 59, 59, 0.08), rgba(255, 59, 59, 0.03));
  backdrop-filter: blur(10px);
  border-color: rgba(255, 59, 59, 0.25);
}

.Card--success {
  background: linear-gradient(180deg, rgba(68, 255, 154, 0.08), rgba(68, 255, 154, 0.03));
  backdrop-filter: blur(10px);
  border-color: rgba(68, 255, 154, 0.25);
}

/* Padding */
.Card--padding-sm {
  padding: var(--space-3);
}

.Card--padding-md {
  padding: var(--card-padding);
}

.Card--padding-lg {
  padding: var(--space-6);
}

/* Interactive States */
.Card--hoverable:hover {
  border-color: rgba(56, 248, 208, 0.35);
  transform: translateY(-2px);
}

.Card--clickable {
  cursor: pointer;
}

.Card--clickable:hover {
  border-color: rgba(124, 92, 255, 0.4);
}

.Card--clickable:active {
  transform: translateY(1px);
}

/* Glow Effect */
.Card[style*="--glow-color"]:hover {
  box-shadow: 0 0 24px var(--glow-color, rgba(56, 248, 208, 0.3));
}

/* Mobile Responsive Adjustments */
@media (max-width: 767px) {
  .Card {
    border-radius: 14px;
  }
  
  /* Reduce backdrop-filter for performance on mobile */
  .Card--default,
  .Card--elevated,
  .Card--danger,
  .Card--success {
    backdrop-filter: blur(4px);
  }
  
  .Card--glass {
    backdrop-filter: blur(6px);
  }
  
  /* Adjust padding for mobile */
  .Card--padding-sm {
    padding: var(--space-2);
  }
  
  .Card--padding-md {
    padding: 14px;
  }
  
  .Card--padding-lg {
    padding: var(--space-5);
  }
  
  /* Simplify hover effects on mobile */
  .Card--hoverable:hover {
    transform: none;
  }
  
  /* Touch-friendly clickable cards */
  .Card--clickable {
    touch-action: manipulation;
  }
}
</style>
