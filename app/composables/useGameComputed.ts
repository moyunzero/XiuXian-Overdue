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
    const version = (g.profileSnapshot?.profileVersion ?? 0) + 1
    g.profileSnapshot = {
      profile: currentProfile,
      lastProfileUpdateDay: g.school.day,
      profileVersion: version
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
