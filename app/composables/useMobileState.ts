import { ref, computed, onMounted, onUnmounted } from 'vue'

export type QuickAction = 'borrow' | 'repay' | 'sandbox' | 'summary' | null

export interface GestureState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  direction: 'left' | 'right' | 'up' | 'down' | null
  isActive: boolean
}

export interface MobileState {
  toolbarExpanded: boolean
  activeQuickAction: QuickAction
  gesture: GestureState
  isMobile: boolean
}

const SWIPE_THRESHOLD = 50
const SWIPE_EXECUTE_THRESHOLD = 100

const state = ref<MobileState>({
  toolbarExpanded: false,
  activeQuickAction: null,
  gesture: {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    direction: null,
    isActive: false
  },
  isMobile: false
})

let mobileMq: MediaQueryList | null = null

export function useMobileState() {
  const toolbarExpanded = computed({
    get: () => state.value.toolbarExpanded,
    set: (val: boolean) => {
      state.value.toolbarExpanded = val
      if (val) {
        state.value.activeQuickAction = null
      }
    }
  })

  const activeQuickAction = computed({
    get: () => state.value.activeQuickAction,
    set: (val: QuickAction) => {
      state.value.activeQuickAction = val
      if (val) {
        state.value.toolbarExpanded = false
      }
    }
  })

  const isMobile = computed(() => state.value.isMobile)

  const gesture = computed(() => state.value.gesture)

  const swipeProgress = computed(() => {
    const g = state.value.gesture
    if (!g.isActive || g.direction !== 'right') return 0
    const delta = g.currentX - g.startX
    return Math.min(delta / SWIPE_EXECUTE_THRESHOLD, 1)
  })

  const shouldShowSwipeHint = computed(() => {
    const g = state.value.gesture
    return g.isActive && g.direction === 'right' && (g.currentX - g.startX) > SWIPE_THRESHOLD
  })

  const shouldExecuteSwipe = computed(() => {
    const g = state.value.gesture
    return g.isActive && g.direction === 'right' && (g.currentX - g.startX) > SWIPE_EXECUTE_THRESHOLD
  })

  function expandToolbar() {
    state.value.toolbarExpanded = true
    state.value.activeQuickAction = null
  }

  function collapseToolbar() {
    state.value.toolbarExpanded = false
  }

  function openQuickAction(action: QuickAction) {
    state.value.activeQuickAction = action
    state.value.toolbarExpanded = false
  }

  function closeQuickAction() {
    state.value.activeQuickAction = null
  }

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    state.value.gesture = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction: null,
      isActive: true
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!state.value.gesture.isActive) return
    const touch = e.touches[0]
    if (!touch) return

    const deltaX = touch.clientX - state.value.gesture.startX
    const deltaY = touch.clientY - state.value.gesture.startY

    let direction: 'left' | 'right' | 'up' | 'down' | null = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    state.value.gesture.currentX = touch.clientX
    state.value.gesture.currentY = touch.clientY
    state.value.gesture.direction = direction
  }

  function handleTouchEnd() {
    state.value.gesture.isActive = false
  }

  function resetGesture() {
    state.value.gesture = {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      direction: null,
      isActive: false
    }
  }

  function syncMobileStatus() {
    if (!mobileMq) return
    state.value.isMobile = mobileMq.matches
  }

  onMounted(() => {
    if (import.meta.server) return
    mobileMq = window.matchMedia('(max-width: 767px)')
    syncMobileStatus()
    mobileMq.addEventListener('change', syncMobileStatus)
  })

  onUnmounted(() => {
    mobileMq?.removeEventListener('change', syncMobileStatus)
  })

  return {
    state: readonly(state),
    toolbarExpanded,
    activeQuickAction,
    isMobile,
    gesture,
    swipeProgress,
    shouldShowSwipeHint,
    shouldExecuteSwipe,
    expandToolbar,
    collapseToolbar,
    openQuickAction,
    closeQuickAction,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetGesture,
    SWIPE_THRESHOLD,
    SWIPE_EXECUTE_THRESHOLD
  }
}

function readonly<T extends object>(val: T): Readonly<T> {
  return val as Readonly<T>
}
