<template>
  <div v-if="show" class="ModalBackdrop" @click.self="emit('close')">
    <div class="Modal">
      <div class="ModalHead">
        <div class="ModalTitle">还款</div>
        <Pill>最低周还款 ¥{{ minPayment.toLocaleString() }}</Pill>
        <Pill>逾期等级 {{ delinquency }} / 5</Pill>
        <span class="Spacer" />
        <Button variant="ghost" size="sm" @click="emit('close')">关闭</Button>
      </div>
      <div class="ModalBody">
        <div class="MonoSmall">系统清偿顺序：利息 → 费用 → 本金。该顺序不可调整。</div>
        <div class="Grid2" style="margin-top: 12px">
          <div>
            <div class="Label">还款金额</div>
            <input v-model.number="repayAmt" class="Field" type="number" min="0" step="100" />
          </div>
          <div>
            <div class="Label">快捷</div>
            <div class="Row" style="margin-top: 6px">
              <Button size="sm" @click="repayAmt = 280">¥280</Button>
              <Button size="sm" @click="repayAmt = 1000">¥1,000</Button>
              <Button size="sm" @click="repayAmt = 5000">¥5,000</Button>
              <Button size="sm" @click="repayAmt = minPayment">最低周还款</Button>
            </div>
          </div>
        </div>
        <div class="RepayBreakdown">
          <div class="BreakdownTitle">本次记账去向（预估）</div>
          <div class="BreakdownRow">
            <span>利息减少</span>
            <span>¥{{ projected.interest.toLocaleString() }}</span>
          </div>
          <div class="BreakdownRow">
            <span>费用减少</span>
            <span>¥{{ projected.fee.toLocaleString() }}</span>
          </div>
          <div class="BreakdownRow">
            <span>本金减少</span>
            <span>¥{{ projected.principal.toLocaleString() }}</span>
          </div>
        </div>
        <div class="Row" style="margin-top: 12px">
          <Button variant="primary" :disabled="totalDebt <= 0" @click="onConfirm">确认还款</Button>
          <span class="Spacer" />
          <Pill>现金：¥{{ Math.floor(cash).toLocaleString() }}</Pill>
          <Pill>债务：¥{{ Math.floor(totalDebt).toLocaleString() }}</Pill>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '../ui/Button.vue'
import Pill from '../ui/Pill.vue'

const props = defineProps<{
  show: boolean
  minPayment: number
  totalDebt: number
  cash: number
  interest: number
  collectionFee: number
  principal: number
  delinquency: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [amount: number]
}>()

const repayAmt = ref(1000)

const projected = computed(() => {
  const budget = Math.max(0, Math.floor(Math.min(repayAmt.value || 0, props.cash, props.totalDebt)))
  let remaining = budget
  const interest = Math.min(remaining, Math.max(0, Math.floor(props.interest)))
  remaining -= interest
  const fee = Math.min(remaining, Math.max(0, Math.floor(props.collectionFee)))
  remaining -= fee
  const principal = Math.min(remaining, Math.max(0, Math.floor(props.principal)))
  return { interest, fee, principal }
})

function onConfirm() {
  emit('confirm', repayAmt.value)
}
</script>

<style scoped>
.RepayBreakdown {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.BreakdownTitle {
  font-size: var(--text-xs, 12px);
  color: var(--muted);
  margin-bottom: 8px;
}

.BreakdownRow {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm, 13px);
  padding: 2px 0;
}
</style>
