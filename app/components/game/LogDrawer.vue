<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="show"
        class="LogDrawer"
        @click.self="emit('close')"
      >
        <div class="LogDrawer__panel">
          <div class="LogDrawer__header">
            <h3 class="LogDrawer__title">日志</h3>
            <button class="LogDrawer__close" @click="emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="LogDrawer__handle" />

          <div class="LogDrawer__content">
            <LogPanel
              :logs="logs"
              :selected-id="selectedId"
              @select="emit('select', $event)"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import LogPanel from './LogPanel.vue'
import type { LogEntryDisplay } from '~/types/game'

interface Props {
  show: boolean
  logs: LogEntryDisplay[]
  selectedId?: string | null
}

withDefaults(defineProps<Props>(), {
  selectedId: null
})

const emit = defineEmits<{
  close: []
  select: [id: string]
}>()
</script>

<style scoped>
.LogDrawer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.LogDrawer__panel {
  background: var(--bg-secondary, #121212);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.LogDrawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.LogDrawer__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.LogDrawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.LogDrawer__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.LogDrawer__close svg {
  width: 18px;
  height: 18px;
}

.LogDrawer__handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 auto 8px;
  flex-shrink: 0;
}

.LogDrawer__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

/* Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .LogDrawer__panel,
.drawer-leave-active .LogDrawer__panel {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .LogDrawer__panel,
.drawer-leave-to .LogDrawer__panel {
  transform: translateY(100%);
}

/* Hide on desktop */
@media (min-width: 768px) {
  .LogDrawer {
    display: none;
  }
}
</style>
