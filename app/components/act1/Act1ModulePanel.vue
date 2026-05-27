<script setup lang="ts">
import type { Act1Modifiers, Act1State, Act1WindowId } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import type { FamilyExpenseId } from '~/logic/act1/familyLedger'
import InterviewModule from '~/components/act1/modules/InterviewModule.vue'
import LoanModule from '~/components/act1/modules/LoanModule.vue'
import FamilyModule from '~/components/act1/modules/FamilyModule.vue'
import MessagesModule from '~/components/act1/modules/MessagesModule.vue'
import type { Act1Notification } from '~/logic/act1/loanProducts'

defineProps<{
  windowId: Act1WindowId
  title: string
  startConfig: StartConfig
  act1: Act1State
  modifiers: Act1Modifiers
  priorMetaUnlocks?: string[]
  act1Notifications?: Act1Notification[]
}>()

const emit = defineEmits<{
  submitInterview: [answers: Record<string, string>]
  compareLoan: []
  compareLoanTick: [deltaMs: number]
  signLoan: [productId: string]
  spendFamily: [id: FamilyExpenseId]
  collectionChoice: [choiceId: string]
}>()
</script>

<template>
  <section class="Act1ModulePanel" :aria-label="title">
    <header class="Act1ModulePanel__chrome">
      <span class="Act1ModulePanel__title">{{ title }}</span>
    </header>
    <div class="Act1ModulePanel__body">
      <InterviewModule
        v-if="windowId === 'interview'"
        :start-config="startConfig"
        :act1="act1"
        :prior-meta-unlocks="priorMetaUnlocks"
        @submit="emit('submitInterview', $event)"
      />
      <LoanModule
        v-else-if="windowId === 'loan'"
        :act1="act1"
        :modifiers="modifiers"
        @compare="emit('compareLoan')"
        @compare-tick="emit('compareLoanTick', $event)"
        @sign="emit('signLoan', $event)"
      />
      <FamilyModule
        v-else-if="windowId === 'family'"
        :act1="act1"
        @spend="emit('spendFamily', $event)"
        @collection-choice="emit('collectionChoice', $event)"
      />
      <MessagesModule v-else-if="windowId === 'messages'" :items="act1Notifications ?? []" />
      <template v-else>
        <p class="Act1Copy Act1Copy--muted">
          {{ act1.interview.result === 'reject' ? '简历副本已粉碎。' : '回收站为空。' }}
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.Act1ModulePanel {
  width: 100%;
  height: 100%;
  min-height: min(420px, 55vh);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.35);
  border-radius: 10px;
  background: var(--bg-tertiary);
  box-shadow: 0 0 0 1px rgba(0, 255, 255, 0.12), 0 20px 50px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  box-sizing: border-box;
}
.Act1ModulePanel__chrome {
  flex-shrink: 0;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.45);
  border-bottom: 1px solid var(--border-default);
}
.Act1ModulePanel__title {
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
}
.Act1ModulePanel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(14px, 1.5vw, 20px);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--text-primary);
}
.Act1Copy {
  margin: 0 0 12px;
  max-width: 72ch;
}
.Act1Copy--muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
.Act1Copy--ok {
  color: var(--success);
}
</style>

<style>
/* 子模块共用按钮样式 */
.Act1Action {
  margin-top: 8px;
  padding: 10px 16px;
  border: 1px solid var(--neon-cyan);
  background: rgba(0, 255, 255, 0.08);
  color: var(--neon-cyan);
  font-family: var(--mono);
  cursor: pointer;
  border-radius: 6px;
}
.Act1Action:hover:not(:disabled) {
  box-shadow: var(--glow-cyan);
}
.Act1Action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.Act1Action--ghost {
  border-color: var(--border-default);
  color: var(--text-secondary);
  background: transparent;
}
.Act1Action--danger {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(255, 59, 59, 0.08);
}
.Act1Row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.Act1List {
  margin: 0;
  padding-left: 1.2em;
}
</style>
