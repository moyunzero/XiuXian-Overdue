<script setup lang="ts">
import type { InboxThread } from '~/types/play'

defineProps<{
  threads: InboxThread[]
}>()

const emit = defineEmits<{
  selectThread: [threadId: string]
}>()
</script>

<template>
  <aside class="InboxPanel" aria-label="灵信收件箱">
    <header class="InboxPanel__head">
      <span class="InboxPanel__title">灵信</span>
      <span class="InboxPanel__hint">灵信 · 制度通知</span>
    </header>
    <ul class="InboxPanel__list">
      <li
        v-for="thread in threads"
        :key="thread.id"
        class="InboxPanel__item"
        :class="{ 'InboxPanel__item--unread': thread.unreadCount > 0 }"
      >
        <button type="button" class="InboxPanel__btn" @click="emit('selectThread', thread.id)">
          <span class="InboxPanel__thread-title">{{ thread.title }}</span>
          <span v-if="thread.unreadCount" class="InboxPanel__badge">{{ thread.unreadCount }}</span>
          <span v-if="thread.messages[0]" class="InboxPanel__preview">{{ thread.messages[0].preview }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.InboxPanel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  border-left: 1px solid var(--border-default);
  background: rgba(10, 14, 39, 0.85);
  font-family: var(--sans);
}
.InboxPanel__head {
  flex-shrink: 0;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-default);
}
.InboxPanel__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--neon-cyan);
  letter-spacing: 0.08em;
}
.InboxPanel__hint {
  display: block;
  margin-top: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.InboxPanel__list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}
.InboxPanel__item {
  margin-bottom: 6px;
}
.InboxPanel__btn {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.InboxPanel__item--unread .InboxPanel__btn {
  border-color: rgba(0, 255, 255, 0.25);
}
.InboxPanel__btn:hover {
  border-color: var(--neon-cyan);
  background: rgba(0, 255, 255, 0.06);
}
.InboxPanel__thread-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--text-sm);
  font-weight: 600;
}
.InboxPanel__badge {
  flex-shrink: 0;
  min-width: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--neon-magenta);
  color: #000;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.InboxPanel__preview {
  display: block;
  margin-top: 6px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
