import { describe, expect, it } from 'vitest'
import { getWorkCollectionBeat } from './workCollection'

describe('workCollection', () => {
  it('逾期越高档位文案越严', () => {
    const low = getWorkCollectionBeat(0)
    const high = getWorkCollectionBeat(4)
    expect(low.stage).toBeLessThan(high.stage)
    expect(high.title).toContain('资产')
  })
})
