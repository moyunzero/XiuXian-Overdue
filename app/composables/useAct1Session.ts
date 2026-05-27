import { computed, ref, watch } from 'vue'
import { navigateTo } from '#app'
import type {
  Act1ModuleId,
  Act1PermanentModifiers,
  Act1State,
  Act1Todo,
  Act1WindowId,
  FamilyOutcome
} from '~/types/act1'
import type { StartConfig } from '~/types/game'
import type { SaveSlotId } from '~/composables/useGameStorage'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { normalizeAct1State } from '~/logic/act1/normalizeAct1State'
import { deriveAct1Modifiers } from '~/logic/act1/startConfigModifiers'
import { scoreInterview } from '~/logic/act1/scoreInterview'
import {
  buildEnrollmentFeeContract,
  buildLoanContract,
  DEFAULT_DRAW_AMOUNT,
  drawCredit,
  LOAN_COMPARE_MS_REQUIRED,
  pickDefaultProductId
} from '~/logic/act1/loanProducts'
import {
  applyCollectionChoice,
  applyFamilyExpense,
  applyFamilyOutcomeEffects,
  getCollectionBeat,
  shouldAutoFamilyLeft,
  type FamilyExpenseId
} from '~/logic/act1/familyLedger'
import {
  deriveMetaUnlocks,
  derivePermanentModifiers
} from '~/logic/act1/act1Settlement'
import { buildAct1Notifications } from '~/logic/act1/act1Notifications'
import {
  canCompleteModule,
  isModuleUnlocked,
  listCreditors,
  markModuleComplete,
  totalDebtPrincipal
} from '~/logic/act1/moduleProgress'
import { useAct1Storage } from '~/composables/useAct1Storage'

const WINDOW_LABELS: Record<Act1WindowId, string> = {
  interview: '入学面试',
  loan: '灵贷终端',
  family: '家庭账本',
  messages: '系统通知',
  recycle: '回收站'
}

const MODULE_WINDOWS: Act1WindowId[] = ['interview', 'loan', 'family']

const TODO_COPY: Record<string, Omit<Act1Todo, 'id'>> = {
  'todo-interview-open': { title: '完成入学面试登记', tone: 'warn', module: 'interview', blocking: true },
  'todo-loan-popup': { title: '处理灵贷弹窗与首笔借款', tone: 'danger', module: 'loan', blocking: true },
  'todo-family-ledger': { title: '核对家庭账本与家人去向', tone: 'warn', module: 'family', blocking: true }
}

