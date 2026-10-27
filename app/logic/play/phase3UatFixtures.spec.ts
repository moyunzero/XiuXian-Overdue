import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildMandateInboxPending } from '~/logic/play/mandateDelivery'
import { buildPhase3UatFixtures, writePhase3UatFixturesToDisk } from '~/logic/play/phase3UatFixtures'

describe('phase3UatFixtures', () => {
  it('exports playwright seed JSON for Phase 3 schedule/mandate UAT', () => {
    const fixtures = buildPhase3UatFixtures()
    expect(fixtures).toHaveLength(5)

    const schedule = fixtures.find((f) => f.id === 'phase3-schedule-week8')!
    const scheduleRun = Object.values(schedule.saveV5.runs)[0]
    expect(scheduleRun.chapter?.chapterWeekIndex).toBe(8)
    expect(scheduleRun.runMode).toBe('fate_run')

    const inbox = fixtures.find((f) => f.id === 'phase3-mandate-inbox')!
    const inboxRun = Object.values(inbox.saveV5.runs)[0]
    expect(inboxRun.mandate?.pendingDeliveryIds.length).toBe(1)
    const built = buildMandateInboxPending(inboxRun)
    expect(built).not.toBeNull()
    expect(built!.responses.length).toBeGreaterThan(0)

    const blocked = fixtures.find((f) => f.id === 'phase3-queue-blocked')!
    const blockedRun = Object.values(blocked.saveV5.runs)[0]
    expect(blockedRun.mandate?.pendingDeliveryIds.length).toBe(3)

    const outDir = path.join(process.cwd(), 'e2e/fixtures/phase3-uat')
    const files = writePhase3UatFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
