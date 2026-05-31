import type { PlayRunState, UniState } from '~/types/play'

export function createUniStateFromHs(run: PlayRunState): UniState {
  const daoXin = run.stats?.daoXin ?? 1
  const faLi = run.stats?.faLi ?? 1
  const rouTi = run.stats?.rouTi ?? 0.6

  return {
    majorId: 'foundation-track',
    sectId: '',
    foundationKpi: { daoXin: 2, faLi: 1.4, rouTi: 1.1 },
    foundationProgress: { daoXin, faLi, rouTi },
    subscriptions: [
      { id: 'spirit-root-lease', label: '灵根租', monthlyCost: 2400, active: false },
      { id: 'method-sub', label: '功法订阅', monthlyCost: 1800, active: false }
    ],
    rankCohort: 'normal',
    rankingLabel: '预科积分榜'
  }
}
