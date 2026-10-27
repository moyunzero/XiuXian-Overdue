import { describe, expect, it } from 'vitest'
import {
  assertPlayerFacingStringsAreLocalized,
  assertPlayerFacingTextDoesNotLeakInternalIds,
  delegationPanelCopy,
  dualLedgerLabelMing,
  dualLedgerLabelYang,
  fateUpdateOverlayBodyLine,
  formatContinuePlayLabel,
  formatEmploymentTrackLabel,
  formatGateLabel,
  formatInstitutionalTagStamp,
  formatLifeStageChain,
  formatPlayAiMomentLogLine,
  formatPlayLogLine,
  formatPlayerFacingTagLine,
  formatPressureCardTagLine,
  formatPrimaryFateLabel,
  META_NEW_HUMAN_OTHER_SLOT_HINT
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

  it('formatContinuePlayLabel 命运档继续文案 (D-110)', () => {
    expect(formatContinuePlayLabel('mortgaged')).toBe('继续 · 抵押运行档')
    expect(formatContinuePlayLabel('head_jar')).toBe('继续 · 器藏维生档')
    expect(formatContinuePlayLabel('human', '高中 · 你')).toBe('继续修行 · 高中 · 你')
    assertPlayerFacingStringsAreLocalized([
      formatContinuePlayLabel('mortgaged'),
      formatContinuePlayLabel('head_jar')
    ])
  })

  it('META_NEW_HUMAN_OTHER_SLOT_HINT 锁定文案 (D-112)', () => {
    expect(META_NEW_HUMAN_OTHER_SLOT_HINT).toBe(
      '新档仍从人类身份签约；上周目的命运态已收入账号档案。'
    )
    assertPlayerFacingTextDoesNotLeakInternalIds(META_NEW_HUMAN_OTHER_SLOT_HINT)
  })

  it('formatPrimaryFateLabel 不暴露 primaryFate ID', () => {
    expect(formatPrimaryFateLabel('human')).toBe('肉身修士')
    expect(formatPrimaryFateLabel('mortgaged')).toBe('抵押运行')
    expect(formatPrimaryFateLabel('head_jar')).toBe('器藏维生')
    expect(formatPrimaryFateLabel('unknown')).toBe('肉身修士')
    assertPlayerFacingStringsAreLocalized([
      formatPrimaryFateLabel('human'),
      formatPrimaryFateLabel('mortgaged'),
      formatPrimaryFateLabel('head_jar')
    ])
  })

  it('formatInstitutionalTagStamp 输出 tag stamp 中文', () => {
    expect(formatInstitutionalTagStamp('supply_cut')).toBe('断供')
    expect(formatInstitutionalTagStamp('credit_blacklist')).toBe('征信黑')
    expect(formatInstitutionalTagStamp('family_leverage')).toBe('连坐')
    expect(formatInstitutionalTagStamp('exam_probation')).toBe('制度标记')
  })

  it('delegationPanelCopy ghost_bound 不含 raw tag ids (D-125)', () => {
    const ghost = delegationPanelCopy('ghost_bound')
    expect(ghost.panelTag).toBe('冥籍绑定')
    expect(ghost.panelTitle).toBe('本周阴司工单')
    expect(ghost.confirmLabel).toBe('开本周')
    expect(JSON.stringify(ghost)).not.toMatch(/ghost_bound|head_jar/)
    assertPlayerFacingStringsAreLocalized([ghost.panelTag, ghost.panelTitle, ghost.confirmLabel])
  })

  it('delegationPanelCopy head_jar defaults unchanged (D-125)', () => {
    const head = delegationPanelCopy('head_jar')
    expect(head.panelTag).toBe('器藏维生')
    expect(head.panelTitle).toBe('本周委托')
    expect(head.confirmLabel).toBe('开本周')
  })

  it('dualLedgerLabelYang/Ming 不含制度二字 (D-123)', () => {
    expect(dualLedgerLabelYang()).toBe('人账阳债')
    expect(dualLedgerLabelMing()).toBe('鬼账冥币')
    expect(dualLedgerLabelYang()).not.toContain('制度')
    expect(dualLedgerLabelMing()).not.toContain('制度')
  })

  it('fateUpdateOverlayBodyLine ghost_bound 不含 raw id (D-127)', () => {
    const body = fateUpdateOverlayBodyLine('ghost_bind', 'ghost_bound')
    expect(body).toContain('绑定幽影')
    expect(body).not.toMatch(/ghost_bound|head_jar/)
    assertPlayerFacingStringsAreLocalized([body])
  })
})
