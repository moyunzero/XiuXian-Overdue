<script setup lang="ts">
import type { BreakthroughPending } from '~/types/play'

withDefaults(
  defineProps<{
    pending: BreakthroughPending
    institutionalNotes?: string[]
    tagLabel?: string
    title?: string
    confirmLabel?: string
  }>(),
  {
    institutionalNotes: () => [],
    tagLabel: '破境关口 · 无尽修行',
    title: '庆典灯未灭',
    confirmLabel: '确认破境 · 签收账单'
  }
)

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <div class="Breakthrough" role="dialog" aria-labelledby="breakthrough-title">
    <div class="Breakthrough__panel">
      <header class="Breakthrough__head">
        <span class="Breakthrough__tag">{{ tagLabel }}</span>
        <h2 id="breakthrough-title" class="Breakthrough__title">{{ title }}</h2>
        <p class="Breakthrough__realm">
          {{ pending.currentRealmLabel }} → {{ pending.nextRealmLabel }}
        </p>
      </header>

      <p class="Breakthrough__celebration">{{ pending.celebrationLine }}</p>

      <ul
        v-if="institutionalNotes.length"
        class="Breakthrough__notes"
        aria-label="制度备注"
      >
        <li v-for="(note, i) in institutionalNotes" :key="i">{{ note }}</li>
      </ul>

      <section class="Breakthrough__bill" aria-label="账单拆解">
        <h3 class="Breakthrough__bill-title">
          庆典后 {{ pending.billRevealSeconds ?? 60 }} 秒 · 账单打脸
        </h3>
        <ul class="Breakthrough__bill-list">
          <li v-for="(line, i) in pending.billLines" :key="i">{{ line }}</li>
        </ul>
        <p class="Breakthrough__debt">
          本局负债合计 <strong>¥{{ pending.totalDebt.toLocaleString() }}</strong>
        </p>
        <p class="Breakthrough__bump">{{ pending.maintenanceBumpLabel }}</p>
      </section>

      <p class="Breakthrough__fine">还清负债不会让你赢——只会让你多撑几轮。</p>
      <button type="button" class="Breakthrough__btn" @click="emit('confirm')">
        {{ confirmLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.Breakthrough {
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
.Breakthrough__panel {
  width: min(520px, 100%);
  max-height: min(90dvh, 640px);
  overflow: auto;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid rgba(180, 120, 255, 0.35);
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(18, 12, 32, 0.98), rgba(6, 8, 18, 0.99));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
}
.Breakthrough__head {
  margin-bottom: 1rem;
}
.Breakthrough__tag {
  display: inline-block;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 160, 255, 0.85);
}
.Breakthrough__title {
  margin: 0.5rem 0 0;
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  color: rgba(240, 230, 255, 0.95);
}
.Breakthrough__realm {
  margin: 0.35rem 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 200, 255, 0.75);
}
.Breakthrough__celebration {
  margin: 0 0 1rem;
  line-height: 1.55;
  color: rgba(220, 230, 255, 0.9);
}
.Breakthrough__notes {
  margin: 0 0 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  background: rgba(0, 40, 50, 0.25);
  list-style: none;
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(160, 230, 255, 0.88);
}
.Breakthrough__notes li + li {
  margin-top: 0.35rem;
}
.Breakthrough__bill {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 120, 120, 0.25);
  background: rgba(40, 12, 20, 0.35);
  margin-bottom: 1rem;
}
.Breakthrough__bill-title {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 180, 180, 0.9);
}
.Breakthrough__bill-list {
  margin: 0 0 0.75rem;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(255, 220, 220, 0.88);
}
.Breakthrough__debt {
  margin: 0 0 0.35rem;
  font-family: var(--mono);
  font-size: var(--text-sm);
}
.Breakthrough__bump {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 200, 140, 0.9);
}
.Breakthrough__fine {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: rgba(160, 180, 220, 0.75);
}
.Breakthrough__btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(120, 80, 200, 0.95), rgba(80, 120, 220, 0.9));
  color: #fff;
}
.Breakthrough__btn:hover {
  filter: brightness(1.08);
}
</style>
