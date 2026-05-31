import collapseData from '../../../data/collapseEndings.json'
import type { StartConfig } from '~/types/game'
import type { LienRecord, PlayRunState, SaveSlotId } from '~/types/play'
import { createPlayRunFromStartConfig, createRunId, touchPlayRun } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { refreshRunInbox } from '~/logic/play/inboxFromTemplates'
import { getJobById } from '~/logic/play/jobs'
import { realmTierLabel } from '~/logic/play/chapterFlow'
import { scheduleBreakthroughIfDue } from '~/logic/play/breakthroughFlow'
import { getRealmTemplate } from '~/logic/play/realmTemplates'
import { prepareEndlessRunForPlay } from '~/logic/play/setpieceFlow'

interface CollapseEndingDef {
  id: string
  trigger: {
    minDelinquency?: number
    maxDaoXin?: number
    minLienCount?: number
    minFatigue?: number
    minLieFlatStreak?: number
    minBreakthroughs?: number
    minDaysInRealm?: number
  }
  title: string
  archiveVerdict: string
}

export const ENDLESS_LIE_FLAT_CARD_ID = 'endless-lie-flat'
export const LIE_FLAT_COLLAPSE_STREAK = 3
const LIE_FLAT_DELINQUENCY_BUMP = 14
const LIE_FLAT_HARVEST_MULT_PER_STREAK = 0.22

const COLLAPSE_ENDINGS = (collapseData as { endings: CollapseEndingDef[] }).endings

function lienCount(run: PlayRunState): number {
  return (run.endless?.irreversibleLiens?.length ?? 0) + (run.bodyLiens?.length ?? 0)
}

/** 紫府/结丹跑步机：中后期每轮微量侵蚀，避免「会玩就几乎必活」 */
export function applyRealmPassivePressure(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'endless' || !run.stats || !run.endless || !run.econ) return run
  if ((run.endless.breakthroughsCount ?? 0) < 2) return run

  const byRealm: Record<string, { daoDrain: number; fatigueBump: number; delCreep: number }> = {
    purple: { daoDrain: 0.013, fatigueBump: 0.72, delCreep: 0.095 },
    core: { daoDrain: 0.012, fatigueBump: 0.7, delCreep: 0.09 }
  }
  const coeff = byRealm[run.realmTier]
  if (!coeff) return run

  const days = run.endless.daysInCurrentRealm
  const accel = 1 + Math.min(0.9, days / 50)

  return {
    ...run,
    stats: {
      ...run.stats,
      daoXin: Math.max(0, run.stats.daoXin - coeff.daoDrain * accel),
      fatigue: Math.min(120, run.stats.fatigue + coeff.fatigueBump * accel)
    },
    econ: {
      ...run.econ,
      delinquency: Math.min(100, run.econ.delinquency + coeff.delCreep * accel)
    }
  }
}

function daoCollapsePressureMet(run: PlayRunState, del: number, fatigue: number): boolean {
  const breakthroughs = run.endless?.breakthroughsCount ?? 0
  if (breakthroughs >= 3) return del >= 45 || fatigue >= 78
  if (breakthroughs >= 2) return del >= 48 || fatigue >= 82
  return del >= 55 || fatigue >= 90
}

function applyCollapse(run: PlayRunState, ending: CollapseEndingDef): PlayRunState {
  const setpiece = { ...run.setpiece }
  delete setpiece.breakthroughPending
  return touchPlayRun({
    ...run,
    runStatus: 'collapsed',
    setpiece,
    logs: [`无尽境崩盘·${ending.title}：${ending.archiveVerdict}`, ...run.logs].slice(0, 80)
  })
}

