<script setup lang="ts">
import type { Background, StartConfig, Talent } from '~/types/game'
import type { PlayRunState } from '~/types/play'
import { computed, onMounted, ref } from 'vue'
import { navigateTo } from '#app'
import { useAct1Storage } from '~/composables/useAct1Storage'
import { usePlayStorage } from '~/composables/usePlayStorage'
import { emptyV4Save, LEGACY_SAVE_KEY } from '~/composables/usePlayStorage.helpers'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { formatMetaUnlocksLine } from '~/logic/act1/metaUnlockLabels'
import { mergePriorMetaForNewRun } from '~/logic/play/playMeta'
import { lifeStageLabel } from '~/logic/play/chapterFlow'
import Act1ArchivePanel from '~/components/home/Act1ArchivePanel.vue'
import HeroSection from '~/components/home/HeroSection.vue'
import IdentitySelector from '~/components/home/IdentitySelector.vue'
import QuickStartButton from '~/components/home/QuickStartButton.vue'
import ParticleBackground from '~/components/home/ParticleBackground.vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'

const selectedNewGameSlot = ref<'slot1' | 'slot2' | 'slot3'>('slot1')
const playerName = ref('龙傲天')
const background = ref<Background>('贫民')
const talent = ref<Talent>('无灵根')
const startingCity = ref('xx市')
const initialDebt = ref(20_000)
const showAdvanced = ref(false)

const act1StartConfig = useState<StartConfig | null>('act1StartConfig', () => null)
const act1SlotId = useState<'slot1' | 'slot2' | 'slot3'>('act1SlotId', () => 'slot1')
const act1PriorMetaUnlocks = useState<string[]>('act1PriorMetaUnlocks', () => [])
const playHsCarryover = useState<ReturnType<typeof carryoverFromPersist> | null>('playHsCarryover', () => null)
const playRunMode = useState<'chapter' | 'endless'>('playRunMode', () => 'chapter')
const aiEventsEnabled = ref(true)

const globalMetaLine = computed(() => {
  const ids = playStorage.getPlayMeta().priorMetaUnlocks
  return ids.length ? formatMetaUnlocksLine(ids, 5) : ''
})

const hasActiveRun = computed(() => !!activePlayRun.value)
const hasAct1InProgress = computed(() => !activePlayRun.value && !!savedAct1Slot.value)
const showNewGameSetup = computed(() => !hasActiveRun.value)

const continuePlayLabel = computed(() => {
  if (activePlayRun.value) return `继续修行 · ${activePlayRunLabel.value}`
  if (savedAct1Slot.value) return `继续修行 · 入学前夜（${slotLabel(savedAct1Slot.value)}）`
  return '继续修行'
})

const activePlayRunLabel = computed(() => {
  const r = activePlayRun.value
  if (!r) return ''
  return `${lifeStageLabel(r.lifeStage)} · ${r.start.playerName}`
})

function buildStartConfig(): StartConfig {
  return {
    playerName: playerName.value.trim() || '无名氏',
    background: background.value,
    talent: talent.value,
    initialDebt: initialDebt.value,
    startingCity: startingCity.value.trim() || '嵩阳市'
  }
}

const act1Storage = useAct1Storage()
const playStorage = usePlayStorage()
const activePlayRun = ref<PlayRunState | null>(null)
const savedAct1Slot = ref<'slot1' | 'slot2' | 'slot3' | null>(null)

const settledAct1ForSlot = computed(() => {
  const saved = act1Storage.loadAct1(selectedNewGameSlot.value)
  return saved?.settled ? saved : null
})

const slotLabel = (id: string) => (id === 'slot1' ? '存档槽 1' : id === 'slot2' ? '存档槽 2' : '存档槽 3')

onMounted(() => {
  activePlayRun.value = playStorage.getActiveRun()
  if (activePlayRun.value) {
    selectedNewGameSlot.value = activePlayRun.value.slotId
    playerName.value = activePlayRun.value.start.playerName
    background.value = activePlayRun.value.start.background
    talent.value = activePlayRun.value.start.talent
    startingCity.value = activePlayRun.value.start.startingCity
    initialDebt.value = activePlayRun.value.start.initialDebt
  }
  aiEventsEnabled.value = playStorage.getPlayMeta().aiEventsEnabled
  for (const slot of ['slot1', 'slot2', 'slot3'] as const) {
    const saved = act1Storage.loadAct1(slot)
    if (saved && !saved.settled) {
      savedAct1Slot.value = slot
      break
    }
  }
})

