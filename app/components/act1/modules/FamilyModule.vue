<script setup lang="ts">
import { computed } from 'vue'
import type { Act1State } from '~/types/act1'
import {
  COLLECTION_ESCALATION_REQUESTS,
  FAMILY_EXPENSES,
  canRequestFamilyExpense,
  getCollectionBeat,
  hasFamilyEndingChoices,
  hasRequestedExpense,
  isCollectionEscalated,
  type FamilyExpenseId
} from '~/logic/act1/familyLedger'
import { COLLECTION_LADDER_LABELS, collectionLadderStage } from '~/logic/act1/s0Flow'

const props = defineProps<{
  act1: Act1State
}>()

const emit = defineEmits<{
  spend: [id: FamilyExpenseId]
  collectionChoice: [choiceId: string]
}>()

const collection = computed(() => getCollectionBeat(props.act1))
const showEndingChoices = computed(() => hasFamilyEndingChoices(props.act1))

const escalationProgress = computed(() =>
  Math.min(100, Math.round((props.act1.familyMeta.moneyRequests / COLLECTION_ESCALATION_REQUESTS) * 100))
)

const ladderStage = computed(() => collectionLadderStage(props.act1))

const outcomeLabels: Record<string, string> = {
  left: '家人离场',
  'saved-costly': '挽留成功（金钱代价）',
  'saved-false-hope': '假希望 · 周转贷'
}

function expenseHint(id: FamilyExpenseId) {
  if (hasRequestedExpense(props.act1, id)) return '已索要过'
  if (props.act1.familyResilience <= 0) return '家庭韧性已耗尽'
  return '点击向家里要这笔钱'
}
</script>

<template>
  <div class="FamilyModule">
    <template v-if="!act1.completedModules.includes('family')">
      <p class="Act1Copy">
        家庭账本 · 韧性 {{ act1.familyResilience }} / 100。每张卡片 =
        <strong>向家里要一笔钱</strong>（入账给你，消耗家庭韧性）。
      </p>

      <ol class="FamilyModule__ladder" aria-label="催收阶梯 0 至 3">
        <li
          v-for="(label, i) in COLLECTION_LADDER_LABELS"
          :key="label"
          class="FamilyModule__ladder-step"
          :class="{
            'FamilyModule__ladder-step--done': ladderStage > i,
            'FamilyModule__ladder-step--current': ladderStage === i
          }"
        >
          <span class="FamilyModule__ladder-dot" />
          <span>{{ label }}</span>
        </li>
      </ol>

      <div class="FamilyModule__meter" aria-label="催收升级进度">
        <div class="FamilyModule__meter-label">
          要钱 {{ act1.familyMeta.moneyRequests }} / {{ COLLECTION_ESCALATION_REQUESTS }} 次
          <span v-if="isCollectionEscalated(act1)" class="FamilyModule__meter-badge">催收已升级</span>
        </div>
        <div class="FamilyModule__meter-track">
          <div class="FamilyModule__meter-fill" :style="{ width: `${escalationProgress}%` }" />
        </div>
        <p class="Act1Copy Act1Copy--muted">
          要钱满 {{ COLLECTION_ESCALATION_REQUESTS }} 次时催收话术明显加码。处理完「联系人」节拍后即可在下方<strong>选家人去留并结案</strong>（不必凑满
          {{ COLLECTION_ESCALATION_REQUESTS }} 次）。韧性归零且再要钱可能自动离场。
        </p>
      </div>

      <div class="FamilyModule__expenses">
        <button
          v-for="exp in FAMILY_EXPENSES"
          :key="exp.id"
          type="button"
          class="FamilyModule__expense"
          :class="{
            'FamilyModule__expense--done': hasRequestedExpense(act1, exp.id),
            'FamilyModule__expense--disabled': !canRequestFamilyExpense(act1, exp.id)
          }"
          :disabled="!canRequestFamilyExpense(act1, exp.id)"
          @click="emit('spend', exp.id)"
        >
          <span class="FamilyModule__expense-label">向家里要 · {{ exp.label }}</span>
          <span class="FamilyModule__expense-cost">+¥{{ exp.cashCost.toLocaleString() }} 入账</span>
          <span class="FamilyModule__expense-detail">{{ exp.detail }}</span>
          <span class="FamilyModule__expense-hint">{{ expenseHint(exp.id) }}</span>
        </button>
      </div>

      <p class="Act1Copy Act1Copy--muted">
        手头现金 ¥{{ act1.cash.toLocaleString() }} · 催收档位 {{ act1.delinquency }}
      </p>

      <section v-if="collection" class="FamilyModule__collection">
        <h4 class="FamilyModule__collection-title">{{ collection.title }}</h4>
        <p v-if="showEndingChoices" class="FamilyModule__outcome-banner">
          选一项以结案家庭模块；完成后三个桌面模块齐备，可打开制度档案结算。
        </p>
        <p
          v-else-if="act1.familyMeta.lastChoiceFeedback"
          class="FamilyModule__feedback"
          role="status"
        >
          {{ act1.familyMeta.lastChoiceFeedback }}
        </p>
        <p class="Act1Copy">{{ collection.body }}</p>
        <div v-if="collection.choices.length > 0" class="FamilyModule__choices">
          <button
            v-for="c in collection.choices"
            :key="c.id"
            type="button"
            class="Act1Action"
            :class="c.id.includes('left') || c.id === 'false-hope' ? 'Act1Action--danger' : 'Act1Action--ghost'"
            :disabled="c.disabled"
            :title="c.hint"
            @click="emit('collectionChoice', c.id)"
          >
            <span class="FamilyModule__choice-label">{{ c.label }}</span>
            <span v-if="c.hint" class="FamilyModule__choice-hint">{{ c.hint }}</span>
          </button>
        </div>
      </section>

      <section
        v-else-if="act1.familyResilience <= 15 && !showEndingChoices"
        class="FamilyModule__collection"
      >
        <p class="Act1Copy">家庭韧性过低。请处理上方催收，或主动选择结局。</p>
        <div class="Act1Row">
          <button type="button" class="Act1Action Act1Action--ghost" @click="emit('collectionChoice', 'accept-left')">
            接受迁出
          </button>
          <button
            type="button"
            class="Act1Action Act1Action--danger"
            @click="emit('collectionChoice', 'false-hope')"
          >
            签家庭周转贷
          </button>
        </div>
      </section>
    </template>

    <template v-else>
      <p class="Act1Copy Act1Copy--ok">家庭模块已结案：{{ outcomeLabels[act1.familyOutcome ?? 'left'] }}</p>
      <p class="Act1Copy Act1Copy--muted">
        韧性终值 {{ act1.familyResilience }} · 向家里要钱 {{ act1.familyMeta.moneyRequests }} 次
      </p>
    </template>
  </div>
