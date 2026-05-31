<script setup lang="ts">
import { computed } from 'vue'
import type { Act1State, Act1Todo } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import Act1ModulePanel from '~/components/act1/Act1ModulePanel.vue'
import LoanAdPopup from '~/components/act1/modules/LoanAdPopup.vue'
import TodoStack from '~/components/act1/TodoStack.vue'
import StatusBar from '~/components/act1/StatusBar.vue'
import Act1Settlement from '~/components/act1/Act1Settlement.vue'
import type { Act1Modifiers, Act1PermanentModifiers } from '~/types/act1'
import type { FamilyExpenseId } from '~/logic/act1/familyLedger'
import type { Act1Notification } from '~/logic/act1/loanProducts'
import {
  COLLECTION_LADDER_LABELS,
  deriveS0Step,
  moduleForS0Step,
  S0_STEP_LABELS,
  S0_STEPS,
  s0StepIndex,
  collectionLadderStage
} from '~/logic/act1/s0Flow'
import type { Act1WindowId } from '~/types/act1'

const props = defineProps<{
  startConfig: StartConfig
  act1: Act1State
  windowLabels: Record<Act1WindowId, string>
  todos: Act1Todo[]
  debtTotal: number
  creditors: { name: string; balance: number }[]
  act1Notifications: Act1Notification[]
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
  allModulesDone: boolean
  settled: boolean
  showLoanPopup: boolean
  modifiers: Act1Modifiers
  priorMetaUnlocks: string[]
}>()

const emit = defineEmits<{
  focusTodo: [todo: Act1Todo]
  submitInterview: [answers: Record<string, string>]
  dismissLoanAd: []
  acknowledgeLoanPopup: []
  compareLoan: []
  compareLoanTick: [deltaMs: number]
  signLoan: [productId: string]
  spendFamily: [id: FamilyExpenseId]
  collectionChoice: [choiceId: string]
  finishSettlement: []
}>()

const s0Step = computed(() => deriveS0Step(props.act1))
const activeModule = computed(() => moduleForS0Step(s0Step.value) ?? 'interview')
const activeLabel = computed(() => S0_STEP_LABELS[s0Step.value])
const ladderStage = computed(() => collectionLadderStage(props.act1))

const cardSteps = computed(() => S0_STEPS.filter((s) => s !== 's0-complete'))

function stepStatus(step: (typeof S0_STEPS)[number]) {
  const idx = s0StepIndex(step)
  const cur = s0StepIndex(s0Step.value)
  if (idx < cur) return 'done'
  if (idx === cur) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="S0Setpiece">
    <StatusBar
      :day="act1.day"
      :cash="act1.cash"
      :pressure="act1.pressure"
      :debt="debtTotal"
      :creditors="creditors"
      :active-label="activeLabel"
    />

    <div v-if="allModulesDone && !settled" class="S0Setpiece__settlement-wrap">
      <Act1Settlement
        :start-config="startConfig"
        :act1="act1"
        :debt-total="debtTotal"
        :meta-unlocks="metaUnlocks"
        :permanent-modifiers="permanentModifiers"
        @finish="emit('finishSettlement')"
      />
    </div>

    <template v-else>
      <div class="S0Setpiece__shell">
        <nav class="S0Setpiece__rail" aria-label="入学前夜三步">
          <ol class="S0Setpiece__steps">
            <li
              v-for="step in cardSteps"
              :key="step"
              class="S0Setpiece__step"
              :class="`S0Setpiece__step--${stepStatus(step)}`"
            >
              <span class="S0Setpiece__step-num">{{ s0StepIndex(step) + 1 }}</span>
              <span class="S0Setpiece__step-label">{{ S0_STEP_LABELS[step] }}</span>
            </li>
          </ol>
          <p class="S0Setpiece__hint">
            入学前夜 · 线性名场面。完成当前大卡后自动进入下一步；待办未清会阻塞推进。
          </p>
        </nav>

        <main class="S0Setpiece__main">
          <header class="S0Setpiece__toolbar">
            <h2 class="S0Setpiece__title">{{ activeLabel }}</h2>
            <p v-if="activeModule === 'family'" class="S0Setpiece__ladder" aria-label="催收阶梯">
              <span
                v-for="(label, i) in COLLECTION_LADDER_LABELS"
                :key="label"
                class="S0Setpiece__ladder-seg"
                :class="{
                  'S0Setpiece__ladder-seg--done': ladderStage > i,
                  'S0Setpiece__ladder-seg--current': ladderStage === i
                }"
              >
                {{ label }}
              </span>
            </p>
          </header>

          <Act1ModulePanel
            class="S0Setpiece__panel"
            :window-id="activeModule"
            :title="windowLabels[activeModule]"
            :start-config="startConfig"
            :act1="act1"
            :modifiers="modifiers"
            :prior-meta-unlocks="priorMetaUnlocks"
            :act1-notifications="act1Notifications"
            @submit-interview="emit('submitInterview', $event)"
            @compare-loan="emit('compareLoan')"
            @compare-loan-tick="emit('compareLoanTick', $event)"
            @sign-loan="emit('signLoan', $event)"
            @spend-family="emit('spendFamily', $event)"
            @collection-choice="emit('collectionChoice', $event)"
          />
        </main>

        <aside class="S0Setpiece__aside" aria-label="系统层">
          <section class="S0Setpiece__aside-block">
            <h3 class="S0Setpiece__aside-heading">系统层</h3>
            <dl class="S0Setpiece__stats">
              <div class="S0Setpiece__row">
                <dt>压力指数</dt>
                <dd class="S0Setpiece__warn">{{ act1.pressure }}</dd>
              </div>
              <div class="S0Setpiece__row">
                <dt>家庭韧性</dt>
                <dd>{{ act1.familyResilience }}</dd>
              </div>
              <div class="S0Setpiece__row">
                <dt>负债合计</dt>
                <dd class="S0Setpiece__danger">¥{{ debtTotal.toLocaleString() }}</dd>
              </div>
            </dl>
          </section>
          <section v-if="creditors.length" class="S0Setpiece__aside-block">
            <h3 class="S0Setpiece__aside-heading">债权人</h3>
            <ul class="S0Setpiece__creditors">
              <li v-for="c in creditors" :key="c.name">
                <span>{{ c.name }}</span>
                <span class="S0Setpiece__danger">¥{{ c.balance.toLocaleString() }}</span>
              </li>
            </ul>
          </section>
        </aside>

        <TodoStack class="S0Setpiece__todos" :items="todos" @select="emit('focusTodo', $event)" />
      </div>

      <LoanAdPopup
        v-if="showLoanPopup"
        :dismiss-count="act1.loanMeta.adDismissCount"
        @close="emit('dismissLoanAd')"
        @learn-more="emit('acknowledgeLoanPopup')"
        @claim="emit('acknowledgeLoanPopup')"
      />
    </template>
  </div>
