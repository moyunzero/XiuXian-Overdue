<script setup lang="ts">
import type { JobChoicePending } from '~/logic/play/workFlow'

defineProps<{
  pending: JobChoicePending
}>()

const emit = defineEmits<{
  choose: [jobId: string]
}>()
</script>

<template>
  <div class="JobChoice" role="dialog" aria-labelledby="job-choice-title">
    <div class="JobChoice__panel">
      <header class="JobChoice__head">
        <span class="JobChoice__tag">昆墟三层 · 求职</span>
        <h2 id="job-choice-title" class="JobChoice__title">职场通行证已签发</h2>
      </header>

      <p class="JobChoice__prompt">{{ pending.prompt }}</p>

      <ul class="JobChoice__list">
        <li v-for="opt in pending.options" :key="opt.id" class="JobChoice__item">
          <button type="button" class="JobChoice__btn" @click="emit('choose', opt.id)">
            <span class="JobChoice__name">{{ opt.title }}</span>
            <span class="JobChoice__meta">
              时薪 ¥{{ opt.hourlyPay }} · 抽成上限 {{ Math.round(opt.harvestRate * 100) }}%
            </span>
            <span class="JobChoice__desc">{{ opt.description }}</span>
          </button>
        </li>
      </ul>

      <p class="JobChoice__fine">选岗后月薪目标与 KPI 挂接——重点高中学历仍可能被备注「不够」。</p>
    </div>
  </div>
</template>

<style scoped>
.JobChoice {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 3vw, 2rem);
  background: rgba(4, 8, 14, 0.88);
  box-sizing: border-box;
}
.JobChoice__panel {
  width: min(560px, 100%);
  max-height: min(90dvh, 680px);
  overflow: auto;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid rgba(255, 160, 90, 0.35);
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(32, 18, 10, 0.98), rgba(12, 8, 6, 0.99));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
}
.JobChoice__head {
  margin-bottom: 1rem;
}
.JobChoice__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 180, 120, 0.95);
}
.JobChoice__title {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
}
.JobChoice__prompt {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}
.JobChoice__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.JobChoice__btn {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid rgba(255, 140, 80, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  color: inherit;
}
.JobChoice__btn:hover {
  border-color: rgba(255, 160, 90, 0.55);
}
.JobChoice__name {
  display: block;
  font-weight: 600;
}
.JobChoice__meta {
  display: block;
  margin-top: 4px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
.JobChoice__desc {
  display: block;
  margin-top: 6px;
  font-size: var(--text-xs);
  color: rgba(255, 220, 180, 0.85);
  line-height: 1.4;
}
.JobChoice__fine {
  margin: 1rem 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 200, 140, 0.9);
}
</style>
