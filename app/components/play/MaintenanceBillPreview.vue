<script setup lang="ts">
import { computed } from 'vue'
import type { MaintenanceBillPreview } from '~/logic/play/headJarWeekPlan'

const props = defineProps<{
  bill: MaintenanceBillPreview
  cash: number
  shortfall?: number
}>()

const tierLabel = computed(() => (props.bill.tier === 'sustain' ? '维持' : '紧缩'))

const ariaTotal = computed(() => `本周维生账单总计 ¥${props.bill.total.toLocaleString()}`)
</script>

<template>
  <section
    class="MaintenanceBillPreview AgGlassSubcard"
    aria-label="本周维生账单"
  >
    <header class="MaintenanceBillPreview__head">
      <h3 class="MaintenanceBillPreview__title">本周维生账单</h3>
      <span
        class="MaintenanceBillPreview__total"
        :class="{ 'MaintenanceBillPreview__total--warn': shortfall != null && shortfall > 0 }"
        :aria-label="ariaTotal"
      >
        ¥{{ bill.total.toLocaleString() }}
      </span>
    </header>
    <p class="MaintenanceBillPreview__line">
      维生维持 · 灵贷并入 ¥{{ bill.debtService.toLocaleString() }} · 利息 ¥{{ bill.interest.toLocaleString() }}
    </p>
    <p class="MaintenanceBillPreview__meta">
      档位 {{ tierLabel }} · 维生 ¥{{ bill.maintenanceBase.toLocaleString() }} · 现金 ¥{{ cash.toLocaleString() }}
    </p>
    <footer class="MaintenanceBillPreview__foot">
      周末结算扣款；现金不足将记入维生欠费。
    </footer>
  </section>
</template>

<style scoped>
.MaintenanceBillPreview {
  width: 100%;
  min-width: 0;
  padding: var(--spacing-4, 16px);
  border: 1px solid var(--fate-tile-accent-maintenance, rgba(0, 200, 220, 0.35));
  border-radius: 10px;
  box-sizing: border-box;
}

.MaintenanceBillPreview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 8px;
}

.MaintenanceBillPreview__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.MaintenanceBillPreview__total {
  font-family: var(--mono);
  font-size: var(--text-xl);
  font-weight: 600;
  color: rgba(200, 235, 255, 0.95);
}

.MaintenanceBillPreview__total--warn {
  color: var(--neon-cyan);
}

.MaintenanceBillPreview__line,
.MaintenanceBillPreview__meta {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
}

.MaintenanceBillPreview__foot {
  margin: 8px 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
}
</style>
