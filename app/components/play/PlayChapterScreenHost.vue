<script setup lang="ts">
import { computed } from 'vue'
import PlayShell from '~/components/play/PlayShell.vue'
import DebtDashboard from '~/components/play/DebtDashboard.vue'
import WeekPlanPanel from '~/components/play/WeekPlanPanel.vue'
import DelegationPanel from '~/components/play/DelegationPanel.vue'
import FateUpdateOverlay from '~/components/play/FateUpdateOverlay.vue'
import TraumaArchiveChip from '~/components/play/TraumaArchiveChip.vue'
import ExamBossScreen from '~/components/play/ExamBossScreen.vue'
import BreakthroughScreen from '~/components/play/BreakthroughScreen.vue'
import SectChoiceScreen from '~/components/play/SectChoiceScreen.vue'
import BodyMortgageScreen from '~/components/play/BodyMortgageScreen.vue'
import MandateInboxScreen from '~/components/play/MandateInboxScreen.vue'
import TrackChoiceScreen from '~/components/play/TrackChoiceScreen.vue'
import JobChoiceScreen from '~/components/play/JobChoiceScreen.vue'
import ContractFinaleScreen from '~/components/play/ContractFinaleScreen.vue'
import WeekLogStrip from '~/components/play/WeekLogStrip.vue'
import WeekSettlementStrip from '~/components/play/WeekSettlementStrip.vue'
import WeekPressureRail from '~/components/play/WeekPressureRail.vue'
import type { useChapterSession } from '~/composables/useChapterSession'
import type { PlayScreenId } from '~/logic/play/resolvePlayScreen'
import { dualLedgerLabelMing, dualLedgerLabelYang } from '~/logic/play/playerFacingCopy'
import type { PlayStatusBarModel, RunArchive } from '~/types/play'
import type { InboxThread } from '~/types/play'

type ChapterSession = ReturnType<typeof useChapterSession>

const props = defineProps<{
  session: ChapterSession
  screen: PlayScreenId
  status: PlayStatusBarModel
  threads: InboxThread[]
  archive: RunArchive | null
  breakthroughNotes: string[]
}>()

const emit = defineEmits<{
  inboxSelect: [threadId: string]
  archived: []
}>()

const lifeStage = computed(() => props.session.run.value?.lifeStage ?? 'hs')

function patchHeadJarTier(tier: import('~/types/chapter').MaintenanceTier) {
  props.session.weekPlan.value = { ...props.session.weekPlan.value, maintenanceTier: tier }
}

function patchDelegationJob(jobId: import('~/types/chapter').DelegationJobId) {
  props.session.weekPlan.value = { ...props.session.weekPlan.value, delegationJob: jobId }
}
</script>