async function onStartJourney() {
  if (activePlayRun.value) {
    const ok = window.confirm(
      `将用当前自定义项在「${slotLabel(selectedNewGameSlot.value)}」开新局，并覆盖进行中的「${activePlayRunLabel.value}」进度。确定？`
    )
    if (!ok) return
  }

  const cfg = buildStartConfig()
  act1StartConfig.value = cfg
  act1SlotId.value = selectedNewGameSlot.value
  playRunMode.value = 'chapter'

  const prev = act1Storage.loadAct1(selectedNewGameSlot.value)
  const fromSlot = prev?.settled ? (prev.metaUnlocks ?? []) : []
  act1PriorMetaUnlocks.value = mergePriorMetaForNewRun(playStorage.getPlayMeta(), fromSlot)

  const run = createPlayRunFromStartConfig(cfg, selectedNewGameSlot.value, {
    runMode: 'chapter'
  })
  playStorage.setActiveRun(run)
  await navigateTo('/play')
}

async function onContinuePlay() {
  if (activePlayRun.value) {
    await onContinuePlayRun()
    return
  }
  if (savedAct1Slot.value) {
    await onContinueAct1()
  }
}

async function onContinueAct1() {
  if (!savedAct1Slot.value) return
  const saved = act1Storage.loadAct1(savedAct1Slot.value)
  if (!saved) return
  act1StartConfig.value = saved.startConfig
  act1SlotId.value = savedAct1Slot.value
  const run = playStorage.ensureRunForSlot(savedAct1Slot.value)
  if (run) {
    playRunMode.value = run.runMode
    playStorage.setActiveRun(run)
  }
  await navigateTo('/play')
}

async function onContinuePlayRun() {
  const run = playStorage.getActiveRun()
  if (!run) return
  act1StartConfig.value = run.start
  act1SlotId.value = run.slotId
  playRunMode.value = run.runMode
  if (run.lifeStage === 'hs') {
    playHsCarryover.value = run.carryoverFromAct1 ?? null
  }
  await navigateTo('/play')
}

function onClearSaves() {
  const ok = window.confirm(
    '将清除本机全部修行存档（入学前夜、战役进度、v4 多周目与旧版槽位）。该操作不可逆。'
  )
  if (!ok) return
  playStorage.writeContainer(emptyV4Save())
  for (const slot of ['slot1', 'slot2', 'slot3'] as const) {
    act1Storage.clearAct1(slot)
  }
  if (import.meta.client) {
    try {
      localStorage.removeItem(LEGACY_SAVE_KEY)
    } catch {
      /* ignore */
    }
  }
  activePlayRun.value = null
  savedAct1Slot.value = null
  aiEventsEnabled.value = true
}
</script>

<template>
  <div class="IndexPage">
    <ClientOnly>
      <ParticleBackground />
    </ClientOnly>
    <div class="Container">
      <HeroSection />

      <IdentitySelector
        v-if="showNewGameSetup"
        v-model="background"
        class="IndexPage__identity"
      />

      <div class="IndexPage__start">
        <template v-if="hasActiveRun">
          <Card class="IndexPage__continueCard" padding="md">
            <p class="IndexPage__continue-kicker">进行中的战役</p>
            <p class="IndexPage__continue-title">{{ activePlayRunLabel }}</p>
            <p v-if="globalMetaLine" class="IndexPage__continue-meta">{{ globalMetaLine }}</p>
          </Card>
          <QuickStartButton
            :text="continuePlayLabel"
            @click="onContinuePlay"
          />
          <button
            type="button"
            class="IndexPage__glassBtn"
            @click="showAdvanced = true"
          >
            开新局（覆盖当前进度）
          </button>
        </template>

        <template v-else>
          <Act1ArchivePanel
            v-if="settledAct1ForSlot"
            :persist="settledAct1ForSlot"
            :slot-label="slotLabel(selectedNewGameSlot)"
          />

          <Card v-if="globalMetaLine" class="IndexPage__meta" padding="md">
            <p class="IndexPage__mode-label">跨周目制度备注</p>
            <p class="IndexPage__meta-line">{{ globalMetaLine }}</p>
          </Card>

          <QuickStartButton
            v-if="hasAct1InProgress"
            :text="continuePlayLabel"
            @click="onContinuePlay"
          />

          <QuickStartButton
            :disabled="!selectedNewGameSlot"
            :text="hasAct1InProgress ? '开新局' : '签署契约并开始'"
            :subtitle="hasAct1InProgress ? '' : '入学前夜 → 高中 → 预科 → 职场 → 无尽境'"
            @click="onStartJourney"
          />
        </template>

        <button
          v-if="showNewGameSetup || hasActiveRun"
          class="IndexPage__advanced-toggle"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '收起' : '高级设置' }}
          <svg
            class="IndexPage__chevron"
            :class="{ 'IndexPage__chevron--up': showAdvanced }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <Transition name="slide">
        <Card v-if="showAdvanced" class="IndexPage__advanced" padding="md">
          <div class="IndexPage__advanced-grid">
            <div class="IndexPage__field">
              <label class="Label">角色名</label>
              <input v-model="playerName" class="Field" placeholder="输入名字" />
            </div>
            <div class="IndexPage__field">
              <label class="Label">城市</label>
              <input v-model="startingCity" class="Field" placeholder="例如：嵩阳市" />
            </div>
            <div class="IndexPage__field">
              <label class="Label">天赋</label>
              <select v-model="talent" class="Field">
                <option value="无灵根">无灵根</option>
                <option value="伪灵根">伪灵根</option>
                <option value="天灵根">天灵根</option>
              </select>
            </div>
            <div class="IndexPage__field">
              <label class="Label">新局写入槽</label>
              <select v-model="selectedNewGameSlot" class="Field">
                <option value="slot1">存档槽 1</option>
                <option value="slot2">存档槽 2</option>
                <option value="slot3">存档槽 3</option>
              </select>
            </div>
          </div>

          <div class="IndexPage__debt">
            <div class="Row">
              <span class="Label">初始债务：¥{{ initialDebt.toLocaleString() }}</span>
              <Pill variant="warning" size="sm">越高越刺激</Pill>
            </div>
            <input
              v-model.number="initialDebt"
              class="DebtSlider"
              type="range"
              min="5000"
              max="200000"
              step="1000"
              :style="{ '--pct': ((initialDebt - 5000) / (200000 - 5000) * 100) + '%' }"
            />
            <div class="Row" style="gap: 8px; flex-wrap: wrap">
              <Button size="sm" @click="initialDebt = 5000">5千</Button>
              <Button size="sm" @click="initialDebt = 20000">2万</Button>
              <Button size="sm" @click="initialDebt = 70000">7万</Button>
              <Button size="sm" @click="initialDebt = 150000">15万</Button>
            </div>
            <p class="ProfileHint">
              身份、天赋、出身与债务将共同决定系统对您的初始画像评估。
            </p>
          </div>

          <label class="IndexPage__ai-toggle">
            <input
              v-model="aiEventsEnabled"
              type="checkbox"
              @change="playStorage.updatePlayMeta({ aiEventsEnabled: aiEventsEnabled })"
            />
            启用 AI 瞬间文案（关闭则不插入瞬间；开启时无 API Key 仍用本地模板）
          </label>

          <Button
            v-if="hasActiveRun"
            variant="secondary"
            size="md"
            full-width
            class="IndexPage__confirmNewRun"
            @click="onStartJourney"
          >
            确认开新局
          </Button>
        </Card>
      </Transition>

      <div class="IndexPage__footer">
        <Button variant="ghost" size="sm" @click="onClearSaves">
          清空存档
        </Button>
        <span class="IndexPage__tech">Nuxt · 本地存档</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.IndexPage {
  width: 100%;
  min-height: 100vh;
}

