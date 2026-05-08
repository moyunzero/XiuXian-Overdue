<template>
  <div class="assessment-history">
    <h3 class="history-title">系统评估记录</h3>

    <div v-if="history.length === 0" class="empty-history">
      暂无评估记录
    </div>

    <div v-else class="history-table-wrapper">
      <table class="history-table">
        <thead>
          <tr>
            <th>评估日期</th>
            <th>财务风险</th>
            <th>教育信用</th>
            <th>制度顺从</th>
            <th>身体资产</th>
            <th>系统备注</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(entry, index) in reversedHistory"
            :key="index"
            class="history-row"
            @click="toggleExpand(index)"
          >
            <td>{{ formatDate(entry.timestamp) }}</td>
            <td :class="['level-cell', getRiskClass(entry.digest.primaryLevel)]">
              {{ getLevelLabel(entry.digest.primaryLevel) }}
            </td>
            <td>{{ entry.riskScore }}</td>
            <td class="note-cell">{{ entry.systemNote }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProfileHistoryEntry } from '~/types/game'

const props = defineProps<{
  history: ProfileHistoryEntry[]
}>()

const expandedRow = ref<number | null>(null)

const reversedHistory = computed(() => {
  return [...props.history].reverse()
})

const toggleExpand = (index: number) => {
  expandedRow.value = expandedRow.value === index ? null : index
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    financialRisk: '财务风险',
    educationCredit: '教育信用',
    compliance: '制度顺从',
    bodyAsset: '身体资产'
  }
  return labels[level] || level
}

const getRiskClass = (level: string) => {
  if (level.includes('financialRisk')) return 'risk-high'
  if (level.includes('educationCredit')) return 'risk-medium'
  return 'risk-low'
}
</script>

<style scoped>
.assessment-history {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.history-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.empty-history {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
  padding: var(--space-xl) 0;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.history-table thead {
  background: var(--color-bg-secondary);
}

.history-table th {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border-primary);
  white-space: nowrap;
}

.history-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border-secondary);
  color: var(--color-text-primary);
}

.history-row {
  cursor: pointer;
  transition: background 0.2s;
}

.history-row:hover {
  background: var(--color-bg-secondary);
}

.level-cell {
  font-weight: 500;
}

.risk-high {
  color: var(--color-danger);
}

.risk-medium {
  color: var(--color-warning);
}

.risk-low {
  color: var(--color-success);
}

.note-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .history-table {
    font-size: 0.75rem;
  }

  .history-table th,
  .history-table td {
    padding: var(--space-xs) var(--space-sm);
  }

  .note-cell {
    max-width: 150px;
  }
}
</style>
