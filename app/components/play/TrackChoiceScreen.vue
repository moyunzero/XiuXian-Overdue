<script setup lang="ts">
import type { TrackChoicePending } from '~/logic/play/workFlow'

defineProps<{
  pending: TrackChoicePending
}>()

const emit = defineEmits<{
  choose: [trackId: string]
}>()
</script>

<template>
  <div class="TrackChoice AgGate AgGate--work TrackChoice--ag" role="dialog" aria-labelledby="track-choice-title">
    <div class="TrackChoice__panel AgGlassPanel">
      <p class="TrackChoice__progress" aria-hidden="true">通行证 · 择轨 1/2</p>
      <header class="TrackChoice__head">
        <span class="TrackChoice__tag">昆墟三层 · 择轨</span>
        <h2 id="track-choice-title" class="TrackChoice__title">职场通行证已签发</h2>
      </header>

      <p class="TrackChoice__prompt">{{ pending.prompt }}</p>

      <ul class="TrackChoice__list AgStagger">
        <li v-for="opt in pending.options" :key="opt.id" class="TrackChoice__item">
          <button type="button" class="TrackChoice__btn" @click="emit('choose', opt.id)">
            <span class="TrackChoice__name">{{ opt.title }}</span>
            <span class="TrackChoice__meta">可选岗位 {{ opt.jobCount }} 个</span>
            <span class="TrackChoice__desc">{{ opt.description }}</span>
          </button>
        </li>
      </ul>

      <p class="TrackChoice__fine">择轨后再选具体岗位；抽成上限与五险一金池因轨而异。</p>
    </div>
  </div>
</template>

<style scoped>
.TrackChoice__progress {
  margin: 0 0 0.75rem;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  color: rgba(140, 170, 210, 0.85);
}
.TrackChoice__panel {
  width: min(560px, 100%);
  max-height: min(90dvh, 680px);
  overflow: auto;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid rgba(255, 160, 90, 0.35);
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(32, 18, 10, 0.98), rgba(12, 8, 6, 0.99));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
}
.TrackChoice__head {
  margin-bottom: 1rem;
}
.TrackChoice__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 180, 120, 0.95);
}
.TrackChoice__title {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
}
.TrackChoice__prompt {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}
.TrackChoice__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.TrackChoice__btn {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid rgba(255, 140, 80, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  color: inherit;
}
.TrackChoice__btn:hover {
  border-color: rgba(255, 160, 90, 0.55);
}
.TrackChoice__name {
  display: block;
  font-weight: 600;
}
.TrackChoice__meta {
  display: block;
  margin-top: 4px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
.TrackChoice__desc {
  display: block;
  margin-top: 6px;
  font-size: var(--text-xs);
  color: rgba(255, 220, 180, 0.85);
  line-height: 1.4;
}
.TrackChoice__fine {
  margin: 1rem 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 200, 140, 0.9);
}
</style>
