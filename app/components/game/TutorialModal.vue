<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import Button from '~/components/ui/Button.vue'

interface Props {
  isOpen: boolean
  currentStep: {
    id: string
    title: string
    content: string
  } | null
  currentIndex: number
  totalSteps: number
  progress: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  next: []
  prev: []
  skip: []
  close: []
}>()

const isFirst = computed(() => props.currentIndex === 0)
const isLast = computed(() => props.currentIndex === props.totalSteps - 1)

const stepDots = computed(() => {
  return Array.from({ length: props.totalSteps }, (_, i) => i)
})

function onNext() {
  emit('next')
}

function onPrev() {
  emit('prev')
}

function onSkip() {
  emit('skip')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div v-if="isOpen && currentStep" class="TutorialOverlay" @click.self="onSkip">
        <div class="TutorialModal">
          <div class="TutorialModal__header">
            <span class="TutorialModal__step-badge">第 {{ currentIndex + 1 }} / {{ totalSteps }} 步</span>
            <button class="TutorialModal__close" @click="onSkip" aria-label="关闭教程">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="TutorialModal__progress">
            <div class="TutorialModal__progress-bar" :style="{ width: progress + '%' }" />
          </div>

          <div class="TutorialModal__content">
            <h3 class="TutorialModal__title">{{ currentStep.title }}</h3>
            <p class="TutorialModal__text">{{ currentStep.content }}</p>
          </div>

          <div class="TutorialModal__dots">
            <span
              v-for="i in stepDots"
              :key="i"
              class="TutorialModal__dot"
              :class="{ 'TutorialModal__dot--active': i === currentIndex }"
            />
          </div>

          <div class="TutorialModal__actions">
            <Button
              v-if="!isFirst"
              variant="ghost"
              size="sm"
              @click="onPrev"
            >
              上一步
            </Button>
            <div class="TutorialModal__spacer" />
            <Button
              variant="secondary"
              size="sm"
              @click="onSkip"
            >
              跳过教程
            </Button>
            <Button
              variant="primary"
              size="sm"
              @click="onNext"
            >
              {{ isLast ? '完成' : '下一步' }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.TutorialOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.TutorialModal {
  width: 90%;
  max-width: 420px;
  background: var(--bg-elevated, #1a1a2e);
  border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.TutorialModal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
}

.TutorialModal__step-badge {
  font-size: var(--text-xs, 12px);
  color: var(--text-muted, #888);
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  padding: 4px 10px;
  border-radius: 20px;
}

.TutorialModal__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.TutorialModal__close:hover {
  background: var(--bg-secondary, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #fff);
}

.TutorialModal__close svg {
  width: 16px;
  height: 16px;
}

.TutorialModal__progress {
  height: 3px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.1));
  margin-top: 12px;
}

.TutorialModal__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-cyan, #00f5d4), var(--neon-purple, #9b5de5));
  transition: width 0.3s ease;
}

.TutorialModal__content {
  padding: 24px 24px 16px;
}

.TutorialModal__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin: 0 0 12px;
}

.TutorialModal__text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #bbb);
  margin: 0;
}

.TutorialModal__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
}

.TutorialModal__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.15));
  transition: all 0.2s;
}

.TutorialModal__dot--active {
  background: var(--neon-cyan, #00f5d4);
  box-shadow: 0 0 8px var(--neon-cyan, #00f5d4);
}

.TutorialModal__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border-default, rgba(255, 255, 255, 0.06));
}

.TutorialModal__spacer {
  flex: 1;
}

.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.25s ease;
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}

.tutorial-fade-enter-active .TutorialModal,
.tutorial-fade-leave-active .TutorialModal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.tutorial-fade-enter-from .TutorialModal,
.tutorial-fade-leave-to .TutorialModal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
