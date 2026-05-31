<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PlayStatusBarModel } from '~/types/play'
import InboxPanel from '~/components/play/InboxPanel.vue'
import type { InboxThread } from '~/types/play'

const props = defineProps<{
  status: PlayStatusBarModel
  threads: InboxThread[]
}>()

const emit = defineEmits<{
  inboxSelect: [threadId: string]
}>()

const inboxWide = ref(false)

const inboxUnread = computed(() =>
  props.threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0)
)

onMounted(() => {
  if (typeof window === 'undefined') return
  const mq = window.matchMedia('(min-width: 901px)')
  const apply = () => {
    inboxWide.value = mq.matches
  }
  apply()
  mq.addEventListener('change', apply)
  onBeforeUnmount(() => mq.removeEventListener('change', apply))
})
</script>

<template>
  <div class="PlayShell PlayShell--terminal">
    <header class="PlayShell__status">
      <div class="PlayShell__brand">
        <NuxtLink to="/" class="PlayShell__tag">KUNXU · PLAY</NuxtLink>
        <span class="PlayShell__stage-label">{{ status.lifeStageLabel }} · {{ status.rankLabel }}</span>
      </div>
      <div class="PlayShell__stats">
        <span>第 {{ status.day }} 日</span>
        <span>现金 ¥{{ status.cash.toLocaleString() }}</span>
        <span class="PlayShell__warn">负债 ¥{{ status.debt.toLocaleString() }}</span>
        <span>逾期 {{ status.delinquency }}</span>
        <span class="PlayShell__realm">{{ status.realmLabel }}</span>
      </div>
    </header>
    <div class="PlayShell__body">
      <main class="PlayShell__stage">
        <slot />
      </main>
      <InboxPanel
        v-if="inboxWide"
        class="PlayShell__inbox"
        :threads="threads"
        @select-thread="emit('inboxSelect', $event)"
      />
      <details v-else class="PlayShell__inboxSheet">
        <summary class="PlayShell__inboxSummary">
          <span>灵信</span>
          <span v-if="inboxUnread" class="PlayShell__inboxBadge">{{ inboxUnread }}</span>
          <span class="PlayShell__inboxHint">展开</span>
        </summary>
        <InboxPanel
          class="PlayShell__inbox PlayShell__inbox--sheet"
          :threads="threads"
          @select-thread="emit('inboxSelect', $event)"
        />
      </details>
    </div>
    <footer v-if="$slots.deck" class="PlayShell__deck">
      <slot name="deck" />
    </footer>
  </div>
</template>

<style scoped>
.PlayShell {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  height: 100%;
  min-height: 100dvh;
  box-sizing: border-box;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.PlayShell__status {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 10px clamp(14px, 2vw, 24px);
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.72);
}
.PlayShell__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.PlayShell__tag {
  letter-spacing: 0.12em;
  font-size: var(--text-xs);
  color: var(--neon-cyan);
  text-decoration: none;
}
.PlayShell__tag:hover {
  color: #fff;
}
.PlayShell__stage-label {
  color: var(--text-muted);
  font-size: var(--text-xs);
}
.PlayShell__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px clamp(14px, 2vw, 24px);
  margin-left: auto;
  justify-content: flex-end;
}
.PlayShell__warn {
  color: var(--danger);
}
.PlayShell__realm {
  color: var(--neon-magenta);
}
.PlayShell__body {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, min(300px, 26vw));
}
@media (max-width: 900px) {
  .PlayShell__body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
  }
}
.PlayShell__stage {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.PlayShell__stage :deep(.Act1StatusBar) {
  display: none;
}
.PlayShell__stage :deep(.Act1Page) {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.PlayShell__stage :deep(.Act1Desktop) {
  width: 100%;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.PlayShell__stage :deep(.Act1Desktop__shell) {
  width: 100%;
}
.PlayShell__inbox {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-default);
}
.PlayShell__inboxSheet {
  flex-shrink: 0;
  min-width: 0;
  border-top: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.55);
}

.PlayShell__inboxSheet:not([open]) {
  max-height: 48px;
  overflow: hidden;
}

.PlayShell__inboxSheet[open] {
  max-height: min(52vh, 400px);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.PlayShell__inboxSummary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px clamp(14px, 2vw, 20px);
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  color: var(--neon-cyan);
  cursor: pointer;
  list-style: none;
  flex-shrink: 0;
}

.PlayShell__inboxSummary::-webkit-details-marker {
  display: none;
}

.PlayShell__inboxBadge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 80, 80, 0.2);
  color: var(--danger);
  font-size: 10px;
}

.PlayShell__inboxHint {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 10px;
}

.PlayShell__inboxSheet[open] .PlayShell__inboxHint::after {
  content: ' · 收起';
}

.PlayShell__inbox--sheet {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-left: none;
}

.PlayShell__inbox--sheet :deep(.InboxPanel__head) {
  display: none;
}

.PlayShell__deck {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
}
</style>
