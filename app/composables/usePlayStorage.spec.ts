import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseV4Save,
  serializeV4Save,
  emptyV4Save,
  migrateRunFromAct1Persist,
  findRunBySlot,
  PLAY_SAVE_SCHEMA_VERSION
} from './usePlayStorage.helpers'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  initialDebt: 0,
  talent: '无灵根',
  startingCity: '嵩阳市'
}

describe('usePlayStorage.helpers', () => {
  beforeEach(() => {
    // pure helpers only
  })

  it('emptyV4Save 含当前 schema 版本', () => {
    const e = emptyV4Save()
    expect(e.saveSchemaVersion).toBe(PLAY_SAVE_SCHEMA_VERSION)
    expect(e.activeRunId).toBeNull()
  })

  it('parseV4Save 非法 JSON 回空容器', () => {
    expect(parseV4Save('not-json').runs).toEqual({})
  })

  it('round-trip serialize', () => {
    const c = emptyV4Save()
    c.activeRunId = 'r1'
    c.runs.r1 = migrateRunFromAct1Persist('slot1', {
      startConfig: start,
      act1: createInitialAct1State(start),
      metaUnlocks: [],
      permanentModifiers: {},
      settled: false
    })
    const back = parseV4Save(serializeV4Save(c))
    expect(back.activeRunId).toBe('r1')
    expect(back.runs.r1?.slotId).toBe('slot1')
  })

  it('parseV4Save v4 战役档迁移为 endless 并剥离 promotion gate', () => {
    const legacy = {
      saveSchemaVersion: 4,
      activeRunId: 'r-legacy',
      runs: {
        'r-legacy': {
          schemaVersion: 4,
          runId: 'r-legacy',
          runMode: 'campaign',
          lifeStage: 'hs',
          slotId: 'slot1',
          setpiece: {
            hsPromotionGatePending: { score: 70, rank: 50 },
            harvestLedgerPending: { week: 12 }
          },
          campaign: { harvestWeek: 12 }
        }
      },
      meta: {}
    }
    const parsed = parseV4Save(JSON.stringify(legacy))
    expect(parsed.saveSchemaVersion).toBe(PLAY_SAVE_SCHEMA_VERSION)
    const run = parsed.runs['r-legacy']
    expect(run?.runMode).toBe('endless')
    expect(run?.campaign).toBeUndefined()
    expect(run?.setpiece?.hsPromotionGatePending).toBeUndefined()
    expect(run?.setpiece?.harvestLedgerPending).toBeUndefined()
  })

  it('parseV4Save v5 有进度的 endless 档迁移为 chapter', () => {
    const legacy = {
      saveSchemaVersion: 5,
      activeRunId: 'r-v5',
      runs: {
        'r-v5': {
          schemaVersion: 4,
          runId: 'r-v5',
          runMode: 'endless',
          lifeStage: 'hs',
          slotId: 'slot1',
          runStatus: 'active',
          logs: [],
          profileTags: [],
          inbox: [],
          start: start,
          school: { day: 8, week: 2, classTier: 'B', score: 500, rank: 100 },
          econ: { cash: 1000, debtPrincipal: 20000, debtInterestAccrued: 0, delinquency: 0, collectionFee: 0 },
          stats: { hp: 80, mp: 80, score: 500, rank: 100 }
        }
      },
      meta: {}
    }
    const parsed = parseV4Save(JSON.stringify(legacy))
    expect(parsed.saveSchemaVersion).toBe(PLAY_SAVE_SCHEMA_VERSION)
    const run = parsed.runs['r-v5']
    expect(run?.runMode).toBe('chapter')
    expect(run?.chapter?.chapterWeekIndex).toBe(1)
  })

  it('findRunBySlot', () => {
    const c = emptyV4Save()
    const run = migrateRunFromAct1Persist('slot2', {
      startConfig: start,
      act1: createInitialAct1State(start),
      metaUnlocks: [],
      permanentModifiers: {},
      settled: false
    })
    c.runs[run.runId] = run
    expect(findRunBySlot(c, 'slot2')?.runId).toBe(run.runId)
    expect(findRunBySlot(c, 'slot1')).toBeNull()
  })
})
