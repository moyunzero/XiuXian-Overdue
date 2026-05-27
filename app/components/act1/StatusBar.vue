<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  day: number
  cash: number
  pressure: number
  debt: number
  creditors?: { name: string; balance: number }[]
  activeLabel?: string
}>()

const creditorLine = computed(() => {
  const list = props.creditors ?? []
  if (!list.length) return ''
  return list.map((c) => `${c.name} ¥${c.balance.toLocaleString()}`).join(' · ')
})
</script>

<template>
  <header class="Act1StatusBar">
    <div class="Act1StatusBar__brand">
      <span class="Act1StatusBar__tag">KUNXU · ACT1</span>
      <span v-if="activeLabel" class="Act1StatusBar__module">{{ activeLabel }}</span>
    </div>
    <div class="Act1StatusBar__stats">
      <span class="Act1StatusBar__item">第 {{ day }} 日</span>
      <span class="Act1StatusBar__item">现金 ¥{{ cash.toLocaleString() }}</span>
      <span class="Act1StatusBar__item Act1StatusBar__item--warn">压力 {{ pressure }}</span>
      <span class="Act1StatusBar__item Act1StatusBar__item--danger">负债 ¥{{ debt.toLocaleString() }}</span>
    </div>
    <p v-if="creditorLine" class="Act1StatusBar__creditors" :title="creditorLine">
      债权人：{{ creditorLine }}
    </p>
  </header>
</template>

<style scoped>
.Act1StatusBar {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 10px clamp(14px, 2vw, 24px);
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.65);
  box-sizing: border-box;
}
.Act1StatusBar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.Act1StatusBar__tag {
  letter-spacing: 0.12em;
  font-size: var(--text-xs);
  color: var(--neon-cyan);
}
.Act1StatusBar__module {
  color: var(--text-muted);
  font-size: var(--text-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 28ch;
}
.Act1StatusBar__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px clamp(16px, 2vw, 28px);
  margin-left: auto;
}
.Act1StatusBar__item--warn {
  color: var(--warning);
}
.Act1StatusBar__item--danger {
  color: var(--danger);
}
.Act1StatusBar__creditors {
  width: 100%;
  margin: 0;
  padding-top: 4px;
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 640px) {
  .Act1StatusBar__stats {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
