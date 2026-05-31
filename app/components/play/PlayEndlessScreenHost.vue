<script setup lang="ts">
import PlayShell from '~/components/play/PlayShell.vue'
import DebtDashboard from '~/components/play/DebtDashboard.vue'
import PressureDeck from '~/components/play/PressureDeck.vue'
import JobChoiceScreen from '~/components/play/JobChoiceScreen.vue'
import BodyMortgageScreen from '~/components/play/BodyMortgageScreen.vue'
import BreakthroughScreen from '~/components/play/BreakthroughScreen.vue'
import type { usePlayEndlessSession } from '~/composables/usePlayEndlessSession'
import type { PlayScreenId } from '~/logic/play/resolvePlayScreen'
import type { PlayStatusBarModel, InboxThread } from '~/types/play'

type EndlessSession = ReturnType<typeof usePlayEndlessSession>

defineProps<{
  session: EndlessSession
  screen: PlayScreenId
  status: PlayStatusBarModel
  threads: InboxThread[]
  breakthroughNotes: string[]
}>()

const emit = defineEmits<{
  inboxSelect: [threadId: string]
  collapsed: []
}>()
</script>

<template>
  <div class="PlayEndlessScreenHost">
    <div v-if="screen === 'endless-collapse'" class="PlayEndlessScreenHost__finale">
      <div class="PlayEndlessScreenHost__panel PlayEndlessScreenHost__panel--danger">
        <h2>无尽境崩盘</h2>
        <p v-for="(line, i) in session.recentLogs.value" :key="i">{{ line }}</p>
        <button type="button" class="PlayEndlessScreenHost__btn" @click="emit('collapsed')">返回首页</button>
      </div>
    </div>
    <JobChoiceScreen
      v-else-if="screen === 'endless-job-choice' && session.jobChoicePending.value"
      :pending="session.jobChoicePending.value"
      @choose="session.chooseJob"
    />
    <BodyMortgageScreen
      v-else-if="screen === 'endless-body-mortgage' && session.bodyMortgagePending.value"
      :pending="session.bodyMortgagePending.value"
      @accept="session.acceptBodyMortgage"
      @refuse="session.refuseBodyMortgage"
    />
    <BreakthroughScreen
      v-else-if="screen === 'endless-breakthrough' && session.breakthroughPending.value"
      :pending="session.breakthroughPending.value"
      :institutional-notes="breakthroughNotes"
      @confirm="session.confirmBreakthroughGate"
    />
    <PlayShell
      v-else-if="screen === 'endless-pressure' && session.debtVm.value"
      :status="status"
      :threads="threads"
      @inbox-select="emit('inboxSelect', $event)"
    >
      <div class="PlayEndlessScreenHost__main">
        <DebtDashboard class="PlayEndlessScreenHost__debt" :model="session.debtVm.value" />
        <p v-if="session.endlessHud.value" class="PlayEndlessScreenHost__hud">
          {{ session.endlessHud.value }}
        </p>
        <div class="PlayEndlessScreenHost__logsBox">
          <h3 class="PlayEndlessScreenHost__logsTitle">回合记录</h3>
          <ul class="PlayEndlessScreenHost__logs">
            <li v-for="(line, i) in session.recentLogs.value" :key="i">{{ line }}</li>
          </ul>
        </div>
      </div>
      <template #deck>
        <PressureDeck
          v-if="session.run.value?.pressure && !session.pressureBlocked.value"
          :cards="session.offeredCards.value"
          :selected-ids="session.selectedIds.value"
          @toggle="session.toggleCard"
          @confirm="session.confirmRound"
        />
      </template>
    </PlayShell>
  </div>
</template>

<style scoped>
.PlayEndlessScreenHost {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}
.PlayEndlessScreenHost__main {
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
.PlayEndlessScreenHost__debt {
  flex-shrink: 0;
}
.PlayEndlessScreenHost__hud {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(120, 200, 255, 0.2);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 220, 255, 0.92);
  flex-shrink: 0;
}
.PlayEndlessScreenHost__logsBox {
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.35);
  overflow: auto;
}
.PlayEndlessScreenHost__logsTitle {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  letter-spacing: 0.06em;
}
.PlayEndlessScreenHost__logs {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}
.PlayEndlessScreenHost__finale {
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
.PlayEndlessScreenHost__panel {
  width: min(520px, 100%);
  margin: auto;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(120, 160, 220, 0.35);
  background: rgba(12, 16, 28, 0.95);
}
.PlayEndlessScreenHost__panel--danger {
  border-color: rgba(255, 100, 100, 0.35);
  background: rgba(20, 8, 12, 0.95);
}
.PlayEndlessScreenHost__btn {
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
</style>
