#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CARDS_PATH = path.resolve(ROOT, 'data/pressureCards.json')
const REALMS_PATH = path.resolve(ROOT, 'data/realmTemplates.json')
const COLLAPSE_PATH = path.resolve(ROOT, 'data/collapseEndings.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { runs: 200, seed: 20260528, maxRounds: 280, profile: 'natural' }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--runs') out.runs = Number(args[++i] ?? out.runs)
    else if (a === '--seed') out.seed = Number(args[++i] ?? out.seed)
    else if (a === '--max-rounds') out.maxRounds = Number(args[++i] ?? out.maxRounds)
    else if (a === '--profile') out.profile = String(args[++i] ?? out.profile)
  }
  return out
}

const CARDS = readJson(CARDS_PATH)
const REALMS = readJson(REALMS_PATH).realms
const COLLAPSE_ENDINGS = readJson(COLLAPSE_PATH).endings
const REALM_BY_ID = Object.fromEntries(REALMS.map((r) => [r.id, r]))
const REALM_ORDER = REALMS.map((r) => r.id)
const LIFE_ORDER = ['pre', 'hs', 'uni', 'work']

const PREFER_TITLES = [
  '最低还款',
  '工位硬睡',
  '静室硬睡',
  '硬睡四小时',
  '吐纳调息',
  '图书馆占座',
  '月考冲刺',
  '闭关筑基',
  '功法订阅加练',
  '发薪日扣款',
  '零工换现',
  '宗门杂务'
]
const AVOID_TITLES = ['登记躺平', '预支薪水', '灵贷续命', '躲催收话术']

function startRun(seed) {
  return {
    seed,
    lifeStage: 'hs',
    realmTier: 'qi',
    maintenanceCoeff: 1,
    econ: {
      cash: 7800,
      debtPrincipal: 25000,
      debtInterestAccrued: 0,
      collectionFee: 0,
      delinquency: 2
    },
    stats: {
      daoXin: 1.0,
      faLi: 6.6,
      rouTi: 0.45,
      fatigue: 25,
      focus: 52
    },
    endless: {
      daysInCurrentRealm: 0,
      breakthroughsCount: 0,
      lieFlatStreak: 0
    },
    bodyLiens: 0,
    round: 0
  }
}

function eligibleCards(run) {
  return CARDS.filter((c) => c.lifeStages.includes(run.lifeStage))
    .filter((c) => !c.realmTiers || c.realmTiers.includes(run.realmTier))
    .filter((c) => {
      if (!c.requires) return true
      if (c.requires.minCash !== undefined && run.econ.cash < c.requires.minCash) return false
      if (c.requires.maxDelinquency !== undefined && run.econ.delinquency > c.requires.maxDelinquency) return false
      return true
    })
}

const WORK_TAG_WEIGHT = {
  work: 1.1,
  risk: 0.85,
  rest: 1.25,
  study: 1.2,
  train: 1.05
}

const ENDLESS_REALM_TAG_WEIGHT = {
  qi: { study: 1.3, rest: 1.28, train: 1.22, work: 0.72, risk: 0.68 },
  foundation: { study: 1.38, rest: 1.3, train: 1.18, work: 0.75, risk: 0.68 },
  purple: { study: 1.18, rest: 1.15, train: 1.12, work: 0.88, risk: 0.82 },
  core: { study: 1.08, rest: 1.12, train: 1.05, work: 0.95, risk: 0.88 }
}

const AGENCY_TAGS = new Set(['rest', 'study', 'train'])
const AGENCY_TITLE_HINTS = [
  '最低还款',
  '硬睡',
  '静室',
  '吐纳',
  '图书馆',
  '月考',
  '闭关',
  '功法',
  '发薪',
  '零工',
  '杂务'
]

function isAgencyCard(card) {
  if ((card.tags ?? []).some((t) => AGENCY_TAGS.has(t))) return true
  return AGENCY_TITLE_HINTS.some((hint) => card.title.includes(hint))
}

