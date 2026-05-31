import type { EconomyState, PlayerStats, SchoolState } from '~/types/game'
import type { PlayEffect, PlayRunState } from '~/types/play'
import { clamp, round1 } from '~/utils/rng'
import { syncFoundationProgressFromStats } from '~/logic/play/uniFlow'

export interface PlayEffectSlice {
  econ: EconomyState
  stats: PlayerStats
  school: SchoolState
  profileTags: string[]
  logs: string[]
  day: number
}

type NumericTarget = keyof PlayerStats | keyof EconomyState | keyof Pick<SchoolState, 'lastExamScore' | 'lastRank'>

function applyNumeric(
  slice: PlayEffectSlice,
  bucket: 'stats' | 'econ' | 'school',
  target: string,
  op: string,
  value: number
): void {
  const record = slice[bucket] as Record<string, number>
  if (!(target in record)) return
  const cur = record[target] ?? 0
  if (op === 'set') {
    record[target] = value
  } else {
    record[target] = cur + value
  }
  if (bucket === 'stats') {
    if (target === 'daoXin' || target === 'faLi' || target === 'rouTi') {
      record[target] = round1(record[target]!)
    }
    if (target === 'daoXin') record[target] = Math.max(1, record[target]!)
    if (target === 'fatigue' || target === 'focus') record[target] = clamp(Math.round(record[target]!), 0, 100)
  }
  if (bucket === 'econ') {
    if (target === 'delinquency') record[target] = clamp(Math.round(record[target]!), 0, 5)
    if (target !== 'dailyRate' && target !== 'lastPaymentDay') {
      record[target] = Math.max(0, Math.floor(record[target]!))
    }
  }
}

export function playEffectSliceFromRun(run: PlayRunState): PlayEffectSlice | null {
  if (!run.econ || !run.stats || !run.school) return null
  return {
    econ: { ...run.econ },
    stats: { ...run.stats },
    school: { ...run.school },
    profileTags: [...run.profileTags],
    logs: [...run.logs],
    day: run.school.day
  }
}

export function mergeEffectSliceIntoRun(run: PlayRunState, slice: PlayEffectSlice): PlayRunState {
  let next: PlayRunState = {
    ...run,
    econ: { ...slice.econ },
    stats: { ...slice.stats },
    school: { ...slice.school },
    profileTags: [...slice.profileTags],
    logs: slice.logs.slice(-80)
  }
  if (next.lifeStage === 'uni') {
    next = syncFoundationProgressFromStats(next)
  }
  if (next.lifeStage === 'work' && next.work) {
    const shameHits = next.profileTags.filter((t) => t === 'work-shame-event').length
    if (shameHits > 0) {
      next = {
        ...next,
        work: { ...next.work, shameEvents: next.work.shameEvents + shameHits },
        profileTags: next.profileTags.filter((t) => t !== 'work-shame-event')
      }
    }
  }
  return next
}

export function applyPlayEffects(slice: PlayEffectSlice, effects: PlayEffect[]): PlayEffectSlice {
  const next = {
    ...slice,
    econ: { ...slice.econ },
    stats: { ...slice.stats },
    school: { ...slice.school },
    profileTags: [...slice.profileTags],
    logs: [...slice.logs]
  }

  for (const eff of effects) {
    const p = eff.payload
    if (eff.kind === 'stat') {
      applyNumeric(next, 'stats', String(p.target), String(p.op ?? 'add'), Number(p.value ?? 0))
    } else if (eff.kind === 'econ') {
      applyNumeric(next, 'econ', String(p.target), String(p.op ?? 'add'), Number(p.value ?? 0))
    } else if (eff.kind === 'school') {
      applyNumeric(next, 'school', String(p.target), String(p.op ?? 'add'), Number(p.value ?? 0))
    } else if (eff.kind === 'log') {
      const title = String(p.title ?? '记录')
      const detail = String(p.detail ?? '')
      next.logs.push(`[D${next.day}] ${title}：${detail}`)
    } else if (eff.kind === 'tag') {
      const tag = String(p.tag ?? '')
      if (tag && !next.profileTags.includes(tag)) next.profileTags.push(tag)
    }
  }

  return next
}

export function applyPlayEffectsToRun(run: PlayRunState, effects: PlayEffect[]): PlayRunState {
  const slice = playEffectSliceFromRun(run)
  if (!slice) return run
  return mergeEffectSliceIntoRun(run, applyPlayEffects(slice, effects))
}
