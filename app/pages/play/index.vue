<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#app'
import PlayShell from '~/components/play/PlayShell.vue'
import S0SetpieceShell from '~/components/play/S0SetpieceShell.vue'
import PressureDeck from '~/components/play/PressureDeck.vue'
import DebtDashboard from '~/components/play/DebtDashboard.vue'
import ExamBossScreen from '~/components/play/ExamBossScreen.vue'
import JobChoiceScreen from '~/components/play/JobChoiceScreen.vue'
import BodyMortgageScreen from '~/components/play/BodyMortgageScreen.vue'
import BreakthroughScreen from '~/components/play/BreakthroughScreen.vue'
import { useAct1Session } from '~/composables/useAct1Session'
import { useAct1Storage } from '~/composables/useAct1Storage'
import { usePlayStorage } from '~/composables/usePlayStorage'
import { usePlayEndlessSession } from '~/composables/usePlayEndlessSession'
import { buildInboxPlaceholders } from '~/logic/play/buildInboxPlaceholders'
import { getChapterMeta, lifeStageLabel, realmTierLabel } from '~/logic/play/chapterFlow'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { buildBreakthroughInstitutionalNotes } from '~/logic/act1/metaUnlockLabels'
import { enrichCarryoverWithPlayMeta, mergePriorMetaForNewRun } from '~/logic/play/playMeta'
import type { PlayRunState, PlayStatusBarModel } from '~/types/play'
import type { StartConfig } from '~/types/game'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { settleAct1IntoPlayRun } from '~/logic/act1/act1PlayTransition'
import { syncSetpieceFromAct1 } from '~/logic/act1/s0Flow'

const playStorage = usePlayStorage()
const act1Storage = useAct1Storage()
const activeRun = ref<PlayRunState | null>(null)

const act1StartConfig = useState<StartConfig | null>('act1StartConfig', () => null)
const act1SlotId = useState<'slot1' | 'slot2' | 'slot3'>('act1SlotId', () => 'slot1')
const hsCarryover = useState<ReturnType<typeof carryoverFromPersist> | null>('playHsCarryover', () => null)
const playRunMode = useState('playRunMode', () => 'endless')

const {
  ready,
  startConfig,
  act1,
  showLoanPopup,
  modifiers,
  todos,
  debtTotal,
  creditors,
  act1Notifications,
  priorMetaUnlocks,
  metaUnlocks,
  permanentModifiers,
  allModulesDone,
  settled,
  WINDOW_LABELS,
  initSession,
  openWindow,
  focusTodo,
  submitInterview,
  dismissLoanAd,
  acknowledgeLoanPopup,
  markLoanCompared,
  trackLoanCompare,
  signLoan,
  spendFamily,
  handleCollectionChoice,
  finishSettlement
} = useAct1Session()

const endlessSession = usePlayEndlessSession()

const playRun = computed(() => endlessSession.run.value ?? activeRun.value)

const lifeStage = computed(() => playRun.value?.lifeStage ?? 'pre')

const breakthroughInstitutionalNotes = computed(() => {
  const merged = mergePriorMetaForNewRun(playStorage.getPlayMeta(), priorMetaUnlocks.value)
  return buildBreakthroughInstitutionalNotes(merged)
})

const inboxThreads = computed(() => {
  if (playRun.value?.lifeStage !== 'pre' && endlessSession.run.value) {
    return endlessSession.run.value.inbox
  }
  return buildInboxPlaceholders(act1.value)
})

const statusBar = computed<PlayStatusBarModel>(() => {
  const chapter = getChapterMeta(lifeStage.value, activeRun.value?.chapterIndex ?? 0)
  if (lifeStage.value !== 'pre' && endlessSession.run.value) {
    const r = endlessSession.run.value
    const hud = endlessSession.endlessHud.value ?? chapter?.title ?? lifeStageLabel(r.lifeStage)
    return {
      day: r.school?.day ?? 1,
      cash: r.econ?.cash ?? 0,
      debt: (r.econ?.debtPrincipal ?? 0) + (r.econ?.debtInterestAccrued ?? 0) + (r.econ?.collectionFee ?? 0),
      rankLabel: hud,
      delinquency: r.econ?.delinquency ?? 0,
      realmLabel: realmTierLabel(r.realmTier ?? 'foundation'),
      lifeStageLabel: lifeStageLabel(r.lifeStage)
    }
  }
  const a = act1.value
  return {
    day: a?.day ?? 1,
    cash: a?.cash ?? 0,
    debt: debtTotal.value,
    rankLabel: chapter?.title ?? lifeStageLabel(lifeStage.value),
    delinquency: a?.delinquency ?? 0,
    realmLabel: realmTierLabel(activeRun.value?.realmTier ?? 'mortal'),
    lifeStageLabel: lifeStageLabel(lifeStage.value)
  }
})

