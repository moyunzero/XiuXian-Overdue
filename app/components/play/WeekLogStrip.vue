<script setup lang="ts">
defineProps<{
  lines: string[]
  settlementVisible?: boolean
}>()
</script>

<template>
  <details
    class="WeekLogStrip"
    :class="{ 'WeekLogStrip--withSettlement': settlementVisible }"
    aria-live="polite"
  >
    <summary class="WeekLogStrip__summary">
      本周流水
      <span class="WeekLogStrip__count">{{ lines.length }}</span>
    </summary>
    <ul v-if="lines.length" class="WeekLogStrip__list">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
    <p v-else class="WeekLogStrip__empty">暂无记录</p>
  </details>
</template>

<style scoped>
.WeekLogStrip {
  width: 100%;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid rgba(100, 140, 180, 0.25);
  background: rgba(0, 0, 0, 0.28);
  font-size: var(--text-xs);
}
.WeekLogStrip__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  font-family: var(--mono);
  color: var(--text-secondary);
  list-style: none;
}
.WeekLogStrip__summary::-webkit-details-marker {
  display: none;
}
.WeekLogStrip__count {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(80, 120, 160, 0.25);
  font-size: 0.65rem;
}
.WeekLogStrip__list {
  margin: 0;
  padding: 0 12px 10px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-muted);
  line-height: 1.45;
}
.WeekLogStrip__empty {
  margin: 0;
  padding: 0 12px 10px;
  color: var(--text-muted);
}
.WeekLogStrip--withSettlement:not([open]) .WeekLogStrip__summary {
  padding: 8px 12px;
  font-size: 0.65rem;
  color: var(--text-muted);
}
</style>
