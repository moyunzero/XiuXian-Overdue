<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGame } from '~/composables/useGame'
import * as Engine from '~/logic/gameEngine'
import { navigateTo } from '#app'
import type { ActionId } from '~/types/game'
import StatPanel from '~/components/game/StatPanel.vue'
import LogPanel from '~/components/game/LogPanel.vue'
import DebtDashboard from '~/components/game/DebtDashboard.vue'
import EventModal from '~/components/game/EventModal.vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'
import HumanModelViewer from '~/components/game/HumanModelViewer.vue'
import BorrowModal from '~/components/game/BorrowModal.vue'
import RepayModal from '~/components/game/RepayModal.vue'
import SummaryPanel from '~/components/game/SummaryPanel.vue'

const {
  game,
  activeSlot,
  saveToSlot,
  totalDebt,
  minPayment,
  accumulatedMinPayment,
  classPressureDigest,
  creditLimit,
  nextLabel,
  remainingSlots,
  actionTrendLabel,
  act,
  borrow,
  repay,
  resolveEvent,
  summaryPanelOpen,
  openSummaryPanel,
  acknowledgeSummaryAndContinue,
  closeSummaryPanelWithoutMarking
} = useGame()

/** D-16：ESC/遮罩关闭优先映射 defaultOptionId；无配置时回退末项（常见消极/拒绝），与后续 validate-events 可对齐收紧 */
const dismissOptionId = computed(() => {
  const p = game.value.pendingEvent
  if (!p?.options?.length) return 'ok'
  if (p.defaultOptionId) return p.defaultOptionId
  return p.options[p.options.length - 1]!.id
})

const showBorrow = ref(false)
const showRepay = ref(false)

/** Phase 5（SAVE-03）：窄屏默认折叠 3D；≥640px 展开 */
const modelDetailsEl = ref<HTMLDetailsElement | null>(null)
let modelMq: MediaQueryList | null = null
const syncModelDetailsOpen = () => {
  const el = modelDetailsEl.value
  const mq = modelMq
  if (!el || !mq) return
  el.open = mq.matches
}
onMounted(async () => {
  if (import.meta.server) return
  await nextTick()
  modelMq = window.matchMedia('(min-width: 640px)')
  syncModelDetailsOpen()
  modelMq.addEventListener('change', syncModelDetailsOpen)
})
onUnmounted(() => {
  modelMq?.removeEventListener('change', syncModelDetailsOpen)
})

const g = computed(() => game.value)
const started = computed(() => g.value.started)
const actionsLocked = computed(() => Boolean(g.value.pendingEvent))

// Logs for LogPanel
const logsForPanel = computed(() => 
  g.value.logs.slice(0, 30).map(log => ({
    ...log,
    tone: log.tone as 'info' | 'warn' | 'danger' | 'ok'
  }))
)
const selectedLogId = ref<string | null>(null)

// StatPanel data
const playerStats = computed(() => [
  {
    name: '道心',
    value: `${g.value.stats.daoXin}级`,
    description: '决定你能否跨过筑基门槛（10级）'
  },
  {
    name: '法力',
    value: g.value.stats.faLi.toFixed(1),
    description: '越高越能卷，越卷越离不开它'
  },
  {
    name: '肉体强度',
    value: `${g.value.stats.rouTi.toFixed(1)}级`,
    description: '炼体与实战的底盘，靠汗与代价换'
  },
  {
    name: '疲劳',
    value: Math.round(g.value.stats.fatigue),
    unit: '/100',
    description: '疲劳高会拖累效率，并更容易出问题',
    progressBar: {
      current: g.value.stats.fatigue,
      max: 100,
      variant: 'danger' as const
    }
  },
  {
    name: '专注',
    value: Math.round(g.value.stats.focus),
    unit: '/100',
    description: '专注影响"走神率"，也影响学习收益',
    progressBar: {
      current: g.value.stats.focus,
      max: 100,
      variant: 'gradient' as const
    }
  }
])

const tierColor = computed(() => {
  const t = g.value.school.classTier
  if (t === '示范班') return 'rgba(56,248,208,.18)'
  if (t === '末位班') return 'rgba(255,59,59,.14)'
  return 'rgba(255,255,255,.06)'
})

const contractPill = computed(() => {
  if (!g.value.contract.active) return '未请神'
  const p = Math.round(g.value.contract.progress)
  const v = Math.round(g.value.contract.vigilance)
  return `已请神 · 缠绕${p}% · 监工${v}`
})

/** PSY-01 D-08：契约旁单行副指标（驯化/麻木），不大面板 */
const psySubsidiaryLine = computed(() => Engine.formatPsySubsidiaryLine(g.value))

