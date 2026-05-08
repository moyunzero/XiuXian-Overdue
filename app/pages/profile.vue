<template>
  <div class="archive-wrapper">
    <!-- 背景网格效果 -->
    <div class="grid-bg" />
    
    <!-- 顶部状态栏 -->
    <header class="archive-topbar">
      <div class="topbar-inner">
        <div class="topbar-brand">
          <span class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          </span>
          <span class="brand-text">修仙信用社会 · 制度档案</span>
        </div>
        <button class="btn-back" @click="navigateTo('/game')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回游戏
        </button>
      </div>
    </header>

    <!-- 空状态 -->
    <EmptyState v-if="!hasHistory" />

    <!-- 主内容 -->
    <main v-else class="archive-main">
      <!-- 风险评分总览 -->
      <section class="section-risk">
        <div class="risk-card">
          <div class="risk-header">
            <span class="risk-label">综合风险评分</span>
            <span :class="['risk-badge', riskBadgeClass]">{{ riskLevelText }}</span>
          </div>
          <div class="risk-body">
            <div class="risk-score-circle" :style="circleStyle">
              <span class="score-number">{{ currentRiskScore }}</span>
              <span class="score-unit">/100</span>
            </div>
            <div class="risk-breakdown">
              <div v-for="dim in dimensions" :key="dim.key" class="dim-item">
                <div class="dim-header">
                  <span class="dim-name">{{ dim.name }}</span>
                  <span :class="['dim-value', dim.valueClass]">{{ dim.value }}</span>
                </div>
                <div class="dim-bar">
                  <div :class="['dim-fill', dim.fillClass]" :style="{ width: dim.percent + '%' }" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 身份摘要 -->
      <section class="section-identity">
        <div class="identity-card">
          <div class="identity-header">
            <h2>身份摘要</h2>
            <span class="archive-id">档案编号：{{ archiveId }}</span>
          </div>
          <div class="identity-grid">
            <div class="id-item">
              <span class="id-label">姓名</span>
              <span class="id-value">{{ playerName }}</span>
            </div>
            <div class="id-item">
              <span class="id-label">班级</span>
              <span class="id-value">{{ classTier }}</span>
            </div>
            <div class="id-item">
              <span class="id-label">建档日期</span>
              <span class="id-value">{{ createdDate }}</span>
            </div>
            <div class="id-item">
              <span class="id-label">档案版本</span>
              <span class="id-value">v{{ profileVersion }}</span>
            </div>
          </div>
          <div class="system-note">
            <div class="note-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p class="note-text">{{ currentSystemNote }}</p>
          </div>
        </div>
      </section>

      <!-- 标签时间线 -->
      <section class="section-timeline">
        <div class="timeline-card">
          <div class="timeline-header">
            <h2>标签时间线</h2>
            <button class="btn-toggle" @click="timelineExpanded = !timelineExpanded">
              {{ timelineExpanded ? '收起' : '展开' }}
            </button>
          </div>
          <div class="timeline-body">
            <div v-for="(entry, idx) in displayHistory" :key="idx" class="tl-entry">
              <div class="tl-dot" />
              <div class="tl-content">
                <div class="tl-meta">
                  <span class="tl-date">{{ formatDate(entry.timestamp) }}</span>
                  <span class="tl-trigger">{{ entry.trigger }}</span>
                </div>
                <div class="tl-tags">
                  <span
                    v-for="tag in getTagsArray(entry)"
                    :key="tag"
                    :class="['tl-tag', getTagColorClass(tag)]"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div v-if="entry.digest.recentChanges?.length" class="tl-changes">
                  <span v-for="(c, i) in entry.digest.recentChanges" :key="i" class="change-text">
                    {{ c }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 评估历史 -->
      <section class="section-history">
        <div class="history-card">
          <h2>系统评估记录</h2>
          <div class="history-table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>触发原因</th>
                  <th>风险分</th>
                  <th>主要维度</th>
                  <th>系统备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(e, i) in reversedHistory" :key="i" class="history-row">
                  <td class="cell-date">{{ formatDate(e.timestamp) }}</td>
                  <td class="cell-trigger">{{ e.trigger }}</td>
                  <td>
                    <span :class="['cell-score', getScoreColorClass(e.riskScore)]">
                      {{ e.riskScore }}
                    </span>
                  </td>
                  <td class="cell-primary">{{ e.digest.primaryLabel }}</td>
                  <td class="cell-note">{{ e.systemNote }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame } from '~/composables/useGame'
import { calculateRiskScore, generateSystemNote } from '~/logic/gameEngine'
import type { ProfileHistoryEntry } from '~/types/game'
import EmptyState from '~/components/profile/EmptyState.vue'

const { game } = useGame()
const timelineExpanded = ref(false)

const profileHistory = computed(() => game.value.profileHistory ?? [])
const hasHistory = computed(() => profileHistory.value.length > 0)

const currentProfile = computed(() => game.value.profileSnapshot?.profile ?? null)
const currentRiskScore = computed(() => currentProfile.value ? calculateRiskScore(currentProfile.value) : 0)
const currentSystemNote = computed(() => currentProfile.value ? generateSystemNote(currentProfile.value) : '档案建立中...')

const archiveId = computed(() => {
  const seed = game.value.seed ?? 0
  return `XC-${seed.toString(36).toUpperCase().slice(0, 6)}`
})

const playerName = computed(() => game.value.startConfig?.playerName ?? '—')
const classTier = computed(() => game.value.school.classTier ?? '—')
const profileVersion = computed(() => game.value.profileSnapshot?.profileVersion ?? 0)

const createdDate = computed(() => {
  const first = profileHistory.value[0]
  return first ? new Date(first.timestamp).toLocaleDateString('zh-CN') : '—'
})

const riskLevelText = computed(() => {
  const s = currentRiskScore.value
  if (s < 30) return '低风险'
  if (s < 60) return '中风险'
  if (s < 80) return '高风险'
  return '极高风险'
})

const riskBadgeClass = computed(() => {
  const s = currentRiskScore.value
  if (s < 30) return 'badge-low'
  if (s < 60) return 'badge-medium'
  if (s < 80) return 'badge-high'
  return 'badge-extreme'
})

const circumference = 2 * Math.PI * 40
const dashOffset = computed(() => circumference * (1 - currentRiskScore.value / 100))

const circleStyle = computed(() => ({
  background: `conic-gradient(${riskColor} ${currentRiskScore.value * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
}))

const riskColor = computed(() => {
  const s = currentRiskScore.value
  if (s < 30) return '#44FF9A'
  if (s < 60) return '#FFD24A'
  if (s < 80) return '#FF8C42'
  return '#FF3B3B'
})

const dimensions = computed(() => {
  if (!currentProfile.value) return []
  const p = currentProfile.value
  const labels: Record<string, Record<string, string>> = {
    financialRisk: { low: '低风险', medium: '中风险', high: '高风险', extreme: '极高风险' },
    educationCredit: { preferred: '优选', investable: '可投资', unstable: '不稳定', discarded: '已放弃' },
    bodyAsset: { intact: '完整', marked: '已标记', mortgaged: '已抵押', depleted: '枯竭' },
    compliance: { resistant: '抵抗', softened: '软化', obedient: '顺从', domesticated: '驯化' }
  }
  const names: Record<string, string> = {
    financialRisk: '财务风险',
    educationCredit: '教育信用',
    bodyAsset: '身体资产',
    compliance: '制度顺从'
  }
  const valueClasses: Record<string, string> = {
    financialRisk: 'val-danger',
    educationCredit: 'val-info',
    bodyAsset: 'val-purple',
    compliance: 'val-success'
  }
  const fillClasses: Record<string, string> = {
    financialRisk: 'fill-danger',
    educationCredit: 'fill-info',
    bodyAsset: 'fill-purple',
    compliance: 'fill-success'
  }
  const percents: Record<string, number> = {
    low: 20, medium: 50, high: 75, extreme: 95,
    preferred: 15, investable: 40, unstable: 65, discarded: 90,
    intact: 10, marked: 35, mortgaged: 65, depleted: 95,
    resistant: 70, softened: 50, obedient: 30, domesticated: 85
  }

  return [
    { key: 'financialRisk', name: names.financialRisk, value: labels.financialRisk[p.financialRisk], valueClass: valueClasses.financialRisk, fillClass: fillClasses.financialRisk, percent: percents[p.financialRisk] },
    { key: 'educationCredit', name: names.educationCredit, value: labels.educationCredit[p.educationCredit], valueClass: valueClasses.educationCredit, fillClass: fillClasses.educationCredit, percent: percents[p.educationCredit] },
    { key: 'bodyAsset', name: names.bodyAsset, value: labels.bodyAsset[p.bodyAsset], valueClass: valueClasses.bodyAsset, fillClass: fillClasses.bodyAsset, percent: percents[p.bodyAsset] },
    { key: 'compliance', name: names.compliance, value: labels.compliance[p.compliance], valueClass: valueClasses.compliance, fillClass: fillClasses.compliance, percent: percents[p.compliance] },
  ]
})

const displayHistory = computed(() => {
  const list = [...profileHistory.value].reverse()
  return timelineExpanded.value ? list : list.slice(0, 5)
})

const reversedHistory = computed(() => [...profileHistory.value].reverse())

const formatDate = (ts: number) => new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

const getTagsArray = (entry: ProfileHistoryEntry) => {
  const s = entry.digest.tagsSummary
  if (!s || s === '暂无显著标签') return []
  return s.split('、')
}

const getTagColorClass = (tag: string) => {
  if (['高风险修士', '低偿付能力', '催收优先级上升'].some(t => tag.includes(t))) return 'tag-red'
  if (['可投资优等生', '偏科执行体', '末位淘汰预备对象'].some(t => tag.includes(t))) return 'tag-blue'
  if (['高服从度人才', '可规训对象', '低反抗样本', '已进入稳定驯化区'].some(t => tag.includes(t))) return 'tag-green'
  if (['可抵押体质', '已标记资产', '身体估值下降', '深度拆解候选'].some(t => tag.includes(t))) return 'tag-purple'
  return 'tag-gray'
}

const getScoreColorClass = (score: number) => {
  if (score < 30) return 'score-low'
  if (score < 60) return 'score-medium'
  if (score < 80) return 'score-high'
  return 'score-extreme'
}
</script>

<style scoped>
/* ====== 基础布局 ====== */
.archive-wrapper {
  min-height: 100vh;
  background: #05060A;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
}

.grid-bg {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

/* ====== 顶部状态栏 ====== */
.archive-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(5, 6, 10, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  width: 100%;
  display: flex;
  justify-content: center;
}

.topbar-inner {
  width: 100%;
  max-width: 1200px;
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.brand-icon {
  width: 28px;
  height: 28px;
  color: #00FFFF;
  filter: drop-shadow(0 0 6px rgba(0,255,255,0.5));
}

.brand-icon svg {
  width: 100%;
  height: 100%;
}

.brand-text {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: #E8ECF6;
  letter-spacing: 0.02em;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: transparent;
  border: 1px solid rgba(0,255,255,0.3);
  color: #00FFFF;
  padding: 0.375rem 0.875rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-family: "IBM Plex Mono", monospace;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back svg {
  width: 16px;
  height: 16px;
}

.btn-back:hover {
  background: rgba(0,255,255,0.1);
  border-color: #00FFFF;
}

/* ====== 主内容区 ====== */
.archive-main {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  padding: 2rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.archive-main > section {
  width: 100%;
}

/* ====== 通用卡片 ====== */
section {
  width: 100%;
}

.risk-card,
.identity-card,
.timeline-card,
.history-card {
  background: rgba(18, 18, 18, 0.6);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  overflow: hidden;
}

/* ====== 风险评分卡片 ====== */
.risk-card {
  padding: 1.5rem;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.risk-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9AA6C6;
  font-family: "IBM Plex Mono", monospace;
}

.risk-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 3px;
  font-family: "IBM Plex Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-low { background: rgba(68,255,154,0.12); color: #44FF9A; }
.badge-medium { background: rgba(255,210,74,0.12); color: #FFD24A; }
.badge-high { background: rgba(255,140,66,0.12); color: #FF8C42; }
.badge-extreme { background: rgba(255,59,59,0.12); color: #FF3B3B; }

.risk-body {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.risk-score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.risk-score-circle::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #0A0E18;
}

.score-number {
  position: relative;
  z-index: 1;
  font-size: 2rem;
  font-weight: 700;
  color: #E8ECF6;
  font-family: "IBM Plex Mono", monospace;
  line-height: 1;
}

.score-unit {
  position: relative;
  z-index: 1;
  font-size: 0.75rem;
  color: #6B7280;
  font-family: "IBM Plex Mono", monospace;
}

.risk-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.dim-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dim-name {
  font-size: 0.8125rem;
  color: #9AA6C6;
}

.dim-value {
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: "IBM Plex Mono", monospace;
}

.val-danger { color: #FF3B3B; }
.val-info { color: #00FFFF; }
.val-purple { color: #A855F7; }
.val-success { color: #44FF9A; }

.dim-bar {
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}

.dim-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.fill-danger { background: linear-gradient(90deg, #FF3B3B, #FF6B6B); }
.fill-info { background: linear-gradient(90deg, #0080FF, #00FFFF); }
.fill-purple { background: linear-gradient(90deg, #7C3AED, #A855F7); }
.fill-success { background: linear-gradient(90deg, #22C55E, #44FF9A); }

/* ====== 身份摘要卡片 ====== */
.identity-card {
  padding: 1.5rem;
}

.identity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.identity-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #E8ECF6;
  margin: 0;
  font-family: "IBM Plex Mono", monospace;
}

.archive-id {
  font-size: 0.75rem;
  color: #6B7280;
  font-family: "IBM Plex Mono", monospace;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.id-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 4px;
}

.id-label {
  font-size: 0.6875rem;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.id-value {
  font-size: 0.9375rem;
  color: #E8ECF6;
  font-weight: 500;
}

.system-note {
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem;
  background: rgba(0,255,255,0.03);
  border: 1px solid rgba(0,255,255,0.1);
  border-radius: 4px;
  align-items: flex-start;
}

.note-icon {
  width: 18px;
  height: 18px;
  color: #00FFFF;
  flex-shrink: 0;
  margin-top: 1px;
}

.note-icon svg {
  width: 100%;
  height: 100%;
}

.note-text {
  margin: 0;
  font-size: 0.8125rem;
  color: #9AA6C6;
  line-height: 1.6;
  font-style: italic;
}

/* ====== 标签时间线 ====== */
.timeline-card {
  padding: 1.5rem;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.timeline-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #E8ECF6;
  margin: 0;
  font-family: "IBM Plex Mono", monospace;
}

.btn-toggle {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #9AA6C6;
  padding: 0.25rem 0.625rem;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle:hover {
  border-color: rgba(255,255,255,0.2);
  color: #E8ECF6;
}

.timeline-body {
  position: relative;
  padding-left: 1.25rem;
}

.timeline-body::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: rgba(255,255,255,0.08);
}

.tl-entry {
  position: relative;
  padding-bottom: 1.25rem;
}

.tl-entry:last-child {
  padding-bottom: 0;
}

.tl-dot {
  position: absolute;
  left: -1.25rem;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00FFFF;
  border: 2px solid #0A0E18;
  box-shadow: 0 0 6px rgba(0,255,255,0.4);
}

.tl-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.6875rem;
  font-family: "IBM Plex Mono", monospace;
}

.tl-date { color: #6B7280; }
.tl-trigger { color: #9AA6C6; background: rgba(255,255,255,0.04); padding: 0.125rem 0.375rem; border-radius: 2px; }

.tl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.tl-tag {
  font-size: 0.6875rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 2px;
  font-weight: 500;
}

.tag-red { background: rgba(255,59,59,0.12); color: #FF6B6B; }
.tag-blue { background: rgba(0,128,255,0.12); color: #60A5FA; }
.tag-green { background: rgba(68,255,154,0.12); color: #4ADE80; }
.tag-purple { background: rgba(168,85,247,0.12); color: #C084FC; }
.tag-gray { background: rgba(255,255,255,0.06); color: #9CA3AF; }

.tl-changes {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.change-text {
  font-size: 0.6875rem;
  color: #6B7280;
}

/* ====== 评估历史表格 ====== */
.history-card {
  padding: 1.5rem;
}

.history-card h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #E8ECF6;
  margin: 0 0 1.25rem;
  font-family: "IBM Plex Mono", monospace;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.history-table thead {
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.history-table th {
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-weight: 500;
  color: #6B7280;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.history-table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #9AA6C6;
}

.cell-date { font-family: "IBM Plex Mono", monospace; color: #6B7280; white-space: nowrap; }
.cell-trigger { color: #9AA6C6; }

.cell-score {
  font-weight: 600;
  font-family: "IBM Plex Mono", monospace;
}

.score-low { color: #44FF9A; }
.score-medium { color: #FFD24A; }
.score-high { color: #FF8C42; }
.score-extreme { color: #FF3B3B; }

.cell-primary { color: #E8ECF6; white-space: nowrap; }
.cell-note { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: #6B7280; }

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .archive-main {
    padding: 1.25rem 1rem 3rem;
  }

  .risk-body {
    flex-direction: column;
    gap: 1.25rem;
  }

  .risk-score-circle {
    width: 100px;
    height: 100px;
  }

  .score-number {
    font-size: 1.5rem;
  }

  .identity-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .topbar-inner {
    padding: 0.625rem 1rem;
  }

  .brand-text {
    font-size: 0.8125rem;
  }

  .history-table {
    font-size: 0.75rem;
  }

  .history-table th,
  .history-table td {
    padding: 0.5rem;
  }

  .cell-note {
    max-width: 150px;
  }
}

@media (max-width: 480px) {
  .identity-grid {
    grid-template-columns: 1fr;
  }

  .brand-text {
    display: none;
  }
}
</style>
