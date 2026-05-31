<script setup lang="ts">
import type { PlayStatusBarModel } from '~/types/play'
import InboxPanel from '~/components/play/InboxPanel.vue'
import type { InboxThread } from '~/types/play'

defineProps<{
  status: PlayStatusBarModel
  threads: InboxThread[]
}>()

const emit = defineEmits<{
  inboxSelect: [threadId: string]
}>()
</script>

<template>
  <div class="PlayShell">
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
      <InboxPanel class="PlayShell__inbox" :threads="threads" @select-thread="emit('inboxSelect', $event)" />
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
    grid-template-rows: 1fr auto;
  }
  .PlayShell__inbox {
    max-height: 220px;
    border-left: none;
    border-top: 1px solid var(--border-default);
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
.PlayShell__deck {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
}
</style>
