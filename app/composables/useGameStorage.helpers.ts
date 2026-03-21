/**
 * Phase 5：纯函数与常量（可脱离 Nuxt 在 Vitest 中测）—— D-03、D-05、D-06
 */
import type { GameState } from '~/types/game'

/** D-03：与 localStorage 键 `kunxu_sim_save_v2` 并存的根级版本号 */
export const SAVE_SCHEMA_VERSION = 2

/** D-05：防抖窗口（毫秒） */
export const SAVE_DEBOUNCE_MS = 500

/**
 * D-06：活跃槽 + autosave 双写目标列表。
 * - 手动槽：同时写该槽与 autosave
 * - autosave 为活跃槽时仅写 autosave 一次
 */
type SlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3'

export function planDualWriteSlots(activeSlot: SlotId): SlotId[] {
  if (activeSlot === 'autosave') return ['autosave']
  return [activeSlot, 'autosave']
}

/**
 * D-05：尾部防抖 —— 多次 schedule 合并为一次 flush
 */
export function createDebouncedFlush(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn()
    }, ms)
  }
}

/** 序列化前确保根级含 saveSchemaVersion（D-03） */
export function serializeSaveContainer(container: Record<string, unknown>): string {
  return JSON.stringify({ ...container, saveSchemaVersion: SAVE_SCHEMA_VERSION })
}

/** loadFromSlot：整包损坏或槽位 state 不可信时拒绝注入 */
export function isLikelyValidGameState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  if (!o.school || typeof o.school !== 'object') return false
  if (!o.econ || typeof o.econ !== 'object') return false
  const school = o.school as Record<string, unknown>
  if (typeof school.day !== 'number') return false
  return true
}
