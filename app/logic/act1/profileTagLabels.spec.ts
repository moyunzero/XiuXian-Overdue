import { describe, expect, it } from 'vitest'
import { formatProfileTag, formatProfileTags } from './profileTagLabels'

describe('profileTagLabels', () => {
  it('常见面试标签显示中文', () => {
    expect(formatProfileTag('sleep-optimized')).toBe('睡眠达标（药物维持）')
    expect(formatProfileTag('track-soul')).toBe('魂修轨道')
  })

  it('家庭支出类标签推断中文', () => {
    expect(formatProfileTag('spent-rent-root')).toBe('已支出·租灵根')
    expect(formatProfileTag('request-pill-pack')).toBe('已向家里索要·培元药剂')
  })

  it('去重相同中文标签', () => {
    const labels = formatProfileTags(['prior-debt', 'prior-debt', 'price-aware'])
    expect(labels).toEqual(['既有负债记录', '比价阅读记录'])
  })
})
