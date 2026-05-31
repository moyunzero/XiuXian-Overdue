import type { SectChoiceOption } from '~/types/play'

export const SECT_CHOICES: SectChoiceOption[] = [
  {
    id: 'sect-cloud',
    name: '云箓宗预科',
    harvestRateCap: 0.22,
    cohortBias: 'elite',
    deckBiasLabel: '闭关 · 订阅权重↑'
  },
  {
    id: 'sect-iron',
    name: '铁券阁预科',
    harvestRateCap: 0.18,
    cohortBias: 'normal',
    deckBiasLabel: '任务 · 兼职权重↑'
  },
  {
    id: 'sect-ash',
    name: '灰炉院预科',
    harvestRateCap: 0.26,
    cohortBias: 'tail',
    deckBiasLabel: '催收 · 风险权重↑'
  }
]

export function getSectChoiceById(id: string): SectChoiceOption | undefined {
  return SECT_CHOICES.find((s) => s.id === id)
}
