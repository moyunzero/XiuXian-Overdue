<template>
  <div
    class="SwipeableCard"
    :class="{ 'SwipeableCard--swiped': isSwiped }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="SwipeableCard__actions">
      <button
        class="SwipeableCard__action SwipeableCard__action--delete"
        @click="handleDelete"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>删除</span>
      </button>
    </div>

    <div
      class="SwipeableCard__content"
      :style="{ transform: `translateX(-${offset}px)` }"
    >
      <slot />
    </div>

    <Transition name="confirm">
      <div v-if="showConfirm" class="SwipeableCard__confirm">
        <div class="SwipeableCard__confirmContent">
          <p class="SwipeableCard__confirmText">确认删除此存档？</p>
          <div class="SwipeableCard__confirmActions">
            <button
              class="SwipeableCard__confirmBtn SwipeableCard__confirmBtn--cancel"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="SwipeableCard__confirmBtn SwipeableCard__confirmBtn--delete"
              @click="confirmDelete"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  threshold?: number
  autoClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 50,
  autoClose: true
})

const emit = defineEmits<{
  delete: []
}>()

const offset = ref(0)
const isSwiped = ref(false)
const showConfirm = ref(false)

let startX = 0
let currentX = 0
let isSwiping = false

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return

  startX = touch.clientX
  currentX = touch.clientX
  isSwiping = true
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping) return

  const touch = e.touches[0]
  if (!touch) return

  currentX = touch.clientX
  const delta = currentX - startX

  if (delta < 0) {
    offset.value = Math.min(Math.abs(delta), 100)
  } else {
    offset.value = 0
  }
}

function onTouchEnd() {
  isSwiping = false

  if (offset.value >= props.threshold) {
    isSwiped.value = true
    offset.value = 80

    if (props.autoClose) {
      setTimeout(() => {
        resetCard()
      }, 3000)
    }
  } else {
    resetCard()
  }
}

function handleDelete() {
  showConfirm.value = true
  resetCard()
}

function cancelDelete() {
  showConfirm.value = false
  resetCard()
}

function confirmDelete() {
  showConfirm.value = false
  emit('delete')
  resetCard()
}

function resetCard() {
  offset.value = 0
  isSwiped.value = false
}
</script>

<style scoped>
.SwipeableCard {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  touch-action: pan-y;
}

.SwipeableCard__actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 59, 59, 0.9);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.SwipeableCard--swiped .SwipeableCard__actions {
  opacity: 1;
  pointer-events: auto;
}

.SwipeableCard__action--delete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 12px;
}

.SwipeableCard__action--delete svg {
  width: 20px;
  height: 20px;
}

.SwipeableCard__action--delete span {
  font-size: 10px;
}

.SwipeableCard__content {
  position: relative;
  background: var(--bg-tertiary, #0A0E27);
  transition: transform 0.2s ease;
  z-index: 1;
}

.SwipeableCard--swiped .SwipeableCard__content {
  transition: transform 0.3s ease;
}

.SwipeableCard__confirm {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.SwipeableCard__confirmContent {
  background: var(--bg-tertiary, #0A0E27);
  border-radius: 16px;
  padding: 24px;
  max-width: 280px;
  width: 90%;
}

.SwipeableCard__confirmText {
  margin: 0 0 20px;
  font-size: var(--text-base);
  color: var(--text-primary);
  text-align: center;
}

.SwipeableCard__confirmActions {
  display: flex;
  gap: 12px;
}

.SwipeableCard__confirmBtn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.SwipeableCard__confirmBtn:active {
  opacity: 0.8;
}

.SwipeableCard__confirmBtn--cancel {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.SwipeableCard__confirmBtn--delete {
  background: var(--danger);
  color: white;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
</style>