function syncInboxToRun() {
  if (!act1.value) return
  const next = playStorage.updateActiveRun({ inbox: buildInboxPlaceholders(act1.value) })
  if (next) activeRun.value = next
}

function initEndlessIfNeeded(run: PlayRunState) {
  activeRun.value = run
  endlessSession.initFromRun(run)
  hsCarryover.value = null
}

onMounted(async () => {
  let run = playStorage.getActiveRun()

  if (!act1StartConfig.value) {
    if (run) {
      act1StartConfig.value = run.start
      act1SlotId.value = run.slotId
    } else {
      await navigateTo('/')
      return
    }
  } else if (!run) {
    run = playStorage.ensureRunForSlot(act1SlotId.value)
    if (!run && act1StartConfig.value) {
      run = createPlayRunFromStartConfig(act1StartConfig.value, act1SlotId.value, {
        runMode: playRunMode.value
      })
      playStorage.setActiveRun(run)
    }
  }

  activeRun.value = run ?? playStorage.getActiveRun()

  const globalMeta = playStorage.getPlayMeta()
  priorMetaUnlocks.value = mergePriorMetaForNewRun(globalMeta, priorMetaUnlocks.value)

  if (run?.lifeStage === 'pre') {
    const saved = act1Storage.loadAct1(act1SlotId.value)
    if (saved?.settled) {
      const carry = enrichCarryoverWithPlayMeta(carryoverFromPersist(saved), globalMeta)
      hsCarryover.value = carry
      const hsRun = settleAct1IntoPlayRun(run, { ...saved, metaUnlocks: carry.metaUnlocks })
      hsRun.runMode = 'endless'
      playStorage.setActiveRun(hsRun)
      initEndlessIfNeeded(hsRun)
      return
    }
    initSession()
  } else if (run) {
    activeRun.value = run
    endlessSession.initFromRun({ ...run, runMode: 'endless' })
  }
})

watch(
  act1,
  () => {
    syncInboxToRun()
    if (!act1.value || lifeStage.value !== 'pre') return
    const run = playStorage.getActiveRun()
    if (!run) return
    const next = playStorage.updateActiveRun({
      setpiece: syncSetpieceFromAct1(act1.value, run.setpiece)
    })
    if (next) activeRun.value = next
  },
  { deep: true }
)

function onInboxSelect(threadId: string) {
  if (threadId === 'thread-family' && act1.value?.pendingTodos.includes('todo-interview-open')) {
    openWindow('interview')
  } else if (threadId === 'thread-loan') {
    openWindow('loan')
  }
}

async function onEndlessCollapsed() {
  playStorage.clearActiveRun()
  await navigateTo('/')
}

async function onFinishSettlement() {
  const hsRun = await finishSettlement()
  if (hsRun) initEndlessIfNeeded({ ...hsRun, runMode: 'endless' })
}
</script>

