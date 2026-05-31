import { describe, expect, it } from 'vitest'
import type { EmploymentTrack } from '~/types/chapter'
import { DEFAULT_WEEK_PLAN, tickChapterWeek } from '~/logic/play/chapterWeekFlow'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { advanceChapterToWeek, dismissCurrentSetpiece, settledChapterRun } from '~/logic/play/chapterTestHelpers'

const TRACKS: EmploymentTrack[] = ['company', 'gig', 'startup']

describe('chapter0-three-track-flow', () => {
  it.each(TRACKS)('择轨 %s 后可推进至 W40 终局', (track) => {
    let run = advanceChapterToWeek(settledChapterRun(), 40, DEFAULT_WEEK_PLAN, 800, track)
    expect(run.chapter?.chapterWeekIndex).toBe(40)
    expect(run.work?.employmentTrack).toBe(track)
    expect(run.work?.jobId).toBeTruthy()

    const tick40 = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(tick40.blocked).toBe(true)
    expect(tick40.run.chapter?.pendingGateId).toBe('gate-w40-finale')

    run = openSegmentGate(tick40.run, 'gate-w40-finale', 'pass')
    expect(run.chapter?.outcomeId).toBe('fulfilled')
    expect(run.runStatus).toBe('archived')
  })
})
