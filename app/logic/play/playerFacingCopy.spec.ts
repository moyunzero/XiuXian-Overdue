import { describe, expect, it } from 'vitest'
import {
  assertPlayerFacingStringsAreLocalized,
  assertPlayerFacingTextDoesNotLeakInternalIds,
  formatEmploymentTrackLabel,
  formatGateLabel,
  formatLifeStageChain,
  formatPlayAiMomentLogLine,
  formatPlayLogLine,
  formatPlayerFacingTagLine,
  formatPressureCardTagLine
} from './playerFacingCopy'

describe('playerFacingCopy', () => {
  it('formatPlayerFacingTagLine 将 educationTags 译为中文', () => {
    const line = formatPlayerFacingTagLine(
      ['hs-graduated', 'uni-enrolled', 'tier-tail'],
      { fallback: '无学历备注' }
    )
    expect(line).toContain('高中')
    expect(line).not.toMatch(/hs-graduated|uni-enrolled|tier-tail/)
    assertPlayerFacingStringsAreLocalized(line.split('、'))
    assertPlayerFacingTextDoesNotLeakInternalIds(line)
  })

  it('formatPressureCardTagLine 不暴露英文 tag', () => {
    const line = formatPressureCardTagLine(['study', 'risk', 'lie-flat'])
    expect(line).toBe('修习 · 风险 · 躺平')
    assertPlayerFacingStringsAreLocalized(line.split(' · '))
  })

  it('formatPlayLogLine 使用中文日序', () => {
    expect(formatPlayLogLine(12, '利率上浮', '日利率 +0.1%')).toBe(
      '第 12 日 · 利率上浮：日利率 +0.1%'
    )
    expect(formatPlayLogLine(3, '记录', '')).toBe('第 3 日 · 记录')
  })

  it('formatPlayAiMomentLogLine 不暴露 trigger 代码', () => {
    const line = formatPlayAiMomentLogLine(
      'post-exam',
      '月考后风控回访',
      '系统叠看了分数与负债曲线。'
    )
    expect(line).toMatch(/^\[月考后\]/)
    expect(line).not.toMatch(/post-exam/)
  })

  it('formatEmploymentTrackLabel 与 formatLifeStageChain', () => {
    expect(formatEmploymentTrackLabel('company')).toBe('进公司')
    expect(formatEmploymentTrackLabel('unknown')).toBe('未择轨')
    expect(formatLifeStageChain(['pre', 'hs', 'uni'])).toBe('入学前 → 高中 → 大学')
    assertPlayerFacingStringsAreLocalized(formatLifeStageChain(['pre', 'hs']).split(' → '))
  })

  it('formatGateLabel 不暴露 gate id', () => {
    expect(formatGateLabel('gate-w40-finale')).toBe('第40周 · 终审判')
    expect(formatGateLabel('gate-unknown')).toBe('制度闸门')
  })

  it('assertPlayerFacingStringsAreLocalized 拒绝 kebab-case 内部 ID', () => {
    expect(() => assertPlayerFacingStringsAreLocalized(['tier-tail'])).toThrow(/内部标签/)
    expect(() => assertPlayerFacingStringsAreLocalized(['work'])).toThrow(/人生段落/)
    expect(() => assertPlayerFacingStringsAreLocalized(['company'])).toThrow(/择轨/)
  })

  it('assertPlayerFacingTextDoesNotLeakInternalIds 拒绝拼接泄漏', () => {
    expect(() =>
      assertPlayerFacingTextDoesNotLeakInternalIds('学历：hs-graduated、uni-enrolled')
    ).toThrow(/内部标签/)
  })

  it('未知 profile tag 不暴露原始 id', () => {
    const line = formatPlayerFacingTagLine(['some-unknown-tag-xyz'], { fallback: '无' })
    expect(line).toBe('制度档案备注')
    expect(line).not.toMatch(/some-unknown/)
  })
})
