<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { Act1Modifiers, Act1State } from '~/types/act1'
import {
  DEFAULT_DRAW_AMOUNT,
  LOAN_COMPARE_MS_REQUIRED,
  LOAN_PRODUCTS,
  loanBalance
} from '~/logic/act1/loanProducts'
import { buildLoanInstitutionalNotes } from '~/logic/act1/metaUnlockLabels'

const props = defineProps<{
  act1: Act1State
  modifiers: Act1Modifiers
  priorMetaUnlocks?: string[]
}>()

const emit = defineEmits<{
  compare: []
  compareTick: [deltaMs: number]
  sign: [productId: string]
}>()

const selectedId = ref(LOAN_PRODUCTS[0]!.id)
const scrolledToEnd = ref(false)
const agreed = ref(false)
const compareMsLocal = ref(props.act1.loanMeta.compareViewMs)
let compareTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.act1.loanMeta.compareViewMs,
  (ms) => {
    compareMsLocal.value = ms
  }
)

const compareProgress = computed(() =>
  Math.min(100, Math.round((compareMsLocal.value / LOAN_COMPARE_MS_REQUIRED) * 100))
)

const compareDone = computed(() => compareMsLocal.value >= LOAN_COMPARE_MS_REQUIRED)

const needsEnrollmentRider = computed(
  () =>
    props.act1.interview.result === 'conditional' ||
    props.act1.interview.result === 'special' ||
    props.act1.interview.result === 'reject'
)

const contractClauses = [
  '第 1 条 额度动用即记入征信，系统有权向招办、灵贷中心及关联催收方共享。',
  '第 2 条 附条件录取、借读或特招通道者，须同步签署《借读费分期附件》，不得单独撤销。',
  '第 3 条 关闭推广不构成拒贷，但可能影响后续推送档位与展示利率。',
  '第 4 条 机构保留单方面调整费率、违约金计算方式之权利，无需另行征得借款人同意。',
  '第 5 条 动用额度后，还款日以前台展示为准；逾期将触发联系人升级链。',
  '第 6 条 借款人确认已阅读全部产品对比表及风险提示，并放弃以「误以为免息」为由抗辩。',
  '第 7 条 争议解决：提交至机构指定仲裁通道，借款人承担举证不能之不利后果。',
  '第 8 条 本合同电子签章与纸质签章具有同等效力；签署即视为同意全部附件。'
]

const contractText = computed(() => {
  const p = LOAN_PRODUCTS.find((x) => x.id === selectedId.value)
  if (!p) return ''
  const rate = (p.baseDailyRate * props.modifiers.regionRateMultiplier * 100).toFixed(2)
  const lines = [
    `借款人：你（电子签）`,
    `产品：${p.displayName}`,
    `授信额度：¥${p.principal.toLocaleString()}`,
    `本次动用：¥${DEFAULT_DRAW_AMOUNT.toLocaleString()}`,
    `免息天数：${p.graceDays}`,
    `基准日息：约 ${rate}%（含地区系数 ${props.modifiers.regionRateMultiplier}）`,
    `违约金：${p.penaltyNote}`,
    '',
    ...contractClauses,
    '',
    needsEnrollmentRider.value
      ? '【附件】借读费分期将在主合同签署时同步挂载，首期将自动记入负债。'
      : '',
    '（请滚动至底部后勾选同意）'
  ]
  return lines.filter(Boolean).join('\n')
})

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  scrolledToEnd.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
}

function startCompareTimer() {
  if (compareTimer || props.act1.completedModules.includes('loan')) return
  compareTimer = setInterval(() => {
    compareMsLocal.value += 1000
    emit('compareTick', 1000)
    if (compareMsLocal.value >= LOAN_COMPARE_MS_REQUIRED) {
      emit('compare')
      stopCompareTimer()
    }
  }, 1000)
}

function stopCompareTimer() {
  if (compareTimer) {
    clearInterval(compareTimer)
    compareTimer = null
  }
}

onUnmounted(stopCompareTimer)

const canSign = computed(() => scrolledToEnd.value && agreed.value && !props.act1.completedModules.includes('loan'))

const institutionalNotes = computed(() => buildLoanInstitutionalNotes(props.priorMetaUnlocks ?? []))
</script>

