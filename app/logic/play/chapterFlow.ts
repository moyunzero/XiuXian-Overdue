import type { LifeStage } from '~/types/play'

export interface ChapterMeta {
  id: string
  lifeStage: LifeStage
  index: number
  title: string
  subtitle: string
}

const PRE_CHAPTERS: ChapterMeta[] = [
  { id: 'pre-0', lifeStage: 'pre', index: 0, title: '入学前夜', subtitle: '三步大卡 · 面试 · 灵贷 · 家庭' }
]

const HS_CHAPTERS: ChapterMeta[] = [
  { id: 'hs-0', lifeStage: 'hs', index: 0, title: '高中修行', subtitle: '压力牌组 · M2' }
]

const UNI_CHAPTERS: ChapterMeta[] = [
  { id: 'uni-0', lifeStage: 'uni', index: 0, title: '预科筑基', subtitle: '择宗 · 订阅 · 压力牌组' }
]

const WORK_CHAPTERS: ChapterMeta[] = [
  { id: 'work-0', lifeStage: 'work', index: 0, title: '职场修行', subtitle: '求职 · KPI · 五险一金' }
]

export function chaptersForLifeStage(stage: LifeStage): ChapterMeta[] {
  switch (stage) {
    case 'pre':
      return PRE_CHAPTERS
    case 'hs':
      return HS_CHAPTERS
    case 'uni':
      return UNI_CHAPTERS
    case 'work':
      return WORK_CHAPTERS
    default:
      return []
  }
}

export function getChapterMeta(stage: LifeStage, index: number): ChapterMeta | null {
  const list = chaptersForLifeStage(stage)
  return list.find((c) => c.index === index) ?? list[0] ?? null
}

export function lifeStageLabel(stage: LifeStage): string {
  const map: Record<LifeStage, string> = {
    pre: '入学前',
    hs: '高中',
    uni: '大学',
    work: '职场'
  }
  return map[stage] ?? stage
}

export function realmTierLabel(tier: string): string {
  const map: Record<string, string> = {
    mortal: '凡人界',
    qi: '练气',
    foundation: '筑基',
    purple: '紫府',
    core: '结丹',
    nascent: '元婴',
    deity: '化神',
    void: '炼虚'
  }
  return map[tier] ?? tier
}

/** 短局终章：首次月考或崩盘后 runStatus 为 archived / collapsed */
export function isRunArchived(run: { runStatus?: string; archive?: { archivePhase?: string } }): boolean {
  return (
    (run.runStatus === 'archived' || run.runStatus === 'collapsed') &&
    run.archive?.archivePhase === 'sprint-finale'
  )
}
