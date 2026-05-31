<script setup lang="ts">
import type { MandateInboxPending } from '~/logic/play/mandateDelivery'

defineProps<{
  pending: MandateInboxPending
}>()

const emit = defineEmits<{
  respond: [responseId: string]
}>()
</script>

<template>
  <div class="MandateInbox AgGate AgGate--mandate MandateInbox--ag" role="dialog" aria-labelledby="mandate-inbox-title">
    <div class="MandateInbox__panel AgGlassPanel">
      <header class="MandateInbox__head">
        <span class="MandateInbox__tag">灵信 · 仙司来文</span>
        <h2 id="mandate-inbox-title" class="MandateInbox__title">{{ pending.title }}</h2>
        <p v-if="pending.queueSize > 1" class="MandateInbox__queue">
          队列 {{ pending.queueSize }} 封 · 须先回应置顶来文
        </p>
      </header>

      <p class="MandateInbox__body">{{ pending.body }}</p>

      <p v-if="pending.numbness >= 40" class="MandateInbox__psy">
        麻木偏高：部分「配合」选项已灰化，劣质出路仍可选。
      </p>

      <ul class="MandateInbox__list AgStagger">
        <li v-for="opt in pending.responses" :key="opt.id" class="MandateInbox__item">
          <button
            type="button"
            class="MandateInbox__btn"
            :class="{ 'MandateInbox__btn--grit': opt.grit }"
            @click="emit('respond', opt.id)"
          >
            {{ opt.label }}
          </button>
        </li>
      </ul>

      <p class="MandateInbox__fine">来文须回应后方可回到周仪表盘；拖延会写入账期与征信侧备注。</p>
    </div>
  </div>
</template>

<style scoped>
.MandateInbox__panel {
  width: min(560px, 100%);
  max-height: min(90dvh, 720px);
  overflow: auto;
  box-sizing: border-box;
}
.MandateInbox__head {
  margin-bottom: 1rem;
}
.MandateInbox__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 210, 255, 0.95);
  letter-spacing: 0.06em;
}
.MandateInbox__title {
  margin: 0.35rem 0 0;
  font-size: 1.15rem;
  line-height: 1.35;
}
.MandateInbox__queue {
  margin: 0.5rem 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 180, 120, 0.9);
}
.MandateInbox__body {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}
.MandateInbox__psy {
  margin: 0 0 1rem;
  padding: 8px 10px;
  border-radius: 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 190, 200, 0.85);
  background: rgba(80, 80, 90, 0.25);
  border: 1px solid rgba(120, 120, 130, 0.35);
}
.MandateInbox__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.MandateInbox__btn {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(100, 180, 220, 0.35);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(210, 240, 255, 0.95);
  font-family: var(--mono);
  font-size: var(--text-xs);
  cursor: pointer;
}
.MandateInbox__btn--grit {
  border-color: rgba(255, 140, 90, 0.45);
  color: rgba(255, 200, 160, 0.95);
}
.MandateInbox__btn:hover {
  background: rgba(40, 80, 110, 0.35);
}
.MandateInbox__fine {
  margin: 1rem 0 0;
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.45;
}
</style>
