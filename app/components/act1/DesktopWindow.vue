<script setup lang="ts">
import { computed } from 'vue'
import type { Act1WindowId } from '~/types/act1'

const props = defineProps<{
  windowId: Act1WindowId
  title: string
  active: boolean
  zIndex: number
  top?: string
  left?: string
}>()

const windowStyle = computed(() => ({
  zIndex: props.zIndex,
  top: props.top ?? '10%',
  left: props.left ?? '10%'
}))

const emit = defineEmits<{
  focus: []
  close: []
}>()
</script>

<template>
  <section
    class="Act1Window"
    :class="{ 'Act1Window--active': active }"
    :style="windowStyle"
    @mousedown="emit('focus')"
  >
    <header class="Act1Window__chrome">
      <span class="Act1Window__title">{{ title }}</span>
      <button type="button" class="Act1Window__close" aria-label="关闭窗口" @click.stop="emit('close')">
        ×
      </button>
    </header>
    <div class="Act1Window__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.Act1Window {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100% - 32px));
  height: min(360px, calc(100% - 32px));
  min-width: 280px;
  min-height: 200px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-tertiary);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.Act1Window--active {
  border-color: rgba(0, 255, 255, 0.35);
  box-shadow: 0 0 0 1px rgba(0, 255, 255, 0.2), 0 16px 48px rgba(0, 0, 0, 0.6);
}
.Act1Window__chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.45);
  border-bottom: 1px solid var(--border-default);
  cursor: default;
  user-select: none;
}
.Act1Window__title {
  font-family: var(--mono);
  font-size: var(--text-sm);
  color: var(--neon-cyan);
}
.Act1Window__close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.Act1Window__close:hover {
  color: var(--danger);
}
.Act1Window__body {
  flex: 1;
  overflow: auto;
  padding: 14px;
  font-size: var(--text-base);
  line-height: 1.55;
  color: var(--text-primary);
}
</style>
