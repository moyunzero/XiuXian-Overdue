import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { createWorkStateFromUni } from '~/logic/play/createWorkPlayState'
import { assertPlayerFacingTextDoesNotLeakInternalIds } from '~/logic/play/playerFacingCopy'
import { buildJobChoicePending } from '~/logic/play/workFlow'

describe('workFlow — 求职文案', () => {
  it('档案标签展示为中文，不暴露内部 id', () => {
    const start = {
      playerName: '试玩',
      background: '贫民' as const,
      talent: '无灵根' as const,
      initialDebt: 10_000,
      startingCity: '嵩阳市'
    }
    const hs = createHsFieldsFromStart(start)
    let run = createPlayRunFromStartConfig(start, 'slot1')
    run = {
      ...run,
      ...hs,
      lifeStage: 'work',
      profileTags: ['hs-graduated', 'uni-enrolled'],
      work: createWorkStateFromUni({
        ...run,
        profileTags: ['hs-graduated', 'uni-enrolled'],
        school: { ...hs.school!, classTier: '末位班' }
      })
    }

    const { prompt } = buildJobChoicePending(run)
    expect(prompt).toContain('高中阶段已结转')
    expect(prompt).toContain('预科学籍已登记')
    expect(prompt).toContain('末位班履历')
    expect(prompt).not.toContain('hs-graduated')
    expect(prompt).not.toContain('uni-enrolled')
    expect(prompt).not.toContain('tier-tail')
    assertPlayerFacingTextDoesNotLeakInternalIds(prompt)
  })
})
