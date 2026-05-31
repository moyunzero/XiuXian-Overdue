import type { EmploymentTrack } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { formatEmploymentTrackLabel, formatPlayerFacingTagLine } from '~/logic/play/playerFacingCopy'
import { availableJobsForRun, getJobById, jobsForTrack } from '~/logic/play/jobs'
import { refreshRunInbox } from '~/logic/play/inboxFromTemplates'

export interface JobChoiceOption {
  id: string
  title: string
  hourlyPay: number
  harvestRate: number
  description: string
}

export interface JobChoicePending {
  prompt: string
  options: JobChoiceOption[]
}

export interface TrackChoiceOption {
  id: EmploymentTrack
  title: string
  description: string
  jobCount: number
}

export interface TrackChoicePending {
  prompt: string
  options: TrackChoiceOption[]
}

export const TRACK_CHOICE_OPTIONS: ReadonlyArray<{
  id: EmploymentTrack
  title: string
  description: string
}> = [
  {
    id: 'company',
    title: '进公司',
    description: '宗门文书岗或库房分拣：稳定时薪，五险一金池按合同扣。'
  },
  {
    id: 'gig',
    title: '散修零工',
    description: '灵材跑腿：日结按件，池子薄，抽检更频。'
  },
  {
    id: 'startup',
    title: '挂靠工作室',
    description: '创业担保贴满墙，现金流方差大，挂靠违约来文更频。'
  }
]

export function needsTrackChoice(run: PlayRunState): boolean {
  return (
    run.runMode === 'chapter' &&
    run.lifeStage === 'work' &&
    run.work != null &&
    run.work.employmentTrack == null &&
    run.work.jobId == null &&
    run.chapter?.pendingGateId === 'gate-w29-track'
  )
}

export function needsJobChoice(run: PlayRunState): boolean {
  if (run.lifeStage !== 'work' || run.work == null || run.work.jobId != null) {
    return false
  }
  if (run.runMode === 'chapter') {
    return (
      run.work.employmentTrack != null &&
      run.chapter?.pendingGateId === 'gate-w29-track'
    )
  }
  return true
}

export function buildTrackChoicePending(run: PlayRunState): TrackChoicePending {
  const tags = run.work?.educationTags ?? []
  const tagLine = formatPlayerFacingTagLine(tags, { fallback: '无学历备注' })
  return {
    prompt: `档案标签：${tagLine}。先择轨，再选具体岗位——三条路抽成与池子不同。`,
    options: TRACK_CHOICE_OPTIONS.map((opt) => ({
      ...opt,
      jobCount: jobsForTrack(run, opt.id).length
    })).filter((opt) => opt.jobCount > 0)
  }
}

export function applyTrackChoice(run: PlayRunState, track: EmploymentTrack): PlayRunState {
  if (!needsTrackChoice(run)) return run
  if (jobsForTrack(run, track).length === 0) return run
  const label = formatEmploymentTrackLabel(track)
  const trackTag = `track-${track}`
  const profileTags = [
    ...run.profileTags.filter((t) => !t.startsWith('track-')),
    trackTag
  ].slice(0, 12)
  return {
    ...run,
    profileTags,
    work: { ...run.work!, employmentTrack: track },
    logs: [`择轨：${label}。`, ...run.logs].slice(0, 80)
  }
}

export function buildJobChoicePending(run: PlayRunState): JobChoicePending {
  const jobs = availableJobsForRun(run)
  const tags = run.work?.educationTags ?? []
  const tagLine = formatPlayerFacingTagLine(tags, { fallback: '无学历备注' })
  const trackLabel =
    formatEmploymentTrackLabel(run.work?.employmentTrack) ?? '当前轨道'
  return {
    prompt: `档案标签：${tagLine}；轨道：${trackLabel}。选岗决定时薪与抽成上限——没有「体面」选项。`,
    options: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      hourlyPay: j.hourlyPay,
      harvestRate: j.harvestRate,
      description: j.description
    }))
  }
}

export function applyJobChoice(run: PlayRunState, jobId: string): PlayRunState {
  if (!needsJobChoice(run)) return run
  const job = getJobById(jobId)
  if (!job || !availableJobsForRun(run).some((j) => j.id === jobId)) return run

  const monthlyFromHourly = job.hourlyPay * 160
  const next: PlayRunState = {
    ...run,
    work: {
      ...run.work!,
      jobId,
      employmentTrack: job.employmentTrack,
      monthlyTarget: Math.max(run.work!.monthlyTarget, monthlyFromHourly)
    },
    profileTags: [...run.profileTags.filter((t) => t !== `job-${jobId}`), `job-${jobId}`].slice(0, 12),
    logs: [
      `入职 ${job.title}：时薪 ¥${job.hourlyPay}，抽成上限 ${Math.round(job.harvestRate * 100)}%。`,
      `月薪目标 ¥${Math.max(run.work!.monthlyTarget, monthlyFromHourly).toLocaleString()}（KPI 已挂接）。`,
      ...run.logs
    ].slice(0, 80)
  }

  return refreshRunInbox(next)
}

export function formatWorkHud(run: PlayRunState): string | null {
  if (run.lifeStage !== 'work' || !run.work) return null
  const job = run.work.jobId ? getJobById(run.work.jobId) : null
  const title = job?.title ?? '待求职'
  return `${title} · 月薪目标 ¥${run.work.monthlyTarget.toLocaleString()} · KPI ${run.work.kpiScore}`
}

/** 每轮压力牌结算后：KPI 微涨 + 维护费系数侵蚀五险一金池 */
export function tickWorkAfterPressureRound(run: PlayRunState): PlayRunState {
  if (run.lifeStage !== 'work' || !run.work || !run.econ) return run
  const job = run.work.jobId ? getJobById(run.work.jobId) : null
  const kpiBump = job ? 3 : 1
  const coeff = run.maintenanceCoeff ?? 1
  const poolBump = Math.floor(run.econ.debtPrincipal * 0.002 * coeff)
  return {
    ...run,
    work: { ...run.work, kpiScore: run.work.kpiScore + kpiBump },
    econ: {
      ...run.econ,
      collectionFee: run.econ.collectionFee + poolBump
    }
  }
}
