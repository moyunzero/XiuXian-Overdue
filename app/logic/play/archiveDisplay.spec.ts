import { describe, expect, it } from 'vitest'
import {
  assertArchiveDisplayStringsAreLocalized,
  formatArchiveTopTags,
  formatBodyLienForArchive,
  formatRunModeForArchive
} from './archiveDisplay'

describe('archiveDisplay', () => {
  it('周目模式显示中文', () => {
    expect(formatRunModeForArchive('endless')).toBe('无尽境')
  })

  it('身体留置 ID 转为中文部位说明', () => {
    expect(formatBodyLienForArchive('lien-LeftPalm-8')).toBe('左手掌 · 第 8 日写入留置')
  })

  it('档案标签不含 kebab-case 内部 ID', () => {
    const labels = formatArchiveTopTags(
      ['family-guarantor', 'collection-shielded', 'hs-graduated', 'sect-ash'],
      8
    )
    expect(labels).toContain('家庭担保人')
    expect(labels).toContain('择宗·灰炉院预科')
    assertArchiveDisplayStringsAreLocalized(labels)
  })
})
