<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="event"
        class="EventModalBackdrop"
        @click.self="handleDismiss"
        @keydown.esc="handleDismiss"
      >
        <div class="EventModal" role="dialog" aria-modal="true">
          <div v-if="event.illustration" class="EventIllustration">
            <img :src="event.illustration" :alt="event.title" />
          </div>
          
          <div class="EventContent">
            <h2 class="EventTitle">{{ event.title }}</h2>
            <p class="EventBody">{{ event.body }}</p>
          </div>
          
          <div class="EventOptions">
            <Button
              v-for="option in event.options"
              :key="option.id"
              :variant="getOptionVariant(option.tone)"
              size="md"
              full-width
              @click="handleResolve(option.id)"
            >
              {{ option.label }}
              <span v-if="option.consequence" class="OptionConsequence">
                {{ option.consequence }}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Button from '../ui/Button.vue'

interface EventOption {
  id: string
  label: string
  tone?: 'normal' | 'danger' | 'primary'
  consequence?: string
}

interface GameEvent {
  title: string
  body: string
  illustration?: string
  options: EventOption[]
}

interface EventModalProps {
  event: GameEvent | null
}

defineProps<EventModalProps>()

const emit = defineEmits<{
  resolve: [optionId: string]
  dismiss: []
}>()

const getOptionVariant = (tone?: 'normal' | 'danger' | 'primary') => {
  if (tone === 'danger') return 'danger'
  if (tone === 'primary') return 'primary'
  return 'secondary'
}

const handleResolve = (optionId: string) => {
  emit('resolve', optionId)
}

const handleDismiss = () => {
  emit('dismiss')
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleDismiss()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.EventModalBackdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 50;
}

.EventModal {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 20, 32, 0.94), rgba(11, 16, 26, 0.92));
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.55), 0 0 40px rgba(56, 248, 208, 0.15);
  overflow: hidden;
}

.EventIllustration {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(56, 248, 208, 0.1), transparent);
}

.EventIllustration img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.EventContent {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.EventTitle {
  margin: 0;
  font-family: var(--serif);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: 0.5px;
}

.EventBody {
  margin: 0;
  font-size: var(--text-base);
  color: var(--muted);
  line-height: var(--leading-relaxed);
}

.EventOptions {
  padding: var(--space-4);
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.OptionConsequence {
  display: block;
  font-size: var(--text-xs);
  color: var(--muted);
  margin-top: var(--space-1);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .EventModal,
.modal-leave-active .EventModal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .EventModal,
.modal-leave-to .EventModal {
  transform: scale(0.9);
  opacity: 0;
}

/* Responsive */
@media (max-width: 767px) {
  .EventModalBackdrop {
    padding: var(--space-2);
    /* Reduce backdrop-filter for performance */
    backdrop-filter: blur(3px);
  }
  
  .EventModal {
    border-radius: 16px;
    max-height: 92vh;
  }
  
  .EventIllustration {
    height: 160px;
  }
  
  .EventContent {
    padding: var(--space-4) var(--space-3);
    gap: var(--space-3);
  }
  
  .EventTitle {
    font-size: 20px;
  }
  
  .EventBody {
    font-size: 13px;
  }
  
  .EventOptions {
    padding: var(--space-3);
    padding-top: 0;
    gap: var(--space-3);
  }
  
  /* Simplify animations on mobile */
  .modal-enter-active,
  .modal-leave-active {
    transition: opacity 0.2s ease;
  }
  
  .modal-enter-active .EventModal,
  .modal-leave-active .EventModal {
    transition: opacity 0.2s ease;
  }
  
  .modal-enter-from .EventModal,
  .modal-leave-to .EventModal {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .EventModal,
  .modal-leave-active .EventModal {
    transition: none;
  }
}
</style>