/** CLASS-03：仅提示制度记录的偏科趋势，不给出策略（冷反馈） */
const routeImbalancePill = computed(() => {
  const ss = g.value.scoreDayStreak ?? 0
  const cs = g.value.cashDayStreak ?? 0
  if (ss < 2 && cs < 2) return ''
  if (ss >= cs) return '系统记录：刷分路线偏科趋势'
  return '系统记录：打工路线偏科趋势'
})

/** PSY-03：三轨先到任一即可见入口 */
const summaryAvailable = computed(
  () => g.value.summaryUnlocked || Engine.shouldUnlockSummary(g.value)
)
const summarySnapshot = computed(() => Engine.buildSummarySnapshot(g.value))

function onSummaryConfirm() {
  acknowledgeSummaryAndContinue()
  if (typeof window !== 'undefined') {
    window.confirm('进度已写入当前槽位。继续下一天循环？')
  }
}

function onSummaryDismiss() {
  closeSummaryPanelWithoutMarking()
}

const actionEntries = computed<Array<{ id: ActionId; label: string; variant: 'primary' | 'secondary'; trend: string; note: string }>>(() => [
  { id: 'study', label: '上课/刷题', variant: 'primary', trend: actionTrendLabel('study'), note: '稳分' },
  { id: 'tuna', label: '吐纳', variant: 'primary', trend: actionTrendLabel('tuna'), note: '养气' },
  { id: 'train', label: '炼体', variant: 'primary', trend: actionTrendLabel('train'), note: '冲体' },
  { id: 'parttime', label: '打工', variant: 'secondary', trend: actionTrendLabel('parttime'), note: '补现' },
  { id: 'rest', label: '休息', variant: 'secondary', trend: actionTrendLabel('rest'), note: '回稳' },
  { id: 'buy', label: '买补给', variant: 'secondary', trend: actionTrendLabel('buy'), note: '短撑' }
])

function actionCopyForTrend(trend: string) {
  if (trend === '稳健') return '稳健'
  if (trend === '冒险') return '冒险'
  return '透支'
}

// Event for EventModal
const eventForModal = computed(() => {
  if (!g.value.pendingEvent) return null
  const pe = g.value.pendingEvent
  return {
    title: pe.title,
    body: pe.body,
    mandatory: pe.mandatory,
    tier: pe.tier,
    systemSummary: pe.systemSummary,
    systemDetails: pe.systemDetails,
    defaultOptionId: pe.defaultOptionId,
    options: pe.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      tone: opt.tone as 'normal' | 'danger' | 'primary'
    }))
  }
})

const isRepaymentModal = computed(() =>
  eventForModal.value?.title?.includes('用身体偿还') ?? false
)

const modalAccumulatedPayment = computed(() =>
  isRepaymentModal.value ? accumulatedMinPayment.value : undefined
)

const modalCurrentCash = computed(() =>
  isRepaymentModal.value ? g.value.econ.cash : undefined
)

const modalTotalDebt = computed(() =>
  isRepaymentModal.value
    ? (g.value.econ.coreDebt + g.value.econ.collectionFee + g.value.econ.debtPrincipal + g.value.econ.debtInterestAccrued)
    : undefined
)

function onBorrow(amt: number) {
  borrow(amt)
  showBorrow.value = false
}

function onRepay(amt: number) {
  repay(amt)
  showRepay.value = false
}

function quickSave(slot: 'slot1' | 'slot2' | 'slot3') {
  const label = slot === 'slot1' ? '存档1' : slot === 'slot2' ? '存档2' : '存档3'
  saveToSlot(slot, label)
  activeSlot.value = slot
}

