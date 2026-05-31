<script setup lang="ts">
import { computed } from 'vue'
import type { Act1ModuleId, Act1State, Act1Todo, Act1WindowId } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import Act1ModulePanel from '~/components/act1/Act1ModulePanel.vue'
import Act1ContextAside from '~/components/act1/Act1ContextAside.vue'
import LoanAdPopup from '~/components/act1/modules/LoanAdPopup.vue'
import TodoStack from '~/components/act1/TodoStack.vue'
import StatusBar from '~/components/act1/StatusBar.vue'
import Act1Settlement from '~/components/act1/Act1Settlement.vue'
import type { Act1Modifiers, Act1PermanentModifiers } from '~/types/act1'
import type { FamilyExpenseId } from '~/logic/act1/familyLedger'
import type { Act1Notification } from '~/logic/act1/loanProducts'

const props = defineProps<{
  startConfig: StartConfig
  act1: Act1State
  openWindows: Act1WindowId[]
  activeWindow: Act1WindowId
  mobileTab: Act1WindowId
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
  isModuleUnlocked: (m: Act1ModuleId) => boolean
}>()

const emit = defineEmits<{
  openWindow: [id: Act1WindowId]
  closeWindow: [id: Act1WindowId]
  focusWindow: [id: Act1WindowId]
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

const desktopIcons: { id: Act1WindowId; glyph: string }[] = [
  { id: 'interview', glyph: '面' },
  { id: 'loan', glyph: '贷' },
  { id: 'family', glyph: '账' },
  { id: 'messages', glyph: '讯' },
  { id: 'recycle', glyph: '回' }
]

const openWindowIds = computed<Act1WindowId[]>(() => {
  const raw = props.openWindows as unknown
  if (Array.isArray(raw)) return raw
  return ['interview']
})

const openLabels = computed(() =>
  openWindowIds.value.map((id) => props.windowLabels[id]).join(' · ')
)

function iconDisabled(id: Act1WindowId) {
  if (id === 'interview' || id === 'loan' || id === 'family') {
    return !props.isModuleUnlocked(id as Act1ModuleId)
  }
  return false
}

function onIconClick(id: Act1WindowId) {
  emit('openWindow', id)
  emit('focusWindow', id)
}
</script>

<template>
  <div class="Act1Desktop Act1Desktop--ag">
    <StatusBar
      :day="act1.day"
      :cash="act1.cash"
      :pressure="act1.pressure"
      :debt="debtTotal"
      :creditors="creditors"
      :active-label="windowLabels[activeWindow]"
    />

    <div v-if="allModulesDone && !settled" class="Act1Desktop__settlement-wrap">
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
      <div class="Act1Desktop__shell">
        <nav class="Act1Desktop__dock" aria-label="桌面图标">
          <button
            v-for="icon in desktopIcons"
            :key="icon.id"
            type="button"
            class="Act1Desktop__dock-btn"
            :class="{
              'Act1Desktop__dock-btn--active': activeWindow === icon.id,
              'Act1Desktop__dock-btn--disabled': iconDisabled(icon.id),
              'Act1Desktop__dock-btn--blocked': iconDisabled(icon.id)
            }"
            :disabled="iconDisabled(icon.id)"
            :aria-current="activeWindow === icon.id ? 'page' : undefined"
            @click="onIconClick(icon.id)"
          >
            <span class="Act1Desktop__glyph">{{ icon.glyph }}</span>
            <span class="Act1Desktop__dock-label">{{ windowLabels[icon.id] }}</span>
          </button>
        </nav>

        <main class="Act1Desktop__workspace Act1Desktop__workspace--desktop">
          <header class="Act1Desktop__toolbar">
            <p class="Act1Desktop__hint">
              入学前夜 · 机构桌面。面试 → 灵贷 → 家庭，待办未清将阻塞下一模块。
            </p>
            <p class="Act1Desktop__meta">
              当前：<strong>{{ windowLabels[activeWindow] }}</strong>
              <span class="Act1Desktop__meta-sep">|</span>
              已打开：{{ openLabels }}
            </p>
          </header>

          <div class="Act1Desktop__workspace-grid">
            <Act1ModulePanel
              class="Act1Desktop__panel Act1Desktop__panel--active"
              :window-id="activeWindow"
              :title="windowLabels[activeWindow]"
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
            <Act1ContextAside
              class="Act1Desktop__context"
              :act1="act1"
              :active-window="activeWindow"
              :window-labels="windowLabels"
              :open-window-ids="openWindowIds"
              :debt-total="debtTotal"
              :creditors="creditors"
              :act1-notifications="act1Notifications"
              @select-window="(id) => { emit('openWindow', id); emit('focusWindow', id) }"
            />
          </div>
        </main>

        <TodoStack class="Act1Desktop__todos" :items="todos" @select="emit('focusTodo', $event)" />
      </div>

      <nav class="Act1Desktop__tabs" aria-label="模块切换">
        <button
          v-for="tab in ['interview', 'loan', 'family'] as Act1WindowId[]"
          :key="tab"
          type="button"
          class="Act1Desktop__tab"
          :class="{ 'Act1Desktop__tab--active': mobileTab === tab }"
          :disabled="iconDisabled(tab)"
          @click="emit('focusWindow', tab); emit('openWindow', tab)"
        >
          {{ windowLabels[tab] }}
        </button>
      </nav>

      <div class="Act1Desktop__mobile-pane">
        <h3 class="Act1Desktop__mobile-title">{{ windowLabels[mobileTab] }}</h3>
        <Act1ModulePanel
          :window-id="mobileTab"
          :title="windowLabels[mobileTab]"
          :start-config="startConfig"
          :act1="act1"
          :modifiers="modifiers"
              :act1-notifications="act1Notifications"
          @submit-interview="emit('submitInterview', $event)"
          @compare-loan="emit('compareLoan')"
          @compare-loan-tick="emit('compareLoanTick', $event)"
          @sign-loan="emit('signLoan', $event)"
          @spend-family="emit('spendFamily', $event)"
          @collection-choice="emit('collectionChoice', $event)"
        />
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
.Act1Desktop {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 80% 50% at 15% 0%, rgba(0, 255, 255, 0.06), transparent 55%),
    radial-gradient(ellipse 60% 40% at 90% 100%, rgba(255, 0, 255, 0.05), transparent 50%),
    #000;
}

