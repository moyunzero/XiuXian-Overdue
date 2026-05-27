<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Act1State, InterviewResult } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import { INTERVIEW_QUESTIONS } from '~/logic/act1/interviewQuestions'
import { formatProfileTags } from '~/logic/act1/profileTagLabels'
import { buildInstitutionalNotes } from '~/logic/act1/metaUnlockLabels'

const props = defineProps<{
  startConfig: StartConfig
  act1: Act1State
  priorMetaUnlocks?: string[]
}>()

const emit = defineEmits<{
  submit: [answers: Record<string, string>]
}>()

const step = ref(0)
const answers = ref<Record<string, string>>({ ...(props.act1.interview.answers ?? {}) })
const showRecycle = ref(false)

const current = computed(() => INTERVIEW_QUESTIONS[step.value])
const totalSteps = INTERVIEW_QUESTIONS.length
const progress = computed(() => Math.round(((step.value + 1) / totalSteps) * 100))

const resultLabels: Record<InterviewResult, string> = {
  reject: '硬拒（末位借读通道）',
  conditional: '附条件录取',
  special: '特招邀请（仍背债）'
}

const displayTags = computed(() => formatProfileTags(props.act1.profileTags, 12))
const institutionalNotes = computed(() => buildInstitutionalNotes(props.priorMetaUnlocks ?? []))

function select(value: string) {
  if (!current.value) return
  answers.value = { ...answers.value, [current.value.id]: value }
}

function next() {
  if (!current.value?.id || !answers.value[current.value.id]) return
  if (step.value < totalSteps - 1) {
    step.value += 1
    return
  }
  emit('submit', { ...answers.value })
}

function back() {
  if (step.value > 0) step.value -= 1
}

watch(
  () => props.act1.interview.completed && props.act1.interview.result === 'reject',
  (isReject) => {
    if (!isReject) return
    showRecycle.value = true
    setTimeout(() => {
      showRecycle.value = false
    }, 2200)
  }
)
</script>

<template>
  <div class="InterviewModule">
    <template v-if="!act1.interview.completed">
      <div v-if="institutionalNotes.length" class="InterviewModule__notes">
        <p v-for="(note, i) in institutionalNotes" :key="i" class="InterviewModule__note">{{ note }}</p>
      </div>

      <div class="InterviewModule__resume">
        <p class="InterviewModule__resume-title">电子简历 · {{ startConfig.playerName || '你' }}</p>
        <p class="InterviewModule__resume-meta">
          {{ startConfig.startingCity }} · {{ startConfig.background }} · {{ startConfig.talent }}
          <span v-if="startConfig.initialDebt > 0">
            · 已有征信 ¥{{ startConfig.initialDebt.toLocaleString() }}
          </span>
        </p>
      </div>

      <div class="InterviewModule__progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <div class="InterviewModule__progress-bar" :style="{ width: `${progress}%` }" />
        <span class="InterviewModule__progress-text">{{ step + 1 }} / {{ totalSteps }}</span>
      </div>

      <p v-if="current?.section === 'track'" class="InterviewModule__badge">追加问询（不对外公示）</p>

      <h3 v-if="current" class="InterviewModule__question">{{ current.prompt }}</h3>
      <p v-if="current?.hint" class="InterviewModule__hint">{{ current.hint }}</p>

      <div v-if="current" class="InterviewModule__options">
        <button
          v-for="opt in current.options"
          :key="opt.value"
          type="button"
          class="InterviewModule__option"
          :class="{ 'InterviewModule__option--selected': answers[current.id] === opt.value }"
          @click="select(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="InterviewModule__nav">
        <button type="button" class="Act1Action Act1Action--ghost" :disabled="step === 0" @click="back">上一步</button>
        <button
          type="button"
          class="Act1Action"
          :disabled="!current || !answers[current.id]"
          @click="next"
        >
          {{ step < totalSteps - 1 ? '下一题' : '提交并评分' }}
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="showRecycle" class="InterviewModule__recycle" aria-live="polite">
        <p>简历已拖入回收站。</p>
        <p class="InterviewModule__recycle-sub">系统评语：未达优秀样本阈值，已开通末位借读通道。</p>
      </div>
      <div v-else class="InterviewModule__result">
        <p class="Act1Copy Act1Copy--ok">
          登记已归档 · {{ resultLabels[act1.interview.result ?? 'conditional'] }}
        </p>
        <p class="Act1Copy Act1Copy--muted">综合评分 {{ act1.interview.score }} · 档案标签 {{ displayTags.length }} 项</p>
        <ul v-if="displayTags.length" class="Act1List">
          <li v-for="label in displayTags" :key="label">{{ label }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.InterviewModule__notes {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 210, 74, 0.35);
  border-radius: 6px;
  background: rgba(255, 210, 74, 0.06);
}
.InterviewModule__note {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--warning);
  line-height: 1.5;
}
.InterviewModule__note:last-child {
  margin-bottom: 0;
}
.InterviewModule__resume {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px dashed var(--border-default);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
}
.InterviewModule__resume-title {
  margin: 0 0 6px;
  font-family: var(--mono);
  color: var(--neon-cyan);
  font-size: var(--text-sm);
}
.InterviewModule__resume-meta {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.InterviewModule__progress {
  position: relative;
  height: 6px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}
.InterviewModule__progress-bar {
  height: 100%;
  background: var(--neon-cyan);
  border-radius: 3px;
  transition: width 0.2s ease;
}
.InterviewModule__progress-text {
  position: absolute;
  right: 0;
  top: 10px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--mono);
}
.InterviewModule__badge {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  color: var(--warning);
  font-family: var(--mono);
}
.InterviewModule__question {
  margin: 0 0 8px;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: 1.5;
}
.InterviewModule__hint {
  margin: 0 0 12px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.InterviewModule__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.InterviewModule__option {
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--text-sm);
  line-height: 1.45;
}
.InterviewModule__option:hover {
  border-color: var(--neon-cyan);
}
.InterviewModule__option--selected {
  border-color: rgba(0, 255, 255, 0.5);
  background: rgba(0, 255, 255, 0.08);
  color: var(--neon-cyan);
}
.InterviewModule__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.InterviewModule__recycle {
  padding: 24px;
  border: 1px solid var(--danger);
  border-radius: 8px;
  background: rgba(255, 59, 59, 0.08);
  animation: fadeRecycle 2s ease;
}
.InterviewModule__recycle-sub {
  margin: 8px 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
@keyframes fadeRecycle {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  15% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
