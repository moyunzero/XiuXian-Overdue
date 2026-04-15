import { ref, computed } from 'vue'

export interface TutorialStep {
  id: string
  title: string
  content: string
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TUTORIAL_STORAGE_KEY = 'xiuxian-tutorial-completed'
const TUTORIAL_VERSION = 1

const tutorialSteps: TutorialStep[] = [
  {
    id: 'debt-intro',
    title: '债务压力',
    content: '你背负着高额债务，日息不断累积。每周利息复利1.5%，还有系统费（五险一金）强制扣除。打工收入的20%直接进入费用池。',
    targetSelector: '.DebtDashboard',
    position: 'left'
  },
  {
    id: 'daily-actions',
    title: '每日行动',
    content: '每天有3个时段（清晨/午后/深夜）。6种行动：上课刷题（法力+专注+）、吐纳（法力+专注-）、炼体（肉体+疲劳++）、打工（现金+专注-）、买补给（专注+疲劳-）、休息（疲劳恢复）。注意疲劳累积！',
    targetSelector: '.ActionGrid, .MobileActionGrid',
    position: 'top'
  },
  {
    id: 'time-slots',
    title: '时段分配',
    content: '每天3个时段，上午→下午→深夜，用完即进入下一天。合理分配刷分与打工时间，是生存的关键。',
    targetSelector: '.GamePage__header',
    position: 'bottom'
  },
  {
    id: 'class-tier',
    title: '分班制度',
    content: '每周考试决定分班：≥600分进示范班（¥160餐补），540-599普通班，<540末位班（无餐补）。分班影响学习效率和债务惩罚上限。',
    targetSelector: '.StatPanel__tier',
    position: 'right'
  },
  {
    id: 'contract-warning',
    title: '请神契约',
    content: '借贷可解燃眉之急，但请神契约有反噬风险。休息时可能触发"麻木"，长期高压会累积"驯化值"。量力而行，切勿透支！',
    targetSelector: '.GamePage__contract',
    position: 'bottom'
  },
  {
    id: 'save-tip',
    title: '存档提示',
    content: '游戏自动存档在autosave槽位，也可手动存档到slot1/2/3。遇到坏结局可以读档重来。记住：债务会复利，时间不等人。',
    targetSelector: '.GamePage__footer',
    position: 'top'
  }
]

export function useGameTutorial() {
  const currentStepIndex = ref(-1)
  const isActive = ref(false)
  const isCompleted = ref(false)

  const currentStep = computed(() => {
    if (currentStepIndex.value < 0 || currentStepIndex.value >= tutorialSteps.length) {
      return null
    }
    return tutorialSteps[currentStepIndex.value]
  })

  const totalSteps = computed(() => tutorialSteps.length)

  const progress = computed(() => {
    if (currentStepIndex.value < 0) return 0
    return ((currentStepIndex.value + 1) / totalSteps.value) * 100
  })

  function checkShouldShow(): boolean {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.version === TUTORIAL_VERSION && data.completed) {
        return false
      }
    }
    return true
  }

  function start() {
    if (!checkShouldShow()) return
    currentStepIndex.value = 0
    isActive.value = true
    isCompleted.value = false
  }

  function next() {
    if (currentStepIndex.value < tutorialSteps.length - 1) {
      currentStepIndex.value++
    } else {
      complete()
    }
  }

  function prev() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function skip() {
    complete()
  }

  function complete() {
    isActive.value = false
    isCompleted.value = true
    currentStepIndex.value = -1
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
      version: TUTORIAL_VERSION,
      completed: true,
      completedAt: Date.now()
    }))
  }

  function reset() {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
    isCompleted.value = false
    currentStepIndex.value = -1
    isActive.value = false
  }

  return {
    tutorialSteps,
    currentStep,
    currentStepIndex,
    totalSteps,
    progress,
    isActive,
    isCompleted,
    start,
    next,
    prev,
    skip,
    complete,
    reset
  }
}
