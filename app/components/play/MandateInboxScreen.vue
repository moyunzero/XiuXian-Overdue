<script setup lang="ts">
import MandateCardStack from '~/components/play/MandateCardStack.vue'
import type { MandateInboxPending } from '~/logic/play/mandateDelivery'

const props = defineProps<{
  pending: MandateInboxPending
}>()

const emit = defineEmits<{
  respond: [responseId: string]
}>()
</script>

<template>
  <div
    class="MandateInbox AgGate AgGate--mandate MandateInbox--ag"
    role="dialog"
    aria-labelledby="mandate-inbox-title"
  >
    <div class="MandateInbox__panel AgGlassPanel">
      <span id="mandate-inbox-title" class="MandateInbox__tag">灵信 · 来文</span>
      <MandateCardStack :pending="props.pending" @respond="emit('respond', $event)" />
    </div>
  </div>
</template>

<style scoped>
.MandateInbox__panel {
  width: min(560px, 100%);
  max-height: min(90dvh, 720px);
  overflow: auto;
  box-sizing: border-box;
  padding: clamp(16px, 2vw, 24px);
}

.MandateInbox__tag {
  display: block;
  margin-bottom: var(--spacing-2);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 210, 255, 0.95);
  letter-spacing: 0.06em;
}
</style>