<template>
  <div class="LoanModule">
    <template v-if="!act1.completedModules.includes('loan')">
      <div v-if="institutionalNotes.length" class="LoanModule__notes">
        <p v-for="(note, i) in institutionalNotes" :key="i" class="LoanModule__note">{{ note }}</p>
      </div>
      <p class="Act1Copy">灵贷中心 · 请对比后签约。对比表累计阅读满 30 秒记入「比价」标签。</p>

      <div
        class="LoanModule__table-wrap"
        @mouseenter="startCompareTimer"
        @mouseleave="stopCompareTimer"
        @focusin="startCompareTimer"
        @focusout="stopCompareTimer"
      >
        <p class="LoanModule__compare-hint">
          比价阅读：{{ compareDone ? '已达标' : `${compareProgress}%` }}
          <span v-if="!compareDone">（鼠标悬停对比表累计计时）</span>
        </p>
        <table class="LoanModule__table">
          <thead>
            <tr>
              <th scope="col">产品</th>
              <th scope="col">授信</th>
              <th scope="col">免息</th>
              <th scope="col">基准日息</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in LOAN_PRODUCTS"
              :key="p.id"
              :class="{ 'LoanModule__row--selected': selectedId === p.id }"
              @click="selectedId = p.id"
            >
              <td>
                <label class="LoanModule__radio">
                  <input v-model="selectedId" type="radio" :value="p.id" name="loan-product" />
                  {{ p.displayName }}
                </label>
                <span class="LoanModule__tagline">{{ p.marketingLine }}</span>
              </td>
              <td>¥{{ p.principal.toLocaleString() }}</td>
              <td>{{ p.graceDays }} 天</td>
              <td>{{ (p.baseDailyRate * 100).toFixed(2) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="needsEnrollmentRider" class="Act1Copy Act1Copy--warn">
        面试结论要求同步签署借读费分期附件；签约主合同后将自动挂载。
      </p>

      <div class="LoanModule__contract">
        <h4 class="LoanModule__contract-title">电子合同（只读）</h4>
        <pre class="LoanModule__contract-body" @scroll="onScroll">{{ contractText }}</pre>
        <label class="LoanModule__check">
          <input v-model="agreed" type="checkbox" :disabled="!scrolledToEnd" />
          我已阅读并同意全部条款（须先滚到底部）
        </label>
        <button type="button" class="Act1Action" :disabled="!canSign" @click="emit('sign', selectedId)">
          签署并动用 ¥{{ DEFAULT_DRAW_AMOUNT.toLocaleString() }} 额度
        </button>
      </div>
    </template>

    <template v-else>
      <p class="Act1Copy Act1Copy--ok">首贷已签约。债权人列表：</p>
      <ul class="Act1List">
        <li v-for="loan in act1.loans" :key="loan.id">
          {{ loan.lenderName }} · 欠款 ¥{{ loanBalance(loan).toLocaleString() }}
          <span class="LoanModule__loan-detail">
            （动用 ¥{{ loan.drawn.toLocaleString() }} · 日息 {{ (loan.dailyRate * 100).toFixed(2) }}% · 免息剩余
            {{ loan.graceDaysLeft }} 天）
          </span>
        </li>
      </ul>
      <p class="Act1Copy Act1Copy--muted">累计动用额度 ¥{{ act1.creditLineUsed.toLocaleString() }}</p>
    </template>
  </div>
</template>

<style scoped>
.LoanModule__notes {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 210, 74, 0.35);
  border-radius: 6px;
  background: rgba(255, 210, 74, 0.06);
}
.LoanModule__note {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--warning);
  line-height: 1.5;
}
.LoanModule__note:last-child {
  margin-bottom: 0;
}
.LoanModule__table-wrap {
  overflow-x: auto;
  margin-bottom: 16px;
}
.LoanModule__compare-hint {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--text-muted);
}
.LoanModule__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.LoanModule__table th,
.LoanModule__table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-default);
  text-align: left;
  vertical-align: top;
}
.LoanModule__row--selected {
  background: rgba(0, 255, 255, 0.06);
}
.LoanModule__radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.LoanModule__tagline {
  display: block;
  margin-top: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.LoanModule__contract {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
}
.LoanModule__contract-title {
  margin: 0 0 8px;
  font-size: var(--text-sm);
  font-family: var(--mono);
  color: var(--text-secondary);
}
.LoanModule__contract-body {
  max-height: 200px;
  overflow-y: auto;
  margin: 0 0 10px;
  padding: 10px;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--text-muted);
  white-space: pre-wrap;
  border: 1px solid var(--border-default);
  border-radius: 4px;
}
.LoanModule__check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.LoanModule__loan-detail {
  display: block;
  margin-top: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.Act1Copy--warn {
  color: var(--warning);
  font-size: var(--text-sm);
}
</style>
