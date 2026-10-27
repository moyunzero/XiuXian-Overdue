<script setup lang="ts">
defineProps<{
  metaSummaryLine?: string
}>()
</script>

<template>
  <div class="AccountProfileZone">
    <section class="AccountProfileZone__archive" aria-label="账号档案">
      <h2 class="AccountProfileZone__kicker">账号档案</h2>
      <slot name="archive" />
      <p
        v-if="metaSummaryLine"
        class="AccountProfileZone__metaLine"
      >
        {{ metaSummaryLine }}
      </p>
    </section>

    <div class="AccountProfileZone__continue">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.AccountProfileZone {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vw, 24px);
}

.AccountProfileZone__archive {
  width: 100%;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--ag-glass-border);
  background: var(--ag-glass);
  backdrop-filter: var(--ag-blur);
  box-shadow: var(--ag-elev-1);
}

.AccountProfileZone__kicker {
  margin: 0 0 10px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--neon-cyan);
}

.AccountProfileZone__metaLine {
  margin: 10px 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.45;
}

.AccountProfileZone__continue {
  width: 100%;
  min-width: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
