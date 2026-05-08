<template>
  <div class="label-timeline">
    <h3 class="timeline-title">标签时间线</h3>

    <div v-if="recentHistory.length === 0" class="empty-timeline">
      暂无标签记录
    </div>

    <div v-else class="timeline-list">
      <div
        v-for="(entry, index) in displayHistory"
        :key="index"
        class="timeline-item"
      >
        <div class="timeline-dot" />
        <div class="timeline-content">
          <div class="entry-header">
            <span class="entry-date">{{ formatDate(entry.timestamp) }}</span>
            <span class="entry-trigger">{{ entry.trigger }}</span>
          </div>
          <div class="entry-tags">
            <span
              v-for="tag in entry.digest.tagsSummary.split('、')"
              :key="tag"
              :class="['tag-badge', getTagClass(tag)]"
            >
              {{ tag }}
            </span>
          </div>
          <div v-if="entry.digest.recentChanges?.length" class="entry-changes">
            <div v-for="(change, idx) in entry.digest.recentChanges" :key="idx" class="change-item">
              {{ change }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="recentHistory.length > 5"
      class="toggle-button"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起' : '展开全部' }} ({{ recentHistory.length }})
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProfileHistoryEntry } from '~/types/game'

const props = defineProps<{
  history: ProfileHistoryEntry[]
}>()

const expanded = ref(false)

const recentHistory = computed(() => {
  return [...props.history].reverse()
})

const displayHistory = computed(() => {
  if (expanded.value) return recentHistory.value
  return recentHistory.value.slice(0, 5)
})

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getTagClass = (tag: string) => {
  const financialTags = ['高风险修士', '低偿付能力', '催收优先级上升']
  const educationTags = ['可投资优等生', '偏科执行体', '末位淘汰预备对象']
  const complianceTags = ['高服从度人才', '可规训对象', '低反抗样本', '已进入稳定驯化区']
  const bodyTags = ['可抵押体质', '已标记资产', '身体估值下降', '深度拆解候选']

  if (financialTags.some(t => tag.includes(t))) return 'tag-financial'
  if (educationTags.some(t => tag.includes(t))) return 'tag-education'
  if (complianceTags.some(t => tag.includes(t))) return 'tag-compliance'
  if (bodyTags.some(t => tag.includes(t))) return 'tag-body'
  return ''
}
</script>

<style scoped>
.label-timeline {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.timeline-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.empty-timeline {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
  padding: var(--space-xl) 0;
}

.timeline-list {
  position: relative;
  padding-left: var(--space-lg);
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border-secondary);
}

.timeline-item {
  position: relative;
  padding-bottom: var(--space-lg);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -18px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent-primary);
  border: 2px solid var(--color-bg-primary);
}

.timeline-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.entry-trigger {
  background: var(--color-bg-tertiary);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-xs);
}

.entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.tag-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-xs);
  font-weight: 500;
}

.tag-financial {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.tag-education {
  background: var(--color-info-light);
  color: var(--color-info);
}

.tag-compliance {
  background: var(--color-success-light);
  color: var(--color-success);
}

.tag-body {
  background: var(--color-purple-light);
  color: var(--color-purple);
}

.entry-changes {
  border-top: 1px solid var(--color-border-secondary);
  padding-top: var(--space-sm);
  margin-top: var(--space-sm);
}

.change-item {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0.125rem 0;
}

.toggle-button {
  margin-top: var(--space-md);
  background: transparent;
  border: 1px solid var(--color-border-primary);
  color: var(--color-accent-primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  width: 100%;
  transition: background 0.2s;
}

.toggle-button:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 768px) {
  .entry-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
  }
}
</style>