</template>

<style scoped>
.S0Setpiece {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 70% 45% at 20% 0%, rgba(0, 255, 255, 0.07), transparent 55%),
    radial-gradient(ellipse 55% 35% at 85% 100%, rgba(255, 0, 255, 0.05), transparent 50%),
    #000;
}

.S0Setpiece__settlement-wrap {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  align-items: stretch;
  padding: clamp(12px, 2vw, 24px);
  box-sizing: border-box;
}

.S0Setpiece__shell {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(200px, 18vw, 300px);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'rail rail'
    'main aside'
    'todos todos';
  gap: 0;
}

.S0Setpiece__rail {
  grid-area: rail;
  padding: clamp(12px, 1.5vw, 18px) clamp(14px, 2vw, 24px);
  border-bottom: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.4);
}

.S0Setpiece__steps {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(10px, 2vw, 24px);
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}

.S0Setpiece__step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.S0Setpiece__step--active {
  color: var(--neon-cyan);
}
.S0Setpiece__step--done {
  color: var(--success);
}

.S0Setpiece__step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: var(--text-xs);
}

.S0Setpiece__step--active .S0Setpiece__step-num {
  box-shadow: var(--glow-cyan);
  background: rgba(0, 255, 255, 0.12);
}

.S0Setpiece__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  max-width: 72ch;
  line-height: 1.5;
}

.S0Setpiece__main {
  grid-area: main;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(12px, 1.5vw, 20px);
  gap: 12px;
}

.S0Setpiece__toolbar {
  flex-shrink: 0;
}

.S0Setpiece__title {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}

.S0Setpiece__ladder {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.S0Setpiece__ladder-seg {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--text-muted);
}

.S0Setpiece__ladder-seg--done {
  border-color: rgba(0, 255, 136, 0.35);
  color: var(--success);
}

.S0Setpiece__ladder-seg--current {
  border-color: rgba(255, 210, 74, 0.5);
  color: var(--warning);
  background: rgba(255, 210, 74, 0.08);
}

.S0Setpiece__panel {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.S0Setpiece__aside {
  grid-area: aside;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(12px, 1.5vw, 16px);
  border-left: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.35);
}

.S0Setpiece__aside-block + .S0Setpiece__aside-block {
  margin-top: 16px;
}

.S0Setpiece__aside-heading {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
}

.S0Setpiece__stats {
  margin: 0;
}

.S0Setpiece__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: var(--text-sm);
}

.S0Setpiece__row dt {
  color: var(--text-muted);
}

.S0Setpiece__warn {
  color: var(--warning);
}

.S0Setpiece__danger {
  color: var(--danger);
}

.S0Setpiece__creditors {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-xs);
}

.S0Setpiece__creditors li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.S0Setpiece__todos {
  grid-area: todos;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .S0Setpiece__shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'rail'
      'main'
      'aside'
      'todos';
  }
  .S0Setpiece__aside {
    border-left: none;
    border-top: 1px solid var(--border-default);
  }
}
</style>
