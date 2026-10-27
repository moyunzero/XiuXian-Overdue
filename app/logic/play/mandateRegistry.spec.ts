import { describe, expect, it } from 'vitest'
import { getChapterConfig } from '~/logic/play/chapterRegistry'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import {
  getMandatePoolPathForRun,
  listMandatesForPool,
  listMandatesForRunPool,
  listMandatesForStage
} from '~/logic/play/mandateRegistry'
import { resolveMandatePoolPath } from '~/logic/play/stageRegistry'

describe('mandateRegistry · stage manifest chain', () => {
  const ch0 = getChapterConfig('ch0-forty-week-contract')

  it('M1 routine pool id set matches legacy chapter path', () => {
    const run = settledChapterRun()
    run.stageId = 'stage-m1-contract'
    const legacyIds = listMandatesForPool(ch0, 'routine').map((m) => m.id).sort()
    const manifestIds = listMandatesForRunPool(run, 'routine').map((m) => m.id).sort()
    expect(manifestIds).toEqual(legacyIds)
  })

  it('ch0-ghost-bound-summon resolvable via stage-m1-contract', () => {
    const run = settledChapterRun()
    run.stageId = 'stage-m1-contract'
    const ids = listMandatesForStage(run, 'routine').map((m) => m.id)
    expect(ids).toContain('ch0-ghost-bound-summon')
  })

  it('M2 skeleton returns undefined pool path even with persistent chapterId', () => {
    expect(
      resolveMandatePoolPath('stage-m2-hs', 'routine', 'ch0-forty-week-contract')
    ).toBeUndefined()
    const run = settledChapterRun()
    run.runMode = 'fate_run'
    run.stageId = 'stage-m2-hs'
    expect(getMandatePoolPathForRun(run, 'routine')).toBeUndefined()
    expect(listMandatesForRunPool(run, 'routine')).toEqual([])
  })
})
