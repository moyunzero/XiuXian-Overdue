import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const MOBILE_STATE_MODULE = '~/composables/useMobileState'

describe('useMobileState', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial toolbar state', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const {
        toolbarExpanded,
        activeQuickAction,
        isMobile,
        gesture
      } = useMobileState()

      expect(toolbarExpanded.value).toBe(false)
      expect(activeQuickAction.value).toBe(null)
      expect(isMobile.value).toBe(false)
      expect(gesture.value.isActive).toBe(false)
    })
  })

  describe('toolbar expansion', () => {
    it('should expand toolbar when expandToolbar is called', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { expandToolbar, toolbarExpanded } = useMobileState()

      expandToolbar()
      expect(toolbarExpanded.value).toBe(true)
    })

    it('should close quick action when expanding toolbar', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { expandToolbar, activeQuickAction } = useMobileState()

      expandToolbar()
      expect(activeQuickAction.value).toBe(null)
    })

    it('should collapse toolbar when collapseToolbar is called', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { expandToolbar, collapseToolbar, toolbarExpanded } = useMobileState()

      expandToolbar()
      collapseToolbar()
      expect(toolbarExpanded.value).toBe(false)
    })
  })

  describe('quick actions', () => {
    it('should open quick action when openQuickAction is called', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { openQuickAction, activeQuickAction } = useMobileState()

      openQuickAction('borrow')
      expect(activeQuickAction.value).toBe('borrow')
    })

    it('should close toolbar when opening quick action', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { openQuickAction, expandToolbar, toolbarExpanded } = useMobileState()

      expandToolbar()
      openQuickAction('repay')
      expect(toolbarExpanded.value).toBe(false)
    })

    it('should close quick action when closeQuickAction is called', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { openQuickAction, closeQuickAction, activeQuickAction } = useMobileState()

      openQuickAction('borrow')
      closeQuickAction()
      expect(activeQuickAction.value).toBe(null)
    })

    it('should accept all valid quick action types', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { openQuickAction, activeQuickAction } = useMobileState()

      const actions: Array<'borrow' | 'repay' | 'sandbox' | 'summary'> = [
        'borrow', 'repay', 'sandbox', 'summary'
      ]

      for (const action of actions) {
        openQuickAction(action)
        expect(activeQuickAction.value).toBe(action)
      }
    })
  })

  describe('gesture detection', () => {
    it('should detect right swipe direction', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, gesture } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 180, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(gesture.value.direction).toBe('right')
      expect(gesture.value.isActive).toBe(true)
    })

    it('should detect left swipe direction', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, gesture } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 200, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 120, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(gesture.value.direction).toBe('left')
    })

    it('should detect vertical swipe direction', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, gesture } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 500 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 110, clientY: 400 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(gesture.value.direction).toBe('up')
    })

    it('should reset gesture when handleTouchEnd is called', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchEnd, gesture, resetGesture } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      expect(gesture.value.isActive).toBe(true)

      handleTouchEnd()
      expect(gesture.value.isActive).toBe(false)
    })

    it('should calculate swipe progress correctly', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, swipeProgress } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 150, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(swipeProgress.value).toBe(0.5)
    })

    it('should cap swipe progress at 1', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, swipeProgress } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 300, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(swipeProgress.value).toBe(1)
    })
  })

  describe('swipe hints and execution', () => {
    it('should show swipe hint when threshold exceeded', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, shouldShowSwipeHint } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 160, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldShowSwipeHint.value).toBe(true)
    })

    it('should not show swipe hint below threshold', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, shouldShowSwipeHint } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 130, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldShowSwipeHint.value).toBe(false)
    })

    it('should indicate execute swipe when execute threshold exceeded', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { handleTouchStart, handleTouchMove, shouldExecuteSwipe } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 220, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldExecuteSwipe.value).toBe(true)
    })
  })

  describe('threshold constants', () => {
    it('should have correct SWIPE_THRESHOLD', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { SWIPE_THRESHOLD } = useMobileState()

      expect(SWIPE_THRESHOLD).toBe(50)
    })

    it('should have correct SWIPE_EXECUTE_THRESHOLD', async () => {
      const { useMobileState } = await import(MOBILE_STATE_MODULE)
      const { SWIPE_EXECUTE_THRESHOLD } = useMobileState()

      expect(SWIPE_EXECUTE_THRESHOLD).toBe(100)
    })
  })
})
