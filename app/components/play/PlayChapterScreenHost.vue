<script setup lang="ts">
import { computed } from 'vue'
import PlayShell from '~/components/play/PlayShell.vue'
import DebtDashboard from '~/components/play/DebtDashboard.vue'
import WeekPlanPanel from '~/components/play/WeekPlanPanel.vue'
import ExamBossScreen from '~/components/play/ExamBossScreen.vue'
import BreakthroughScreen from '~/components/play/BreakthroughScreen.vue'
import SectChoiceScreen from '~/components/play/SectChoiceScreen.vue'
import BodyMortgageScreen from '~/components/play/BodyMortgageScreen.vue'
import MandateInboxScreen from '~/components/play/MandateInboxScreen.vue'
import TrackChoiceScreen from '~/components/play/TrackChoiceScreen.vue'
import JobChoiceScreen from '~/components/play/JobChoiceScreen.vue'
import ContractFinaleScreen from '~/components/play/ContractFinaleScreen.vue'
import RunArchiveView from '~/components/play/RunArchiveView.vue'
import type { useChapterSession } from '~/composables/useChapterSession'
import type { PlayScreenId } from '~/logic/play/resolvePlayScreen'
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
    <PlayShell
      v-else-if="
        (screen === 'week-dashboard' || screen === 'mandate-inbox') && session.debtVm.value
      "
      :status="status"
      :threads="threads"
      @inbox-select="emit('inboxSelect', $event)"
    >
      <div
        class="PlayChapterScreenHost__main PlayChapterScreenHost__main--ag"
        :class="{ 'PlayChapterScreenHost__main--dimmed': screen === 'mandate-inbox' }"
      >
        <DebtDashboard class="PlayChapterScreenHost__debt DebtDash--ag" :model="session.debtVm.value" />
        <WeekPlanPanel
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
          @update:plan="session.weekPlan.value = $event"
          @confirm="session.confirmWeekPlan()"
          @repeat-last="session.repeatLastWeekPlan()"
        />
        <details class="PlayChapterScreenHost__logsBox">
          <summary class="PlayChapterScreenHost__logsTitle">
            回合记录
            <span class="PlayChapterScreenHost__logsCount">{{ session.recentLogs.value.length }}</span>
          </summary>
          <ul class="PlayChapterScreenHost__logs">
            <li v-for="(line, i) in session.recentLogs.value" :key="i">{{ line }}</li>
          </ul>
        </details>
      </div>
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
.PlayChapterScreenHost__main {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  padding: clamp(14px, 2vw, 24px);
  overflow: auto;
}
.PlayChapterScreenHost__debt {
  flex-shrink: 0;
}
.PlayChapterScreenHost__main--dimmed {
  pointer-events: none;
  user-select: none;
  filter: brightness(0.55) saturate(0.85);
  transition: filter 0.28s ease;
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
