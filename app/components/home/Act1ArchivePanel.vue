<script setup lang="ts">
import type { Act1Persist } from '~/types/act1'
import {
  formatFamilyOutcome,
  formatMetaUnlocks,
  formatPermanentModifierSummary
} from '~/logic/act1/metaUnlockLabels'
import { totalDebtPrincipal } from '~/logic/act1/moduleProgress'

const props = defineProps<{
  persist: Act1Persist
  slotLabel: string
}>()

const metaLabels = formatMetaUnlocks(props.persist.metaUnlocks, 8)
const modSummary = formatPermanentModifierSummary(props.persist.permanentModifiers)
const debt = totalDebtPrincipal(props.persist.act1)
const outcome = formatFamilyOutcome(props.persist.act1.familyOutcome)
</script>

<template>
  <section class="Act1ArchivePanel" aria-label="入学前夜档案摘要">
    <header class="Act1ArchivePanel__head">
      <h3 class="Act1ArchivePanel__title">入学前夜 · 已归档</h3>
      <span class="Act1ArchivePanel__slot">{{ slotLabel }}</span>
    </header>
    <p class="Act1ArchivePanel__meta">
      {{ persist.startConfig.playerName || '你' }} · {{ persist.startConfig.startingCity }} ·
      {{ persist.startConfig.background }} · 结局：{{ outcome }}
    </p>
    <p class="Act1ArchivePanel__line">{{ modSummary }}</p>
    <p class="Act1ArchivePanel__line">阶段负债合计：¥{{ debt.toLocaleString() }}</p>
    <ul v-if="metaLabels.length" class="Act1ArchivePanel__tags">
      <li v-for="label in metaLabels" :key="label">{{ label }}</li>
    </ul>
    <p v-else class="Act1ArchivePanel__muted">暂无 meta 词条</p>
    <p class="Act1ArchivePanel__hint">下方「进入昆墟高中」将继承制度备注与永久利率修正（不继承现金）。</p>
  </section>
</template>

<style scoped>
.Act1ArchivePanel {
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(0, 255, 255, 0.25);
  border-radius: 6px;
  background: rgba(0, 255, 255, 0.04);
  text-align: left;
}
.Act1ArchivePanel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.Act1ArchivePanel__title {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
  letter-spacing: 0.04em;
}
.Act1ArchivePanel__slot {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.Act1ArchivePanel__meta,
.Act1ArchivePanel__line {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}
.Act1ArchivePanel__tags {
  margin: 8px 0;
  padding-left: 18px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-primary);
}
.Act1ArchivePanel__muted {
  margin: 8px 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.Act1ArchivePanel__hint {
  margin: 10px 0 0;
  font-size: var(--text-xs);
  color: var(--warning);
  line-height: 1.45;
}
</style>
