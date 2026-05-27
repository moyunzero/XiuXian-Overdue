<script setup lang="ts">
import type { Act1State, Act1WindowId } from '~/types/act1'

const props = defineProps<{
  act1: Act1State
  activeWindow: Act1WindowId
  windowLabels: Record<Act1WindowId, string>
  openWindowIds: Act1WindowId[]
  debtTotal: number
  creditors?: { name: string; balance: number }[]
  act1Notifications?: { id: string; title: string }[]
}>()

const emit = defineEmits<{
  selectWindow: [id: Act1WindowId]
}>()
</script>

<template>
  <aside class="Act1ContextAside" aria-label="系统层">
    <section class="Act1ContextAside__block">
      <h3 class="Act1ContextAside__heading">系统层</h3>
      <dl class="Act1ContextAside__stats">
        <div class="Act1ContextAside__row">
          <dt>压力指数</dt>
          <dd class="Act1ContextAside__warn">{{ act1.pressure }}</dd>
        </div>
        <div class="Act1ContextAside__row">
          <dt>家庭韧性</dt>
          <dd>{{ act1.familyResilience }}</dd>
        </div>
        <div class="Act1ContextAside__row">
          <dt>负债合计</dt>
          <dd class="Act1ContextAside__danger">¥{{ debtTotal.toLocaleString() }}</dd>
        </div>
      </dl>
    </section>

    <section class="Act1ContextAside__block">
      <h3 class="Act1ContextAside__heading">已打开窗口</h3>
      <div class="Act1ContextAside__chips">
        <button
          v-for="id in openWindowIds"
          :key="id"
          type="button"
          class="Act1ContextAside__chip"
          :class="{ 'Act1ContextAside__chip--active': activeWindow === id }"
          @click="emit('selectWindow', id)"
        >
          {{ windowLabels[id] }}
        </button>
      </div>
    </section>

    <section v-if="creditors?.length" class="Act1ContextAside__block">
      <h3 class="Act1ContextAside__heading">债权人</h3>
      <ul class="Act1ContextAside__creditors">
        <li v-for="c in creditors" :key="c.name">
          <span>{{ c.name }}</span>
          <span class="Act1ContextAside__danger">¥{{ c.balance.toLocaleString() }}</span>
        </li>
      </ul>
    </section>

    <section class="Act1ContextAside__block Act1ContextAside__block--muted">
      <h3 class="Act1ContextAside__heading">通知队列</h3>
      <ul v-if="act1Notifications?.length" class="Act1ContextAside__notices">
        <li v-for="n in act1Notifications.slice(0, 4)" :key="n.id">{{ n.title }}</li>
      </ul>
      <p class="Act1ContextAside__note">催收节拍会推送到待办。花钱 ≥3 次后注意升级链。</p>
    </section>
  </aside>
</template>

<style scoped>
.Act1ContextAside {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  overflow-y: auto;
}
.Act1ContextAside__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.Act1ContextAside__block--muted {
  opacity: 0.85;
}
.Act1ContextAside__heading {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.Act1ContextAside__stats {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.Act1ContextAside__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
}
.Act1ContextAside__row dt {
  color: var(--text-secondary);
}
.Act1ContextAside__row dd {
  margin: 0;
  font-family: var(--mono);
  color: var(--text-primary);
}
.Act1ContextAside__warn {
  color: var(--warning);
}
.Act1ContextAside__danger {
  color: var(--danger);
}
.Act1ContextAside__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.Act1ContextAside__chip {
  padding: 6px 10px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-family: var(--mono);
  cursor: pointer;
}
.Act1ContextAside__chip:hover {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}
.Act1ContextAside__chip--active {
  border-color: rgba(0, 255, 255, 0.5);
  color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
}
.Act1ContextAside__note {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-muted);
}
.Act1ContextAside__creditors,
.Act1ContextAside__notices {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--text-sm);
}
.Act1ContextAside__creditors li,
.Act1ContextAside__notices li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
}
.Act1ContextAside__notices li {
  justify-content: flex-start;
}
</style>