function agencyBuckets(card) {
  const buckets = []
  if ((card.tags ?? []).includes('rest')) buckets.push('rest')
  if ((card.tags ?? []).includes('study')) buckets.push('study')
  if ((card.tags ?? []).includes('train')) buckets.push('train')
  if (card.title.includes('最低还款')) buckets.push('repay')
  else if (
    card.title.includes('发薪') ||
    card.title.includes('零工') ||
    card.title.includes('杂务')
  ) {
    buckets.push('income')
  }
  if (!buckets.length && isAgencyCard(card)) buckets.push('other')
  return buckets
}

function agencyBucketCount(cards) {
  const buckets = new Set()
  for (const card of cards.filter(isAgencyCard)) {
    for (const bucket of agencyBuckets(card)) buckets.add(bucket)
  }
  return buckets.size
}

function ensureMinimumAgencyCards(picked, eligible, run, rng) {
  if (picked.length < 4) return picked
  const result = [...picked]
  const used = () => new Set(result.map((c) => c.id))
  const agencyPool = (preferBucket) =>
    eligible.filter((c) => {
      if (!isAgencyCard(c) || used().has(c.id)) return false
      if (!preferBucket) return true
      return agencyBuckets(c).includes(preferBucket)
    })
  const replaceWeakest = (pool) => {
    const candidates = result
      .map((card, index) => ({
        index,
        agency: isAgencyCard(card),
        weight: weightForCardInRun(card, run)
      }))
      .filter((row) => !row.agency)
      .sort((a, b) => a.weight - b.weight)
    if (!candidates.length || !pool.length) return false
    const replacement = weightedPickOne(pool, rng, run)
    if (!replacement) return false
    result[candidates[0].index] = replacement
    return true
  }
  let agencyCount = result.filter(isAgencyCard).length
  while (agencyCount < 2) {
    if (!replaceWeakest(agencyPool())) break
    agencyCount = result.filter(isAgencyCard).length
  }
  const existingBuckets = new Set()
  for (const card of result.filter(isAgencyCard)) {
    for (const bucket of agencyBuckets(card)) existingBuckets.add(bucket)
  }
  for (const bucket of ['rest', 'study', 'train', 'repay', 'income']) {
    if (agencyBucketCount(result) >= 2) break
    if (existingBuckets.has(bucket)) continue
    if (!replaceWeakest(agencyPool(bucket))) continue
    existingBuckets.add(bucket)
  }
  while (agencyBucketCount(result) < 2) {
    const agencyCards = result.filter(isAgencyCard)
    const bucketCounts = new Map()
    for (const card of agencyCards) {
      for (const bucket of agencyBuckets(card)) {
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1)
      }
    }
    const dominantBucket = [...bucketCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const missingBuckets = ['rest', 'study', 'train', 'repay', 'income'].filter((b) => !bucketCounts.has(b))
    if (!dominantBucket || !missingBuckets.length) break
    const replaceIndex = result.findIndex(
      (card) => isAgencyCard(card) && agencyBuckets(card).includes(dominantBucket)
    )
    if (replaceIndex < 0) break
    const pool = agencyPool(missingBuckets[0]).filter((c) => !result.some((r) => r.id === c.id))
    const replacement = weightedPickOne(pool, rng, run)
    if (!replacement) break
    result[replaceIndex] = replacement
  }
  return result
}

function weightForCardInRun(card, run) {
  let weight = 1
  if (run.lifeStage === 'work') {
    for (const tag of card.tags ?? []) {
      const mult = WORK_TAG_WEIGHT[tag]
      if (mult !== undefined) weight *= mult
    }
    const del = run.econ?.delinquency ?? 0
    if (del >= 2 && (card.tags ?? []).includes('risk')) weight *= 0.95 + del * 0.04
  }
  const realmTable = ENDLESS_REALM_TAG_WEIGHT[run.realmTier]
  if (realmTable) {
    for (const tag of card.tags ?? []) {
      const mult = realmTable[tag]
      if (mult !== undefined) weight *= mult
    }
  }
  return Math.max(0.01, weight)
}

