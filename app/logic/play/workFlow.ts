import type { PlayRunState } from '~/types/play'
import { formatPlayerFacingTagLine } from '~/logic/play/playerFacingCopy'
import { availableJobsForRun, getJobById } from '~/logic/play/jobs'
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

export function needsJobChoice(run: PlayRunState): boolean {
  return run.lifeStage === 'work' && run.work != null && run.work.jobId == null
}

export function buildJobChoicePending(run: PlayRunState): JobChoicePending {
  const jobs = availableJobsForRun(run)
  const tags = run.work?.educationTags ?? []
  const tagLine = formatPlayerFacingTagLine(tags, { fallback: '无学历备注' })
  return {
    prompt: `档案标签：${tagLine}。选岗决定时薪与抽成上限——没有「体面」选项。`,
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
      monthlyTarget: Math.max(run.work!.monthlyTarget, monthlyFromHourly)
    },
    profileTags: [...run.profileTags.filter((t) => t !== `job-${jobId}`), `job-${jobId}`].slice(0, 12),
    logs: [
      `入职 ${job.title}：时薪 ¥${job.hourlyPay}，抽成上限 ${Math.round(job.harvestRate * 100)}%。`,
      `月薪目标 ¥${Math.max(run.work!.monthlyTarget, monthlyFromHourly).toLocaleString()}（制度 KPI 已挂接）。`,
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
