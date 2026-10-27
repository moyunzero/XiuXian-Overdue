import { describe, expect, it } from 'vitest'
import {
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD
} from '~/logic/play/chapterCollapse'
import {
  findCollapseRule,
  findHeadJarUpgradeRule,
  getFateDef,
  listFateDefs,
  mapTriggerFromCatalog,
  resolveOverlayCopy
} from '~/logic/play/fateCatalog'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { HEAD_JAR_INTEGRITY } from '~/logic/play/headJarWeekPlan'

describe('fateCatalog', () => {
  it('loads all seven PrimaryFate entries', () => {
    expect(listFateDefs()).toHaveLength(7)
    for (const id of [
      'human',
      'indentured',
      'mortgaged',
      'ghost_voluntary',
      'head_jar',
      'ghost_bound',
      'shattered'
    ] as const) {
      expect(getFateDef(id).id).toBe(id)
    }
  })

  it('marks shattered and ghost_voluntary non-playable', () => {
    expect(getFateDef('shattered').playable).toBe(false)
    expect(getFateDef('ghost_voluntary').playable).toBe(false)
  })

  it('collapse-body maps body_integrity to mortgaged', () => {
    const mapped = mapTriggerFromCatalog('body_integrity')
    expect(mapped.primaryFate).toBe('mortgaged')
    expect(mapped.tags).toEqual([])
  })

  it('head_jar integrity rule fires on mortgaged fated run below threshold', () => {
    const run = settledFateRun()
    run.primaryFate = 'mortgaged'
    run.runStatus = 'fated'
    run.bodyIntegrity = HEAD_JAR_INTEGRITY - 0.01
    expect(findHeadJarUpgradeRule(run)?.id).toBe('mortgaged-to-head-jar-integrity')
  })

  it('resolveOverlayCopy returns catalog bodyLine for body_integrity → mortgaged', () => {
    const line = resolveOverlayCopy('body_integrity', 'mortgaged')
    expect(line).toContain('抵押')
    expect(line?.length).toBeGreaterThan(0)
  })

  it('findCollapseRule covers body_exhaustion via triggerIds', () => {
    expect(findCollapseRule('body_exhaustion')?.toFate).toBe('mortgaged')
  })

  it('body_exhaustion collapse path still maps to mortgaged', () => {
    const run = settledFateRun()
    run.econ!.delinquency = CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY
    run.bodyIntegrity = CHAPTER_BODY_EXHAUSTION_THRESHOLD - 0.01
    const mapped = mapTriggerFromCatalog('body_exhaustion')
    expect(mapped.primaryFate).toBe('mortgaged')
  })
})
