<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#app'
import PlayShell from '~/components/play/PlayShell.vue'
import S0SetpieceShell from '~/components/play/S0SetpieceShell.vue'
import PlayChapterScreenHost from '~/components/play/PlayChapterScreenHost.vue'
import PlayEndlessScreenHost from '~/components/play/PlayEndlessScreenHost.vue'
import { useAct1Session } from '~/composables/useAct1Session'
import { useAct1Storage } from '~/composables/useAct1Storage'
import { usePlayStorage } from '~/composables/usePlayStorage'
import { usePlayEndlessSession } from '~/composables/usePlayEndlessSession'
import { useChapterSession } from '~/composables/useChapterSession'
import { usePlayOrchestrator } from '~/composables/usePlayOrchestrator'
import { buildInboxPlaceholders } from '~/logic/play/buildInboxPlaceholders'
import { getChapterMeta, lifeStageLabel, realmTierLabel } from '~/logic/play/chapterFlow'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { buildBreakthroughInstitutionalNotes } from '~/logic/act1/metaUnlockLabels'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { buildChapterFinaleArchive } from '~/logic/play/buildRunArchive'
import { enrichCarryoverWithPlayMeta, mergePriorMetaForNewRun } from '~/logic/play/playMeta'
import type { PlayRunState, PlayStatusBarModel, RunArchive } from '~/types/play'
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
const playRunMode = useState<'chapter' | 'endless'>('playRunMode', () => 'chapter')

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
const chapterSession = useChapterSession()

const playRun = computed(() => {
  if (chapterSession.run.value?.runMode === 'chapter') return chapterSession.run.value
  if (endlessSession.run.value?.runMode === 'endless') return endlessSession.run.value
  return activeRun.value
})

const act1Ready = computed(
  () => Boolean(ready.value && startConfig.value && act1.value && modifiers.value)
)

const { playScreen, isPreAct1, isChapterRun, isEndlessRun } = usePlayOrchestrator({
  playRun,
  act1Ready,
  chapterDebtReady: computed(() => Boolean(chapterSession.debtVm.value)),
  endlessDebtReady: computed(() => Boolean(endlessSession.debtVm.value))
})

const lifeStage = computed(() => playRun.value?.lifeStage ?? 'pre')

const breakthroughInstitutionalNotes = computed(() => {
  const merged = mergePriorMetaForNewRun(playStorage.getPlayMeta(), priorMetaUnlocks.value)
  return buildBreakthroughInstitutionalNotes(merged)
})

const chapterArchive = computed((): RunArchive | null => {
  const r = chapterSession.run.value
  if (!r || r.runStatus === 'active') return null
  const act1State = r.act1 ?? createInitialAct1State(r.start)
  return buildChapterFinaleArchive({
    run: r,
    act1: act1State,
    startConfig: r.start,
    metaUnlocks: r.carryoverFromAct1?.metaUnlocks ?? [],
    permanentModifiers: r.carryoverFromAct1?.permanentModifiers ?? {}
  })
})

const inboxThreads = computed(() => {
  if (playRun.value?.lifeStage !== 'pre') {
    return playRun.value?.inbox ?? []
  }
  return buildInboxPlaceholders(act1.value)
})

const statusBar = computed<PlayStatusBarModel>(() => {
  const chapter = getChapterMeta(lifeStage.value, activeRun.value?.chapterIndex ?? 0)
  if (lifeStage.value !== 'pre' && chapterSession.run.value?.runMode === 'chapter') {
    const r = chapterSession.run.value
    const hud = chapterSession.chapterHud.value
    return {
      day: r.school?.day ?? 1,
      cash: r.econ?.cash ?? 0,
      debt:
        (r.econ?.debtPrincipal ?? 0) +
        (r.econ?.debtInterestAccrued ?? 0) +
        (r.econ?.collectionFee ?? 0),
      rankLabel: hud?.contractRankLabel ?? hud?.weekLabel ?? chapter?.title ?? lifeStageLabel(r.lifeStage),
      delinquency: r.econ?.delinquency ?? 0,
      realmLabel: realmTierLabel(r.realmTier ?? 'mortal'),
      lifeStageLabel: lifeStageLabel(r.lifeStage)
    }
  }
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

function initPlaySession(run: PlayRunState) {
  activeRun.value = run
  hsCarryover.value = null
  if (run.runMode === 'chapter') {
    chapterSession.initFromRun(run)
  } else {
    endlessSession.initFromRun(run)
  }
}

function initEndlessIfNeeded(run: PlayRunState) {
  initPlaySession({ ...run, runMode: 'endless' })
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
      hsRun.runMode = 'chapter'
      playStorage.setActiveRun(hsRun)
      initPlaySession(hsRun)
      return
    }
    initSession()
  } else if (run) {
    activeRun.value = run
    if (run.runMode === 'chapter') {
      chapterSession.initFromRun(run)
    } else {
      endlessSession.initFromRun({ ...run, runMode: 'endless' })
    }
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

async function onChapterArchived() {
  playStorage.clearActiveRun()
  await navigateTo('/')
}

async function onFinishSettlement() {
  const hsRun = await finishSettlement()
  if (hsRun) initPlaySession({ ...hsRun, runMode: 'chapter' })
}
</script>

<template>
  <Transition name="play-route-crossfade" mode="out-in">
    <div v-if="isPreAct1" key="act1" class="PlayPage PlayRoute--ag">
      <PlayShell :status="statusBar" :threads="inboxThreads" @inbox-select="onInboxSelect">
        <div class="PlayPage__act1">
          <S0SetpieceShell
            :start-config="startConfig!"
            :act1="act1!"
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
            :modifiers="modifiers!"
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

    <div v-else-if="isChapterRun" key="chapter" class="PlayPage PlayRoute--ag">
      <PlayChapterScreenHost
        :session="chapterSession"
        :screen="playScreen"
        :status="statusBar"
        :threads="inboxThreads"
        :archive="chapterArchive"
        :breakthrough-notes="breakthroughInstitutionalNotes"
        @inbox-select="onInboxSelect"
        @archived="onChapterArchived"
      />
    </div>

    <div v-else-if="isEndlessRun" key="endless" class="PlayPage PlayRoute--ag">
      <PlayEndlessScreenHost
        :session="endlessSession"
        :screen="playScreen"
        :status="statusBar"
        :threads="inboxThreads"
        :breakthrough-notes="breakthroughInstitutionalNotes"
        @inbox-select="onInboxSelect"
        @collapsed="onEndlessCollapsed"
      />
    </div>

    <div v-else key="loading" class="PlayPage PlayPage--loading">
      <p>载入修行档案…</p>
    </div>
  </Transition>
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
.PlayPage__collapsedBtn--ghost {
  margin-left: 0.75rem;
  background: transparent;
  border: 1px solid rgba(120, 160, 220, 0.45);
}
.PlayPage__weekActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}
.PlayPage__weekBtn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-xs);
  background: rgba(100, 200, 255, 0.18);
  color: rgba(200, 235, 255, 0.95);
  border: 1px solid rgba(100, 200, 255, 0.35);
}
.PlayPage__weekBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.PlayPage__weekBtn--ghost {
  background: transparent;
}

:global(.play-route-crossfade-enter-active),
:global(.play-route-crossfade-leave-active) {
  transition: opacity 600ms ease;
}

:global(.play-route-crossfade-enter-from),
:global(.play-route-crossfade-leave-to) {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  :global(.play-route-crossfade-enter-active),
  :global(.play-route-crossfade-leave-active) {
    transition: none;
  }
}
</style>
