import { describe, expect, it } from 'vitest'
import type { MandateResponseDef } from '~/types/chapter'
import {
  buildMandateCardOptions,
  formatMandateCostHint,
  fuzzCostHintText,
  gritLinkLabel,
  partitionMandateResponses
} from '~/logic/play/mandateCostHints'

const compliantA: MandateResponseDef = {
  id: 'a',
  label: '配合登记',
  effects: [{ kind: 'domestication', value: 3 }]
}

const compliantB: MandateResponseDef = {
  id: 'b',
  label: '部分配合',
  costHint: '灵石-200',
  effectTiming: 'weekend',
  effects: [{ kind: 'log', message: 'x' }]
}

const gritShort: MandateResponseDef = {
  id: 'g1',
  label: '拖一周',
  grit: true,
  effects: [{ kind: 'delinquency', value: 1 }, { kind: 'numbness', value: 2 }]
}

describe('mandateCostHints', () => {
  it('derives 灵石/压力 hints from effects', () => {
    const hint = formatMandateCostHint({
      id: 'x',
      label: '零工',
      grit: true,
      effects: [
        { kind: 'cash', value: 800 },
        { kind: 'numbness', value: 4 },
        { kind: 'domestication', value: -2 }
      ]
    })
    expect(hint.hint).toBe('灵石+800 压力+2')
    expect(hint.timingTag).toBeUndefined()
  })

  it('uses costHint and weekend timing tag when provided', () => {
    const hint = formatMandateCostHint(compliantB)
    expect(hint.hint).toBe('灵石-200')
    expect(hint.timingTag).toBe('本周末入账')
  })

  it('fuzzes numeric hints when costBlur flag set', () => {
    const hint = formatMandateCostHint(compliantB, true)
    expect(hint.fuzzed).toBe(true)
    expect(hint.hint).toBe('灵石???')
    expect(fuzzCostHintText('压力+3 灵石-120')).toBe('压力??? 灵石???')
  })

  it('partitions compliant vs grit and prefixes grit labels', () => {
    const parts = partitionMandateResponses([compliantA, gritShort, compliantB])
    expect(parts.left?.id).toBe('a')
    expect(parts.right?.id).toBe('b')
    expect(parts.grit.map((g) => g.id)).toEqual(['g1'])
    expect(gritLinkLabel(gritShort, 0)).toBe('短痛：拖一周')
    expect(gritLinkLabel(gritShort, 1)).toBe('长痛：拖一周')
  })

  it('buildMandateCardOptions maps pending responses with fuzz flags', () => {
    const view = buildMandateCardOptions([compliantA, compliantB, gritShort], { costBlur: true })
    expect(view.left?.costHintFuzzed).toBe(true)
    expect(view.right?.timingTag).toBe('本周末入账')
    expect(view.grit[0]?.id).toBe('g1')
  })

  it('promotes first grit to right zone when only one compliant option', () => {
    const gritLong: MandateResponseDef = {
      id: 'g2',
      label: '零工凑数',
      grit: true,
      effects: [{ kind: 'cash', value: 800 }]
    }
    const view = buildMandateCardOptions([compliantA, gritShort, gritLong])
    expect(view.left?.id).toBe('a')
    expect(view.right?.id).toBe('g1')
    expect(view.right?.isGrit).toBe(true)
    expect(view.grit.map((g) => g.id)).toEqual(['g2'])
  })

  it('clauseLiterateUnblurId forces left compliant sharp under costBlur', () => {
    const view = buildMandateCardOptions([compliantA, compliantB, gritShort], {
      costBlur: true,
      clauseLiterateUnblurId: 'a'
    })
    expect(view.left?.costHintFuzzed).toBe(false)
    expect(view.right?.costHintFuzzed).toBe(true)
  })
})
