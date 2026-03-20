<template>
  <div class="LogPanel">
    <div class="LogList">
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        :class="logItemClasses(log.id)"
        @click="selectLog(log.id)"
      >
        <span :class="`LogDot LogDot--${log.tone}`"></span>
        <div class="LogContent">
          <span class="LogMeta">Day {{ log.day }}</span>
          <span class="LogTitle">{{ log.title }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="selectedLog" class="LogDetail">
      <div class="LogDetailHeader">
        <span class="LogDetailDay">Day {{ selectedLog.day }}</span>
        <span :class="`LogDetailTone LogDetailTone--${selectedLog.tone}`">
          {{ toneLabel(selectedLog.tone) }}
        </span>
      </div>
      <h3 class="LogDetailTitle">{{ selectedLog.title }}</h3>
      <p class="LogDetailBody">{{ selectedLog.detail }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LogEntryDisplay } from '~/types/game'

interface LogPanelProps {
  logs: LogEntryDisplay[]
  maxVisible?: number
  selectedId?: string
  filterByTone?: LogEntryDisplay['tone'][]
}

const props = withDefaults(defineProps<LogPanelProps>(), {
  maxVisible: 100,
  filterByTone: () => []
})

const emit = defineEmits<{
  select: [id: string]
}>()

const internalSelectedId = ref(props.selectedId || (props.logs[0]?.id || ''))

const filteredLogs = computed(() => {
  let logs = props.logs
  if (props.filterByTone && props.filterByTone.length > 0) {
    logs = logs.filter(log => props.filterByTone!.includes(log.tone))
  }
  return logs.slice(0, props.maxVisible)
})

const selectedLog = computed(() => filteredLogs.value.find(log => log.id === internalSelectedId.value))

const logItemClasses = (id: string) => ({
  'LogItem': true,
  'LogItem--active': id === internalSelectedId.value
})

const selectLog = (id: string) => {
  internalSelectedId.value = id
  emit('select', id)
}

const toneLabel = (tone: LogEntryDisplay['tone']) => {
  const labels: Record<LogEntryDisplay['tone'], string> = { info: '信息', warn: '警告', danger: '危险', ok: '成功' }
  return labels[tone]
}
</script>

<style scoped>
.LogPanel {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.LogList {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 340px;
  overflow-y: auto;
  padding-right: var(--space-1);
  flex: 0 0 56%;
}

.LogList::-webkit-scrollbar {
  width: 6px;
}

.LogList::-webkit-scrollbar-track {
  background: transparent;
}

.LogList::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}

.LogItem {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
  padding: var(--space-2) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.LogItem--active {
  border-color: rgba(56, 248, 208, 0.5);
  background: linear-gradient(90deg, rgba(56, 248, 208, 0.16), rgba(124, 92, 255, 0.10));
}

.LogItem:hover {
  border-color: rgba(124, 92, 255, 0.42);
}

.LogDot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.LogDot--ok { background: var(--ok); }
.LogDot--warn { background: var(--warn); }
.LogDot--danger { background: var(--danger); }
.LogDot--info { background: rgba(154, 166, 198, 0.9); }

.LogContent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.LogMeta {
  font-size: var(--text-xs);
  color: var(--muted);
}

.LogTitle {
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.LogDetail {
  flex: 1 1 0;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: radial-gradient(circle at 0 0, rgba(56, 248, 208, 0.08), transparent 55%), rgba(0, 0, 0, 0.35);
  padding: var(--space-4);
  min-height: 80px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.LogDetailHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.LogDetailDay {
  font-size: var(--text-sm);
  color: var(--muted);
  font-weight: var(--font-medium);
}

.LogDetailTone {
  font-size: var(--text-xs);
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: var(--font-medium);
}

.LogDetailTone--ok {
  background: rgba(68, 255, 154, 0.15);
  color: var(--ok);
}

.LogDetailTone--warn {
  background: rgba(255, 210, 74, 0.15);
  color: var(--warn);
}

.LogDetailTone--danger {
  background: rgba(255, 59, 59, 0.15);
  color: var(--danger);
}

.LogDetailTone--info {
  background: rgba(154, 166, 198, 0.15);
  color: var(--muted);
}

.LogDetailTitle {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  font-family: var(--serif);
  line-height: var(--leading-tight);
}

.LogDetailBody {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: var(--leading-normal);
}

/* Responsive */
@media (max-width: 920px) {
  .LogPanel {
    flex-direction: column;
  }
  
  .LogList {
    max-height: 220px;
    flex-basis: auto;
  }
}

@media (max-width: 767px) {
  .LogPanel {
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  
  .LogList {
    max-height: 200px;
    gap: 2px;
  }
  
  .LogItem {
    padding: 6px var(--space-2);
    /* Touch-friendly */
    touch-action: manipulation;
    min-height: 44px;
  }
  
  .LogMeta {
    font-size: 10px;
  }
  
  .LogTitle {
    font-size: 11px;
  }
  
  .LogDetail {
    padding: var(--space-3);
    gap: var(--space-2);
    border-radius: 14px;
  }
  
  .LogDetailDay {
    font-size: 11px;
  }
  
  .LogDetailTone {
    font-size: 10px;
    padding: 3px 6px;
  }
  
  .LogDetailTitle {
    font-size: var(--text-base);
  }
  
  .LogDetailBody {
    font-size: 13px;
  }
}
</style>
