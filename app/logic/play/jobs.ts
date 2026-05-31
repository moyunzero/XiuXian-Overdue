import jobsData from '../../../data/jobs.json'
import type { PlayRunState } from '~/types/play'

export interface JobDef {
  id: string
  title: string
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

export function availableJobsForRun(run: PlayRunState): JobDef[] {
  const tags = run.work?.educationTags ?? []
  return JOBS.filter((j) => jobMeetsEducation(j, tags))
}
