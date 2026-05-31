import { describe, expect, it } from 'vitest'
import {
  assertPlayerFacingStringsAreLocalized,
  assertPlayerFacingTextDoesNotLeakInternalIds,
  formatPlayerFacingTagLine
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

  it('assertPlayerFacingStringsAreLocalized 拒绝 kebab-case 内部 ID', () => {
    expect(() => assertPlayerFacingStringsAreLocalized(['tier-tail'])).toThrow(/内部标签/)
  })

  it('assertPlayerFacingTextDoesNotLeakInternalIds 拒绝拼接泄漏', () => {
    expect(() =>
      assertPlayerFacingTextDoesNotLeakInternalIds('学历：hs-graduated、uni-enrolled')
    ).toThrow(/内部标签/)
  })
})
