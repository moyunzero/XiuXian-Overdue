import { describe, expect, it } from 'vitest'
import {
  beatsForWeek,
  getChapterConfig,
  isNodeWeek,
  segmentForWeek,
  weeksRemaining
} from '~/logic/play/chapterRegistry'
import { DEFAULT_CHAPTER_ID } from '~/types/chapter'

describe('chapterRegistry', () => {
  const config = getChapterConfig(DEFAULT_CHAPTER_ID)

  it('loads ch0 config with weekBudget from data', () => {
    expect(config.id).toBe('ch0-forty-week-contract')
    expect(config.weekBudget).toBe(40)
    expect(config.segments).toHaveLength(3)
  })

  it('segmentForWeek maps hs / uni / work ranges', () => {
    expect(segmentForWeek(config, 1)?.id).toBe('hs')
    expect(segmentForWeek(config, 16)?.id).toBe('hs')
    expect(segmentForWeek(config, 17)?.id).toBe('uni')
    expect(segmentForWeek(config, 29)?.id).toBe('work')
    expect(segmentForWeek(config, 0)).toBeNull()
  })

  it('beatsForWeek returns node beats only for configured weeks', () => {
    expect(beatsForWeek(config, 4)).toHaveLength(1)
    expect(beatsForWeek(config, 4)[0]?.kind).toBe('monthly_exam')
    expect(beatsForWeek(config, 5)).toHaveLength(0)
    expect(isNodeWeek(config, 40)).toBe(true)
  })

  it('weeksRemaining derives from weekBudget', () => {
    expect(weeksRemaining(config, 1)).toBe(39)
    expect(weeksRemaining(config, 40)).toBe(0)
  })

  it('work 段 allowedActions 不含 study', () => {
    const work = config.segments.find((s) => s.id === 'work')
    expect(work?.allowedActions).toBeDefined()
    expect(work?.allowedActions).not.toContain('study')
    expect(work?.allowedActions).toContain('work')
  })
})
