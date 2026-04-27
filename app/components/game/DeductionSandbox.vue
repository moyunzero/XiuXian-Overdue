<script setup lang="ts">
import type { ActionId, GameState, CausalGraph, PersonalityProfile, HiddenModifiers, StateSnapshot, RiskIndicator } from '~/types/game'
import { predictSequence } from '~/logic/causalGraphEngine'

const props = defineProps<{
  currentState: GameState
  causalGraph: CausalGraph
  personalityProfile: PersonalityProfile
  hiddenModifiers: HiddenModifiers
}>()

const emit = defineEmits<{
  (e: 'commit', actions: ActionId[]): void
  (e: 'cancel'): void
}>()

const actionQueue = ref<ActionId[]>([])
const predictionResult = ref<ReturnType<typeof predictSequence> | null>(null)

const availableActions: { id: ActionId; label: string; description: string }[] = [
  { id: 'study', label: '上课/刷题', description: '提升道心，增加疲劳' },
  { id: 'tuna', label: '吐纳', description: '提升法力，轻微增加疲劳' },
  { id: 'train', label: '炼体', description: '提升肉体强度，高疲劳' },
  { id: 'parttime', label: '打工', description: '获得现金，高疲劳' },
  { id: 'buy', label: '购买补给', description: '恢复状态，花费现金' },
  { id: 'rest', label: '休息', description: '大幅恢复疲劳和专注' }
]

const isProcessing = ref(false)

watch(actionQueue, async () => {
  await computePrediction()
}, { deep: true })

async function computePrediction() {
  if (actionQueue.value.length === 0) {
    predictionResult.value = null
    return
  }

  isProcessing.value = true

  try {
    predictionResult.value = predictSequence(
      props.causalGraph,
      props.currentState,
      actionQueue.value,
      props.hiddenModifiers
    )
  } finally {
    isProcessing.value = false
  }
}

function addAction(actionId: ActionId) {
  actionQueue.value.push(actionId)
}

function removeAction(index: number) {
  actionQueue.value.splice(index, 1)
}

function clearActions() {
  actionQueue.value = []
}

function commitSequence() {
  if (actionQueue.value.length === 0) return
  emit('commit', [...actionQueue.value])
  actionQueue.value = []
  predictionResult.value = null
}

function cancel() {
  emit('cancel')
}

function getRiskLevelClass(level: string): string {
  switch (level) {
    case 'critical': return 'risk-critical'
    case 'high': return 'risk-high'
    case 'medium': return 'risk-medium'
    case 'low': return 'risk-low'
    default: return ''
  }
}

function getRiskTypeLabel(type: string): string {
  switch (type) {
    case 'debt_trajectory': return '债务走势'
    case 'fatigue_accumulation': return '疲劳累积'
    case 'focus_depletion': return '专注消耗'
    case 'body_integrity': return '身体状态'
    case 'cultivation_imbalance': return '修行失衡'
    default: return type
  }
}

function getRiskLevelLabel(level: string): string {
  switch (level) {
    case 'critical': return '危险'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return level
  }
}

function formatStatChange(current: number, predicted: number): string {
  const delta = predicted - current
  if (delta > 0) return `+${delta.toFixed(1)}`
  if (delta < 0) return delta.toFixed(1)
  return '0'
}

function getSlotLabel(index: number): string {
  const slot = ['清晨', '午后', '深夜'][index % 3]
  const day = Math.floor(index / 3) + 1
  return `第${day}天${slot}`
}
</script>

