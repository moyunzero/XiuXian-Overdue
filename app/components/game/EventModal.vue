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
            
            <div v-if="isMandatory" class="MandatoryWarning" role="alert">
              你已经没有选择的余地。
            </div>
          </div>

          <RepaymentInfoPanel
            v-if="isRepaymentEvent"
            :total-debt="totalDebt ?? 0"
            :accumulated-payment="accumulatedPayment ?? 0"
            :current-cash="currentCash ?? 0"
          />
          
          <div class="EventOptions" aria-live="polite">
            <template v-for="option in visibleOptions">
              <div v-if="option.id === 'immediate_payment' && isRepaymentEvent" :key="option.id" class="PaymentOptionWrapper">
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
              
              <Button
                v-else
                :key="option.id + '_reg'"
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
import RepaymentInfoPanel from './RepaymentInfoPanel.vue'
import type { EventModalPayload, EventOptionDisplay } from '~/types/game'

const props = defineProps<{
  event: EventModalPayload | null
  accumulatedPayment?: number
  currentCash?: number
  totalDebt?: number
}>()

const emit = defineEmits<{
  resolve: [optionId: string]
  dismiss: []
}>()

const modalRef = ref<HTMLElement | null>(null)

const isMandatory = computed(() => props.event?.mandatory === true)

const isRepaymentEvent = computed(() => {
  if (!props.event) return false
  return props.event.type === 'repayment' || props.event.title?.includes('用身体偿还')
})

const canAffordPayment = computed(() => {
  if (props.accumulatedPayment === undefined || props.currentCash === undefined) return true
  return props.currentCash >= props.accumulatedPayment
})

const visibleOptions = computed((): EventOptionDisplay[] => {
  if (!props.event) return []
  if (isMandatory.value) return props.event.options.filter(o => o.id !== 'refuse')
  return props.event.options
})

const getOptionVariant = (tone?: EventOptionDisplay['tone']) => {
  if (tone === 'danger') return 'danger'
  if (tone === 'primary') return 'primary'
  return 'secondary'
}

const handleResolve = (optionId: string) => emit('resolve', optionId)

const handleDismiss = () => {
  if (isMandatory.value) return
  emit('dismiss')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.event) return
  if (e.key === 'Escape') {
    if (!isMandatory.value) handleDismiss()
    return
  }
  if (e.key === 'Tab') {
    const modal = modalRef.value
    if (!modal) return
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
}

watch(
  () => props.event,
  async (event) => {
    document.body.style.overflow = event ? 'hidden' : ''
    if (event) {
      await nextTick()
      const firstFocusable = modalRef.value?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled])')
      firstFocusable?.focus()
    }
  },
  { immediate: true }
)

onUnmounted(() => { document.body.style.overflow = '' })
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

.EventIllustration img { width: 100%; height: 100%; object-fit: cover; }

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

.OptionConsequence {
  display: block;
  font-size: var(--text-xs);
  color: var(--muted);
  margin-top: var(--space-1);
}

@media (max-width: 767px) {
  .EventModalBackdrop { padding: var(--space-2); backdrop-filter: blur(3px); }
  .EventModal { border-radius: 16px; max-height: 92vh; }
  .EventIllustration { height: 160px; }
  .EventContent { padding: var(--space-4) var(--space-3); gap: var(--space-3); }
  .EventTitle { font-size: 20px; }
  .EventBody { font-size: 13px; }
  .EventOptions { padding: var(--space-3); padding-top: 0; gap: var(--space-3); }
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
