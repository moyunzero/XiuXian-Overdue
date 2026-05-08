import { computed, type Ref } from 'vue'
import type { GameState } from '~/types/game'
import * as Engine from '~/logic/gameEngine'
import { remainingSlotsFor } from './useGame.actions'

export function useGameComputed(game: Ref<GameState>) {
  const totalDebt = computed(() =>
    Math.max(
      0,
      game.value.econ.collectionFee +
        game.value.econ.debtPrincipal +
        game.value.econ.debtInterestAccrued
    )
  )

  const minPayment = computed(() => {
    return Engine.calculateTierAdjustedMinPayment(
      totalDebt.value,
      game.value.econ.delinquency,
      game.value.school.classTier
    )
  })

  const nextLabel = computed(() => Engine.describeSlot(game.value.school.slot))
  const remainingSlots = computed(() => remainingSlotsFor(game.value.school.slot))

  const accumulatedMinPayment = computed(() => Engine.calculateAccumulatedMinPayment(game.value))

  const profileSnapshot = computed(() => Engine.buildSocialProfile(game.value))

  const prevProfile = computed(() => game.value.profileSnapshot?.profile)

  const profileDigest = computed(() => Engine.buildProfileDigest(game.value, prevProfile.value))

  const refreshProfileSnapshot = () => {
    const g = game.value
    const currentProfile = Engine.buildSocialProfile(g)
    const prevSnapshot = g.profileSnapshot
    const version = (prevSnapshot?.profileVersion ?? 0) + 1

    // 检测画像是否发生变化
    const hasProfileChanged = !prevSnapshot || 
      JSON.stringify(prevSnapshot.profile) !== JSON.stringify(currentProfile)

    g.profileSnapshot = {
      profile: currentProfile,
      lastProfileUpdateDay: g.school.day,
      profileVersion: version
    }

    // 如果画像变化，记录到历史
    if (hasProfileChanged) {
      const digest = Engine.buildProfileDigest(g, prevSnapshot?.profile)
      const riskScore = Engine.calculateRiskScore(currentProfile)
      const systemNote = Engine.generateSystemNote(currentProfile)

      const historyEntry = {
        timestamp: Date.now(),
        digest,
        riskScore,
        trigger: prevSnapshot ? '画像变更' : '初始建档',
        systemNote
      }

      if (!g.profileHistory) {
        g.profileHistory = []
      }

      g.profileHistory.push(historyEntry)

      // 限制历史记录最多50条
      if (g.profileHistory.length > 50) {
        g.profileHistory = g.profileHistory.slice(-50)
      }
    }
  }

  const classPressureDigest = computed(() => {
    const g = game.value
    const latestWeeklyReport = g.logs.find((log: GameState['logs'][number]) => log.title.includes('周结算通报'))
    const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
    const weeklyChangeMatch = latestWeeklyReport?.detail.match(/分班变化：([^；]+)；/)
    return {
      weeklyClassChange: weeklyChangeMatch?.[1] ?? '等待首轮周结算',
      nextWeekPerks: `餐补¥${g.school.perks.mealSubsidy}/天，专注加成${g.school.perks.focusBonus >= 0 ? '+' : ''}${g.school.perks.focusBonus}`,
      riskShiftSummary: `利率×${tierDebtProfile.dailyRateMultiplier.toFixed(2)}，最低周还款×${tierDebtProfile.minWeeklyPaymentMultiplier.toFixed(2)}，催收权重×${tierDebtProfile.collectionRiskWeight.toFixed(2)}`
    }
  })

  return {
    totalDebt,
    minPayment,
    nextLabel,
    remainingSlots,
    accumulatedMinPayment,
    profileSnapshot,
    prevProfile,
    profileDigest,
    refreshProfileSnapshot,
    classPressureDigest
  }
}