watch(
  logsForPanel,
  (logs) => {
    if (!logs.length) {
      selectedLogId.value = null
      return
    }
    if (!selectedLogId.value || !logs.find((l) => l.id === selectedLogId.value)) {
      selectedLogId.value = logs[0].id
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="!started" class="Container">
    <Card padding="md">
      <h1 class="Title">还没开局</h1>
      <p class="Sub">先去配置开局信息，再开始这局。</p>
      <Button variant="primary" @click="navigateTo('/')">去开局</Button>
    </Card>
  </div>

  <div v-else class="Container GameScreen">
    <!-- Header -->
    <div class="Row GameScreen__header" style="align-items: baseline">
      <h1 class="Title">日程面板</h1>
      <Pill>{{ nextLabel }}</Pill>
      <Pill :style="{ background: tierColor }">
        分班：{{ g.school.classTier }} · 周{{ g.school.week - 1 || 1 }}
      </Pill>
      <Pill
        :style="{
          borderColor: g.contract.active ? 'rgba(255,79,122,.45)' : 'rgba(255,255,255,.12)',
          background: g.contract.active ? 'rgba(255,79,122,.08)' : 'rgba(0,0,0,.18)'
        }"
      >
        {{ contractPill }}
      </Pill>
      <Pill
        v-if="g.contract.active && psySubsidiaryLine"
        :style="{ borderColor: 'rgba(255,255,255,.18)', background: 'rgba(0,0,0,.22)', fontSize: '12px' }"
      >
        {{ psySubsidiaryLine }}
      </Pill>
      <Pill
        v-if="routeImbalancePill"
        :style="{ borderColor: 'rgba(255,255,255,.2)', background: 'rgba(0,0,0,.2)' }"
      >
        {{ routeImbalancePill }}
      </Pill>
      <span class="Spacer" />
      <Pill>存档：{{ activeSlot }}</Pill>
      <Button
        v-if="summaryAvailable"
        size="sm"
        variant="secondary"
        :disabled="actionsLocked"
        @click="openSummaryPanel"
      >
        总结
      </Button>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot1')">存1</Button>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot2')">存2</Button>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot3')">存3</Button>
      <Button size="sm" variant="ghost" @click="navigateTo('/')">回到开局页</Button>
    </div>
    
    <p class="Sub">
      你每一天有三段行动：清晨、午后、深夜。每段只能做一件事。第 7、14、21…天结算"月考"，决定待遇。
    </p>

    <!-- Phase 5：栅格区 — 窄屏顺序 stats → logs → debt → actions → perks → model（D-13～D-15） -->
    <div class="GamePage">
      <Card class="GamePage__stats" padding="md">
        <div class="Row">
          <Pill>角色</Pill>
          <Pill>{{ g.startConfig?.playerName }}</Pill>
          <Pill>城市：{{ g.startConfig?.startingCity }}</Pill>
          <span class="Spacer" />
          <Pill>出身：{{ g.startConfig?.background }}</Pill>
          <Pill>天赋：{{ g.startConfig?.talent }}</Pill>
        </div>

        <StatPanel
          :stats="playerStats"
          layout="grid"
          :columns="3"
          style="margin-top: 12px"
        />
      </Card>

      <div class="GamePage__model">
        <Card padding="md">
          <details ref="modelDetailsEl" class="ModelFold">
            <summary class="ModelFold__summary">人体模型（3D）</summary>
            <HumanModelViewer />
          </details>
        </Card>
      </div>

      <DebtDashboard
        class="GamePage__debt"
        :core-debt="g.econ.coreDebt || 0"
        :collection-fee="g.econ.collectionFee || 0"
        :principal="g.econ.debtPrincipal || 0"
        :interest="g.econ.debtInterestAccrued || 0"
        :daily-rate="g.econ.dailyRate || 0"
        :delinquency="g.econ.delinquency || 0"
        :min-payment="minPayment || 0"
        :cash="g.econ.cash || 0"
        @borrow="showBorrow = true"
        @repay="showRepay = true"
      />

      <Card class="GamePage__actions" padding="md">
        <div class="Row" style="margin-bottom: 12px">
          <Pill>行动</Pill>
          <span class="Spacer" />
          <Pill>
            上次月考：{{ g.school.lastExamScore || '未结算' }} ·
            排名：{{ g.school.lastRank === 999 ? '—' : `约第${g.school.lastRank}名` }}
          </Pill>
        </div>

        <div class="ActionGrid">
          <div
            v-for="entry in actionEntries"
            :key="entry.id"
            class="ActionItem"
          >
            <Button
              :variant="entry.variant"
              :disabled="actionsLocked"
              class="ActionButton"
              @click="act(entry.id)"
            >
              {{ entry.label }}
            </Button>
            <div class="ActionPreview">
              趋势：{{ actionCopyForTrend(entry.trend) }}（{{ entry.note }}） · 剩余时段：{{ remainingSlots }}
            </div>
          </div>
        </div>

        <div class="MonoSmall" style="margin-top: 10px">
          预览仅展示趋势（稳健 / 冒险 / 透支），不展示具体计算细节。行动结果会统一进入主日志。
        </div>
      </Card>

      <Card class="GamePage__logs" padding="md">
        <div class="Row">
          <Pill>日志</Pill>
          <Pill>最近 30 条</Pill>
        </div>
        <LogPanel
          :logs="logsForPanel"
          :selected-id="selectedLogId"
          @select="(id) => selectedLogId = id"
        />
      </Card>

      <Card class="GamePage__perks" padding="md">
        <div class="Row">
          <Pill>分班后果追踪</Pill>
          <span class="Spacer" />
          <Pill>餐补：¥{{ g.school.perks.mealSubsidy }}/天</Pill>
          <Pill>专注加成：{{ g.school.perks.focusBonus }}</Pill>
        </div>

        <div class="ClassDigestList">
          <div class="ClassDigestItem">
            <span class="ClassDigestLabel">本周分班变化</span>
            <span class="ClassDigestValue">{{ classPressureDigest.weeklyClassChange }}</span>
          </div>
          <div class="ClassDigestItem">
            <span class="ClassDigestLabel">下周待遇变化</span>
            <span class="ClassDigestValue">{{ classPressureDigest.nextWeekPerks }}</span>
          </div>
          <div class="ClassDigestItem">
            <span class="ClassDigestLabel">风险变化摘要</span>
            <span class="ClassDigestValue">{{ classPressureDigest.riskShiftSummary }}</span>
          </div>
        </div>

        <div class="MonoSmall" style="margin-top: 12px">
          系统仅提供制度记录，不提供最优路径。你只能在刷分与还债之间自行承担后果。
        </div>
      </Card>
    </div>

    <!-- Borrow Modal -->
    <BorrowModal
      :show="showBorrow"
      :daily-rate="g.econ.dailyRate"
      :total-debt="totalDebt"
      :credit-limit="creditLimit"
      @close="showBorrow = false"
      @confirm="onBorrow"
    />

    <!-- Repay Modal -->
    <RepayModal
      :show="showRepay"
      :min-payment="minPayment"
      :total-debt="totalDebt"
      :cash="g.econ.cash"
      :interest="g.econ.debtInterestAccrued"
      :collection-fee="g.econ.collectionFee"
      :principal="g.econ.debtPrincipal"
      :delinquency="g.econ.delinquency"
      @close="showRepay = false"
      @confirm="onRepay"
    />

    <!-- Event Modal -->
    <EventModal
      :event="eventForModal"
      :accumulated-payment="modalAccumulatedPayment"
      :current-cash="modalCurrentCash"
      :total-debt="modalTotalDebt"
      @resolve="resolveEvent"
      @dismiss="() => resolveEvent(dismissOptionId)"
    />

    <SummaryPanel
      :show="summaryPanelOpen"
      :snapshot="summarySnapshot"
      @confirm="onSummaryConfirm"
      @dismiss="onSummaryDismiss"
    />
  </div>
</template>

<style scoped>
/* Phase 5（SAVE-03）：三断点栅格 — 窄屏日志优先、3D 置底可折 */
.GameScreen {
  font-size: var(--font-body, 14px);
}

.GameScreen__header {
  flex-wrap: wrap;
  gap: 8px;
}

.GamePage {
  display: grid;
  gap: 14px;
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-areas:
    'stats debt'
    'model actions'
    'logs perks';
}

.GamePage__stats {
  grid-area: stats;
}
.GamePage__model {
  grid-area: model;
}
.GamePage__debt {
  grid-area: debt;
}
.GamePage__actions {
  grid-area: actions;
}
.GamePage__logs {
  grid-area: logs;
}
.GamePage__perks {
  grid-area: perks;
}

@media (max-width: 639px) {
  .GamePage {
    grid-template-columns: 1fr;
    grid-template-areas:
      'stats'
      'logs'
      'debt'
      'actions'
      'perks'
      'model';
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .GamePage {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.ModelFold {
  border: none;
}

.ModelFold__summary {
  cursor: pointer;
  font-size: var(--font-meta, 12px);
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 10px;
  list-style: none;
}

.ModelFold__summary::-webkit-details-marker {
  display: none;
}

@media (min-width: 640px) {
  .ModelFold__summary {
    display: none;
  }
  .ModelFold {
    display: block;
  }
}

.ActionGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ActionItem {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ActionButton {
  width: 100%;
  white-space: normal;
}

.ActionPreview {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.76);
  word-break: break-word;
}

.ClassDigestList {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 10px;
}

.ClassDigestItem {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
}

.ClassDigestLabel {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
}

.ClassDigestValue {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  text-align: right;
}

@media (max-width: 740px) {
  .ActionGrid {
    grid-template-columns: 1fr;
  }

  .ClassDigestItem {
    flex-direction: column;
    align-items: flex-start;
  }

  .ClassDigestLabel,
  .ClassDigestValue {
    white-space: normal;
    text-align: left;
  }
}
</style>
