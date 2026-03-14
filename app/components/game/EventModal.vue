<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="event"
        class="EventModalBackdrop"
        @click.self="handleDismiss"
      >
        <div
          ref="modalRef"
          class="EventModal"
          role="dialog"
          aria-modal="true"
          :aria-label="event.title"
          @keydown="handleKeydown"
        >
          <div v-if="event.illustration" class="EventIllustration">
            <img :src="event.illustration" :alt="event.title" />
          </div>
          
          <div class="EventContent">
            <h2 class="EventTitle">{{ event.title }}</h2>
            <p class="EventBody">{{ event.body }}</p>
            
            <!-- Mandatory warning -->
            <div v-if="isMandatory" class="MandatoryWarning" role="alert">
              你已经没有选择的余地。
            </div>
          </div>

          <!-- Repayment info panel -->
          <div v-if="isRepaymentEvent" class="RepaymentInfo">
            <div v-if="totalDebt !== undefined" class="RepaymentDebt">
              当前总债务：<span class="DebtAmount">¥{{ Math.floor(totalDebt).toLocaleString() }}</span>
            </div>
            <div class="RepaymentWarning">
              偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。
            </div>
          </div>
          
          <div class="EventOptions" aria-live="polite">
            <template v-for="option in visibleOptions" :key="option.id">
              <!-- Immediate payment option with cash info -->
              <div v-if="option.id === 'immediate_payment' && isRepaymentEvent" class="PaymentOptionWrapper">
                <div v-if="accumulatedPayment !== undefined" class="PaymentInfo">
                  <span>需还款：¥{{ Math.floor(accumulatedPayment).toLocaleString() }}</span>
                  <span v-if="currentCash !== undefined">
                    · 现金：¥{{ Math.floor(currentCash).toLocaleString() }}
                  </span>
                  <span
                    v-if="currentCash !== undefined && accumulatedPayment !== undefined && currentCash < accumulatedPayment"
                    class="DeficitText"
                  >
                    · 差额：¥{{ Math.floor(accumulatedPayment - currentCash).toLocaleString() }}
                  </span>
                </div>
                <Button
                  :variant="canAffordPayment ? 'primary' : 'danger'"
                  size="md"
                  full-width
                  :disabled="!canAffordPayment"
                  @click="handleResolve(option.id)"
                >
                  {{ option.label }}
                </Button>
              </div>
              
              <!-- Regular option -->
              <Button
                v-else
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
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
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
  mandatory?: boolean
  type?: string
}

interface EventModalProps {
  event: GameEvent | null
  accumulatedPayment?: number
  currentCash?: number
  totalDebt?: number
}
 
const props = defineProps<EventModalProps>()

const emit = defineEmits<{
  resolve: [optionId: string]
  dismiss: []
}>()

const modalRef = ref<HTMLElement | null>(null)

const isMandatory = computed(() => props.event?.mandatory === true)

const isRepaymentEvent = computed(() => {
  if (!props.event) return false
  return props.event.type === 'repayment' ||
    props.event.title?.includes('用身体偿还')
})

const canAffordPayment = computed(() => {
  if (props.accumulatedPayment === undefined || props.currentCash === undefined) return true
  return props.currentCash >= props.accumulatedPayment
})

// Filter out 'refuse' option if mandatory (safety net)
const visibleOptions = computed(() => {
  if (!props.event) return []
  if (isMandatory.value) {
    return props.event.options.filter(o => o.id !== 'refuse')
  }
  return props.event.options
})

const getOptionVariant = (tone?: 'normal' | 'danger' | 'primary') => {
  if (tone === 'danger') return 'danger'
  if (tone === 'primary') return 'primary'
  return 'secondary'
}

const handleResolve = (optionId: string) => {
  emit('resolve', optionId)
}

const handleDismiss = () => {
  if (isMandatory.value) return
  emit('dismiss')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.event) return
  
  if (e.key === 'Escape') {
    if (!isMandatory.value) {
      handleDismiss()
    }
    return
  }
  
  // Focus trap: Tab cycles within modal
  if (e.key === 'Tab') {
    const modal = modalRef.value
    if (!modal) return
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

watch(
  () => props.event,
  async (event) => {
    document.body.style.overflow = event ? 'hidden' : ''
    if (event) {
      await nextTick()
      // Focus first focusable element in modal
      const modal = modalRef.value
      if (modal) {
        const firstFocusable = modal.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled])'
        )
        firstFocusable?.focus()
      }
    }
  },
  { immediate: true }
)
 
onUnmounted(() => {
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

.MandatoryWarning {
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 59, 59, 0.12);
  border: 1px solid rgba(255, 59, 59, 0.4);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: var(--text-sm);
  font-weight: 600;
}

.RepaymentInfo {
  padding: 0 var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.RepaymentDebt {
  font-size: var(--text-sm);
  color: var(--muted);
}

.DebtAmount {
  color: #ff6b6b;
  font-weight: 600;
}

.RepaymentWarning {
  font-size: var(--text-sm);
  color: rgba(255, 107, 107, 0.8);
  font-style: italic;
}

.EventOptions {
  padding: var(--space-4);
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.PaymentOptionWrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.PaymentInfo {
  font-size: var(--text-xs);
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.DeficitText {
  color: #ff6b6b;
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
