<script setup lang="ts">
import type { Act1Todo } from '~/types/act1'

defineProps<{
  items: Act1Todo[]
}>()

const emit = defineEmits<{
  select: [todo: Act1Todo]
}>()
</script>

<template>
  <aside class="Act1TodoStack" aria-label="待办堆栈">
    <h2 class="Act1TodoStack__title">待办</h2>
    <ul v-if="items.length" class="Act1TodoStack__list">
      <li
        v-for="todo in items"
        :key="todo.id"
        class="Act1TodoStack__item"
        :class="`Act1TodoStack__item--${todo.tone ?? 'info'}`"
      >
        <button type="button" class="Act1TodoStack__btn" @click="emit('select', todo)">
          <span v-if="todo.blocking" class="Act1TodoStack__dot" aria-hidden="true" />
          {{ todo.title }}
        </button>
      </li>
    </ul>
    <p v-else class="Act1TodoStack__empty">暂无待办。系统仍可能推送通知。</p>
  </aside>
</template>

<style scoped>
.Act1TodoStack {
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: clamp(12px, 1.2vw, 18px);
  background: rgba(10, 14, 39, 0.9);
  font-size: var(--text-sm);
  overflow: hidden;
}
.Act1TodoStack__title {
  flex-shrink: 0;
  margin: 0 0 12px;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.Act1TodoStack__list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.Act1TodoStack__btn {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}
.Act1TodoStack__btn:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
}
.Act1TodoStack__dot {
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--danger);
  flex-shrink: 0;
}
.Act1TodoStack__item--danger .Act1TodoStack__btn {
  border-color: rgba(255, 59, 59, 0.35);
}
.Act1TodoStack__item--warn .Act1TodoStack__btn {
  border-color: rgba(255, 210, 74, 0.35);
}
.Act1TodoStack__empty {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
