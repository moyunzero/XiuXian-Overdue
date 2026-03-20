<template>
  <div v-if="show" class="ModalBackdrop" @click.self="emit('close')">
    <div class="Modal">
      <div class="ModalHead">
        <div class="ModalTitle">还款</div>
        <Pill>最低周还款 ¥{{ minPayment.toLocaleString() }}</Pill>
        <span class="Spacer" />
        <Button variant="ghost" size="sm" @click="emit('close')">关闭</Button>
      </div>
      <div class="ModalBody">
        <div class="MonoSmall">优先偿还利息。你每一次"止血"，都会留下更深的疤。</div>
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
import { ref } from 'vue'
import Button from '../ui/Button.vue'
import Pill from '../ui/Pill.vue'

const props = defineProps<{
  show: boolean
  minPayment: number
  totalDebt: number
  cash: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [amount: number]
}>()

const repayAmt = ref(1000)

function onConfirm() {
  emit('confirm', repayAmt.value)
}
</script>

<style scoped>
</style>
