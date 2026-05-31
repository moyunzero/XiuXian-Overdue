import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { writeUiAuditFixturesToDisk, buildUiAuditFixtures } from '~/logic/play/uiAuditFixtures'

describe('uiAuditFixtures', () => {
  it('exports playwright seed JSON for each play screen', () => {
    const fixtures = buildUiAuditFixtures()
    expect(fixtures.length).toBeGreaterThanOrEqual(14)
    expect(fixtures.some((f) => f.id === 'chapter-collapse-debt')).toBe(true)
    expect(fixtures.some((f) => f.id === 'chapter-natural-ch0-start')).toBe(true)
    const naturalStart = fixtures.find((f) => f.id === 'chapter-natural-ch0-start')!
    const naturalStartRun = Object.values(naturalStart.saveV5!.runs)[0]
    expect(naturalStartRun.seed).toBe(20260531)
    expect(naturalStartRun.chapter?.chapterWeekIndex).toBe(1)
    const collapse = fixtures.find((f) => f.id === 'chapter-collapse-debt')!
    expect(collapse.saveV5?.runs).toBeDefined()
    const collapseRun = Object.values(collapse.saveV5!.runs)[0]
    expect(collapseRun.runStatus).toBe('collapsed')
    expect(collapseRun.chapter?.outcomeId).toBe('collapse_debt')
    const outDir = path.join(process.cwd(), 'e2e/fixtures/ui-audit')
    const files = writeUiAuditFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
