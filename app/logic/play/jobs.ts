import jobsData from '../../../data/jobs.json'
import type { EmploymentTrack } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'

export interface JobDef {
  id: string
  title: string
  employmentTrack: EmploymentTrack
  minEducationTags: string[]
  hourlyPay: number
  harvestRate: number
  pressureCardUnlocks: string[]
  description: string
}

const JOBS = (jobsData as { jobs: JobDef[] }).jobs

export function listJobDefs(): JobDef[] {
  return JOBS
}

export function getJobById(id: string): JobDef | undefined {
  return JOBS.find((j) => j.id === id)
}

export function jobMeetsEducation(job: JobDef, educationTags: string[]): boolean {
  return job.minEducationTags.every((t) => educationTags.includes(t))
}

export function jobsForTrack(run: PlayRunState, track: EmploymentTrack): JobDef[] {
  const tags = run.work?.educationTags ?? []
  return JOBS.filter((j) => j.employmentTrack === track && jobMeetsEducation(j, tags))
}

export function availableJobsForRun(run: PlayRunState): JobDef[] {
  const tags = run.work?.educationTags ?? []
  const track = run.work?.employmentTrack
  return JOBS.filter((j) => {
    if (track && j.employmentTrack !== track) return false
    return jobMeetsEducation(j, tags)
  })
}
