<template>
  <div :class="containerClasses">
    <div
      v-for="stat in stats"
      :key="stat.name"
      class="StatItem"
    >
      <div class="StatHeader">
        <span class="StatName">{{ stat.name }}</span>
        <div class="StatValueGroup">
          <span class="StatValue">{{ stat.value }}</span>
          <span v-if="stat.unit" class="StatUnit">{{ stat.unit }}</span>
          <span v-if="stat.trend" :class="trendClasses(stat.trend)" class="StatTrend">
            {{ trendIcon(stat.trend) }}
            <span v-if="stat.trendValue">{{ stat.trendValue }}</span>
          </span>
        </div>
      </div>
      
      <p v-if="stat.description" class="StatDescription">{{ stat.description }}</p>
      
      <ProgressBar
        v-if="stat.progressBar"
        :value="stat.progressBar.current"
        :max="stat.progressBar.max"
        :variant="stat.progressBar.variant"
        :height="'sm'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from '../ui/ProgressBar.vue'

interface StatItem {
  name: string
  value: number | string
  unit?: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  progressBar?: {
    current: number
    max: number
    variant: 'default' | 'gradient' | 'danger' | 'success'
  }
}

interface StatPanelProps {
  stats: StatItem[]
  layout?: 'grid' | 'list'
  columns?: 2 | 3 | 4
}

const props = withDefaults(defineProps<StatPanelProps>(), {
  layout: 'grid',
  columns: 3
})

const containerClasses = computed(() => {
  if (props.layout === 'list') {
    return 'StatPanel StatPanel--list'
  }
  return `StatPanel StatPanel--grid StatPanel--cols-${props.columns}`
})

const trendClasses = (trend: 'up' | 'down' | 'neutral') => ({
  'StatTrend--up': trend === 'up',
  'StatTrend--down': trend === 'down',
  'StatTrend--neutral': trend === 'neutral'
})

const trendIcon = (trend: 'up' | 'down' | 'neutral') => {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}
</script>

<style scoped>
.StatPanel {
  display: flex;
  gap: var(--space-3);
}

.StatPanel--grid {
  display: grid;
}

.StatPanel--cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.StatPanel--cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.StatPanel--cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.StatPanel--list {
  flex-direction: column;
}

.StatItem {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.18);
}

.StatHeader {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.StatName {
  color: var(--muted);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.StatValueGroup {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.StatValue {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.StatUnit {
  font-size: var(--text-sm);
  color: var(--muted);
}

.StatTrend {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.StatTrend--up {
  color: var(--ok);
}

.StatTrend--down {
  color: var(--danger);
}

.StatTrend--neutral {
  color: var(--muted);
}

.StatDescription {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--muted);
  line-height: var(--leading-normal);
}

/* Responsive */
@media (max-width: 920px) and (min-width: 768px) {
  .StatPanel--cols-3,
  .StatPanel--cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .StatPanel {
    gap: var(--space-2);
  }
  
  .StatPanel--grid {
    grid-template-columns: 1fr;
  }
  
  .StatItem {
    padding: var(--space-2);
  }
  
  .StatName {
    font-size: 11px;
  }
  
  .StatValue {
    font-size: 16px;
  }
  
  .StatUnit {
    font-size: 11px;
  }
  
  .StatTrend {
    font-size: 11px;
  }
  
  .StatDescription {
    font-size: 11px;
    line-height: 1.4;
  }
}
</style>
