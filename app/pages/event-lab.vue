<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import Pill from '~/components/ui/Pill.vue'

const eventId = ref('my_new_event')
const title = ref('新事件标题')
const body = ref('这里写事件正文，可以多段换行。')
const type = ref('school')
const tone = ref<'info' | 'warn' | 'danger' | 'ok'>('info')
const weight = ref(3)
const cooldownDays = ref(2)
const maxTimes = ref(3)

const optionALabel = ref('选项 A')
const optionATone = ref<'normal' | 'primary' | 'danger'>('primary')
const optionAFocusDelta = ref(5)
const optionAFatigueDelta = ref(0)

const optionBLabel = ref('选项 B')
const optionBTone = ref<'normal' | 'primary' | 'danger'>('normal')
const optionBFocusDelta = ref(-5)
const optionBFatigueDelta = ref(0)

const jsonPreview = computed(() => {
  const event = {
    id: eventId.value.trim(),
    title: title.value.trim(),
    body: body.value,
    type: type.value.trim() || 'school',
    tone: tone.value,
    phase: 'afterAction',
    weight: weight.value,
    cooldownDays: cooldownDays.value,
    maxTimes: maxTimes.value,
    trigger: {
      minDay: 1
    },
    options: [
      {
        id: 'option_a',
        label: optionALabel.value.trim(),
        tone: optionATone.value,
        effects: [
          { kind: 'stat', target: 'focus', delta: optionAFocusDelta.value },
          { kind: 'stat', target: 'fatigue', delta: optionAFatigueDelta.value }
        ]
      },
      {
        id: 'option_b',
        label: optionBLabel.value.trim(),
        tone: optionBTone.value,
        effects: [
          { kind: 'stat', target: 'focus', delta: optionBFocusDelta.value },
          { kind: 'stat', target: 'fatigue', delta: optionBFatigueDelta.value }
        ]
      }
    ]
  }

  return JSON.stringify(event, null, 2)
})

function copyJson() {
  navigator.clipboard
    .writeText(jsonPreview.value)
    .catch(() => {
      // ignore
    })
}
</script>

<template>
  <div class="Container">
    <div class="Row" style="align-items: baseline">
      <h1 class="Title">事件实验室（Event Lab）</h1>
      <Pill>仅用来生成 JSON，不会直接改存档</Pill>
      <span class="Spacer" />
      <Pill size="sm">开发工具 / 玩家可选用</Pill>
    </div>

    <div class="Grid2" style="margin-top: 14px">
      <Card padding="md">
        <div class="Label">基础信息</div>
        <div class="Grid2" style="margin-top: 8px; gap: 10px">
          <div>
            <div class="Label">事件 ID（英文）</div>
            <input v-model="eventId" class="Field" />
          </div>
          <div>
            <div class="Label">类型 type</div>
            <input v-model="type" class="Field" placeholder="collection / teacher / job / school / ritual" />
          </div>
        </div>

        <div style="margin-top: 8px">
          <div class="Label">标题 title</div>
          <input v-model="title" class="Field" />
        </div>

        <div style="margin-top: 8px">
          <div class="Label">正文 body</div>
          <textarea v-model="body" class="Field" rows="5" />
        </div>

        <div class="Grid3" style="margin-top: 8px; gap: 10px">
          <div>
            <div class="Label">tone</div>
            <select v-model="tone" class="Field">
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="danger">danger</option>
              <option value="ok">ok</option>
            </select>
          </div>
          <div>
            <div class="Label">weight</div>
            <input v-model.number="weight" type="number" min="1" class="Field" />
          </div>
          <div>
            <div class="Label">cooldownDays / maxTimes</div>
            <div class="Row" style="gap: 6px">
              <input v-model.number="cooldownDays" type="number" min="0" class="Field" />
              <input v-model.number="maxTimes" type="number" min="0" class="Field" />
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div class="Label">选项与效果（示例：专注 / 疲劳）</div>

        <div class="Grid2" style="margin-top: 10px; gap: 12px">
          <div>
            <Pill size="sm">选项 A</Pill>
            <div class="Label" style="margin-top: 6px">label</div>
            <input v-model="optionALabel" class="Field" />
            <div class="Label" style="margin-top: 6px">tone</div>
            <select v-model="optionATone" class="Field">
              <option value="normal">normal</option>
              <option value="primary">primary</option>
              <option value="danger">danger</option>
            </select>
            <div class="Label" style="margin-top: 6px">focus / fatigue 变化</div>
            <div class="Row" style="gap: 6px">
              <input v-model.number="optionAFocusDelta" class="Field" type="number" />
              <input v-model.number="optionAFatigueDelta" class="Field" type="number" />
            </div>
          </div>

          <div>
            <Pill size="sm">选项 B</Pill>
            <div class="Label" style="margin-top: 6px">label</div>
            <input v-model="optionBLabel" class="Field" />
            <div class="Label" style="margin-top: 6px">tone</div>
            <select v-model="optionBTone" class="Field">
              <option value="normal">normal</option>
              <option value="primary">primary</option>
              <option value="danger">danger</option>
            </select>
            <div class="Label" style="margin-top: 6px">focus / fatigue 变化</div>
            <div class="Row" style="gap: 6px">
              <input v-model.number="optionBFocusDelta" class="Field" type="number" />
              <input v-model.number="optionBFatigueDelta" class="Field" type="number" />
            </div>
          </div>
        </div>
      </Card>
    </div>

    <Card padding="md" style="margin-top: 14px">
      <div class="Row" style="align-items: center">
        <Pill>生成的 JSON 片段</Pill>
        <span class="Spacer" />
        <Button variant="primary" size="sm" @click="copyJson">
          复制到剪贴板
        </Button>
      </div>
      <textarea
        class="Field"
        :value="jsonPreview"
        rows="18"
        readonly
        style="margin-top: 10px; font-family: var(--mono); font-size: 12px"
      />
      <div class="MonoSmall" style="margin-top: 8px">
        把这段 JSON 复制到 <code>data/events.json</code> 对应位置，再参考《事件创作指南》调整细节即可。
      </div>
    </Card>
  </div>
</template>

