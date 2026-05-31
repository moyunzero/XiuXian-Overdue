import { describe, expect, it } from 'vitest'
import { listJobDefs, jobMeetsEducation } from '~/logic/play/jobs'

describe('jobs.json', () => {
  it('岗位定义非空且学历门控可判定', () => {
    const jobs = listJobDefs()
    expect(jobs.length).toBeGreaterThanOrEqual(3)
    const elite = jobs.find((j) => j.id === 'elite-pipeline')!
    expect(jobMeetsEducation(elite, ['hs-graduated', 'tier-elite'])).toBe(true)
    expect(jobMeetsEducation(elite, ['hs-graduated'])).toBe(false)
  })
})
