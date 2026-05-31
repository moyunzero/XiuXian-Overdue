<script setup lang="ts">
import type { ExamBossResult } from '~/types/play'

defineProps<{
  result: ExamBossResult
}>()

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <div class="ExamBoss" role="dialog" aria-labelledby="exam-boss-title">
    <div class="ExamBoss__panel">
      <header class="ExamBoss__head">
        <span class="ExamBoss__tag">月考 · 第 {{ result.week }} 周</span>
        <h2 id="exam-boss-title" class="ExamBoss__title">制度结算</h2>
      </header>
      <div class="ExamBoss__score">
        <span class="ExamBoss__score-num">{{ result.score }}</span>
        <span class="ExamBoss__score-label">总分</span>
      </div>
      <dl class="ExamBoss__meta">
        <div class="ExamBoss__row">
          <dt>排名</dt>
          <dd>约第 {{ result.rank }} 名</dd>
        </div>
        <div class="ExamBoss__row">
          <dt>分班</dt>
          <dd>
            <span class="ExamBoss__tier">{{ result.tierBefore }}</span>
            <span class="ExamBoss__arrow">→</span>
            <span class="ExamBoss__tier ExamBoss__tier--after">{{ result.tierAfter }}</span>
          </dd>
        </div>
        <div class="ExamBoss__row ExamBoss__row--wide">
          <dt>待遇</dt>
          <dd>{{ result.perkSummary }}</dd>
        </div>
      </dl>
      <p class="ExamBoss__fine">在这里，「约」也足够杀人。</p>
      <button type="button" class="ExamBoss__btn" @click="emit('confirm')">确认并继续</button>
    </div>
  </div>
</template>

<style scoped>
.ExamBoss {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
}
.ExamBoss__panel {
  width: min(480px, 100%);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: clamp(20px, 3vw, 28px);
  background: linear-gradient(165deg, rgba(12, 18, 28, 0.98), rgba(4, 8, 14, 0.99));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}
.ExamBoss__head {
  margin-bottom: 20px;
}
.ExamBoss__tag {
  display: block;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  color: var(--neon-cyan);
  margin-bottom: 6px;
}
.ExamBoss__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}
.ExamBoss__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid rgba(0, 255, 213, 0.25);
  border-radius: 8px;
  background: rgba(0, 255, 213, 0.04);
}
.ExamBoss__score-num {
  font-family: var(--mono);
  font-size: clamp(2.5rem, 8vw, 3.5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--neon-cyan);
}
.ExamBoss__score-label {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.2em;
}
.ExamBoss__meta {
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ExamBoss__row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  font-family: var(--mono);
  font-size: var(--text-sm);
}
.ExamBoss__row dt {
  margin: 0;
  color: var(--text-muted);
}
.ExamBoss__row dd {
  margin: 0;
  color: var(--text-secondary);
}
.ExamBoss__row--wide dd {
  line-height: 1.45;
}
.ExamBoss__tier--after {
  color: var(--neon-amber, #ffb347);
}
.ExamBoss__arrow {
  margin: 0 6px;
  color: var(--text-muted);
}
.ExamBoss__fine {
  margin: 0 0 20px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-style: italic;
}
.ExamBoss__btn {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--neon-cyan);
  border-radius: 6px;
  background: rgba(0, 255, 213, 0.08);
  color: var(--neon-cyan);
  font-family: var(--mono);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.15s ease;
}
.ExamBoss__btn:hover {
  background: rgba(0, 255, 213, 0.16);
}
</style>