<template>
  <div class="deduction-sandbox">
    <div class="sandbox-header">
      <h3>推演沙盘</h3>
      <button class="btn-close" @click="cancel">×</button>
    </div>

    <div class="sandbox-content">
      <div class="action-panel">
        <h4>可用行动</h4>
        <div class="action-buttons">
          <button
            v-for="action in availableActions"
            :key="action.id"
            class="action-btn"
            @click="addAction(action.id)"
          >
            <span class="action-label">{{ action.label }}</span>
            <span class="action-desc">{{ action.description }}</span>
          </button>
        </div>
      </div>

      <div class="queue-panel">
        <h4>行动序列</h4>
        <div v-if="actionQueue.length === 0" class="empty-queue">
          点击上方行动按钮添加
        </div>
        <div v-else class="queue-list">
          <div
            v-for="(action, index) in actionQueue"
            :key="`${action}-${index}`"
            class="queue-item"
          >
            <span class="queue-index">{{ getSlotLabel(index) }}</span>
            <span class="queue-action">{{ availableActions.find(a => a.id === action)?.label }}</span>
            <button class="btn-remove" @click="removeAction(index)">×</button>
          </div>
        </div>
        <div class="queue-actions">
          <button class="btn-clear" @click="clearActions" :disabled="actionQueue.length === 0">
            清空
          </button>
        </div>
      </div>

      <div class="prediction-panel">
        <h4>预测结果</h4>
        <div v-if="isProcessing" class="loading">
          计算中...
        </div>
        <div v-else-if="!predictionResult" class="no-prediction">
          添加行动后查看预测
        </div>
        <div v-else class="prediction-results">
          <div class="state-changes">
            <h5>状态变化</h5>
            <div class="state-grid">
              <div class="state-item">
                <span class="state-label">道心</span>
                <span class="state-current">{{ currentState.stats.daoXin }}</span>
                <span class="state-arrow">→</span>
                <span class="state-predicted">{{ predictionResult.finalState.stats.daoXin }}</span>
                <span class="state-delta">
                  ({{ formatStatChange(currentState.stats.daoXin, predictionResult.finalState.stats.daoXin) }})
                </span>
              </div>
              <div class="state-item">
                <span class="state-label">法力</span>
                <span class="state-current">{{ currentState.stats.faLi.toFixed(1) }}</span>
                <span class="state-arrow">→</span>
                <span class="state-predicted">{{ predictionResult.finalState.stats.faLi.toFixed(1) }}</span>
                <span class="state-delta">
                  ({{ formatStatChange(currentState.stats.faLi, predictionResult.finalState.stats.faLi) }})
                </span>
              </div>
              <div class="state-item">
                <span class="state-label">肉体强度</span>
                <span class="state-current">{{ currentState.stats.rouTi.toFixed(1) }}</span>
                <span class="state-arrow">→</span>
                <span class="state-predicted">{{ predictionResult.finalState.stats.rouTi.toFixed(1) }}</span>
                <span class="state-delta">
                  ({{ formatStatChange(currentState.stats.rouTi, predictionResult.finalState.stats.rouTi) }})
                </span>
              </div>
              <div class="state-item">
                <span class="state-label">现金</span>
                <span class="state-current">{{ Math.floor(currentState.econ.cash) }}</span>
                <span class="state-arrow">→</span>
                <span class="state-predicted">{{ Math.floor(predictionResult.finalState.econ.cash) }}</span>
                <span class="state-delta">
                  ({{ formatStatChange(currentState.econ.cash, predictionResult.finalState.econ.cash) }})
                </span>
              </div>
              <div class="state-item">
                <span class="state-label">债务</span>
                <span class="state-current">{{ Math.floor(currentState.econ.debtPrincipal + currentState.econ.debtInterestAccrued) }}</span>
                <span class="state-arrow">→</span>
                <span class="state-predicted">
                  {{ Math.floor(predictionResult.finalState.econ.debtPrincipal + predictionResult.finalState.econ.debtInterestAccrued) }}
                </span>
                <span class="state-delta">
                  ({{ formatStatChange(
                    currentState.econ.debtPrincipal + currentState.econ.debtInterestAccrued,
                    predictionResult.finalState.econ.debtPrincipal + predictionResult.finalState.econ.debtInterestAccrued
                  ) }})
                </span>
              </div>
              <div class="state-item">
                <span class="state-label">疲劳</span>
                <span class="state-current" :class="{ 'stat-danger': currentState.stats.fatigue > 70 }">
                  {{ currentState.stats.fatigue }}
                </span>
                <span class="state-arrow">→</span>
                <span class="state-predicted" :class="{ 'stat-danger': predictionResult.finalState.fatigue > 70 }">
                  {{ predictionResult.finalState.fatigue }}
                </span>
                <span class="state-delta">
                  ({{ formatStatChange(currentState.stats.fatigue, predictionResult.finalState.fatigue) }})
                </span>
              </div>
            </div>
          </div>

          <div v-if="predictionResult.riskIndicators.length > 0" class="risk-indicators">
            <h5>风险提示</h5>
            <div class="risk-list">
              <div
                v-for="indicator in predictionResult.riskIndicators"
                :key="indicator.type"
                class="risk-item"
                :class="getRiskLevelClass(indicator.level)"
              >
                <span class="risk-type">{{ getRiskTypeLabel(indicator.type) }}</span>
                <span class="risk-level" :class="`level-${indicator.level}`">{{ getRiskLevelLabel(indicator.level) }}</span>
                <span class="risk-desc">{{ indicator.description }}</span>
              </div>
            </div>
          </div>

          <div v-if="predictionResult.potentialEvents.length > 0" class="potential-events">
            <h5>可能触发事件</h5>
            <div class="event-list">
              <span
                v-for="event in predictionResult.potentialEvents"
                :key="event"
                class="event-tag"
              >
                {{ event }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sandbox-footer">
      <button class="btn-cancel" @click="cancel">取消</button>
      <button
        class="btn-commit"
        @click="commitSequence"
        :disabled="actionQueue.length === 0"
      >
        执行序列 ({{ actionQueue.length }})
      </button>
    </div>
  </div>
</template>

<style scoped>
.deduction-sandbox {
  background: var(--bg-secondary, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  max-width: 900px;
}

.sandbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #333);
}

.sandbox-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary, #888);
}

