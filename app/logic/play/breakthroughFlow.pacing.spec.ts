import { describe, expect, it } from 'vitest'
import { breakthroughBillRevealSeconds } from '~/logic/play/breakthroughFlow'

describe('breakthrough pacing', () => {
  it('first two breakthroughs keep 60s bill', () => {
    expect(breakthroughBillRevealSeconds(0)).toBe(60)
    expect(breakthroughBillRevealSeconds(1)).toBe(60)
  })

  it('third and later breakthroughs compress to 15s', () => {
    expect(breakthroughBillRevealSeconds(2)).toBe(15)
    expect(breakthroughBillRevealSeconds(6)).toBe(15)
  })
})
