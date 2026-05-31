import { describe, it, expect } from 'vitest'
import type { PlayRunState } from '~/types/play'
import type { StartConfig } from '~/types/game'
import { createHsFieldsFromStart } from './createHsPlayState'
import { buildInboxFromTemplates, refreshRunInbox } from './inboxFromTemplates'
import { INBOX_TEMPLATES } from './inboxFromTemplates'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 12000,
  startingCity: '嵩阳市'
}

function hsRun(overrides: Partial<PlayRunState> = {}): PlayRunState {
  const hs = createHsFieldsFromStart(start)
  const base: PlayRunState = {
    schemaVersion: 4,
    runId: 'test-run',
    runMode: 'endless',
    createdAt: '',
    updatedAt: '',
    lifeStage: 'hs',
    chapterIndex: 0,
    realmTier: 'mortal',
    realmIndex: 0,
    start,
    slotId: 'slot1',
    runStatus: 'active',
    logs: hs.logs,
    profileTags: hs.profileTags,
    inbox: [],
    ...hs
  }
  return {
    ...base,
    ...overrides,
    school: overrides.school ? { ...base.school!, ...overrides.school } : base.school,
    econ: overrides.econ ? { ...base.econ!, ...overrides.econ } : base.econ
  }
}

describe('inboxFromTemplates', () => {
  it('模板库非空', () => {
    expect(INBOX_TEMPLATES.length).toBeGreaterThanOrEqual(3)
  })

  it('hs 基础日匹配还款线程', () => {
    const threads = buildInboxFromTemplates(hsRun())
    expect(threads.some((t) => t.id === 'thread-loan')).toBe(true)
  })

  it('逾期档位匹配警告模板', () => {
    const run = hsRun({ econ: { delinquency: 2 } })
    const threads = buildInboxFromTemplates(run)
    const loan = threads.find((t) => t.id === 'thread-loan')
    expect(loan?.messages.some((m) => m.title === '逾期警告')).toBe(true)
  })

  it('示范班匹配待遇模板', () => {
    const run = hsRun({ school: { classTier: '示范班' } })
    const threads = buildInboxFromTemplates(run)
    expect(threads.some((t) => t.messages.some((m) => m.title === '示范班待遇'))).toBe(true)
  })

  it('refreshRunInbox 写入 run.inbox', () => {
    const next = refreshRunInbox(hsRun())
    expect(next.inbox.length).toBeGreaterThan(0)
  })
})
