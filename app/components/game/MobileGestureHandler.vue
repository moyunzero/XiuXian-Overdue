<template>
  <div
    class="GestureHandler"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <slot />
  </div>

  <Transition name="swipe-hint">
    <div v-if="showSwipeHint" class="SwipeHint">
      <div class="SwipeHint__content">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span>释放返回首页</span>
      </div>
      <div class="SwipeHint__progress" :style="{ width: `${progress * 100}%` }" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { navigateTo } from '#app'
import { useMobileState } from '~/composables/useMobileState'

interface Props {
  enabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true
})

const emit = defineEmits<{
  swipeStart: []
  swipeEnd: []
  swipeCancel: []
}>()

const {
  gesture,
  swipeProgress,
  shouldShowSwipeHint,
  shouldExecuteSwipe,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd: mobileHandleTouchEnd,
  resetGesture
} = useMobileState()

const showSwipeHint = computed(() => props.enabled && shouldShowSwipeHint.value)
const progress = computed(() => swipeProgress.value)

function onTouchStart(e: TouchEvent) {
  if (!props.enabled) return
  handleTouchStart(e)
  emit('swipeStart')
}

function onTouchMove(e: TouchEvent) {
  if (!props.enabled) return
  handleTouchMove(e)
}

function onTouchEnd() {
  if (!props.enabled) return

  if (shouldExecuteSwipe.value) {
    emit('swipeEnd')
    navigateTo('/')
  } else {
    emit('swipeCancel')
  }

  mobileHandleTouchEnd()
  resetGesture()
}
</script>

<style scoped>
.GestureHandler {
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}

.SwipeHint {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  pointer-events: none;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0) 100%
  );
}

.SwipeHint__content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #E8ECF6);
  font-size: var(--text-sm, 12px);
}

.SwipeHint__content svg {
  width: 20px;
  height: 20px;
  animation: pulse 1s ease-in-out infinite;
}

.SwipeHint__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--neon-cyan, #00FFFF);
  transition: width 0.05s linear;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.swipe-hint-enter-active,
.swipe-hint-leave-active {
  transition: opacity 0.2s ease;
}

.swipe-hint-enter-from,
.swipe-hint-leave-to {
  opacity: 0;
}
</style>
