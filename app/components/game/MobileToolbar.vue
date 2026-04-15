<template>
  <Teleport to="body">
    <Transition name="toolbar">
      <div v-if="show" class="MobileToolbar">
        <button
          class="MobileToolbar__btn"
          :class="{ 'MobileToolbar__btn--active': activeTab === 'save' }"
          @click="activeTab = 'save'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>存档</span>
        </button>

        <button
          class="MobileToolbar__btn"
          :class="{ 'MobileToolbar__btn--active': activeTab === 'stats' }"
          @click="activeTab = 'stats'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>统计</span>
        </button>

        <button
          class="MobileToolbar__btn MobileToolbar__btn--primary"
          @click="onShare"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>分享</span>
        </button>

        <button
          class="MobileToolbar__btn"
          :class="{ 'MobileToolbar__btn--active': activeTab === 'logs' }"
          @click="activeTab = 'logs'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>日志</span>
        </button>

        <button
          class="MobileToolbar__btn"
          @click="onBack"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>首页</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '#app'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: true
})

const emit = defineEmits<{
  share: []
  save: []
}>()

const activeTab = ref<string | null>(null)

const onShare = () => {
  emit('share')
}

const onBack = () => {
  navigateTo('/')
}
</script>

<style scoped>
.MobileToolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
}

.MobileToolbar__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.15s ease;
  min-width: 48px;
  min-height: 48px;
  justify-content: center;
}

.MobileToolbar__btn:active {
  transform: scale(0.95);
}

.MobileToolbar__btn svg {
  width: 22px;
  height: 22px;
}

.MobileToolbar__btn--active {
  color: var(--neon-cyan);
}

.MobileToolbar__btn--primary {
  color: var(--neon-cyan);
  background: rgba(0, 255, 255, 0.1);
  border-radius: 12px;
  min-width: 56px;
}

.MobileToolbar__btn--primary:active {
  background: rgba(0, 255, 255, 0.2);
}

.toolbar-enter-active,
.toolbar-leave-active {
  transition: transform 0.3s ease;
}

.toolbar-enter-from,
.toolbar-leave-to {
  transform: translateY(100%);
}

/* Hide on desktop */
@media (min-width: 768px) {
  .MobileToolbar {
    display: none;
  }
}
</style>