export function checkEndlessCollapse(run: PlayRunState): PlayRunState | null {
  if (run.runMode !== 'endless') return null
  const del = run.econ?.delinquency ?? 0
  const dao = run.stats?.daoXin ?? 1
  const fatigue = run.stats?.fatigue ?? 0
  const liens = lienCount(run)
  const lieFlatStreak = run.endless?.lieFlatStreak ?? 0
  const breakthroughs = run.endless?.breakthroughsCount ?? 0
  const daysInRealm = run.endless?.daysInCurrentRealm ?? 0

  for (const ending of COLLAPSE_ENDINGS) {
    const t = ending.trigger
    if (t.minBreakthroughs !== undefined && breakthroughs < t.minBreakthroughs) continue
    if (t.minDaysInRealm !== undefined && daysInRealm < t.minDaysInRealm) continue
    // UX guard: after each breakthrough, keep a short adaptation window so players
    // can actually experience the new stage instead of immediate collapse.
    if (daysInRealm < 4 && ending.id !== 'collapse-lie-flat') continue
    // UX guard: dao-only collapse must reflect systemic pressure, not a single-axis dip.
    if (ending.id === 'collapse-dao' && !daoCollapsePressureMet(run, del, fatigue)) continue
    if (t.minDelinquency !== undefined && del >= t.minDelinquency) {
      return applyCollapse(run, ending)
    }
    if (t.maxDaoXin !== undefined && dao <= t.maxDaoXin) {
      return applyCollapse(run, ending)
    }
    if (t.minLienCount !== undefined && liens >= t.minLienCount) {
      return applyCollapse(run, ending)
    }
    if (t.minFatigue !== undefined && fatigue >= t.minFatigue) {
      return applyCollapse(run, ending)
    }
    if (t.minLieFlatStreak !== undefined && lieFlatStreak >= t.minLieFlatStreak) {
      return applyCollapse(run, ending)
    }
  }
  return null
}

export function playedEndlessLieFlatThisRound(run: PlayRunState): boolean {
  return (run.pressure?.playedCardIds ?? []).includes(ENDLESS_LIE_FLAT_CARD_ID)
}

/** 躺平：加重逾期与抽成；连续躺平可触发崩盘；本回合不推进破境关口 */
export function applyEndlessLieFlatAfterRound(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'endless' || !run.endless || !run.econ) return run

  const didLieFlat = playedEndlessLieFlatThisRound(run)
  let endless = { ...run.endless }
  let econ = { ...run.econ }
  let logs = run.logs
  let stats = run.stats ? { ...run.stats } : undefined
  let setpiece = run.setpiece ? { ...run.setpiece } : undefined

  if (didLieFlat) {
    const streak = (endless.lieFlatStreak ?? 0) + 1
    endless = { ...endless, lieFlatStreak: streak }
    econ = {
      ...econ,
      delinquency: Math.min(100, econ.delinquency + LIE_FLAT_DELINQUENCY_BUMP)
    }
    if (stats) {
      stats.daoXin = Math.max(0, stats.daoXin - 0.12)
    }
    if (setpiece?.breakthroughPending) {
      delete setpiece.breakthroughPending
    }
    logs = [
      `躺平登记：本回合不冲 KPI。逾期 +${LIE_FLAT_DELINQUENCY_BUMP}；连续躺平 ${streak} 回合。`,
      ...logs
    ].slice(0, 80)
  } else {
    endless = { ...endless, lieFlatStreak: 0 }
  }

  return {
    ...run,
    endless,
    econ,
    stats,
    setpiece,
    logs
  }
}

export function tickEndlessAfterPressureRound(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'endless' || !run.endless || !run.econ) return run

  let next = applyEndlessLieFlatAfterRound(run)
  const streak = next.endless!.lieFlatStreak ?? 0
  const lieFlatMult =
    playedEndlessLieFlatThisRound(next) && streak > 0
      ? 1 + streak * LIE_FLAT_HARVEST_MULT_PER_STREAK
      : 1

  const baseSkim = Math.max(1, Math.round(fullDebtFromRun(next) * next.endless!.harvestRate * 0.02))
  const skim = Math.max(1, Math.round(baseSkim * lieFlatMult))
  next = {
    ...next,
    econ: {
      ...next.econ!,
      debtPrincipal: next.econ!.debtPrincipal + skim
    },
    endless: {
      ...next.endless!,
      daysInCurrentRealm: next.endless!.daysInCurrentRealm + (playedEndlessLieFlatThisRound(next) ? 0 : 1)
    },
    logs: [
      playedEndlessLieFlatThisRound(next) && lieFlatMult > 1
        ? `躺平加重抽成：本回合 +¥${skim}（×${lieFlatMult.toFixed(2)}）。`
        : `平台抽成：本回合 +¥${skim} 入主债权（抽成 ${(next.endless!.harvestRate * 100).toFixed(0)}%）。`,
      ...next.logs
    ].slice(0, 80)
  }

  next = applyRealmPassivePressure(next)

  const collapsed = checkEndlessCollapse(next)
  if (collapsed) return collapsed
  if (playedEndlessLieFlatThisRound(next)) return next
  return scheduleBreakthroughIfDue(next)
}

