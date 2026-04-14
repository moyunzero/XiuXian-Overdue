<template>
  <div class="IdentitySelector">
    <div class="IdentitySelector__header">
      <span class="IdentitySelector__label">选择你的身份</span>
    </div>
    <div
      ref="scrollContainer"
      class="IdentitySelector__scroll"
      @scroll="onScroll"
    >
      <div
        v-for="identity in identities"
        :key="identity.value"
        class="IdentityCard"
        :class="{ 'IdentityCard--selected': modelValue === identity.value }"
        role="button"
        tabindex="0"
        :aria-pressed="modelValue === identity.value"
        @click="select(identity.value)"
        @keydown.enter="select(identity.value)"
        @keydown.space.prevent="select(identity.value)"
      >
        <div class="IdentityCard__glow" />
        <div class="IdentityCard__content">
          <div class="IdentityCard__header">
            <span class="IdentityCard__name">{{ identity.name }}</span>
            <span v-if="identity.badge" class="IdentityCard__badge">
              {{ identity.badge }}
            </span>
          </div>
          <div class="IdentityCard__cash">
            <span class="IdentityCard__cash-label">初始现金</span>
            <span class="IdentityCard__cash-value">¥{{ identity.cash.toLocaleString() }}</span>
          </div>
          <p class="IdentityCard__desc">{{ identity.description }}</p>
        </div>
        <div class="IdentityCard__indicator">
          <svg v-if="modelValue === identity.value" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    </div>
    <div class="IdentitySelector__dots">
      <span
        v-for="(_, index) in identities"
        :key="index"
        class="IdentitySelector__dot"
        :class="{ 'IdentitySelector__dot--active': activeIndex === index }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Background } from '~/types/game'

interface Identity {
  value: Background
  name: string
  cash: number
  description: string
  badge?: string
}

const props = defineProps<{
  modelValue: Background
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Background]
}>()

const identities: Identity[] = [
  {
    value: '贫民',
    name: '贫民',
    cash: 800,
    description: '现金紧，利率高，靠命卷。',
    badge: 'hard'
  },
  {
    value: '中产',
    name: '中产',
    cash: 3200,
    description: '现金一般，利率中等，容错稍高。'
  },
  {
    value: '富户',
    name: '富户',
    cash: 12000,
    description: '现金充足，利率更低，但你依旧会被分数定义。',
    badge: 'rich'
  }
]

const scrollContainer = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

const select = (value: Background) => {
  emit('update:modelValue', value)
}

const onScroll = () => {
  if (!scrollContainer.value) return
  const { scrollLeft, clientWidth } = scrollContainer.value
  activeIndex.value = Math.round(scrollLeft / clientWidth)
}

defineExpose({
  scrollTo: (index: number) => {
    if (!scrollContainer.value) return
    scrollContainer.value.scrollTo({
      left: index * scrollContainer.value.clientWidth,
      behavior: 'smooth'
    })
  }
})
</script>

<style scoped>
.IdentitySelector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.IdentitySelector__header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.IdentitySelector__label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.IdentitySelector__scroll {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 8px 0 16px;
}

.IdentityCard {
  scroll-snap-align: center;
  position: relative;
  border-radius: 16px;
  border: 1px solid var(--border-default);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  backdrop-filter: blur(10px);
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.IdentityCard:hover {
  border-color: rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.IdentityCard--selected {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.IdentityCard__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 100% 100% at 50% 0%,
    rgba(0, 255, 255, 0.1) 0%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.IdentityCard--selected .IdentityCard__glow {
  opacity: 1;
}

.IdentityCard__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.IdentityCard__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.IdentityCard__name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.IdentityCard__badge {
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 59, 59, 0.2);
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.IdentityCard__cash {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.IdentityCard__cash-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.IdentityCard__cash-value {
  font-size: var(--text-xl);
  font-weight: 600;
  font-family: var(--mono);
  color: var(--neon-cyan);
}

.IdentityCard__desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.IdentityCard__indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.IdentityCard--selected .IdentityCard__indicator {
  border-color: var(--neon-cyan);
  background: var(--neon-cyan);
}

.IdentityCard__indicator svg {
  width: 14px;
  height: 14px;
  color: var(--bg-primary);
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.IdentityCard--selected .IdentityCard__indicator svg {
  opacity: 1;
  transform: scale(1);
}

.IdentitySelector__dots {
  display: none;
  justify-content: center;
  gap: 6px;
}

.IdentitySelector__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-default);
  transition: background 0.2s ease, transform 0.2s ease;
}

.IdentitySelector__dot--active {
  background: var(--neon-cyan);
  transform: scale(1.2);
}

@media (max-width: 768px) {
  .IdentitySelector__scroll {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 8px 4px 16px;
    margin: -8px -4px -16px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .IdentitySelector__scroll::-webkit-scrollbar {
    display: none;
  }

  .IdentityCard {
    flex: 0 0 80%;
  }

  .IdentitySelector__dots {
    display: flex;
  }

  .IdentityCard__name {
    font-size: var(--text-base);
  }

  .IdentityCard__cash-value {
    font-size: var(--text-lg);
  }
}
</style>
