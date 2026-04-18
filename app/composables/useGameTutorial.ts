import { driver as Driver } from 'driver.js'
import type { Driver, DriveStep } from 'driver.js'

const TUTORIAL_STORAGE_KEY = 'xiuxian-tutorial-completed'
const TUTORIAL_VERSION = 1

export interface TutorialStep {
  id: string
  element: string
  title: string
  description: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

const defaultSteps: TutorialStep[] = [
  {
    id: 'debt-intro',
    element: '.GamePage__debt',
    title: '债务压力',
    description: '这是你的债务面板。总债务 = 制度欠款 + 本金 + 利息 + 系统费池。每周复利1.5%，打工收入的20%直接进入费用池。',
    side: 'left',
    align: 'center'
  },
  {
    id: 'daily-actions',
    element: '.GamePage__actions',
    title: '每日行动',
    description: '每天有3个时段（清晨/午后/深夜）。6种行动：上课刷题、吐纳、炼体、打工、买补给、休息。注意疲劳累积！',
    side: 'top',
    align: 'center'
  },
  {
    id: 'stats-panel',
    element: '.GamePage__stats',
    title: '角色属性',
    description: '道心决定能否筑基（10级）。法力影响效率。肉体强度靠炼体提升。疲劳和专注需要平衡管理。',
    side: 'right',
    align: 'center'
  },
  {
    id: 'class-tier',
    element: '.GamePage__header',
    title: '分班制度',
    description: '每周考试决定分班：≥600分进示范班（¥160餐补），540-599普通班，<540末位班（无餐补）。',
    side: 'bottom',
    align: 'center'
  },
  {
    id: 'log-panel',
    element: '.GamePage__logs',
    title: '日志记录',
    description: '这里记录你的每次选择后果。仔细阅读日志，了解自己的处境变化。',
    side: 'top',
    align: 'center'
  },
  {
    id: 'save-tip',
    element: '.GamePage__actions',
    title: '存档提示',
    description: '游戏自动存档（autosave），也可手动存档到slot1/2/3。遇到坏结局可以读档重来。',
    side: 'top',
    align: 'center'
  }
]

export function useGameTutorial() {
  const driverInstance = useState<Driver | null>('tutorial-driver', () => null)
  const isCompleted = useState<boolean>('tutorial-completed', () => false)

  function checkShouldShow(): boolean {
    if (import.meta.server) return false
    
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.version === TUTORIAL_VERSION && data.completed) {
          return false
        }
      } catch {
        // ignore parse errors
      }
    }
    return true
  }

  function buildSteps(steps: TutorialStep[]): DriveStep[] {
    return steps.map(step => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side,
        align: step.align
      }
    }))
  }

  function start() {
    if (!checkShouldShow()) return

    if (driverInstance.value) {
      driverInstance.value.destroy()
      driverInstance.value = null
    }

    driverInstance.value = Driver({
      animate: true,
      opacity: 0.75,
      padding: 10,
      allowClose: true,
      stageRadius: 8,
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
      showButtons: ['next', 'previous', 'close'],
      steps: buildSteps(defaultSteps),
      onCloseClick: () => {
        finishTutorial()
      }
    })

    driverInstance.value.drive()
  }

  function finishTutorial() {
    if (driverInstance.value) {
      driverInstance.value.destroy()
      driverInstance.value = null
    }
    
    isCompleted.value = true
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
      version: TUTORIAL_VERSION,
      completed: true,
      completedAt: Date.now()
    }))
  }

  function reset() {
    if (driverInstance.value) {
      driverInstance.value.destroy()
      driverInstance.value = null
    }
    
    isCompleted.value = false
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  }

  function isActive(): boolean {
    return driverInstance.value?.isActive() ?? false
  }

  return {
    start,
    finish: finishTutorial,
    reset,
    isActive,
    isCompleted
  }
}