export function useAct1Session() {
  const startConfig = useState<StartConfig | null>('act1StartConfig', () => null)
  const slotId = useState<SaveSlotId>('act1SlotId', () => 'slot1')
  const storage = useAct1Storage()

  const act1 = ref<Act1State | null>(null)
  const settled = ref(false)
  const metaUnlocks = ref<string[]>([])
  const permanentModifiers = ref<Act1PermanentModifiers>({})
  const ready = ref(false)
  const openWindows = ref<Act1WindowId[]>(['interview'])
  const activeWindow = ref<Act1WindowId>('interview')
  const mobileTab = ref<Act1WindowId>('interview')
  const showLoanPopup = ref(false)
  const priorMetaUnlocks = useState<string[]>('act1PriorMetaUnlocks', () => [])

  const modifiers = computed(() =>
    startConfig.value ? deriveAct1Modifiers(startConfig.value) : null
  )

  const todos = computed<Act1Todo[]>(() => {
    if (!act1.value) return []
    const base = act1.value.pendingTodos.map((id) => ({
      id,
      ...TODO_COPY[id],
      title: TODO_COPY[id]?.title ?? id
    }))
    if (
      act1.value.completedModules.includes('loan') &&
      !act1.value.completedModules.includes('family')
    ) {
      const beat = getCollectionBeat(act1.value)
      if (beat) {
        base.push({
          id: 'todo-collection-active',
          title: `催收：${beat.title}`,
          tone: 'danger',
          module: 'family',
          blocking: false
        })
      }
    }
    return base
  })

  const allModulesDone = computed(
    () => act1.value?.completedModules.length === 3
  )

  const persist = () => {
    if (!startConfig.value || !act1.value) return
    storage.saveAct1(slotId.value, {
      startConfig: startConfig.value,
      act1: act1.value,
      metaUnlocks: metaUnlocks.value,
      permanentModifiers: permanentModifiers.value,
      settled: settled.value
    })
  }

  const syncLoanPopup = () => {
    if (!act1.value) return
    const loanOpen =
      act1.value.completedModules.includes('interview') &&
      !act1.value.completedModules.includes('loan')
    showLoanPopup.value =
      loanOpen && !act1.value.loanMeta.popupAcknowledged && act1.value.pendingTodos.includes('todo-loan-popup')
  }

  const initSession = () => {
    if (!startConfig.value) {
      void navigateTo('/')
      return
    }
    const saved = storage.loadAct1(slotId.value)
    if (saved?.startConfig) {
      startConfig.value = saved.startConfig
      act1.value = normalizeAct1State(saved.act1)
      settled.value = saved.settled
      metaUnlocks.value = saved.metaUnlocks ?? []
      permanentModifiers.value = saved.permanentModifiers ?? {}
    } else {
      act1.value = createInitialAct1State(startConfig.value)
      settled.value = false
      persist()
    }
    if (openWindows.value.length === 0) {
      openWindows.value = ['interview']
    }
    activeWindow.value = openWindows.value.includes(activeWindow.value)
      ? activeWindow.value
      : openWindows.value[0]!
    mobileTab.value = activeWindow.value
    syncLoanPopup()
    ready.value = true
  }

  const openWindow = (id: Act1WindowId) => {
    if (MODULE_WINDOWS.includes(id) && act1.value && !isModuleUnlocked(act1.value, id as Act1ModuleId)) {
      return
    }
    if (!openWindows.value.includes(id)) openWindows.value = [...openWindows.value, id]
    activeWindow.value = id
    mobileTab.value = id
  }

  const closeWindow = (id: Act1WindowId) => {
    if (MODULE_WINDOWS.includes(id) && act1.value && !isModuleUnlocked(act1.value, id as Act1ModuleId)) {
      return
    }
    if (openWindows.value.length <= 1) return
    openWindows.value = openWindows.value.filter((w) => w !== id)
    if (activeWindow.value === id) {
      activeWindow.value = openWindows.value[openWindows.value.length - 1] ?? 'interview'
    }
  }

  const focusTodo = (todo: Act1Todo) => {
    if (todo.module) openWindow(todo.module)
  }

  const focusWindow = (id: Act1WindowId) => {
    activeWindow.value = id
    mobileTab.value = id
  }

  const submitInterview = (answers: Record<string, string>) => {
    if (!act1.value || !startConfig.value || !modifiers.value || !canCompleteModule(act1.value, 'interview')) {
      return
    }
    const { score, result, tags } = scoreInterview(answers, startConfig.value, modifiers.value)
    const mergedTags = [...new Set([...act1.value.profileTags, ...tags])]
    act1.value = markModuleComplete(
      {
        ...act1.value,
        interview: { completed: true, result, score, answers },
        profileTags: mergedTags,
        pressure: act1.value.pressure + (result === 'reject' ? 8 : 5)
      },
      'interview'
    )
    openWindow('loan')
    syncLoanPopup()
    persist()
  }

  const dismissLoanAd = () => {
    if (!act1.value) return
    const count = act1.value.loanMeta.adDismissCount + 1
    const tags = count >= 3 ? [...new Set([...act1.value.profileTags, 'ad-resistant'])] : act1.value.profileTags
    act1.value = {
      ...act1.value,
      loanMeta: { ...act1.value.loanMeta, adDismissCount: count, popupAcknowledged: true },
      profileTags: tags
    }
    showLoanPopup.value = false
    openWindow('loan')
    persist()
  }

  const acknowledgeLoanPopup = () => {
    if (!act1.value) return
    act1.value = {
      ...act1.value,
      loanMeta: { ...act1.value.loanMeta, popupAcknowledged: true }
    }
    showLoanPopup.value = false
    openWindow('loan')
    persist()
  }

  const trackLoanCompare = (deltaMs: number) => {
    if (!act1.value || act1.value.completedModules.includes('loan') || deltaMs <= 0) return
    const compareViewMs = act1.value.loanMeta.compareViewMs + deltaMs
    const reached = compareViewMs >= LOAN_COMPARE_MS_REQUIRED
    act1.value = {
      ...act1.value,
      loanMeta: {
        ...act1.value.loanMeta,
        compareViewMs,
        comparedProducts: act1.value.loanMeta.comparedProducts || reached
      },
      profileTags:
        reached && !act1.value.profileTags.includes('price-aware')
          ? [...new Set([...act1.value.profileTags, 'price-aware'])]
          : act1.value.profileTags
    }
    persist()
  }

  const markLoanCompared = () => {
    trackLoanCompare(LOAN_COMPARE_MS_REQUIRED)
  }

  const signLoan = (productId: string) => {
    if (!act1.value || !modifiers.value || !canCompleteModule(act1.value, 'loan')) return
    const id =
      productId ||
      pickDefaultProductId(act1.value.loanMeta.adDismissCount, act1.value.loanMeta.comparedProducts)
    const contract = buildLoanContract(
      id,
      modifiers.value,
      act1.value.interview.result,
      act1.value.profileTags,
      act1.value.day
    )
    if (!contract) return

    const enrollment = buildEnrollmentFeeContract(
      act1.value.interview.result,
      modifiers.value,
      act1.value.day
    )
    let loans = [...act1.value.loans, contract]
    if (enrollment) loans = [...loans, enrollment]

    const drawn = drawCredit(
      { creditLineUsed: act1.value.creditLineUsed, loans },
      DEFAULT_DRAW_AMOUNT,
      contract.id
    )

    const enrollmentCash = enrollment?.drawn ?? 0
    const pressureBump =
      12 + (enrollment ? 6 : 0) + (drawn.interestAdded > 0 ? 3 : 0)

    act1.value = markModuleComplete(
      {
        ...act1.value,
        cash: act1.value.cash + drawn.cashDelta + enrollmentCash,
        loans: drawn.loans,
        creditLineUsed: drawn.creditLineUsed,
        delinquency: act1.value.delinquency + 1,
        pressure: Math.min(100, act1.value.pressure + pressureBump),
        profileTags: enrollment
          ? [...new Set([...act1.value.profileTags, 'enrollment-fee-rider'])]
          : act1.value.profileTags,
        loanMeta: { ...act1.value.loanMeta, popupAcknowledged: true }
      },
      'loan'
    )
    showLoanPopup.value = false
    openWindow('family')
    persist()
  }

  const spendFamily = (expenseId: FamilyExpenseId) => {
    if (!act1.value || act1.value.completedModules.includes('family')) return
    act1.value = applyFamilyExpense(act1.value, expenseId)
    if (shouldAutoFamilyLeft(act1.value)) {
      finalizeFamily('left')
      return
    }
    persist()
  }

  const handleCollectionChoice = (choiceId: string) => {
    if (!act1.value || act1.value.completedModules.includes('family')) return
    const { state, forceOutcome } = applyCollectionChoice(act1.value, choiceId)
    act1.value = state
    if (forceOutcome) {
      finalizeFamily(forceOutcome)
      return
    }
    persist()
  }

  const finalizeFamily = (outcome: FamilyOutcome) => {
    if (!act1.value || !canCompleteModule(act1.value, 'family')) return
    const next = applyFamilyOutcomeEffects(act1.value, outcome)
    act1.value = markModuleComplete(next, 'family')
    metaUnlocks.value = deriveMetaUnlocks(act1.value)
    permanentModifiers.value = derivePermanentModifiers(act1.value)
    persist()
  }

  const finishSettlement = async () => {
    if (act1.value) {
      metaUnlocks.value = deriveMetaUnlocks(act1.value)
      permanentModifiers.value = derivePermanentModifiers(act1.value)
    }
    settled.value = true
    persist()
    await navigateTo('/')
  }

  const debtTotal = computed(() => (act1.value ? totalDebtPrincipal(act1.value) : 0))

  const creditors = computed(() => (act1.value ? listCreditors(act1.value) : []))

  const act1Notifications = computed(() =>
    act1.value ? buildAct1Notifications(act1.value) : []
  )

  watch(
    act1,
    () => {
      if (ready.value && act1.value) persist()
    },
    { deep: true }
  )

  return {
    startConfig,
    slotId,
    act1,
    settled,
    metaUnlocks,
    permanentModifiers,
    ready,
    openWindows,
    activeWindow,
    mobileTab,
    showLoanPopup,
    modifiers,
    todos,
    allModulesDone,
    debtTotal,
    WINDOW_LABELS,
    MODULE_WINDOWS,
    initSession,
    openWindow,
    closeWindow,
    focusWindow,
    focusTodo,
    isModuleUnlocked: (m: Act1ModuleId) => (act1.value ? isModuleUnlocked(act1.value, m) : false),
    submitInterview,
    dismissLoanAd,
    acknowledgeLoanPopup,
    markLoanCompared,
    trackLoanCompare,
    signLoan,
    creditors,
    priorMetaUnlocks,
    act1Notifications,
    spendFamily,
    handleCollectionChoice,
    finalizeFamily,
    finishSettlement
  }
}