<template>
  <div v-if="lifeStage === 'pre' && ready && startConfig && act1 && modifiers" class="PlayPage">
    <PlayShell :status="statusBar" :threads="inboxThreads" @inbox-select="onInboxSelect">
      <div class="PlayPage__act1">
        <S0SetpieceShell
          :start-config="startConfig"
          :act1="act1"
          :window-labels="WINDOW_LABELS"
          :todos="todos"
          :debt-total="debtTotal"
          :creditors="creditors"
          :act1-notifications="act1Notifications"
          :meta-unlocks="metaUnlocks"
          :permanent-modifiers="permanentModifiers"
          :all-modules-done="allModulesDone"
          :settled="settled"
          :show-loan-popup="showLoanPopup"
          :modifiers="modifiers"
          :prior-meta-unlocks="priorMetaUnlocks"
          @focus-todo="focusTodo"
          @submit-interview="submitInterview"
          @dismiss-loan-ad="dismissLoanAd"
          @acknowledge-loan-popup="acknowledgeLoanPopup"
          @compare-loan="markLoanCompared"
          @compare-loan-tick="trackLoanCompare"
          @sign-loan="signLoan"
          @spend-family="spendFamily"
          @collection-choice="handleCollectionChoice"
          @finish-settlement="onFinishSettlement"
        />
      </div>
    </PlayShell>
  </div>

  <div
    v-else-if="
      lifeStage !== 'pre' &&
      endlessSession.run.value &&
      endlessSession.debtVm.value
    "
    class="PlayPage"
  >
    <div v-if="endlessSession.isCollapsed.value" class="PlayPage PlayPage__finale">
      <div class="PlayPage__collapsed">
        <h2>无尽境崩盘</h2>
        <p v-for="(line, i) in endlessSession.recentLogs.value" :key="i">{{ line }}</p>
        <button type="button" class="PlayPage__collapsedBtn" @click="onEndlessCollapsed">返回首页</button>
      </div>
    </div>
    <template v-else>
      <JobChoiceScreen
        v-if="endlessSession.jobChoicePending.value"
        :pending="endlessSession.jobChoicePending.value"
        @choose="endlessSession.chooseJob"
      />
      <BodyMortgageScreen
        v-else-if="endlessSession.bodyMortgagePending.value"
        :pending="endlessSession.bodyMortgagePending.value"
        @accept="endlessSession.acceptBodyMortgage"
        @refuse="endlessSession.refuseBodyMortgage"
      />
      <BreakthroughScreen
        v-else-if="endlessSession.breakthroughPending.value"
        :pending="endlessSession.breakthroughPending.value"
        :institutional-notes="breakthroughInstitutionalNotes"
        @confirm="endlessSession.confirmBreakthroughGate"
      />
      <PlayShell v-else :status="statusBar" :threads="inboxThreads" @inbox-select="onInboxSelect">
        <div class="PlayPage__hs">
          <DebtDashboard class="PlayPage__debt" :model="endlessSession.debtVm.value" />
          <p v-if="endlessSession.endlessHud.value" class="PlayPage__subHud">
            {{ endlessSession.endlessHud.value }}
          </p>
          <div class="PlayPage__logs">
            <h3 class="PlayPage__logs-title">回合记录</h3>
            <ul class="PlayPage__logs-list">
              <li v-for="(line, i) in endlessSession.recentLogs.value" :key="i">{{ line }}</li>
            </ul>
          </div>
        </div>
        <template #deck>
          <PressureDeck
            v-if="endlessSession.run.value?.pressure && !endlessSession.pressureBlocked.value"
            :cards="endlessSession.offeredCards.value"
            :selected-ids="endlessSession.selectedIds.value"
            @toggle="endlessSession.toggleCard"
            @confirm="endlessSession.confirmRound"
          />
        </template>
      </PlayShell>
    </template>
  </div>

  <div v-else class="PlayPage PlayPage--loading">
    <p>载入修行档案…</p>
  </div>
</template>

<style scoped>
.PlayPage {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  min-height: 100dvh;
  box-sizing: border-box;
}
.PlayPage__act1 {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.PlayPage__hs {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(14px, 2vw, 24px);
  overflow: auto;
}
.PlayPage__debt {
  flex-shrink: 0;
}
.PlayPage__logs {
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.35);
  overflow: auto;
}
.PlayPage__subHud {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(120, 200, 255, 0.2);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 220, 255, 0.92);
  flex-shrink: 0;
}
.PlayPage__roundHud {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(160, 200, 255, 0.75);
  flex-shrink: 0;
}
.PlayPage__foundationHint {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 180, 100, 0.35);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 210, 160, 0.95);
  line-height: 1.45;
  flex-shrink: 0;
}
.PlayPage__workPlaceholder {
  margin: 0;
  padding: 1rem;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
}
.PlayPage__kpiPanel {
  flex-shrink: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(160, 120, 255, 0.25);
  background: rgba(20, 12, 36, 0.45);
  min-width: 0;
}
.PlayPage__kpiTitle {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}
.PlayPage__kpiList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.PlayPage__kpiRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.PlayPage__kpiMeta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(210, 190, 255, 0.9);
}
.PlayPage__logs-title {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}
.PlayPage__logs-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}
.PlayPage__finale {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: clamp(14px, 2vw, 24px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.PlayPage__finale :deep(.RunArchiveView) {
  width: min(720px, 100%);
}
.PlayPage--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  color: var(--text-muted);
  font-family: var(--mono);
}
.PlayPage__collapsed {
  width: min(520px, 100%);
  margin: auto;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 100, 100, 0.35);
  background: rgba(20, 8, 12, 0.95);
}
.PlayPage__collapsedBtn {
  margin-top: 1rem;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: rgba(120, 160, 220, 0.9);
  color: #fff;
}
</style>
