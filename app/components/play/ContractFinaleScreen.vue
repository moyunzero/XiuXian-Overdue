<script setup lang="ts">
defineProps<{
  totalDebt: number
  weekBudget: number
  kpiScore?: number
}>()

const emit = defineEmits<{
  fulfill: []
  breach: []
}>()
</script>

<template>
  <div class="ContractFinale AgGate AgGate--finale" role="dialog" aria-labelledby="contract-finale-title">
    <div class="ContractFinale__panel AgGlassPanel">
      <header class="ContractFinale__head">
        <span class="ContractFinale__tag">第 {{ weekBudget }} / {{ weekBudget }} 周</span>
        <h2 id="contract-finale-title" class="ContractFinale__title">契约终局裁定</h2>
      </header>

      <p class="ContractFinale__lead">
        四十周账期已走完。征信灵籍将据此写入结局标签——确认后无法撤回。
      </p>

      <ul class="ContractFinale__stats">
        <li>滚动负债约 ¥{{ totalDebt.toLocaleString() }}</li>
        <li v-if="kpiScore != null">职场 KPI 归档分 {{ kpiScore }}</li>
      </ul>

      <p class="ContractFinale__fine">
        「履约结业」写入履约结局；「违约归档」写入违约结局。二者都会进入 RunArchive。
      </p>

      <div class="ContractFinale__actions">
        <button type="button" class="ContractFinale__btn" @click="emit('fulfill')">
          履约结业
        </button>
        <button type="button" class="ContractFinale__btn ContractFinale__btn--ghost" @click="emit('breach')">
          违约归档
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ContractFinale__panel {
  width: min(520px, 100%);
  border-color: rgba(255, 120, 90, 0.35);
}
.ContractFinale__head {
  margin-bottom: 1rem;
}
.ContractFinale__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 160, 120, 0.95);
}
.ContractFinale__title {
  margin: 0.35rem 0 0;
  font-size: 1.25rem;
}
.ContractFinale__lead {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}
.ContractFinale__stats {
  margin: 0 0 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 140, 100, 0.2);
  background: rgba(0, 0, 0, 0.35);
  list-style: none;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 210, 190, 0.92);
  line-height: 1.6;
}
.ContractFinale__fine {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.45;
}
.ContractFinale__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 1.25rem;
}
.ContractFinale__btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: var(--text-xs);
  background: rgba(120, 160, 220, 0.9);
  color: #fff;
}
.ContractFinale__btn--ghost {
  background: transparent;
  border: 1px solid rgba(120, 160, 220, 0.45);
  color: rgba(200, 220, 255, 0.95);
}
</style>