.btn-close:hover {
  color: var(--text-primary, #fff);
}

.sandbox-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

.action-panel {
  grid-column: 1;
  grid-row: 1;
}

.queue-panel {
  grid-column: 2;
  grid-row: 1;
}

.prediction-panel {
  grid-column: 1 / -1;
  grid-row: 2;
}

h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary, #888);
  text-transform: uppercase;
}

h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--text-secondary, #888);
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btn {
  background: var(--bg-tertiary, #252540);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--bg-hover, #303050);
}

.action-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary, #fff);
  margin-bottom: 2px;
}

.action-desc {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, #888);
}

.empty-queue {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary, #888);
  background: var(--bg-tertiary, #252540);
  border-radius: 6px;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary, #252540);
  border-radius: 4px;
}

.queue-index {
  font-size: 11px;
  color: var(--text-secondary, #888);
  min-width: 70px;
}

.queue-action {
  flex: 1;
  font-weight: 500;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 16px;
}

.btn-remove:hover {
  color: var(--danger, #ff6b6b);
}

.queue-actions {
  margin-top: 12px;
}

.btn-clear {
  background: var(--bg-tertiary, #252540);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  padding: 6px 12px;
  color: var(--text-secondary, #888);
  cursor: pointer;
}

.btn-clear:hover:not(:disabled) {
  background: var(--bg-hover, #303050);
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .no-prediction {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary, #888);
}

.prediction-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state-changes {
  background: var(--bg-tertiary, #252540);
  border-radius: 6px;
  padding: 12px;
}

.state-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-item {
  display: grid;
  grid-template-columns: 80px 60px 30px 60px 60px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.state-label {
  color: var(--text-secondary, #888);
}

.state-current, .state-predicted {
  font-family: monospace;
}

.state-arrow {
  color: var(--text-secondary, #888);
  text-align: center;
}

.state-delta {
  font-family: monospace;
  color: var(--text-secondary, #888);
}

.state-delta:first-child {
  color: var(--success, #4ecdc4);
}

.state-delta[delta^="-"] {
  color: var(--danger, #ff6b6b);
}

.stat-danger {
  color: var(--danger, #ff6b6b);
}

.risk-indicators {
  background: var(--bg-tertiary, #252540);
  border-radius: 6px;
  padding: 12px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.risk-critical {
  background: rgba(255, 107, 107, 0.2);
  border-left: 3px solid var(--danger, #ff6b6b);
}

.risk-high {
  background: rgba(255, 165, 0, 0.2);
  border-left: 3px solid orange;
}

.risk-medium {
  background: rgba(255, 255, 0, 0.2);
  border-left: 3px solid yellow;
}

.risk-low {
  background: rgba(78, 205, 196, 0.2);
  border-left: 3px solid var(--success, #4ecdc4);
}

.risk-type {
  font-weight: 500;
  min-width: 120px;
}

.risk-level {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.risk-level.level-critical {
  background: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.risk-level.level-high {
  background: rgba(255, 165, 0, 0.3);
  color: orange;
}

.risk-level.level-medium {
  background: rgba(255, 255, 0, 0.3);
  color: yellow;
}

.risk-level.level-low {
  background: rgba(78, 205, 196, 0.3);
  color: #4ecdc4;
}

.risk-desc {
  flex: 1;
  color: var(--text-secondary, #888);
}

.potential-events {
  background: var(--bg-tertiary, #252540);
  border-radius: 6px;
  padding: 12px;
}

.event-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-tag {
  background: var(--bg-secondary, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
}

.sandbox-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-color, #333);
}

.btn-cancel, .btn-commit {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel {
  background: var(--bg-tertiary, #252540);
  border: 1px solid var(--border-color, #333);
  color: var(--text-secondary, #888);
}

.btn-cancel:hover {
  background: var(--bg-hover, #303050);
}

.btn-commit {
  background: var(--primary, #4ecdc4);
  border: none;
  color: var(--bg-primary, #0a0a0f);
}

.btn-commit:hover:not(:disabled) {
  background: var(--primary-hover, #3dbdb5);
}

.btn-commit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
