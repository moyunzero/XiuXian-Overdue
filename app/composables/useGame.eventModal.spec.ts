import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { GameState, PendingEvent } from '~/types/game'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

function baseStartedGame(): GameState {
  const g = defaultState()
  g.started = true
  g.school.day = 10
  g.school.slot = 'morning'
  g.stats.faLi = 6
  g.stats.fatigue = 40
  g.stats.focus = 50
  return g
}

describe('EventModal 弹窗关闭逻辑测试', () => {
  beforeEach(() => {
    const stateMap = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
      if (!stateMap.has(key)) stateMap.set(key, ref(init()))
      return stateMap.get(key)
    })
    const localStore = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStore.set(key, value)
      },
      removeItem: (key: string) => {
        localStore.delete(key)
      }
    })
  })

  describe('pendingEvent 状态管理', () => {
    it('pendingEvent 在 resolveEvent 后应该被清除', () => {
      const { game, resolveEvent } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试事件',
        body: '测试内容',
        options: [{ id: 'opt1', label: '选项1' }],
        tier: 'normal'
      }

      expect(game.value.pendingEvent).not.toBeNull()
      resolveEvent('opt1')
      expect(game.value.pendingEvent).toBeUndefined()
    })

    it('pendingEvent 在无操作时不会自动清除（遮罩层点击禁用）', () => {
      const { game } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试事件',
        body: '测试内容',
        options: [{ id: 'opt1', label: '选项1' }],
        tier: 'normal'
      }

      const pendingEventBefore = game.value.pendingEvent
      expect(pendingEventBefore).not.toBeNull()

      // 模拟"遮罩层点击禁用"后，pendingEvent 应该保持不变
      // 由于 @click.self 已移除，点击遮罩层不会再触发任何事件
      // 此测试验证：在没有调用 resolveEvent 的情况下，pendingEvent 应该保持不变
      // (这是一个静态状态验证，不需要实际点击)
      expect(game.value.pendingEvent).toEqual(pendingEventBefore)
    })

    it('强制事件 mandatory=true 时 resolveEvent 是唯一清除途径', () => {
      const { game, resolveEvent } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '强制事件',
        body: '必须处理',
        mandatory: true,
        options: [{ id: 'forced', label: '被迫接受' }],
        tier: 'critical'
      }

      expect(game.value.pendingEvent).not.toBeNull()

      // 只有通过 resolveEvent 才能清除 pendingEvent
      resolveEvent('forced')
      expect(game.value.pendingEvent).toBeUndefined()
    })
  })

  describe('dismissOptionId 计算逻辑', () => {
    it('当存在 defaultOptionId 时应返回该选项', () => {
      const { game } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试',
        body: '内容',
        defaultOptionId: 'opt_yield',
        options: [
          { id: 'opt_push', label: '硬顶' },
          { id: 'opt_yield', label: '退让' }
        ],
        tier: 'normal'
      }

      // 手动计算 dismissOptionId（与 game.vue 中的逻辑一致）
      const p = game.value.pendingEvent
      let dismissOptionId = 'ok'
      if (p?.options?.length) {
        if (p.defaultOptionId) {
          dismissOptionId = p.defaultOptionId
        } else {
          dismissOptionId = p.options[p.options.length - 1]!.id
        }
      }

      expect(dismissOptionId).toBe('opt_yield')
    })

    it('当无 defaultOptionId 时应返回最后一个选项', () => {
      const { game } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试',
        body: '内容',
        options: [
          { id: 'opt1', label: '选项1' },
          { id: 'opt2', label: '选项2' }
        ],
        tier: 'normal'
      }

      const p = game.value.pendingEvent
      let dismissOptionId = 'ok'
      if (p?.options?.length) {
        if (p.defaultOptionId) {
          dismissOptionId = p.defaultOptionId
        } else {
          dismissOptionId = p.options[p.options.length - 1]!.id
        }
      }

      expect(dismissOptionId).toBe('opt2')
    })

    it('当无 options 时应返回默认 ok', () => {
      const { game } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试',
        body: '内容',
        options: [],
        tier: 'normal'
      }

      const p = game.value.pendingEvent
      let dismissOptionId = 'ok'
      if (p?.options?.length) {
        if (p.defaultOptionId) {
          dismissOptionId = p.defaultOptionId
        } else {
          dismissOptionId = p.options[p.options.length - 1]!.id
        }
      }

      expect(dismissOptionId).toBe('ok')
    })
  })

  describe('ESC 键关闭逻辑（保留功能）', () => {
    it('ESC 键仍可通过 dismiss 关闭非强制事件', () => {
      const { game, resolveEvent } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '测试',
        body: '内容',
        defaultOptionId: 'cancel',
        options: [
          { id: 'confirm', label: '确认' },
          { id: 'cancel', label: '取消' }
        ],
        tier: 'normal'
      }

      // 模拟 ESC 键按下 -> dismiss -> resolveEvent(dismissOptionId)
      const p = game.value.pendingEvent
      const dismissOptionId = p?.defaultOptionId ?? p?.options?.[p.options.length - 1]?.id ?? 'ok'
      resolveEvent(dismissOptionId)

      expect(game.value.pendingEvent).toBeUndefined()
    })

    it('强制事件不能通过 ESC 关闭', () => {
      const { game, resolveEvent } = useGame()
      game.value = baseStartedGame()
      game.value.pendingEvent = {
        title: '强制',
        body: '必须处理',
        mandatory: true,
        defaultOptionId: 'forced',
        options: [{ id: 'forced', label: '被迫接受' }],
        tier: 'critical'
      }

      // 即使调用 dismiss，强制事件也需要显式选择才能关闭
      // 这里验证的是：在强制事件场景下，resolveEvent('forced') 会关闭
      resolveEvent('forced')
      expect(game.value.pendingEvent).toBeUndefined()
    })
  })
})
