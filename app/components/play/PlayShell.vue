<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PlayStatusBarModel } from '~/types/play'
import InboxPanel from '~/components/play/InboxPanel.vue'
import type { InboxThread } from '~/types/play'

const props = withDefaults(
  defineProps<{
    status: PlayStatusBarModel
    threads: InboxThread[]
    layoutToken?: string
    statusBarFields?: string[]
    integrity?: number
    integrityCap?: number
    maintenanceBill?: number
  }>(),
  {
    layoutToken: 'fate-human',
    statusBarFields: () => ['debt', 'cash', 'delinquency']
  }
)

const emit = defineEmits<{
  inboxSelect: [threadId: string]
}>()

const inboxWide = ref(false)

const inboxUnread = computed(() =>
  props.threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0)
)

const shellClass = computed(() => `PlayShell--${props.layoutToken}`)

const integrityPct = computed(() =>
  props.integrity != null ? Math.round(props.integrity * 100) : null
)

const integrityCapPct = computed(() =>
  props.integrityCap != null ? Math.round(props.integrityCap * 100) : null
)

const showField = (key: string) => props.statusBarFields.includes(key)

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
  <div class="PlayShell" :class="shellClass">
    <header class="PlayShell__status">
      <div class="PlayShell__brand">
        <NuxtLink to="/" class="PlayShell__tag">KUNXU · PLAY</NuxtLink>
        <span class="PlayShell__stage-label">{{ status.lifeStageLabel }} · {{ status.rankLabel }}</span>
      </div>
      <div class="PlayShell__stats">
        <span v-if="status.flash" class="PlayShell__flash" role="status">{{ status.flash }}</span>
        <span>第 {{ status.day }} 日</span>
        <span v-if="showField('cash')">现金 ¥{{ status.cash.toLocaleString() }}</span>
        <span v-if="showField('debt')" class="PlayShell__warn">负债 ¥{{ status.debt.toLocaleString() }}</span>
        <span
          v-if="showField('integrity') && integrityPct != null"
          class="PlayShell__integrity"
          :class="{ 'PlayShell__integrity--warn': integrityCapPct != null && integrityPct >= integrityCapPct - 5 }"
        >
          完整度 {{ integrityPct }}%
          <template v-if="integrityCapPct != null"> · 上限 {{ integrityCapPct }}%</template>
        </span>
        <span
          v-else-if="showField('body') && integrityPct != null"
          class="PlayShell__integrity"
        >
          完整度 {{ integrityPct }}%
        </span>
        <span
          v-if="showField('maintenance') && maintenanceBill != null"
          class="PlayShell__maintenance"
          :class="{ 'PlayShell__maintenance--warn': maintenanceBill > status.cash }"
        >
          维生 ¥{{ maintenanceBill.toLocaleString() }}
        </span>
        <span v-if="showField('delinquency')">逾期 {{ status.delinquency }}</span>
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
.PlayShell__flash {
  color: var(--neon-cyan);
  font-family: var(--mono);
  animation: playShellFlash 280ms ease-out;
}
@keyframes playShellFlash {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.PlayShell__realm {
  color: var(--neon-magenta);
}
.PlayShell__integrity {
  color: var(--text-secondary);
}
.PlayShell__integrity--warn {
  color: var(--fate-integrity-warn, rgba(255, 140, 60, 0.9));
}
.PlayShell__maintenance {
  color: var(--text-secondary);
}
.PlayShell__maintenance--warn {
  color: var(--neon-cyan);
}

/* fate-human aliases Phase 3 terminal */
.PlayShell--fate-human,
.PlayShell--terminal {
  --fate-shell-bg:
    radial-gradient(ellipse 120% 80% at 50% 0%, rgba(80, 0, 40, 0.12), transparent 55%),
    radial-gradient(ellipse 90% 60% at 100% 100%, rgba(0, 80, 120, 0.08), transparent 50%),
    var(--bg-primary);
  --fate-stage-tint: rgba(255, 40, 80, 0.04);
  --fate-rail-border: rgba(255, 80, 100, 0.22);
  --fate-rail-accent: rgba(255, 140, 160, 0.95);
  --fate-meter-primary: linear-gradient(90deg, rgba(255, 120, 80, 0.5), var(--danger));
  --fate-meter-secondary: linear-gradient(90deg, rgba(255, 80, 40, 0.65), #ff2244);
  --fate-integrity-warn: var(--danger);
  background: var(--fate-shell-bg);
}

.PlayShell--fate-mortgaged {
  --fate-shell-bg:
    radial-gradient(ellipse 100% 70% at 50% 0%, rgba(60, 20, 40, 0.18), transparent 55%),
    var(--bg-primary);
  --fate-stage-tint: rgba(180, 40, 60, 0.06);
  --fate-rail-border: rgba(255, 60, 80, 0.28);
  --fate-rail-accent: rgba(255, 100, 120, 0.95);
  --fate-meter-primary: linear-gradient(90deg, rgba(255, 120, 80, 0.5), var(--danger));
  --fate-meter-secondary: rgba(255, 160, 80, 0.85);
  --fate-integrity-warn: rgba(255, 140, 60, 0.9);
  background: var(--fate-shell-bg);
}

.PlayShell--fate-head-jar {
  --fate-shell-bg:
    radial-gradient(ellipse 90% 60% at 30% 0%, rgba(0, 120, 140, 0.14), transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 100%, rgba(40, 80, 100, 0.08), transparent 45%),
    var(--bg-primary);
  --fate-stage-tint: rgba(0, 180, 200, 0.05);
  --fate-rail-border: rgba(0, 200, 220, 0.22);
  --fate-rail-accent: rgba(120, 220, 240, 0.95);
  --fate-meter-primary: linear-gradient(90deg, rgba(0, 180, 200, 0.45), rgba(80, 220, 240, 0.85));
  --fate-meter-secondary: linear-gradient(90deg, rgba(255, 100, 80, 0.45), var(--danger));
  --fate-tile-accent-maintenance: rgba(0, 200, 220, 0.85);
  --fate-tile-accent-delegation: rgba(140, 180, 255, 0.85);
  background: var(--fate-shell-bg);
}

.PlayShell--fate-ghost-bound {
  --fate-shell-bg:
    radial-gradient(ellipse 85% 55% at 20% 0%, rgba(80, 40, 120, 0.16), transparent 52%),
    radial-gradient(ellipse 60% 45% at 95% 100%, rgba(40, 20, 60, 0.12), transparent 48%),
    var(--bg-primary);
  --fate-stage-tint: rgba(120, 80, 180, 0.06);
  --fate-rail-border: rgba(140, 100, 200, 0.28);
  --fate-rail-accent: rgba(180, 140, 255, 0.95);
  --fate-meter-primary: linear-gradient(90deg, rgba(100, 60, 160, 0.5), rgba(160, 120, 220, 0.85));
  --fate-meter-secondary: linear-gradient(90deg, rgba(255, 120, 80, 0.45), var(--danger));
  --fate-tile-accent-maintenance: rgba(140, 100, 200, 0.75);
  --fate-tile-accent-delegation: rgba(180, 140, 255, 0.85);
  background: var(--fate-shell-bg);
}

.PlayShell--fate-mortgaged .PlayShell__stage {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 4px,
      rgba(255, 255, 255, 0.03) 4px,
      rgba(255, 255, 255, 0.03) 5px
    ),
    linear-gradient(180deg, var(--fate-stage-tint) 0%, transparent 35%),
    rgba(0, 0, 0, 0.22);
}

.PlayShell--fate-head-jar .PlayShell__stage {
  background:
    linear-gradient(180deg, var(--fate-stage-tint) 0%, transparent 35%),
    rgba(0, 0, 0, 0.18);
}

.PlayShell--fate-ghost-bound .PlayShell__stage {
  background:
    linear-gradient(180deg, var(--fate-stage-tint) 0%, transparent 35%),
    rgba(0, 0, 0, 0.2);
}

.PlayShell--fate-human .PlayShell__stage,
.PlayShell--terminal .PlayShell__stage {
  background:
    linear-gradient(180deg, var(--fate-stage-tint) 0%, transparent 35%),
    rgba(0, 0, 0, 0.15);
}
.PlayShell__body {
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, min(320px, 28vw));
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.015) 3px,
      rgba(255, 255, 255, 0.015) 4px
    );
}
@media (min-width: 1280px) {
  .PlayShell__body {
    grid-template-columns: minmax(0, 1fr) minmax(240px, min(300px, 22vw));
  }
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px clamp(14px, 2vw, 24px) max(8px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  max-height: min(28vh, 220px);
  overflow: auto;
  border-top: 1px solid rgba(255, 80, 100, 0.12);
  background: rgba(0, 0, 0, 0.45);
}
</style>