.IndexPage__identity {
  margin-top: 24px;
}

.IndexPage__start {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.IndexPage__continueCard {
  width: 100%;
  max-width: 420px;
  text-align: left;
}
.IndexPage__continue-kicker {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  color: var(--neon-cyan);
}
.IndexPage__continue-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}
.IndexPage__continue-meta {
  margin: 10px 0 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}
.IndexPage__devLink {
  width: 100%;
  max-width: 320px;
  text-align: center;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 220, 255, 0.85);
  text-decoration: none;
  padding: 8px 12px;
  border: 1px dashed rgba(120, 200, 255, 0.35);
  border-radius: 8px;
  box-sizing: border-box;
}
.IndexPage__devLink:hover {
  color: var(--neon-cyan);
  border-color: rgba(120, 200, 255, 0.55);
}

.IndexPage__mode {
  width: 100%;
  max-width: 420px;
}

.IndexPage__mode-label {
  margin: 0 0 12px;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--neon-cyan);
  font-family: var(--mono);
}

.IndexPage__meta-line {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--text-secondary);
}

.IndexPage__confirmNewRun {
  margin-top: 16px;
}

.IndexPage__ai-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
  cursor: pointer;
}

.IndexPage__advanced-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: color 0.2s ease;
}

.IndexPage__advanced-toggle:hover {
  color: var(--text-secondary);
}

.IndexPage__chevron {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.IndexPage__chevron--up {
  transform: rotate(180deg);
}

.IndexPage__advanced {
  margin-top: 16px;
}

.IndexPage__advanced-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.IndexPage__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.IndexPage__debt {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.IndexPage__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.IndexPage__tech {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  border-top-width: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Debt Slider */
.DebtSlider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  margin: 14px 0;
  cursor: pointer;
  outline: none;
  border: none;
  background: linear-gradient(
    to right,
    var(--neon-cyan) 0%,
    var(--neon-cyan) var(--pct, 10%),
    rgba(255, 255, 255, 0.12) var(--pct, 10%),
    rgba(255, 255, 255, 0.12) 100%
  );
}

.DebtSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--neon-cyan);
  border: 2px solid #fff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.DebtSlider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.7);
}

.DebtSlider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--neon-cyan);
  border: 2px solid #fff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  cursor: pointer;
}

.DebtSlider::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.DebtSlider::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: var(--neon-cyan);
}

.ProfileHint {
  margin-top: 10px;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .IndexPage__advanced-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .IndexPage {
    padding: 0 16px 32px;
  }

  .IndexPage__advanced-grid {
    grid-template-columns: 1fr;
  }

  .IndexPage__footer {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
