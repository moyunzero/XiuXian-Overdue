<script setup lang="ts">
import type { Act1Notification } from '~/logic/act1/loanProducts'

defineProps<{
  items: Act1Notification[]
}>()
</script>

<template>
  <div class="MessagesModule">
    <p class="Act1Copy Act1Copy--muted">系统通知栈 · 按推送顺序排列。部分条目与待办联动。</p>
    <ul v-if="items.length" class="MessagesModule__list">
      <li
        v-for="n in items"
        :key="n.id"
        class="MessagesModule__item"
        :class="`MessagesModule__item--${n.tone}`"
      >
        <p class="MessagesModule__title">{{ n.title }}</p>
        <p class="MessagesModule__body">{{ n.body }}</p>
      </li>
    </ul>
    <p v-else class="Act1Copy Act1Copy--muted">暂无通知。完成面试后灵贷与借读费附件会在此出现。</p>
  </div>
</template>

<style scoped>
.MessagesModule__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.MessagesModule__item {
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}
.MessagesModule__item--danger {
  border-color: rgba(255, 59, 59, 0.35);
}
.MessagesModule__item--warn {
  border-color: rgba(255, 210, 74, 0.35);
}
.MessagesModule__title {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
}
.MessagesModule__body {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