<template>
  <div class="PlayChapterScreenHost">
    <RunArchiveView
      v-if="screen === 'run-archive' && archive"
      :archive="archive"
      confirm-label="返回首页"
      @confirm="emit('archived')"
    />
    <ContractFinaleScreen
      v-else-if="screen === 'contract-finale'"
      :total-debt="session.debtVm.value?.totalDebt ?? 0"
      :week-budget="session.run.value?.chapter?.weekBudget ?? 40"
      :kpi-score="session.run.value?.work?.kpiScore"
      @fulfill="session.confirmContractFinale(true)"
      @breach="session.confirmContractFinale(false)"
    />
    <ExamBossScreen
      v-else-if="screen === 'exam-boss' && session.examBossPending.value"
      :result="session.examBossPending.value"
      @confirm="session.dismissExamBossScreen"
    />
    <BreakthroughScreen
      v-else-if="screen === 'breakthrough-gate' && session.breakthroughPending.value"
      :pending="session.breakthroughPending.value"
      :institutional-notes="breakthroughNotes"
      tag-label="筑基关口 · 四十周契约"
      title="升学关口"
      confirm-label="确认并进入预科"
      @confirm="session.confirmBreakthroughGate"
    />
    <SectChoiceScreen
      v-else-if="screen === 'sect-choice' && session.sectChoicePending.value"
      :pending="session.sectChoicePending.value"
      @choose="session.confirmSectChoice"
    />
    <div
      v-else-if="screen === 'uni-setpiece' && session.uniFoundationGatePending.value"
      class="PlayChapterScreenHost__finale AgGate AgGate--finale"
    >
      <div class="PlayChapterScreenHost__panel AgGlassPanel">
        <h2>预科结业关口</h2>
        <p>{{ session.uniFoundationGatePending.value.celebrationLine }}</p>
        <ul class="PlayChapterScreenHost__logs">
          <li v-for="(line, i) in session.uniFoundationGatePending.value.billLines" :key="i">{{ line }}</li>
        </ul>
        <button type="button" class="PlayChapterScreenHost__btn" @click="session.dismissUniFoundationGate">
          签收账单并继续
        </button>
      </div>
    </div>
    <BodyMortgageScreen
      v-else-if="screen === 'body-mortgage' && session.bodyMortgagePending.value"
      :pending="session.bodyMortgagePending.value"
      @accept="session.acceptBodyMortgage"
      @refuse="session.refuseBodyMortgage"
    />
    <FateUpdateOverlay
      v-else-if="screen === 'fate-update' && session.fateUpdateOverlay.value"
      :pending="session.fateUpdateOverlay.value"
      @complete="session.dismissFateUpdate()"
      @skip="session.dismissFateUpdate()"
    />
    <PlayShell
      v-else-if="
        (screen === 'week-dashboard' || screen === 'mandate-inbox') && session.debtVm.value
      "
      :status="status"
      :threads="threads"
      :layout-token="session.layoutToken.value"
      :status-bar-fields="session.statusBarFields.value"
      :integrity="session.run.value?.bodyIntegrity"
      :integrity-cap="session.mortgagedIntegrityCap.value"
      :maintenance-bill="session.maintenanceBillPreview.value?.total"
      @inbox-select="emit('inboxSelect', $event)"
    >
      <div
        class="PlayChapterScreenHost__main PlayChapterScreenHost__main--ag"
        :class="{ 'PlayChapterScreenHost__main--dimmed': screen === 'mandate-inbox' }"
      >
        <div class="PlayChapterScreenHost__grid">
          <div class="PlayChapterScreenHost__primary">
            <DebtDashboard class="PlayChapterScreenHost__debt DebtDash--ag" :model="session.debtVm.value" />
            <WeekPlanPanel
              v-if="session.scheduleMode.value === 'four_tile'"
              class="PlayChapterScreenHost__weekPlan"
              :plan="session.weekPlan.value"
              :disabled="session.weekBlocked.value"
              :life-stage="lifeStage"
              :segment-actions="session.weekSegmentActions.value"
              :actions="session.weekActionFlags.value"
              :repay-tiers="session.weekRepayTiers.value"
              :psy-notice="session.weekPsyNotice.value"
              :repeat-hint="session.weekRepeatHint.value"
              :can-repeat-last="session.hasLastWeekPlan.value"
              :segment-label="session.chapterHud.value?.segmentLabel"
              :weeks-remaining="session.chapterHud.value?.weeksRemaining"
              :schedule-mode="session.scheduleMode.value"
              :integrity-cap="session.mortgagedIntegrityCap.value"
              :show-blood-draw="session.showBloodDraw.value"
              :blood-draw-disabled="session.weekBlocked.value"
              @update:plan="session.weekPlan.value = $event"
              @confirm="session.confirmWeekPlan()"
              @repeat-last="session.repeatLastWeekPlan()"
              @blood-draw="session.activateBloodDrawGrit()"
            />
            <DelegationPanel
              v-else-if="session.scheduleMode.value === 'delegation_two' && session.maintenanceBillPreview.value"
              class="PlayChapterScreenHost__weekPlan"
              :plan="session.weekPlan.value"
              :maintenance-tier="session.weekPlan.value.maintenanceTier"
              :delegation-job-id="session.weekPlan.value.delegationJob"
              :bill-preview="session.maintenanceBillPreview.value"
              :delegation-options="session.delegationOptions.value"
              :panel-tag="session.delegationPanelStrings.value.panelTag"
              :panel-title="session.delegationPanelStrings.value.panelTitle"
              :confirm-label="session.delegationPanelStrings.value.confirmLabel"
              :bill-label-yang="session.showDualLedgerLabels.value ? dualLedgerLabelYang() : undefined"
              :bill-label-ming="session.showDualLedgerLabels.value ? dualLedgerLabelMing() : undefined"
              :cash="session.run.value?.econ?.cash ?? 0"
              :disabled="session.weekBlocked.value"
              :can-repeat-last="session.hasLastWeekPlan.value"
              :repeat-hint="session.weekRepeatHint.value"
              @update:maintenance-tier="patchHeadJarTier"
              @update:delegation-job-id="patchDelegationJob"
              @confirm="session.confirmWeekPlan()"
              @repeat-last="session.repeatLastWeekPlan()"
            />
          </div>
          <WeekPressureRail
            v-if="session.debtVm.value"
            class="PlayChapterScreenHost__rail"
            :lines="session.recentLogs.value"
            :debt="session.debtVm.value"
            :weeks-remaining="session.chapterHud.value?.weeksRemaining"
            :emphasis="session.weekPressureEmphasis.value"
            :integrity="session.run.value?.bodyIntegrity"
            :integrity-cap="session.mortgagedIntegrityCap.value"
            :maintenance-bill="session.maintenanceBillPreview.value?.total"
            :anti-pattern-headline="session.debtVm.value.antiPatternHeadline"
            :dual-ledger-yang="session.debtVm.value.dualLedgerYang"
            :dual-ledger-ming="session.debtVm.value.dualLedgerMing"
          />
        </div>
      </div>
      <template #deck>
        <div
          class="PlayChapterScreenHost__deck"
          :class="{ 'PlayChapterScreenHost__deck--settlement': session.settlementFlash.value }"
        >
          <WeekSettlementStrip
            v-if="session.settlementFlash.value"
            :summary="session.settlementFlash.value"
            @dismiss="session.dismissSettlement()"
          />
          <WeekLogStrip
            class="PlayChapterScreenHost__deckLog"
            :lines="session.recentLogs.value.slice(0, 3)"
            :settlement-visible="!!session.settlementFlash.value"
          />
        </div>
      </template>
    </PlayShell>
    <MandateInboxScreen
      v-if="screen === 'mandate-inbox' && session.mandateInboxPending.value"
      :pending="session.mandateInboxPending.value"
      @respond="session.respondMandate"
    />
    <TrackChoiceScreen
      v-else-if="screen === 'work-track-choice' && session.trackChoicePending.value"
      :pending="session.trackChoicePending.value"
      @choose="session.chooseTrack"
    />
    <JobChoiceScreen
      v-else-if="screen === 'work-job-choice' && session.jobChoicePending.value"
      :pending="session.jobChoicePending.value"
      @choose="session.chooseJob"
    />
    <TraumaArchiveChip
      v-if="
        session.traumaStampFlash.value?.visible &&
        !session.fateUpdatePending.value
      "
      :fate="session.traumaStampFlash.value.fate"
      :visible="true"
      @dismiss="session.dismissTraumaStamp()"
    />
  </div>
