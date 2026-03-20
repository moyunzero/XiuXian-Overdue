<template>
  <div v-if="show" class="ModalBackdrop" @click.self="emit('close')">
    <div class="Modal">
      <div class="ModalHead">
        <div class="ModalTitle">借贷</div>
        <Pill>日利率 {{ (dailyRate * 100).toFixed(2) }}%</Pill>
        <span class="Spacer" />
        <Button variant="ghost" size="sm" @click="emit('close')">关闭</Button>
      </div>
      <div class="ModalBody">
        <div class="MonoSmall">
          你当然知道借贷会让未来更窒息。你也知道不借贷，今天就会先窒息。
        </div>
        <div class="Grid2" style="margin-top: 12px">
          <div>
            <div class="Label">借款金额</div>
            <input v-model.number="borrowAmt" class="Field" type="number" min="0" step="100" />
          </div>
          <div>
            <div class="Label">快捷</div>
            <div class="Row" style="margin-top: 6px">
              <Button size="sm" @click="borrowAmt = 1000">¥1,000</Button>
              <Button size="sm" @click="borrowAmt = 5000">¥5,000</Button>
              <Button size="sm" @click="borrowAmt = 20000">¥20,000</Button>
            </div>
          </div>
        </div>
        <div class="Row" style="margin-top: 12px; flex-wrap: wrap; gap: 8px">
          <Button variant="primary" :disabled="borrowAmt > creditLimit" @click="onConfirm">确认借贷</Button>
          <span class="Spacer" />
          <Pill variant="warning">可借额度：¥{{ Math.floor(creditLimit).toLocaleString() }}</Pill>
          <Pill>当前债务：¥{{ Math.floor(totalDebt).toLocaleString() }}</Pill>
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
  dailyRate: number
  totalDebt: number
  creditLimit: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [amount: number]
}>()

const borrowAmt = ref(5000)

function onConfirm() {
  emit('confirm', borrowAmt.value)
}
</script>

<style scoped>
</style>