function weightedPickOne(items, rand, run) {
  if (!items.length) return null
  const weights = items.map((card) => weightForCardInRun(card, run))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return items[Math.floor(rand() * items.length)] ?? null
  let roll = rand() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0
    if (roll <= 0) return items[i] ?? null
  }
  return items[items.length - 1] ?? null
}

function pickOffered(run, rng) {
  const eligible = eligibleCards(run)
  const picked = []
  let pool = [...eligible]
  while (picked.length < 4 && pool.length > 0) {
    const next = weightedPickOne(pool, rng, run)
    if (!next) break
    const idx = pool.findIndex((card) => card.id === next.id)
    if (idx < 0) break
    pool.splice(idx, 1)
    picked.push(next)
  }
  return ensureMinimumAgencyCards(picked, eligible, run, rng)
}

function softPityWindowForRealm(realmId) {
  if (realmId === 'qi') return { startDay: 20, forceDay: 38 }
  if (realmId === 'foundation') return { startDay: 30, forceDay: 54 }
  if (realmId === 'purple') return { startDay: 24, forceDay: 42 }
  return { startDay: 26, forceDay: 46 }
}

function deterministicBreakthroughRoll(run) {
  const seed = run.seed ?? 1
  const day = run.round ?? 1
  const realmIdx = REALM_ORDER.indexOf(run.realmTier)
  const mix = (seed * 1103515245 + day * 12345 + (realmIdx < 0 ? 0 : realmIdx) * 2654435761) >>> 0
  return (mix % 1000) / 1000
}

function softPityBreakthroughDue(run) {
  const days = run.endless.daysInCurrentRealm
  const { startDay, forceDay } = softPityWindowForRealm(run.realmTier)
  if (days < startDay) return false
  if (days >= forceDay) return true
  const chance = (days - startDay) / (forceDay - startDay)
  return deterministicBreakthroughRoll(run) < chance
}

function chooseTwoNatural(offered, run) {
  const affordable = offered.filter((c) => {
    const minCash = c.requires?.minCash
    if (minCash !== undefined && run.econ.cash < minCash) return false
    return true
  })
  const pool = affordable.length >= 2 ? affordable : offered
  const picked = []
  for (const key of PREFER_TITLES) {
    for (const c of pool) {
      if (picked.length >= 2) break
      if (picked.includes(c)) continue
      if (AVOID_TITLES.some((a) => c.title.includes(a))) continue
      if (c.title.includes(key)) picked.push(c)
    }
    if (picked.length >= 2) break
  }
  if (picked.length < 2) {
    for (const c of pool) {
      if (picked.length >= 2) break
      if (picked.includes(c)) continue
      if (AVOID_TITLES.some((a) => c.title.includes(a))) continue
      picked.push(c)
    }
  }
  if (picked.length < 2) {
    for (const c of pool) {
      if (picked.length >= 2) break
      if (!picked.includes(c)) picked.push(c)
    }
  }
  return picked
}

