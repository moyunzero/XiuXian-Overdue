<script setup lang="ts">
import { computed } from 'vue'
import type { Act1PermanentModifiers, Act1State } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import { buildAct1SettlementLines } from '~/logic/act1/act1Settlement'

const props = defineProps<{
  startConfig: StartConfig
  act1: Act1State
  debtTotal: number
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
}>()

defineEmits<{
  finish: []
}>()

const lines = computed(() =>
  buildAct1SettlementLines(
    props.startConfig,
    props.act1,
    props.debtTotal,
    props.permanentModifiers,
    props.metaUnlocks
  )
)
</script>

<template>
  <article class="Act1Settlement">
    <pre class="Act1Settlement__report">{{ lines.join('\n') }}</pre>
    <button type="button" class="Act1Settlement__btn" @click="$emit('finish')">
      确认并返回首页
    </button>
  </article>
</template>

<style scoped>
.Act1Settlement {
  max-width: min(720px, 100%);
  margin: 0 auto;
}
.Act1Settlement__report {
  margin: 0 0 20px;
  padding: 20px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  font-family: var(--mono);
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.Act1Settlement__btn {
  padding: 10px 18px;
  border: 1px solid var(--neon-cyan);
  background: rgba(0, 255, 255, 0.1);
  color: var(--neon-cyan);
  font-family: var(--mono);
  cursor: pointer;
  border-radius: 4px;
}
.Act1Settlement__btn:hover {
  box-shadow: var(--glow-cyan);
}
</style>
