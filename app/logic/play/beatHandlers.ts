import type { BeatDef } from '~/types/chapter'
import type { HsPromotionGatePending, PlayRunState } from '~/types/play'
import { buildBreakthroughPending } from '~/logic/play/breakthroughFlow'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { runExamBoss } from '~/logic/play/examBoss'
import { createUniStateFromHs } from '~/logic/play/createUniPlayState'
import { createWorkStateFromUni } from '~/logic/play/createWorkPlayState'
import { buildSectChoicePending } from '~/logic/play/uniFlow'
import { mulberry32 } from '~/utils/rng'

export interface BeatResult {
  run: PlayRunState
  blocking: boolean
  gateId?: string
  logLine?: string
}

export type BeatHandler = (run: PlayRunState, beat: BeatDef) => BeatResult

function withLog(run: PlayRunState, line: string): PlayRunState {
  return { ...run, logs: [line, ...run.logs].slice(0, 80) }
}

export const BEAT_HANDLERS: Record<string, BeatHandler> = {
  examBoss(run, beat) {
    const rand = mulberry32((run.seed ?? 1) + beat.week * 777)
    const result = runExamBoss(run, rand)
    return {
      run: {
        ...run,
        setpiece: { ...run.setpiece, examBossPending: result }
      },
      blocking: true,
      logLine: `第 ${beat.week} 周：月考结算待确认。`
    }
  },

  breakthroughFlow(run, beat) {
    const pending = buildBreakthroughPending({
      ...run,
      lifeStage: 'hs',
      realmTier: run.realmTier === 'mortal' ? 'qi' : run.realmTier
    })
    if (!pending) {
      return {
        run: withLog(run, `第 ${beat.week} 周：筑基关口条件未满足，进入降级路径。`),
        blocking: false,
        gateId: beat.gateId
      }
    }
    return {
      run: {
        ...run,
        setpiece: { ...run.setpiece, breakthroughPending: pending }
      },
      blocking: true,
      gateId: beat.gateId,
      logLine: `第 ${beat.week} 周：筑基关口。`
    }
  },

  uniFlow(run, beat) {
    const pending = buildSectChoicePending(run)
    return {
      run: {
        ...run,
        lifeStage: 'uni',
        uni: run.uni ?? createUniStateFromHs(run),
        setpiece: { ...run.setpiece, sectChoicePending: pending }
      },
      blocking: true,
      gateId: beat.gateId,
      logLine: `第 ${beat.week} 周：择宗待确认。`
    }
  },

  quotaAudit(run, beat) {
    return {
      run: withLog(run, `第 ${beat.week} 周：配额审计记录已入账。`),
      blocking: false
    }
  },

  setpieceFlow(run, beat) {
    const realmTier = run.realmTier === 'mortal' ? 'qi' : (run.realmTier ?? 'foundation')
    const pending = buildBreakthroughPending({
      ...run,
      lifeStage: 'uni',
      realmTier
    })
    const uniFoundationGatePending: HsPromotionGatePending | undefined = pending
      ? {
          examsCompleted: run.setpiece?.examsCompleted ?? 0,
          celebrationLine: pending.celebrationLine,
          billLines: pending.billLines,
          totalDebt: pending.totalDebt,
          maintenanceBumpLabel: pending.maintenanceBumpLabel
        }
      : run.runMode === 'chapter'
        ? {
            examsCompleted: run.setpiece?.examsCompleted ?? 0,
            celebrationLine: '预科结业关口：档案已盖章，下一周进入择轨。',
            billLines: [
              '结业审计费计入本周账单。',
              '灵根租与功法订阅按合同继续扣费。',
              '职场段门槛将在择轨后解锁。'
            ],
            totalDebt: fullDebtFromRun(run),
            maintenanceBumpLabel: `维护费系数 ×${(run.maintenanceCoeff ?? 1).toFixed(2)}`
          }
        : undefined
    return {
      run: {
        ...run,
        setpiece: {
          ...run.setpiece,
          uniFoundationGatePending
        }
      },
      blocking: !!uniFoundationGatePending,
      gateId: beat.gateId,
      logLine: `第 ${beat.week} 周：预科结业关口。`
    }
  },

  workFlow(run, beat) {
    const work: import('~/types/play').WorkState = {
      ...createWorkStateFromUni(run),
      jobId: null,
      employmentTrack: null
    }
    return {
      run: {
        ...withLog(run, `第 ${beat.week} 周：职场择轨。`),
        lifeStage: 'work',
        work
      },
      blocking: true,
      gateId: beat.gateId
    }
  },

  workKpiReview(run, beat) {
    const kpi = run.work?.kpiScore ?? 0
    return {
      run: withLog(run, `第 ${beat.week} 周：KPI 复核 ${kpi} 分已归档。`),
      blocking: false
    }
  },

  contractFinale(run, beat) {
    if (run.runMode === 'fate_run') {
      return {
        run: withLog(run, `第 ${beat.week} 周：契约账期已满，阶梯续行。`),
        blocking: false
      }
    }
    return {
      run: withLog(run, `第 ${beat.week} 周：契约终局待裁定。`),
      blocking: true,
      gateId: beat.gateId
    }
  }
}

export function getBeatHandler(handlerId: string): BeatHandler | undefined {
  return BEAT_HANDLERS[handlerId]
}
