<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGame } from '~/composables/useGame'
import { navigateTo } from '#app'
import StatPanel from '~/components/game/StatPanel.vue'
import LogPanel from '~/components/game/LogPanel.vue'
import DebtDashboard from '~/components/game/DebtDashboard.vue'
import EventModal from '~/components/game/EventModal.vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'
import HumanModelViewer from '~/components/game/HumanModelViewer.vue'

const { game, activeSlot, saveToSlot, totalDebt, minPayment, accumulatedMinPayment, nextLabel, act, borrow, repay, resolveEvent } = useGame()

const showBorrow = ref(false)
const showRepay = ref(false)
const borrowAmt = ref(5000)
const repayAmt = ref(1000)

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
  isRepaymentModal.value ? (g.value.econ.debtPrincipal + g.value.econ.debtInterestAccrued) : undefined
)

function onBorrow() {
  borrow(borrowAmt.value)
  showBorrow.value = false
}

function onRepay() {
  repay(repayAmt.value)
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

          <div class="Row" style="gap: 8px; flex-wrap: wrap">
            <Button variant="primary" :disabled="actionsLocked" @click="act('study')">
              上课/刷题
            </Button>
            <Button variant="primary" :disabled="actionsLocked" @click="act('tuna')">
              吐纳
            </Button>
            <Button variant="primary" :disabled="actionsLocked" @click="act('train')">
              炼体
            </Button>
            <Button variant="secondary" :disabled="actionsLocked" @click="act('parttime')">
              打工
            </Button>
            <Button variant="secondary" :disabled="actionsLocked" @click="act('rest')">
              休息
            </Button>
            <Button variant="secondary" :disabled="actionsLocked" @click="act('buy')">
              买补给
            </Button>
          </div>

          <div class="MonoSmall" style="margin-top: 10px">
            每段行动都会改变疲劳/专注，并可能触发随机事件。最恶心的不是事件本身，而是它会在你最缺钱、最缺时间的时候出现。
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
    <div v-if="showBorrow" class="ModalBackdrop" @click.self="showBorrow = false">
      <div class="Modal">
        <div class="ModalHead">
          <div class="ModalTitle">借贷</div>
          <Pill>日利率 {{ (g.econ.dailyRate * 100).toFixed(2) }}%</Pill>
          <span class="Spacer" />
          <Button variant="ghost" size="sm" @click="showBorrow = false">关闭</Button>
        </div>
        <div class="ModalBody">
          <div class="MonoSmall">
            你当然知道借贷会让未来更窒息。你也知道不借贷，今天就会先窒息。
          </div>
          <div class="Grid2" style="margin-top: 12px">
            <div>
              <div class="Label">借款金额</div>
              <input v-model.number="borrowAmt" class="Field" type="number" min="0" step="100" />
            </div>
            <div>
              <div class="Label">快捷</div>
              <div class="Row" style="margin-top: 6px">
                <Button size="sm" @click="borrowAmt = 1000">¥1,000</Button>
                <Button size="sm" @click="borrowAmt = 5000">¥5,000</Button>
                <Button size="sm" @click="borrowAmt = 20000">¥20,000</Button>
              </div>
            </div>
          </div>
          <div class="Row" style="margin-top: 12px">
            <Button variant="primary" @click="onBorrow">确认借贷</Button>
            <span class="Spacer" />
            <Pill>当前债务：¥{{ Math.floor(totalDebt).toLocaleString() }}</Pill>
          </div>
        </div>
      </div>
    </div>

    <!-- Repay Modal -->
    <div v-if="showRepay" class="ModalBackdrop" @click.self="showRepay = false">
      <div class="Modal">
        <div class="ModalHead">
          <div class="ModalTitle">还款</div>
          <Pill>最低周还款 ¥{{ minPayment.toLocaleString() }}</Pill>
          <span class="Spacer" />
          <Button variant="ghost" size="sm" @click="showRepay = false">关闭</Button>
        </div>
        <div class="ModalBody">
          <div class="MonoSmall">优先偿还利息。你每一次"止血"，都会留下更深的疤。</div>
          <div class="Grid2" style="margin-top: 12px">
            <div>
              <div class="Label">还款金额</div>
              <input v-model.number="repayAmt" class="Field" type="number" min="0" step="100" />
            </div>
            <div>
              <div class="Label">快捷</div>
              <div class="Row" style="margin-top: 6px">
                <Button size="sm" @click="repayAmt = 280">¥280</Button>
                <Button size="sm" @click="repayAmt = 1000">¥1,000</Button>
                <Button size="sm" @click="repayAmt = 5000">¥5,000</Button>
                <Button size="sm" @click="repayAmt = minPayment">最低周还款</Button>
              </div>
            </div>
          </div>
          <div class="Row" style="margin-top: 12px">
            <Button variant="primary" :disabled="totalDebt <= 0" @click="onRepay">确认还款</Button>
            <span class="Spacer" />
            <Pill>现金：¥{{ Math.floor(g.econ.cash).toLocaleString() }}</Pill>
            <Pill>债务：¥{{ Math.floor(totalDebt).toLocaleString() }}</Pill>
          </div>
        </div>
      </div>
    </div>

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
</style>
