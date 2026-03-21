/**
 * Phase 5 — D-03、D-05、D-06：双写、防抖、saveSchemaVersion
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SAVE_SCHEMA_VERSION,
  SAVE_DEBOUNCE_MS,
  planDualWriteSlots,
  createDebouncedFlush,
  serializeSaveContainer
} from './useGameStorage.helpers'

describe('planDualWriteSlots (D-06)', () => {
  it('slot2 含 slot2 与 autosave', () => {
    expect(planDualWriteSlots('slot2')).toEqual(['slot2', 'autosave'])
  })
  it('autosave 仅 autosave', () => {
    expect(planDualWriteSlots('autosave')).toEqual(['autosave'])
  })
})

describe('serializeSaveContainer (D-03)', () => {
  it('根级含 saveSchemaVersion', () => {
    const s = serializeSaveContainer({ activeSlot: 'slot1', slots: {} })
    expect(s).toContain('"saveSchemaVersion"')
    expect(JSON.parse(s).saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION)
  })
})

describe('createDebouncedFlush (D-05)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('500ms 内多次调用只触发一次底层写入', () => {
    const setItem = vi.fn()
    const flush = () => setItem('x')
    const schedule = createDebouncedFlush(flush, SAVE_DEBOUNCE_MS)
    schedule()
    schedule()
    schedule()
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(setItem).toHaveBeenCalledTimes(1)
  })
})
