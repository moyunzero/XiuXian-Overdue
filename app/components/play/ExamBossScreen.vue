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
  <div class="ExamBoss AgGate AgGate--exam" role="dialog" aria-labelledby="exam-boss-title">
    <div class="ExamBoss__panel AgGlassPanel">
      <header class="ExamBoss__head">
        <span class="ExamBoss__tag">月考 · 第 {{ result.week }} 周</span>
        <h2 id="exam-boss-title" class="ExamBoss__title">制度结算</h2>
      </header>
      <div class="AgHeroMetric" aria-label="月考总分">
        <span class="AgHeroMetric__num">{{ result.score }}</span>
        <span class="AgHeroMetric__label">总分</span>
      </div>
      <dl class="ExamBoss__meta ExamBoss__meta--grid">
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
      <button type="button" class="ExamBoss__btn ExamBoss__btn--delayed" @click="emit('confirm')">
        确认并继续
      </button>
    </div>
  </div>
</template>

<style scoped>
.ExamBoss__panel {
  width: min(480px, 100%);
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
.ExamBoss__meta {
  margin: 0 0 16px;
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
