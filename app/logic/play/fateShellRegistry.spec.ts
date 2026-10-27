import { describe, expect, it } from 'vitest'
import { getFateShell, isScheduleActionDisabled } from '~/logic/play/fateShellRegistry'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import type { PrimaryFate } from '~/types/play'

describe('fateShellRegistry', () => {
  it('human and mortgaged use four_tile scheduleMode', () => {
    const run = settledFateRun()
    expect(getFateShell({ primaryFate: 'human' }).scheduleMode).toBe('four_tile')
    expect(getFateShell({ ...run, primaryFate: 'mortgaged' }).scheduleMode).toBe('four_tile')
  })

  it('head_jar uses delegation_two and disables four-tile actions', () => {
    const shell = getFateShell({ primaryFate: 'head_jar' })
    expect(shell.scheduleMode).toBe('delegation_two')
    expect(shell.layoutToken).toBe('fate-head-jar')
    expect(shell.disabledActions).toEqual(
      expect.arrayContaining(['study', 'parttime', 'rest', 'repay_hero'])
    )
  })

  it('head_jar statusBarFields are debt, maintenance, integrity (no body duplicate)', () => {
    const fields = getFateShell({ primaryFate: 'head_jar' }).statusBarFields
    expect(fields).toEqual(['debt', 'maintenance', 'integrity'])
    expect(fields).not.toContain('body')
  })

  it('isScheduleActionDisabled blocks four-tile ids for head_jar', () => {
    const run = { primaryFate: 'head_jar' as PrimaryFate }
    expect(isScheduleActionDisabled(run, 'study')).toBe(true)
    expect(isScheduleActionDisabled(run, 'parttime')).toBe(true)
    expect(isScheduleActionDisabled(run, 'rest')).toBe(true)
    expect(isScheduleActionDisabled(run, 'repay_hero')).toBe(true)
    expect(isScheduleActionDisabled(run, 'repay')).toBe(false)
  })

  it('all seven PrimaryFate keys resolve to populated shells', () => {
    const fates: PrimaryFate[] = [
      'human',
      'indentured',
      'mortgaged',
      'ghost_voluntary',
      'head_jar',
      'ghost_bound',
      'shattered'
    ]
    for (const fate of fates) {
      const shell = getFateShell({ primaryFate: fate })
      expect(shell.layoutToken).toBeTruthy()
      expect(shell.statusBarFields.length).toBeGreaterThan(0)
      expect(shell.scheduleMode).toMatch(/four_tile|delegation_two/)
    }
  })

  it('unknown primaryFate falls back to human shell', () => {
    const shell = getFateShell({ primaryFate: 'not-a-fate' as PrimaryFate })
    expect(shell.layoutToken).toBe('fate-human')
    expect(shell.scheduleMode).toBe('four_tile')
  })
})
