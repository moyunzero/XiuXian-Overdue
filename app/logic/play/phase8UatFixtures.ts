import fs from 'node:fs'
import path from 'node:path'
import { writePhase5UatFixturesToDisk } from '~/logic/play/phase5UatFixtures'
import { writePhase6UatFixturesToDisk } from '~/logic/play/phase6UatFixtures'
import { writePhase7UatFixturesToDisk } from '~/logic/play/phase7UatFixtures'

export type Phase8UatScenarioRef = {
  id: string
  label: string
  checklistRef: string
  sourcePhase: 5 | 6 | 7
  sourceFixtureId: string
  path: '/' | '/play'
  waitSelector: string
  usesMeta?: boolean
}

/** Handoff registry — reuses phase5–7 JSON fixtures on disk (D-158). */
export function buildPhase8UatScenarios(): Phase8UatScenarioRef[] {
  return [
    {
      id: 'phase8-meta-codex',
      label: 'UAT-1 · 账号档案 FateCodexStrip',
      checklistRef: '§0 preflight · meta',
      sourcePhase: 5,
      sourceFixtureId: 'phase5-meta-codex-mortgaged',
      path: '/',
      waitSelector: '.FateCodexStrip',
      usesMeta: true
    },
    {
      id: 'phase8-m1-dashboard',
      label: 'UAT-2 · M1 第8周四格排程',
      checklistRef: '§1 短局 · 周循环',
      sourcePhase: 7,
      sourceFixtureId: 'phase7-m1-week8-dashboard',
      path: '/play',
      waitSelector: '.WeekPlan'
    },
    {
      id: 'phase8-mandate-inbox',
      label: 'UAT-3 · M1 来文池',
      checklistRef: '§1 短局 · 来文',
      sourcePhase: 7,
      sourceFixtureId: 'phase7-m1-mandate-inbox',
      path: '/play',
      waitSelector: '.MandateInbox'
    },
    {
      id: 'phase8-fate-overlay',
      label: 'UAT-4 · 灵籍 overlay catalog',
      checklistRef: '§3 命运链',
      sourcePhase: 7,
      sourceFixtureId: 'phase7-fate-overlay-catalog',
      path: '/play',
      waitSelector: '.FateUpdateOverlay'
    },
    {
      id: 'phase8-w40-continuity',
      label: 'UAT-5 · W40 无终局',
      checklistRef: '§2 中局 · W40 续玩',
      sourcePhase: 7,
      sourceFixtureId: 'phase7-w40-continuity',
      path: '/play',
      waitSelector: '.WeekPlan'
    },
    {
      id: 'phase8-w41-m2',
      label: 'UAT-6 · W41 → M2',
      checklistRef: '§2 中局 · stage ladder',
      sourcePhase: 7,
      sourceFixtureId: 'phase7-w41-m2-stage',
      path: '/play',
      waitSelector: '.WeekPlan'
    },
    {
      id: 'phase8-ghost-bound',
      label: 'UAT-7 · ghost_bound 双账',
      checklistRef: '§3 幽影旁支',
      sourcePhase: 6,
      sourceFixtureId: 'phase6-ghost-bound-playable',
      path: '/play',
      waitSelector: '.DelegationPanel'
    }
  ]
}

export function ensureUpstreamUatFixturesOnDisk(): string[] {
  const written: string[] = []
  written.push(...writePhase5UatFixturesToDisk(path.join(process.cwd(), 'e2e/fixtures/phase5-uat')))
  written.push(...writePhase6UatFixturesToDisk(path.join(process.cwd(), 'e2e/fixtures/phase6-uat')))
  written.push(...writePhase7UatFixturesToDisk(path.join(process.cwd(), 'e2e/fixtures/phase7-uat')))
  const registryPath = path.join(process.cwd(), 'e2e/fixtures/phase8-uat/scenarios.json')
  fs.mkdirSync(path.dirname(registryPath), { recursive: true })
  fs.writeFileSync(registryPath, JSON.stringify(buildPhase8UatScenarios(), null, 2), 'utf8')
  written.push(registryPath)
  return written
}
