<script setup lang="ts">
import type { SectChoicePending } from '~/types/play'

defineProps<{
  pending: SectChoicePending
}>()

const emit = defineEmits<{
  choose: [sectId: string]
}>()
</script>

<template>
  <div class="SectChoice AgGate AgGate--sect" role="dialog" aria-labelledby="sect-choice-title">
    <div class="SectChoice__panel AgGlassPanel">
      <header class="SectChoice__head">
        <span class="SectChoice__tag">昆墟二层 · 择宗</span>
        <h2 id="sect-choice-title" class="SectChoice__title">预科通道已开</h2>
      </header>

      <p class="SectChoice__prompt">{{ pending.prompt }}</p>

      <ul class="SectChoice__list AgStagger">
        <li v-for="opt in pending.options" :key="opt.id" class="SectChoice__item">
          <button type="button" class="SectChoice__btn" @click="emit('choose', opt.id)">
            <span class="SectChoice__name">{{ opt.name }}</span>
            <span class="SectChoice__meta">
              抽成上限 {{ Math.round(opt.harvestRateCap * 100) }}% · {{ opt.deckBiasLabel }}
            </span>
          </button>
        </li>
      </ul>

      <p class="SectChoice__fine">择宗后灵根租与功法订阅立即激活——首期周扣当场入账，此后每 7 日结算。</p>
    </div>
  </div>
</template>

<style scoped>
.SectChoice__panel {
  width: min(560px, 100%);
  max-height: min(90dvh, 680px);
  overflow: auto;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid rgba(160, 120, 255, 0.35);
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(18, 12, 32, 0.98), rgba(8, 6, 16, 0.99));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
}
.SectChoice__head {
  margin-bottom: 1rem;
}
.SectChoice__tag {
  display: inline-block;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 170, 255, 0.85);
}
.SectChoice__title {
  margin: 0.35rem 0 0;
  font-size: 1.45rem;
  font-weight: 650;
  color: #f0e8ff;
}
.SectChoice__prompt {
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: rgba(220, 210, 240, 0.9);
}
.SectChoice__list {
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.SectChoice__btn {
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(160, 130, 220, 0.35);
  border-radius: 8px;
  background: rgba(40, 28, 60, 0.5);
  cursor: pointer;
  color: inherit;
}
.SectChoice__btn:hover {
  border-color: rgba(200, 160, 255, 0.55);
  background: rgba(60, 40, 90, 0.55);
}
.SectChoice__name {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #f5eeff;
}
.SectChoice__meta {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: rgba(190, 175, 220, 0.85);
}
.SectChoice__fine {
  margin: 0;
  font-size: 0.82rem;
  font-style: italic;
  color: rgba(180, 170, 200, 0.75);
}
</style>
