import { describe, it, expect, vi, beforeEach } from 'vitest'

const GESTURE_HANDLER_MODULE = '~/components/game/MobileGestureHandler.vue'

describe('MobileGestureHandler', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('swipe detection', () => {
    it('should detect right swipe exceeding threshold', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
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

    it('should not trigger on left swipe', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
      const { handleTouchStart, handleTouchMove, shouldShowSwipeHint } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 200, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 140, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldShowSwipeHint.value).toBe(false)
    })

    it('should not trigger on vertical swipe', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
      const { handleTouchStart, handleTouchMove, shouldShowSwipeHint } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 500 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 110, clientY: 400 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldShowSwipeHint.value).toBe(false)
    })
  })

  describe('execute threshold', () => {
    it('should trigger navigation when swipe exceeds execute threshold', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
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

    it('should not trigger navigation below execute threshold', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
      const { handleTouchStart, handleTouchMove, shouldExecuteSwipe } = useMobileState()

      const mockTouchStart = {
        touches: [{ clientX: 100, clientY: 200 } as Touch]
      } as TouchEvent

      const mockTouchMove = {
        touches: [{ clientX: 140, clientY: 210 } as Touch]
      } as TouchEvent

      handleTouchStart(mockTouchStart)
      handleTouchMove(mockTouchMove)

      expect(shouldExecuteSwipe.value).toBe(false)
    })
  })

  describe('progress calculation', () => {
    it('should calculate progress correctly at 50%', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
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

    it('should cap progress at 100%', async () => {
      const { useMobileState } = await import('~/composables/useMobileState')
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
})