function chooseTwoBalanced(offered, run, rng) {
  const fatigue = run.stats.fatigue
  const delinquency = run.econ.delinquency
  const cash = run.econ.cash
  const scored = offered.map((card, idx) => {
    const t = card.title
    let score = 0
    if (AVOID_TITLES.some((a) => t.includes(a))) score -= 40
    if (t.includes('登记躺平')) score -= 120
    if (t.includes('硬睡') || t.includes('静室') || t.includes('吐纳')) {
      score += fatigue >= 70 ? 95 : fatigue >= 50 ? 55 : 18
    }
    if (t.includes('最低还款')) {
      score += delinquency >= 55 ? 85 : delinquency >= 35 ? 45 : 12
      if (cash < 300) score -= 20
    }
    if (t.includes('月考冲刺') || t.includes('闭关') || t.includes('功法订阅') || t.includes('图书馆')) {
      score += 32
    }
    if (t.includes('零工') || t.includes('发薪') || t.includes('杂务')) {
      score += cash < 1500 ? 36 : 16
    }
    if (t.includes('灵贷续命') || t.includes('预支薪水')) {
      score += cash < 450 ? 10 : -18
      score -= delinquency >= 65 ? 8 : 0
    }
    score += rng() * 0.01
    return { card, idx, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 2).map((s) => s.card)
}

function chooseTwo(offered, run, rng, profile) {
  if (profile === 'balanced') return chooseTwoBalanced(offered, run, rng)
  return chooseTwoNatural(offered, run)
}

function applyEffect(run, effect) {
  if (!effect || !effect.kind) return
  const p = effect.payload ?? {}
  if (effect.kind === 'stat') {
    const key = p.target
    if (!(key in run.stats)) return
    const next = Number(run.stats[key]) + Number(p.value ?? 0)
    if (key === 'fatigue') run.stats[key] = Math.max(0, Math.min(120, next))
    else run.stats[key] = Math.max(0, next)
  } else if (effect.kind === 'econ') {
    const key = p.target
    if (!(key in run.econ)) return
    const next = Number(run.econ[key]) + Number(p.value ?? 0)
    if (key === 'delinquency') run.econ[key] = Math.max(0, Math.min(100, next))
    else run.econ[key] = next
  } else if (effect.kind === 'tag') {
    if (p.tag === 'body-marked') run.bodyLiens += 1
    if (p.tag === 'work-shame-event') run.stats.daoXin = Math.max(0, run.stats.daoXin - 0.04)
  }
}

function tickEndless(run, playedLieFlat) {
  const realm = REALM_BY_ID[run.realmTier]
  const harvestRate = realm?.harvestRate ?? 0.14
  if (playedLieFlat) {
    run.endless.lieFlatStreak += 1
    run.econ.delinquency = Math.min(100, run.econ.delinquency + 14)
    run.stats.daoXin = Math.max(0, run.stats.daoXin - 0.12)
  } else {
    run.endless.lieFlatStreak = 0
    run.endless.daysInCurrentRealm += 1
  }
  const fullDebt = run.econ.debtPrincipal + run.econ.debtInterestAccrued + run.econ.collectionFee
  run.econ.debtInterestAccrued += Math.max(1, Math.round(fullDebt * 0.007))
  const skim = Math.max(1, Math.round(fullDebt * harvestRate * 0.02))
  run.econ.debtPrincipal += skim
  applyRealmPassivePressure(run)
}

function applyRealmPassivePressure(run) {
  if ((run.endless.breakthroughsCount ?? 0) < 2) return
  const byRealm = {
    purple: { daoDrain: 0.013, fatigueBump: 0.72, delCreep: 0.095 },
    core: { daoDrain: 0.012, fatigueBump: 0.7, delCreep: 0.09 }
  }
  const coeff = byRealm[run.realmTier]
  if (!coeff) return
  const days = run.endless.daysInCurrentRealm
  const accel = 1 + Math.min(0.9, days / 50)
  run.stats.daoXin = Math.max(0, run.stats.daoXin - coeff.daoDrain * accel)
  run.stats.fatigue = Math.min(120, run.stats.fatigue + coeff.fatigueBump * accel)
  run.econ.delinquency = Math.min(100, run.econ.delinquency + coeff.delCreep * accel)
}

function tickWeeklyDelinquency(run) {
  if (run.round % 7 !== 0) return
  if ((run.endless.breakthroughsCount ?? 0) < 2) return
  const fullDebt = run.econ.debtPrincipal + run.econ.debtInterestAccrued + run.econ.collectionFee
  const minPay = Math.max(400, Math.round(fullDebt * 0.025))
  if (run.econ.cash < minPay) {
    run.econ.delinquency = Math.min(100, run.econ.delinquency + 7)
  }
}

function tickDailyEconPressure(run, picked) {
  if ((run.endless.breakthroughsCount ?? 0) < 2) return
  const playedMinPay = picked.some((c) => c.title.includes('最低还款'))
  run.econ.delinquency = Math.min(100, run.econ.delinquency + (playedMinPay ? 0.1 : 0.32))
  run.stats.fatigue = Math.min(120, run.stats.fatigue + 0.28)
}

function daoCollapsePressureMet(run, del, fatigue) {
  const breakthroughs = run.endless.breakthroughsCount ?? 0
  if (breakthroughs >= 3) return del >= 45 || fatigue >= 78
  if (breakthroughs >= 2) return del >= 48 || fatigue >= 82
  return del >= 55 || fatigue >= 90
}

function meetsBreakthroughKpi(run) {
  const realm = REALM_BY_ID[run.realmTier]
  const nextRealm = REALM_ORDER[REALM_ORDER.indexOf(run.realmTier) + 1]
  if (!realm || !nextRealm) return false
  const kpi = realm.breakthroughKpi ?? {}
  const days = run.endless.daysInCurrentRealm
  if (days < (kpi.minDaysInRealm ?? 3)) return false
  if (run.stats.daoXin < (kpi.minDaoXin ?? 0)) return false
  if (run.stats.faLi < (kpi.minFaLi ?? 0)) return false
  if (run.stats.rouTi < (kpi.minRouTi ?? 0)) return false
  return true
}

function confirmBreakthrough(run) {
  const idx = REALM_ORDER.indexOf(run.realmTier)
  if (idx < 0 || idx >= REALM_ORDER.length - 1) return false
  const nextRealm = REALM_BY_ID[REALM_ORDER[idx + 1]]
  if (!nextRealm) return false
  run.realmTier = nextRealm.id
  run.maintenanceCoeff *= nextRealm.maintenanceCoeff
  run.endless.daysInCurrentRealm = 0
  run.endless.breakthroughsCount += 1
  const lifeIdx = LIFE_ORDER.indexOf(run.lifeStage)
  if (lifeIdx >= 0 && lifeIdx < LIFE_ORDER.length - 1) {
    run.lifeStage = LIFE_ORDER[lifeIdx + 1]
  }
  const fullDebt = run.econ.debtPrincipal + run.econ.debtInterestAccrued + run.econ.collectionFee
  run.econ.debtPrincipal += Math.max(5000, Math.round(fullDebt * 0.08 * nextRealm.maintenanceCoeff))
  return true
}

function checkCollapse(run) {
  const del = run.econ.delinquency
  const dao = run.stats.daoXin
  const fatigue = run.stats.fatigue
  const liens = run.bodyLiens
  const lieFlatStreak = run.endless.lieFlatStreak
  const breakthroughs = run.endless.breakthroughsCount
  const daysInRealm = run.endless.daysInCurrentRealm

  for (const ending of COLLAPSE_ENDINGS) {
    const t = ending.trigger ?? {}
    if (t.minBreakthroughs !== undefined && breakthroughs < t.minBreakthroughs) continue
    if (t.minDaysInRealm !== undefined && daysInRealm < t.minDaysInRealm) continue
    if (daysInRealm < 4 && ending.id !== 'collapse-lie-flat') continue
    if (ending.id === 'collapse-dao' && !daoCollapsePressureMet(run, del, fatigue)) continue
    if (t.minDelinquency !== undefined && del >= t.minDelinquency) return ending
    if (t.maxDaoXin !== undefined && dao <= t.maxDaoXin) return ending
    if (t.minLienCount !== undefined && liens >= t.minLienCount) return ending
    if (t.minFatigue !== undefined && fatigue >= t.minFatigue) return ending
    if (t.minLieFlatStreak !== undefined && lieFlatStreak >= t.minLieFlatStreak) return ending
  }
  return null
}

function simulateOne(seed, maxRounds, profile) {
  const rng = mulberry32(seed)
  const run = startRun(seed)
  let firstBreakthroughRound = null
  let roundsWithAvoidPick = 0
  let roundsWithLowAgency = 0
  let lastBreakthroughRound = null
  let secondBreakthroughRound = null
  let thirdBreakthroughRound = null
  const buildFlowMetrics = (finalRound) => ({
    firstBreakthroughRound,
    secondBreakthroughRound,
    thirdBreakthroughRound,
    roundsWithAvoidPick,
    roundsWithLowAgency,
    roundsAfterLastBreakthrough: lastBreakthroughRound == null ? 0 : finalRound - lastBreakthroughRound,
    hsRounds: firstBreakthroughRound ?? finalRound,
    uniRounds:
      secondBreakthroughRound != null && firstBreakthroughRound != null
        ? secondBreakthroughRound - firstBreakthroughRound
        : 0,
    workPreCoreRounds:
      thirdBreakthroughRound != null && secondBreakthroughRound != null
        ? thirdBreakthroughRound - secondBreakthroughRound
        : 0
  })
  for (let i = 0; i < maxRounds; i++) {
    run.round += 1
    const offered = pickOffered(run, rng)
    if (offered.length < 2) {
      return {
        status: 'stalled',
        rounds: run.round,
        realmTier: run.realmTier,
        lifeStage: run.lifeStage,
        ...buildFlowMetrics(run.round)
      }
    }
    const picked = chooseTwo(offered, run, rng, profile)
    const preferredOfferedCount = offered.filter((c) => PREFER_TITLES.some((k) => c.title.includes(k))).length
    if (preferredOfferedCount <= 1) roundsWithLowAgency += 1
    if (picked.some((c) => AVOID_TITLES.some((k) => c.title.includes(k)))) roundsWithAvoidPick += 1
    const playedIds = new Set(picked.map((c) => c.id))
    const playedLieFlat = playedIds.has('endless-lie-flat')

    for (const card of offered) {
      const effects = playedIds.has(card.id) ? (card.effectsOnPlay ?? []) : (card.effectsOnSkip ?? [])
      for (const effect of effects) applyEffect(run, effect)
    }

    tickEndless(run, playedLieFlat)
    tickDailyEconPressure(run, picked)
    tickWeeklyDelinquency(run)
    const collapse = checkCollapse(run)
    if (collapse) {
      return {
        status: 'collapsed',
        endingId: collapse.id,
        endingTitle: collapse.title,
        rounds: run.round,
        realmTier: run.realmTier,
        lifeStage: run.lifeStage,
        breakthroughs: run.endless.breakthroughsCount,
        ...buildFlowMetrics(run.round)
      }
    }

    if (!playedLieFlat && (meetsBreakthroughKpi(run) || softPityBreakthroughDue(run))) {
      const broke = confirmBreakthrough(run)
      if (broke) {
        if (firstBreakthroughRound == null) firstBreakthroughRound = run.round
        else if (secondBreakthroughRound == null) secondBreakthroughRound = run.round
        else if (thirdBreakthroughRound == null) thirdBreakthroughRound = run.round
        lastBreakthroughRound = run.round
      }
    }
  }
  return {
    status: 'survived',
    rounds: maxRounds,
    realmTier: run.realmTier,
    lifeStage: run.lifeStage,
    breakthroughs: run.endless.breakthroughsCount,
    ...buildFlowMetrics(maxRounds)
  }
}

function pct(n, total) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0.0%'
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr) {
  if (!arr.length) return 0
  const xs = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(xs.length / 2)
  if (xs.length % 2) return xs[mid]
  return (xs[mid - 1] + xs[mid]) / 2
}

function main() {
  const { runs, seed, maxRounds, profile } = parseArgs()
  if (!Number.isFinite(runs) || runs <= 0) throw new Error('runs 必须是正整数')
  if (!Number.isFinite(seed)) throw new Error('seed 必须是数字')
  if (!Number.isFinite(maxRounds) || maxRounds <= 0) throw new Error('max-rounds 必须是正整数')
  if (!['natural', 'balanced'].includes(profile)) {
    throw new Error('profile 仅支持 natural | balanced')
  }

  /** @type {Array<ReturnType<typeof simulateOne>>} */
  const results = []
  for (let i = 0; i < runs; i++) {
    results.push(simulateOne(seed + i * 17, maxRounds, profile))
  }

  const collapsed = results.filter((r) => r.status === 'collapsed')
  const survived = results.filter((r) => r.status === 'survived')
  const stalled = results.filter((r) => r.status === 'stalled')

  const byRealm = new Map()
  const byEnding = new Map()
  for (const r of collapsed) {
    byRealm.set(r.realmTier, (byRealm.get(r.realmTier) ?? 0) + 1)
    byEnding.set(r.endingId, (byEnding.get(r.endingId) ?? 0) + 1)
  }

  const firstBreakthroughRounds = results
    .map((r) => r.firstBreakthroughRound)
    .filter((n) => typeof n === 'number')
  const avoidPickRatios = results
    .filter((r) => r.rounds > 0)
    .map((r) => (r.roundsWithAvoidPick ?? 0) / r.rounds)
  const lowAgencyRatios = results
    .filter((r) => r.rounds > 0)
    .map((r) => (r.roundsWithLowAgency ?? 0) / r.rounds)
  const roundsAfterLastBreakthrough = results
    .map((r) => r.roundsAfterLastBreakthrough ?? 0)
    .filter((n) => Number.isFinite(n))
  const hsRounds = results.map((r) => r.hsRounds ?? 0)
  const uniRounds = results.map((r) => r.uniRounds ?? 0).filter((n) => n > 0)
  const workPreCoreRounds = results
    .map((r) => r.workPreCoreRounds ?? 0)
    .filter((n) => n > 0)

  console.log(`\n崩盘分布模拟`)
  console.log(`runs=${runs}, seed=${seed}, maxRounds=${maxRounds}, profile=${profile}`)
  console.log(`collapsed=${collapsed.length} (${pct(collapsed.length, runs)})`)
  console.log(`survived=${survived.length} (${pct(survived.length, runs)})`)
  console.log(`stalled=${stalled.length} (${pct(stalled.length, runs)})`)

  console.log(`\n按境界崩盘分布`)
  const realmRows = Array.from(byRealm.entries()).sort((a, b) => b[1] - a[1])
  if (!realmRows.length) console.log('  - 无崩盘')
  for (const [realm, count] of realmRows) {
    console.log(`  - ${realm}: ${count} (${pct(count, collapsed.length)})`)
  }

  console.log(`\n按崩盘原因分布`)
  const reasonRows = Array.from(byEnding.entries()).sort((a, b) => b[1] - a[1])
  if (!reasonRows.length) console.log('  - 无崩盘')
  for (const [id, count] of reasonRows) {
    const title = COLLAPSE_ENDINGS.find((e) => e.id === id)?.title ?? id
    console.log(`  - ${id}(${title}): ${count} (${pct(count, collapsed.length)})`)
  }

  console.log(`\n玩家体验指标`)
  console.log(
    `  - 首次破境回合: mean=${mean(firstBreakthroughRounds).toFixed(1)}, median=${median(firstBreakthroughRounds).toFixed(1)}`
  )
  console.log(
    `  - 低能动性回合占比(可选偏好<=1): mean=${(mean(lowAgencyRatios) * 100).toFixed(1)}%, median=${(median(lowAgencyRatios) * 100).toFixed(1)}%`
  )
  console.log(
    `  - 被迫选择负向牌占比: mean=${(mean(avoidPickRatios) * 100).toFixed(1)}%, median=${(median(avoidPickRatios) * 100).toFixed(1)}%`
  )
  console.log(
    `  - 最近一次破境后存活回合: mean=${mean(roundsAfterLastBreakthrough).toFixed(1)}, median=${median(roundsAfterLastBreakthrough).toFixed(1)}`
  )
  console.log(
    `  - 高中段回合(开局→1破): mean=${mean(hsRounds).toFixed(1)}, median=${median(hsRounds).toFixed(1)}`
  )
  console.log(
    `  - 大学段回合(1破→2破): mean=${mean(uniRounds).toFixed(1)}, median=${median(uniRounds).toFixed(1)}`
  )
  console.log(
    `  - 职场前段回合(2破→3破): mean=${mean(workPreCoreRounds).toFixed(1)}, median=${median(workPreCoreRounds).toFixed(1)}`
  )

  console.log(`\n样本提示`)
  const sample = collapsed.slice(0, 8)
  if (!sample.length) {
    console.log('  - 本次样本无崩盘，可提高 runs 或 max-rounds 再观察')
  } else {
    for (const s of sample) {
      console.log(
        `  - round=${s.rounds}, realm=${s.realmTier}, life=${s.lifeStage}, ending=${s.endingId}, breakthroughs=${s.breakthroughs}`
      )
    }
  }
}

main()

