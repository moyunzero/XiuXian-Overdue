<script setup lang="ts">
defineProps<{
  dismissCount: number
}>()

const emit = defineEmits<{
  close: []
  learnMore: []
  claim: []
}>()
</script>

<template>
  <div class="LoanAdPopup" role="dialog" aria-labelledby="loan-ad-title">
    <div class="LoanAdPopup__card">
      <button type="button" class="LoanAdPopup__close" aria-label="关闭广告" @click="emit('close')">×</button>
      <p id="loan-ad-title" class="LoanAdPopup__title">传功影像 · 限时开放</p>
      <p class="LoanAdPopup__sub">您的灵根画像已更新。备用修为额度待领取。</p>
      <p class="LoanAdPopup__fine">
        点击即视为已阅读《征信授权》《额度动用说明》。日息以区域系数计，逾期违约金另计。
      </p>
      <p v-if="dismissCount >= 2" class="LoanAdPopup__warn">已关闭 {{ dismissCount }} 次 · 后续或推送更高档位产品</p>
      <div class="LoanAdPopup__actions">
        <button type="button" class="Act1Action Act1Action--ghost" @click="emit('close')">关闭</button>
        <button type="button" class="Act1Action" @click="emit('learnMore')">了解更多</button>
        <button type="button" class="Act1Action Act1Action--danger" @click="emit('claim')">领取额度</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.LoanAdPopup {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: clamp(16px, 3vw, 32px);
  background: rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}
.LoanAdPopup__card {
  position: relative;
  width: min(420px, 100%);
  padding: 20px;
  border: 1px solid rgba(255, 0, 255, 0.4);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(20, 10, 40, 0.95), rgba(0, 0, 0, 0.9));
  box-shadow: 0 0 40px rgba(255, 0, 255, 0.15);
}
.LoanAdPopup__close {
  position: absolute;
  top: 8px;
  right: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}
.LoanAdPopup__title {
  margin: 0 0 8px;
  font-family: var(--serif);
  font-size: var(--text-lg);
  color: var(--neon-magenta, #f0f);
}
.LoanAdPopup__sub {
  margin: 0 0 10px;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.LoanAdPopup__fine {
  margin: 0 0 12px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}
.LoanAdPopup__warn {
  margin: 0 0 12px;
  font-size: var(--text-xs);
  color: var(--warning);
  font-family: var(--mono);
}
.LoanAdPopup__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