</template>

<style scoped>
.FamilyModule__ladder {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
}
.FamilyModule__ladder-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.FamilyModule__ladder-step--done {
  border-color: rgba(0, 255, 136, 0.35);
  color: var(--success);
}
.FamilyModule__ladder-step--current {
  border-color: rgba(255, 210, 74, 0.5);
  color: var(--warning);
  background: rgba(255, 210, 74, 0.08);
}
.FamilyModule__ladder-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.FamilyModule__meter {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}
.FamilyModule__meter-label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.FamilyModule__meter-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 59, 59, 0.15);
  color: var(--danger);
  font-size: var(--text-xs);
}
.FamilyModule__meter-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 8px;
}
.FamilyModule__meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--warning), var(--danger));
  transition: width 0.25s ease;
}
.FamilyModule__expenses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.FamilyModule__expense {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}
.FamilyModule__expense:hover:not(:disabled) {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
}
.FamilyModule__expense--done {
  opacity: 0.55;
  border-style: dashed;
}
.FamilyModule__expense--disabled:not(.FamilyModule__expense--done) {
  opacity: 0.4;
  cursor: not-allowed;
}
.FamilyModule__expense-label {
  font-weight: 600;
  font-size: var(--text-sm);
}
.FamilyModule__expense-cost {
  font-family: var(--mono);
  color: var(--success);
  font-size: var(--text-sm);
}
.FamilyModule__expense-detail {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.4;
}
.FamilyModule__expense-hint {
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  font-family: var(--mono);
}
.FamilyModule__collection {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(255, 59, 59, 0.35);
  border-radius: 8px;
  background: rgba(255, 59, 59, 0.05);
}
.FamilyModule__collection-title {
  margin: 0 0 8px;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--danger);
}
.FamilyModule__feedback {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 255, 200, 0.08);
  border: 1px solid rgba(0, 255, 200, 0.25);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--neon-cyan);
}
.FamilyModule__outcome-banner {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255, 200, 0, 0.1);
  border: 1px solid rgba(255, 200, 0, 0.35);
  font-size: var(--text-sm);
  color: var(--warning);
  line-height: 1.45;
}
.FamilyModule__choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.FamilyModule__choices .Act1Action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  width: 100%;
}
.FamilyModule__choice-label {
  font-size: var(--text-sm);
}
.FamilyModule__choice-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--mono);
}
</style>
