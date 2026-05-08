<template>
  <header class="archive-header">
    <div class="header-content">
      <div class="header-title">
        <h1>修仙信用社会 · 制度档案</h1>
        <div class="header-meta">
          <span v-if="archiveId" class="archive-id">档案编号：{{ archiveId }}</span>
          <span v-if="createdDate" class="created-date">建档日期：{{ createdDate }}</span>
        </div>
      </div>
      <button class="back-button" @click="$emit('back')">
        ← 返回游戏
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'

defineEmits<{
  back: []
}>()

const { game } = useGame()

const archiveId = computed(() => {
  if (!game.value.startConfig?.playerName) return null
  const seed = game.value.seed ?? 0
  return `XC-${seed.toString(36).toUpperCase().slice(0, 6)}`
})

const createdDate = computed(() => {
  const firstEntry = game.value.profileHistory?.[0]
  if (!firstEntry) return null
  return new Date(firstEntry.timestamp).toLocaleDateString('zh-CN')
})
</script>

<style scoped>
.archive-header {
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border-default);
  padding: var(--spacing-6) var(--spacing-8);
}

.header-content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-1) 0;
  font-family: var(--mono);
}

.header-meta {
  display: flex;
  gap: var(--spacing-3);
  font-size: 0.875rem;
  color: var(--muted);
}

.archive-id,
.created-date {
  font-family: var(--mono);
}

.back-button {
  background: var(--neon-cyan);
  color: var(--bg-primary);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.back-button:hover {
  background: var(--neon-blue);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: flex-start;
  }

  .header-title h1 {
    font-size: 1.25rem;
  }

  .header-meta {
    flex-direction: column;
    gap: var(--spacing-1);
  }
}
</style>
