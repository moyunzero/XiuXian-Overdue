<script setup lang="ts">
import { computed } from 'vue'
import type { DelegationJobId, MaintenanceTier, WeekPlan } from '~/types/chapter'
import type { MaintenanceBillPreview } from '~/logic/play/headJarWeekPlan'
import MaintenanceBillPreviewCard from '~/components/play/MaintenanceBillPreview.vue'
import MaintenanceTierTile from '~/components/play/MaintenanceTierTile.vue'
import DelegationJobTile, {
  type DelegationJobOption
} from '~/components/play/DelegationJobTile.vue'

const props = withDefaults(
  defineProps<{
    plan: WeekPlan
    maintenanceTier?: MaintenanceTier
    delegationJobId?: DelegationJobId
    billPreview: MaintenanceBillPreview
    delegationOptions: DelegationJobOption[]
    cash: number
    disabled?: boolean
    canRepeatLast?: boolean
    repeatHint?: string | null
    panelTag?: string
    panelTitle?: string
    confirmLabel?: string
    billLabelYang?: string
    billLabelMing?: string
  }>(),
  {
    panelTag: '器藏维生',
    panelTitle: '本周委托',
    confirmLabel: '开本周',
    disabled: false,
    canRepeatLast: false,
    repeatHint: null
  }
)

const emit = defineEmits<{
  'update:maintenanceTier': [tier: MaintenanceTier]
  'update:delegationJobId': [jobId: DelegationJobId]
  confirm: []
  repeatLast: []
}>()

const tierCosts = computed(() => ({
  sustain: 420,
  austerity: 260
}))

const shortfall = computed(() => {
  const diff = props.billPreview.total - props.cash
  return diff > 0 ? diff : undefined
})
</script>

<template>
  <section class="DelegationPanel" aria-labelledby="delegation-panel-title">
    <header class="DelegationPanel__head">
      <span class="DelegationPanel__tag">{{ panelTag }}</span>
      <h2 id="delegation-panel-title" class="DelegationPanel__title">{{ panelTitle }}</h2>
      <div
        v-if="billLabelYang || billLabelMing"
        class="DelegationPanel__ledgerLabels"
        aria-label="双账标签"
      >
        <span v-if="billLabelYang" class="DelegationPanel__ledgerLabel">{{ billLabelYang }}</span>
        <span v-if="billLabelMing" class="DelegationPanel__ledgerLabel">{{ billLabelMing }}</span>
      </div>
      <p v-if="repeatHint" class="DelegationPanel__repeatHint" role="status">{{ repeatHint }}</p>
    </header>

    <MaintenanceBillPreviewCard
      class="DelegationPanel__bill"
      :bill="billPreview"
      :cash="cash"
      :shortfall="shortfall"
    />

    <div class="DelegationPanel__slots">
      <MaintenanceTierTile
        class="DelegationPanel__slot"
        :selected="maintenanceTier"
        :disabled="disabled"
        :tier-costs="tierCosts"
        @select="emit('update:maintenanceTier', $event)"
      />
      <DelegationJobTile
        class="DelegationPanel__slot"
        :options="delegationOptions"
        :selected-id="delegationJobId"
        :disabled="disabled"
        @select="emit('update:delegationJobId', $event)"
      />
    </div>

    <div class="DelegationPanel__actions">
      <button
        type="button"
        class="DelegationPanel__btn DelegationPanel__btn--primary"
        :disabled="disabled"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
      <button
        type="button"
        class="DelegationPanel__btn DelegationPanel__btn--ghost"
        :disabled="disabled || !canRepeatLast"
        @click="emit('repeatLast')"
      >
        和上周一样
      </button>
    </div>
  </section>
</template>

<style scoped>
.DelegationPanel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: clamp(14px, 2vw, 18px);
  border-radius: 10px;
  border: 1px solid rgba(0, 200, 220, 0.28);
  background: linear-gradient(160deg, rgba(4, 20, 24, 0.92), rgba(2, 10, 14, 0.96));
  box-sizing: border-box;
}

.DelegationPanel__head {
  margin-bottom: 1rem;
}

.DelegationPanel__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(120, 220, 240, 0.95);
  letter-spacing: 0.08em;
}

.DelegationPanel__title {
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.DelegationPanel__ledgerLabels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0.5rem;
}

.DelegationPanel__ledgerLabel {
  font-family: var(--mono);
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(160, 120, 220, 0.35);
  color: rgba(200, 180, 255, 0.92);
  letter-spacing: 0.06em;
}

.DelegationPanel__repeatHint {
  margin: 0.35rem 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 200, 220, 0.28);
  background: rgba(8, 32, 36, 0.35);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 240, 255, 0.92);
  line-height: 1.45;
}

.DelegationPanel__bill {
  margin-bottom: 1rem;
}

.DelegationPanel__slots {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacing-2, 8px);
  margin-bottom: 1rem;
  min-width: 0;
  flex: 1;
}

@media (min-width: 640px) {
  .DelegationPanel__slots {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .DelegationPanel__slot :deep(.MaintenanceTierTile),
  .DelegationPanel__slot :deep(.DelegationJobTile) {
    min-height: 72px;
  }
}

.DelegationPanel__slot {
  min-width: 0;
}

.DelegationPanel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  flex-shrink: 0;
}

.DelegationPanel__btn {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-xs);
  background: rgba(0, 200, 220, 0.12);
  color: rgba(200, 245, 255, 0.95);
  border: 1px solid rgba(0, 200, 220, 0.35);
}

.DelegationPanel__btn--primary {
  flex: 1 1 auto;
  min-width: min(200px, 100%);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(0, 255, 255, 0.12);
  color: rgba(220, 255, 255, 0.98);
  border-color: rgba(0, 255, 255, 0.55);
}

.DelegationPanel__btn--primary:hover:not(:disabled) {
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.28);
}

.DelegationPanel__btn--ghost {
  flex: 0 0 auto;
  background: transparent;
}

.DelegationPanel__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
