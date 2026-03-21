<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGame } from '~/composables/useGame'
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

const { game, activeSlot, saveToSlot, totalDebt, minPayment, accumulatedMinPayment, creditLimit, nextLabel, remainingSlots, actionTrendLabel, act, borrow, repay, resolveEvent } = useGame()

const showBorrow = ref(false)
const showRepay = ref(false)

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
  return {
    title: g.value.pendingEvent.title,
    body: g.value.pendingEvent.body,
    mandatory: g.value.pendingEvent.mandatory,
    options: g.value.pendingEvent.options.map(opt => ({
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

  <div v-else class="Container">
    <!-- Header -->
    <div class="Row" style="align-items: baseline">
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
      <span class="Spacer" />
      <Pill>存档：{{ activeSlot }}</Pill>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot1')">存1</Button>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot2')">存2</Button>
      <Button size="sm" :disabled="actionsLocked" @click="quickSave('slot3')">存3</Button>
      <Button size="sm" variant="ghost" @click="navigateTo('/')">回到开局页</Button>
    </div>
    
    <p class="Sub">
      你每一天有三段行动：清晨、午后、深夜。每段只能做一件事。第 7、14、21…天结算"月考"，决定待遇。
    </p>

    <!-- Main Content Grid -->
    <div class="Grid2" style="margin-top: 14px">
      <!-- Left Column: Character Stats + Human Model -->
      <div style="display: flex; flex-direction: column; gap: 14px">
        <Card padding="md">
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

        <Card padding="md">
          <div class="Row" style="margin-bottom: 10px">
            <Pill>人体状态</Pill>
          </div>
          <HumanModelViewer />
        </Card>
      </div>

      <!-- Right Column: Debt & Actions -->
      <div style="display: flex; flex-direction: column; gap: 14px">
        <DebtDashboard
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

        <Card padding="md">
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
      </div>
    </div>

    <!-- Bottom Grid: Logs & Perks -->
    <div class="Grid2" style="margin-top: 14px">
      <!-- Logs -->
      <Card padding="md">
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

      <!-- Perks & Strategy -->
      <Card padding="md">
        <div class="Row">
          <Pill>待遇（由分班决定）</Pill>
          <span class="Spacer" />
          <Pill>餐补：¥{{ g.school.perks.mealSubsidy }}/天</Pill>
          <Pill>专注加成：{{ g.school.perks.focusBonus }}</Pill>
        </div>

        <div class="MonoSmall" style="margin-top: 10px">
          - <b>示范班</b>：更稳定的餐补与专注优势，资源会更"像资源"。<br />
          - <b>普通班</b>：资源不缺但也不够，你会一直感觉差一口气。<br />
          - <b>末位班</b>：不是没资源，是资源要你先付出"尊严"和"风险"。
        </div>

        <Card variant="glass" padding="sm" style="margin-top: 12px">
          <div class="Label">建议策略（仅供第一局）</div>
          <div class="MonoSmall" style="margin-top: 8px">
            先用"上课/吐纳"稳住分数，再用"打工"补现金缺口。等你能维持周最低还款，再考虑炼体冲分。<br />
          </div>
        </Card>
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
      @dismiss="() => resolveEvent(eventForModal?.options[0]?.id || 'ok')"
    />
  </div>
</template>

<style scoped>
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

@media (max-width: 740px) {
  .ActionGrid {
    grid-template-columns: 1fr;
  }
}
</style>