export function createEndlessRunFromStart(start: StartConfig, slotId: SaveSlotId): PlayRunState {
  const base = createPlayRunFromStartConfig(start, slotId, { runMode: 'endless' })
  const hs = createHsFieldsFromStart(start)
  const qi = getRealmTemplate('qi')!
  const run = touchPlayRun({
    ...base,
    ...hs,
    lifeStage: 'work',
    chapterIndex: 0,
    realmTier: 'qi',
    realmIndex: qi.order,
    maintenanceCoeff: qi.maintenanceCoeff,
    work: {
      jobId: 'errand-runner',
      educationTags: ['tier-normal'],
      monthlyTarget: 5000,
      kpiScore: 0,
      shameEvents: 0
    },
    endless: {
      maintenanceStack: 1,
      harvestRate: qi.harvestRate,
      daysInCurrentRealm: 0,
      breakthroughsCount: 0,
      irreversibleLiens: [],
      lieFlatStreak: 0
    },
    profileTags: [...hs.profileTags, 'endless-runner'].slice(0, 12),
    logs: [
      '无尽修行：从练气跑步机起步——没有还清终点，只有下一境账单。',
      ...hs.logs
    ].slice(0, 80)
  })
  return prepareEndlessRunForPlay(refreshRunInbox(run))
}

export function createEndlessFromHandoff(run: PlayRunState): PlayRunState {
  const template = getRealmTemplate(run.realmTier) ?? getRealmTemplate('foundation')!
  const liens: LienRecord[] = (run.bodyLiens ?? []).map((label, i) => ({
    id: `lien-legacy-${i}`,
    kind: 'body',
    label,
    createdAtDay: run.school?.day ?? 1,
    cannotRemove: true
  }))
  const setpiece = { ...(run.setpiece ?? {}) }
  delete setpiece.harvestLedgerPending
  delete setpiece.breakthroughPending
  const next = touchPlayRun({
    ...run,
    runId: createRunId(),
    runMode: 'endless',
    runStatus: 'active',
    maintenanceCoeff: (run.maintenanceCoeff ?? 1) * template.maintenanceCoeff,
    endless: {
      maintenanceStack: run.maintenanceCoeff ?? 1,
      harvestRate: template.harvestRate,
      daysInCurrentRealm: 0,
      breakthroughsCount: 0,
      irreversibleLiens: liens,
      lieFlatStreak: 0
    },
    setpiece
  })
  return prepareEndlessRunForPlay(refreshRunInbox(next))
}

export function formatEndlessHud(run: PlayRunState): string | null {
  if (run.runMode !== 'endless' || !run.endless) return null
  const template = getRealmTemplate(run.realmTier)
  const job = run.work?.jobId ? getJobById(run.work.jobId) : null
  const jobTitle = job?.title ?? '外门杂役'
  const realm = template?.displayName ?? realmTierLabel(run.realmTier)
  const flat =
    (run.endless.lieFlatStreak ?? 0) > 0 ? ` · 躺平 ${run.endless.lieFlatStreak} 回合` : ''
  return `${realm} · ${jobTitle} · 境中日 ${run.endless.daysInCurrentRealm} · 破境 ${run.endless.breakthroughsCount} 次${flat}`
}