.Act1Desktop__shell {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns:
    clamp(72px, 6vw, 112px)
    minmax(0, 1fr)
    clamp(200px, 18vw, 320px);
  grid-template-rows: minmax(0, 1fr);
}

.Act1Desktop__dock {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: clamp(12px, 1.5vw, 20px) clamp(8px, 1vw, 12px);
  border-right: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.45);
  min-height: 0;
  overflow-y: auto;
}

.Act1Desktop__dock-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.Act1Desktop__dock-btn:hover:not(:disabled) {
  color: var(--neon-cyan);
  background: rgba(0, 255, 255, 0.06);
}

.Act1Desktop__dock-btn--active {
  color: var(--neon-cyan);
  border-color: rgba(0, 255, 255, 0.35);
  background: rgba(0, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 255, 255, 0.12);
}

.Act1Desktop__dock-btn--disabled,
.Act1Desktop__dock-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.Act1Desktop__glyph {
  width: clamp(36px, 4vw, 44px);
  height: clamp(36px, 4vw, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  font-family: var(--serif);
  font-size: var(--text-lg);
}

.Act1Desktop__dock-label {
  text-align: center;
  line-height: 1.25;
  max-width: 100%;
}

.Act1Desktop__workspace {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(12px, 1.5vw, 20px);
  gap: clamp(10px, 1.2vw, 16px);
  background:
    linear-gradient(180deg, rgba(10, 14, 39, 0.55), rgba(0, 0, 0, 0.35)),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0,
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 48px
    );
  border-right: 1px solid var(--border-default);
  overflow: hidden;
}

.Act1Desktop__toolbar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 20px;
}

.Act1Desktop__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--mono);
}

.Act1Desktop__meta {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-family: var(--mono);
}

.Act1Desktop__meta strong {
  color: var(--neon-cyan);
  font-weight: 600;
}

.Act1Desktop__meta-sep {
  margin: 0 8px;
  color: var(--text-muted);
}

.Act1Desktop__workspace-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(12px, 1.5vw, 20px);
  align-items: stretch;
}

.Act1Desktop__panel {
  min-height: 0;
  height: 100%;
}

.Act1Desktop__context {
  display: none;
}

.Act1Desktop__todos {
  min-height: 0;
  height: 100%;
}

.Act1Desktop__settlement-wrap {
  flex: 1;
  width: 100%;
  padding: clamp(16px, 2vw, 28px);
  overflow: auto;
}

.Act1Desktop__tabs,
.Act1Desktop__mobile-pane {
  display: none;
}

/* 宽屏：主面板 + 系统层双栏，填满中间区域 */
@media (min-width: 900px) {
  .Act1Desktop__workspace-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.75fr);
  }

  .Act1Desktop__context {
    display: flex;
  }
}

@media (min-width: 1280px) {
  .Act1Desktop__shell {
    grid-template-columns:
      clamp(88px, 5vw, 120px)
      minmax(0, 1fr)
      clamp(240px, 16vw, 360px);
  }
}

@media (min-width: 1600px) {
  .Act1Desktop__shell {
    grid-template-columns:
      clamp(96px, 5vw, 128px)
      minmax(0, 1fr)
      clamp(260px, 14vw, 380px);
  }

  .Act1Desktop__workspace-grid {
    grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
  }
}

@media (max-width: 1023px) {
  .Act1Desktop__shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .Act1Desktop__dock,
  .Act1Desktop__workspace--desktop {
    display: none;
  }

  .Act1Desktop__tabs {
    display: flex;
    flex-shrink: 0;
    border-top: 1px solid var(--border-default);
    background: rgba(0, 0, 0, 0.65);
  }

  .Act1Desktop__tab {
    flex: 1;
    padding: 12px 8px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .Act1Desktop__tab--active {
    color: var(--neon-cyan);
    box-shadow: inset 0 -2px 0 var(--neon-cyan);
  }

  .Act1Desktop__tab:disabled {
    opacity: 0.35;
  }

  .Act1Desktop__mobile-pane {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 16px;
    gap: 12px;
    overflow: auto;
    background: rgba(10, 14, 39, 0.75);
  }

  .Act1Desktop__mobile-title {
    margin: 0;
    font-family: var(--mono);
    color: var(--neon-cyan);
    font-size: var(--text-base);
  }

  .Act1Desktop :deep(.Act1TodoStack) {
    max-height: 160px;
    border-left: none;
    border-top: 1px solid var(--border-default);
  }
}
</style>
