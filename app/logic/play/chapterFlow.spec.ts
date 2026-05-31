import { describe, it, expect } from 'vitest'
import { chaptersForLifeStage, getChapterMeta, lifeStageLabel, realmTierLabel } from './chapterFlow'

describe('chapterFlow', () => {
  it('pre 阶段至少一章', () => {
    const pre = chaptersForLifeStage('pre')
    expect(pre.length).toBeGreaterThan(0)
    expect(pre[0]!.lifeStage).toBe('pre')
  })

  it('getChapterMeta 回退首章', () => {
    const m = getChapterMeta('pre', 99)
    expect(m?.index).toBe(0)
  })

  it('lifeStageLabel 与 realmTierLabel', () => {
    expect(lifeStageLabel('pre')).toBe('入学前')
    expect(realmTierLabel('mortal')).toBe('凡人界')
  })

  it('uni 阶段有章节元数据', () => {
    const uni = chaptersForLifeStage('uni')
    expect(uni.length).toBe(1)
    expect(uni[0]!.lifeStage).toBe('uni')
  })
})