</template>

<style scoped>
.PlayChapterScreenHost {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}
.PlayChapterScreenHost:has(.PlayShell) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.PlayChapterScreenHost :deep(.PlayShell) {
  flex: 1;
  min-height: 0;
}
.PlayChapterScreenHost__main {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  padding: clamp(10px, 1.5vw, 16px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.PlayChapterScreenHost__grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
@media (min-width: 1024px) {
  .PlayChapterScreenHost__grid {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  }
}
.PlayChapterScreenHost__primary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: auto;
}
.PlayChapterScreenHost__weekPlan {
  flex: 1;
  min-height: 0;
}
.PlayChapterScreenHost__rail {
  min-height: 0;
}
@media (max-width: 1023px) {
  .PlayChapterScreenHost__rail {
    display: none;
  }
}
.PlayChapterScreenHost__deckLog {
  display: block;
}
@media (min-width: 1024px) {
  .PlayChapterScreenHost__deckLog {
    display: none;
  }
}
.PlayChapterScreenHost__debt {
  flex-shrink: 0;
}
.PlayChapterScreenHost__deck {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.PlayChapterScreenHost__deck--settlement :deep(.WeekLogStrip) {
  border-color: rgba(80, 100, 120, 0.2);
  background: rgba(0, 0, 0, 0.18);
}
.PlayChapterScreenHost__main--dimmed {
  pointer-events: none;
  user-select: none;
  filter: brightness(0.42) saturate(0.78);
  opacity: 0.92;
  transition: filter 0.28s ease, opacity 0.28s ease;
}
.PlayChapterScreenHost__logsBox {
  min-width: 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.35);
}

.PlayChapterScreenHost__logsBox:not([open]) {
  align-self: start;
}

.PlayChapterScreenHost__logsBox[open] {
  min-height: 0;
  max-height: min(42vh, 360px);
  overflow: auto;
}

.PlayChapterScreenHost__logsTitle {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.PlayChapterScreenHost__logsTitle::-webkit-details-marker {
  display: none;
}

.PlayChapterScreenHost__logsCount {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(0, 255, 255, 0.25);
  color: var(--text-muted);
  font-size: 10px;
}

.PlayChapterScreenHost__logsBox[open] .PlayChapterScreenHost__logs {
  margin-top: 8px;
}
.PlayChapterScreenHost__logs {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}
.PlayChapterScreenHost__finale {
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
.PlayChapterScreenHost__panel {
  width: min(520px, 100%);
  margin: auto;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(120, 160, 220, 0.35);
  background: rgba(12, 16, 28, 0.95);
}
.PlayChapterScreenHost__btn {
  margin-top: 1rem;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: rgba(120, 160, 220, 0.9);
  color: #fff;
  font-family: var(--mono);
  font-size: var(--text-xs);
}
.PlayChapterScreenHost__finale :deep(.RunArchiveView) {
  width: min(720px, 100%);
}
</style>
