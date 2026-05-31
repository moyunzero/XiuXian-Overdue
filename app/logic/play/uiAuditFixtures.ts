import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import type { SaveContainer } from '~/types/game'
import type { StartConfig } from '~/types/game'
import { PLAY_SAVE_SCHEMA_VERSION } from '~/composables/usePlayStorage.helpers'
import { SAVE_SCHEMA_VERSION, serializeSaveContainer } from '~/composables/useGameStorage.helpers'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { advanceRunToHs } from '~/logic/play/createHsPlayState'
import { initChapter } from '~/logic/play/chapterWeekFlow'
import {
  settledChapterRun,
  advanceChapterToWeek,
  dismissCurrentSetpiece
} from '~/logic/play/chapterTestHelpers'
import { tickChapterWeek, DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { SECT_CHOICES } from '~/logic/play/sectChoices'
import { buildBodyMortgagePending } from '~/logic/play/bodyMortgage'
import { applyChapterCollapse } from '~/logic/play/chapterCollapse'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { NATURAL_BASELINE_SEED, simulateNaturalToW40 } from '~/logic/play/chapterNaturalSim'

export const UI_AUDIT_START: StartConfig = {
  playerName: '审计员',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

export type UiAuditFixtureExport = {
  id: string
  label: string
  path: '/' | '/play'
  waitSelector: string
  saveV5: KunxuSaveV4 | null
  saveV2: string | null
}

function buildV5Save(run: PlayRunState): KunxuSaveV4 {
  return {
    saveSchemaVersion: PLAY_SAVE_SCHEMA_VERSION,
    activeRunId: run.runId,
    runs: { [run.runId]: run },
    meta: {
      priorMetaUnlocks: [],
      permanentModifiers: {},
      runsCompleted: 0
    }
  }
}

function hsChapter(overrides: Partial<PlayRunState> = {}): PlayRunState {
  const base = createPlayRunFromStartConfig(UI_AUDIT_START, 'slot1', { runMode: 'chapter' })
  return initChapter({ ...advanceRunToHs(base), ...overrides })
}

/** W29 tick 后停在择轨屏（与 chapter0-contract-flow.spec 一致） */
function workTrackChoiceRun(): PlayRunState {
  let run = advanceChapterToWeek(settledChapterRun(UI_AUDIT_START), 28)
  run = dismissCurrentSetpiece(tickChapterWeek(run, DEFAULT_WEEK_PLAN).run)
  run = advanceChapterToWeek(run, 29)
  return tickChapterWeek(run, DEFAULT_WEEK_PLAN).run
}

/** 择轨后停在择岗屏 */
function workJobChoiceRun(): PlayRunState {
  return dismissCurrentSetpiece(workTrackChoiceRun(), { employmentTrack: 'company' })
}

export function buildUiAuditFixtures(): UiAuditFixtureExport[] {
  const preRun = createPlayRunFromStartConfig(UI_AUDIT_START, 'slot1', { runMode: 'chapter' })
  const act1 = createInitialAct1State(UI_AUDIT_START)
  const act1Container: SaveContainer = {
    activeSlot: 'slot1',
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    slots: {},
    act1BySlot: { slot1: { startConfig: UI_AUDIT_START, act1, settled: false, metaUnlocks: [] } }
  }

  let bodyRun = hsChapter()
  bodyRun.econ!.delinquency = 3
  bodyRun.econ!.cash = 40
  bodyRun.econ!.debtPrincipal = 60_000
  bodyRun.school!.day = 10
  const bodyPending = buildBodyMortgagePending(bodyRun, () => 0)

  const trackRun = workTrackChoiceRun()
  const jobRun = workJobChoiceRun()

  let finaleRun = advanceChapterToWeek(settledChapterRun(UI_AUDIT_START), 40)
  finaleRun = {
    ...finaleRun,
    chapter: {
      ...finaleRun.chapter!,
      chapterWeekIndex: 40,
      weeksRemaining: 0,
      pendingGateId: 'gate-w40-finale'
    }
  }

  /** 自然模拟跑满 40 周并履约结业（与 chapterNaturalSim.spec baseline 一致） */
  const naturalFulfilledRun = simulateNaturalToW40('company')

  /** Ch0 第 1 周 · natural baseline seed（E2E 纯 UI 40 周入口，与 simulateNaturalToW40 同源） */
  const naturalCh0StartRun: PlayRunState = {
    ...settledChapterRun(UI_AUDIT_START),
    seed: NATURAL_BASELINE_SEED
  }

  /** 债务逾期触线 → 崩盘档案（含 failurePostMortem） */
  let debtCollapseRun = advanceChapterToWeek(settledChapterRun(UI_AUDIT_START), 14)
  debtCollapseRun.econ!.delinquency = 6
  debtCollapseRun.mandate!.supplyCutStreak = 3
  debtCollapseRun = applyChapterCollapse(debtCollapseRun)

  const scenarios: Array<{ id: string; label: string; path: '/' | '/play'; waitSelector: string; run?: PlayRunState; act1?: boolean }> = [
    { id: 'home-index', label: '首页 · 开局', path: '/', waitSelector: '.HeroSection' },
    { id: 'pre-act1-desktop', label: 'S0 · 入学前夜桌面', path: '/play', waitSelector: '.Act1Desktop, .S0Setpiece', run: preRun, act1: true },
    { id: 'chapter-week-dashboard', label: 'Ch0 · 周计划主界面', path: '/play', waitSelector: '.WeekPlan', run: settledChapterRun(UI_AUDIT_START) },
    {
      id: 'chapter-natural-ch0-start',
      label: 'Ch0 · 自然人格 · 第 1 周',
      path: '/play',
      waitSelector: '.WeekPlan',
      run: naturalCh0StartRun
    },
    {
      id: 'chapter-mandate-inbox',
      label: 'Ch0 · 制度来文',
      path: '/play',
      waitSelector: '.MandateInbox',
      run: hsChapter({
        mandate: { numbness: 12, domestication: 5, pendingDeliveryIds: ['ch0-debt-reminder'], supplyCutStreak: 0 }
      })
    },
    {
      id: 'chapter-exam-boss',
      label: 'Ch0 · 月考关口',
      path: '/play',
      waitSelector: '.ExamBoss',
      run: hsChapter({
        setpiece: {
          examBossPending: {
            score: 612,
            rank: 38,
            classTier: '重点班',
            tierBefore: '普通班',
            tierAfter: '重点班',
            perksDelta: { mealSubsidy: 1, focusBonus: 2 },
            week: 4,
            perkSummary: '餐补与专注权重上调'
          }
        }
      })
    },
    {
      id: 'chapter-breakthrough-gate',
      label: 'Ch0 · 升学关口',
      path: '/play',
      waitSelector: '.Breakthrough',
      run: hsChapter({
        setpiece: {
          breakthroughPending: {
            currentRealmId: 'mortal',
            nextRealmId: 'foundation',
            currentRealmLabel: '凡人',
            nextRealmLabel: '预科',
            celebrationLine: '升学关口登记完成，债务条款已锁定。',
            billLines: ['学籍押金 ¥2,400', '预科订阅 ¥1,200/月', '征信联动利率 +0.2%'],
            totalDebt: 22_400,
            maintenanceBumpLabel: '维持费 +¥180/周'
          }
        }
      })
    },
    {
      id: 'chapter-sect-choice',
      label: 'Ch0 · 院系选择',
      path: '/play',
      waitSelector: '.SectChoice',
      run: hsChapter({
        lifeStage: 'uni',
        setpiece: {
          sectChoicePending: {
            prompt: '预科注册处要求你在今日内锁定院系预科路径。',
            options: SECT_CHOICES
          }
        }
      })
    },
    {
      id: 'chapter-body-mortgage',
      label: 'Ch0 · 身体抵押',
      path: '/play',
      waitSelector: '.BodyMortgage',
      run: bodyPending ? hsChapter({ setpiece: { bodyMortgagePending: bodyPending } }) : hsChapter()
    },
    { id: 'chapter-work-track-choice', label: 'Ch0 · 择轨', path: '/play', waitSelector: '.TrackChoice', run: trackRun },
    { id: 'chapter-work-job-choice', label: 'Ch0 · 择岗', path: '/play', waitSelector: '.JobChoice', run: jobRun },
    { id: 'chapter-contract-finale', label: 'Ch0 · 四十周终局', path: '/play', waitSelector: '.ContractFinale', run: finaleRun },
    {
      id: 'chapter-run-archive',
      label: 'Ch0 · 自然通关 · 履约档案',
      path: '/play',
      waitSelector: '.RunArchiveView',
      run: naturalFulfilledRun
    },
    {
      id: 'chapter-collapse-debt',
      label: 'Ch0 · 债务崩盘 · 终局档案',
      path: '/play',
      waitSelector: '.RunArchiveView__post-mortem',
      run: debtCollapseRun
    }
  ]

  return scenarios.map((s) => {
    if (s.id === 'home-index') {
      return { id: s.id, label: s.label, path: s.path, waitSelector: s.waitSelector, saveV5: null, saveV2: null }
    }
    const run = s.run!
    return {
      id: s.id,
      label: s.label,
      path: s.path,
      waitSelector: s.waitSelector,
      saveV5: buildV5Save(run),
      saveV2: s.act1 ? serializeSaveContainer(act1Container as unknown as Record<string, unknown>) : null
    }
  })
}

export function writeUiAuditFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const written: string[] = []
  for (const fixture of buildUiAuditFixtures()) {
    const file = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(file, JSON.stringify(fixture, null, 2), 'utf8')
    written.push(file)
  }
  return written
}
