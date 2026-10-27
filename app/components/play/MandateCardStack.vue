<script setup lang="ts">
import MandateCard from '~/components/play/MandateCard.vue'
import { computed, ref } from 'vue'
import type { MandateInboxPending } from '~/logic/play/mandateDelivery'
import {
  buildMandateCardOptions,
  formatIssuerLabel
} from '~/logic/play/mandateCostHints'

const props = defineProps<{
  pending: MandateInboxPending
}>()

const emit = defineEmits<{
  respond: [responseId: string]
}>()

const exitDirection = ref<'left' | 'right' | 'grit' | null>(null)

const cardOptions = computed(() => buildMandateCardOptions(props.pending.responses, props.pending.fuzzFlags))

const issuerLabel = computed(() =>
  formatIssuerLabel(props.pending.issuerLabel, props.pending.fuzzFlags)
)

const FLY_MS = 320

function finishRespond(responseId: string) {
  window.setTimeout(() => {
    emit('respond', responseId)
    exitDirection.value = null
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : FLY_MS)
}

function onChoose(responseId: string, direction: 'left' | 'right' | 'grit') {
  if (exitDirection.value) return
  exitDirection.value = direction
  finishRespond(responseId)
}
</script>

<template>
  <div class="MandateCardStack">
    <p v-if="props.pending.queueSize > 1" class="MandateCardStack__queue">
      队列 {{ props.pending.queueSize }} 封 · 须先回应置顶来文
    </p>

    <div class="MandateCardStack__deck" aria-live="polite">
      <div
        v-if="props.pending.queueSize > 1"
        class="MandateCardStack__peek AgGlassSubcard"
        aria-hidden="true"
      >
        <span class="MandateCardStack__peekTag">下一封</span>
        <span class="MandateCardStack__peekTitle">待回应来文</span>
      </div>

      <MandateCard
        class="MandateCardStack__active"
        :issuer-label="issuerLabel"
        :title="props.pending.title"
        :body="props.pending.body"
        :left="cardOptions.left"
        :right="cardOptions.right"
        :grit="cardOptions.grit"
        :issuer-fuzzed="!!props.pending.fuzzFlags?.issuerNoise"
        :exit-direction="exitDirection"
        @choose="onChoose"
      />
    </div>

    <p v-if="props.pending.numbness >= 40" class="MandateCardStack__psy">
      麻木偏高：部分选项已灰化，劣质出路仍可选。
    </p>

    <p class="MandateCardStack__fine">
      来文须回应后方可继续本周；拖延会写入账期与征信侧备注。
    </p>
  </div>
</template>

<style scoped>
.MandateCardStack {
  width: min(640px, calc(100% - 32px));
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin: var(--spacing-8) auto 0;
}

.MandateCardStack__queue {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 180, 120, 0.9);
  text-align: center;
}

.MandateCardStack__deck {
  position: relative;
  min-height: 280px;
}

.MandateCardStack__peek {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform: translateY(8px) scale(0.97);
  opacity: 0.65;
  padding: var(--spacing-4);
  pointer-events: none;
  border: 1px solid rgba(100, 180, 220, 0.18);
}

.MandateCardStack__peekTag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 210, 255, 0.7);
}

.MandateCardStack__peekTitle {
  display: block;
  margin-top: 8px;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-muted);
}

.MandateCardStack__active {
  position: relative;
  z-index: 2;
}

.MandateCardStack__psy {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 190, 200, 0.85);
  background: rgba(80, 80, 90, 0.25);
  border: 1px solid rgba(120, 120, 130, 0.35);
}

.MandateCardStack__fine {
  margin: 0;
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.45;
  text-align: center;
}
</style>
