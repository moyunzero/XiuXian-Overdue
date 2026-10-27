<script setup lang="ts">
import type { Background, StartConfig, Talent } from '~/types/game'
import type { MetaProgress, PlayRunState, SaveSlotId } from '~/types/play'
import { computed, onMounted, ref } from 'vue'
import { navigateTo } from '#app'
import { useAct1Storage } from '~/composables/useAct1Storage'
import { useMetaStorage } from '~/composables/useMetaStorage'
import { usePlayStorage } from '~/composables/usePlayStorage'
import { emptyV4Save, LEGACY_SAVE_KEY } from '~/composables/usePlayStorage.helpers'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { formatMetaUnlocksLine } from '~/logic/act1/metaUnlockLabels'
import { formatMetaProgressLine } from '~/logic/play/metaProgressCopy'
import { mergePriorMetaForNewRun } from '~/logic/play/playMeta'
import {
  formatContinuePlayLabel,
  META_NEW_HUMAN_OTHER_SLOT_HINT
} from '~/logic/play/playerFacingCopy'
import { START_BUNDLE_REGISTRY } from '~/logic/play/startBundleRegistry'
import { lifeStageLabel } from '~/logic/play/chapterFlow'
import Act1ArchivePanel from '~/components/home/Act1ArchivePanel.vue'
import AccountProfileZone from '~/components/home/AccountProfileZone.vue'
import FateCodexStrip from '~/components/home/FateCodexStrip.vue'
import HeroSection from '~/components/home/HeroSection.vue'
import IdentitySelector from '~/components/home/IdentitySelector.vue'
import PlaySlotSummaryCard from '~/components/home/PlaySlotSummaryCard.vue'
import QuickStartButton from '~/components/home/QuickStartButton.vue'
import StartBundlePicker from '~/components/home/StartBundlePicker.vue'
import ParticleBackground from '~/components/home/ParticleBackground.vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'

const SLOT_IDS: SaveSlotId[] = ['slot1', 'slot2', 'slot3']

const selectedNewGameSlot = ref<SaveSlotId>('slot1')
const selectedBundleId = ref('standard')
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

const act1Storage = useAct1Storage()
const playStorage = usePlayStorage()
const metaStorage = useMetaStorage()
const meta = ref<MetaProgress>({ unlockedFatesSeen: ['human'] })
const activePlayRun = ref<PlayRunState | null>(null)
const savedAct1Slot = ref<'slot1' | 'slot2' | 'slot3' | null>(null)

const globalMetaLine = computed(() => {
  const metaLine = formatMetaProgressLine(meta.value)
  const ids = playStorage.getPlayMeta().priorMetaUnlocks
  const legacy = ids.length ? formatMetaUnlocksLine(ids, 5) : ''
  if (metaLine && legacy) return `${metaLine} · ${legacy}`
  return metaLine || legacy
})

const activeRunsBySlot = computed(() => playStorage.listActiveRunsBySlot())

const eligibleBundleOptions = computed(() =>
  metaStorage.getEligibleBundles().map((id) => {
    const def = START_BUNDLE_REGISTRY[id]
    return {
      id,
      label: def?.playerLabel ?? id,
      description: '前若干周来文措辞更直白，不改变数值。'
    }
  })
)

const showStartBundlePicker = computed(
  () => showNewGameSetup.value && !hasAct1InProgress.value && eligibleBundleOptions.value.length > 0
)

const headJarOtherSlotHint = computed(() => {
  if (!showNewGameSetup.value) return ''
  const hasHeadJarElsewhere = Object.values(activeRunsBySlot.value).some(
    (run) =>
      run &&
      run.primaryFate === 'head_jar' &&
      run.slotId !== selectedNewGameSlot.value
  )
  return hasHeadJarElsewhere ? META_NEW_HUMAN_OTHER_SLOT_HINT : ''
})

const hasActiveRun = computed(() => !!activePlayRun.value)
const hasAct1InProgress = computed(() => !activePlayRun.value && !!savedAct1Slot.value)
const showNewGameSetup = computed(() => !hasActiveRun.value)

const continuePlayLabel = computed(() => {
  if (activePlayRun.value) {
    return formatContinuePlayLabel(
      activePlayRun.value.primaryFate,
      activePlayRunLabel.value
    )
  }
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

const settledAct1ForSlot = computed(() => {
  const saved = act1Storage.loadAct1(selectedNewGameSlot.value)
  return saved?.settled ? saved : null
})

const slotLabel = (id: string) => (id === 'slot1' ? '存档槽 1' : id === 'slot2' ? '存档槽 2' : '存档槽 3')

function syncFormFromRun(run: PlayRunState) {
  playerName.value = run.start.playerName
  background.value = run.start.background
  talent.value = run.start.talent
  startingCity.value = run.start.startingCity
  initialDebt.value = run.start.initialDebt
}

function onSlotCardClick(slotId: SaveSlotId) {
  selectedNewGameSlot.value = slotId
  const run = activeRunsBySlot.value[slotId]
  if (run) syncFormFromRun(run)
}

onMounted(() => {
  meta.value = metaStorage.readMeta()
  activePlayRun.value = playStorage.getActiveRun()
  if (activePlayRun.value) {
    selectedNewGameSlot.value = activePlayRun.value.slotId
    syncFormFromRun(activePlayRun.value)
  }
  aiEventsEnabled.value = playStorage.getPlayMeta().aiEventsEnabled
  for (const slot of SLOT_IDS) {
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

  const bundleId =
    selectedBundleId.value === 'standard' ? null : selectedBundleId.value
  const eligible = metaStorage.getEligibleBundles()
  if (bundleId && !eligible.includes(bundleId)) return

  if (!(meta.value.unlockedFatesSeen?.length ?? 0)) {
    meta.value = metaStorage.recordFateSeen('human')
  }

  const run = createPlayRunFromStartConfig(cfg, selectedNewGameSlot.value, {
    runMode: 'chapter',
    startBundleId: bundleId
  })
  playStorage.setActiveRun(run)
  activePlayRun.value = run
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
  for (const slot of SLOT_IDS) {
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

      <AccountProfileZone
        class="IndexPage__profile"
        :meta-summary-line="globalMetaLine"
      >
        <template #archive>
          <FateCodexStrip :unlocked-fates-seen="meta.unlockedFatesSeen ?? []" />
        </template>

        <div class="IndexPage__start">
          <template v-if="hasActiveRun">
            <Card class="IndexPage__continueCard" padding="md">
              <p class="IndexPage__continue-kicker">进行中的战役</p>
              <p class="IndexPage__continue-title">{{ activePlayRunLabel }}</p>
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

            <QuickStartButton
              v-if="hasAct1InProgress"
              :text="continuePlayLabel"
              @click="onContinuePlay"
            />

            <StartBundlePicker
              v-if="showStartBundlePicker"
              v-model="selectedBundleId"
              :bundles="eligibleBundleOptions"
              class="IndexPage__bundlePicker"
            />

            <p
              v-if="headJarOtherSlotHint"
              class="IndexPage__headJarHint"
            >
              {{ headJarOtherSlotHint }}
            </p>

            <QuickStartButton
              :disabled="!selectedNewGameSlot"
              :text="hasAct1InProgress ? '开新局' : '签署契约并开始'"
              :subtitle="hasAct1InProgress ? '' : '入学前夜 → 高中 → 预科 → 职场 → 无尽境'"
              @click="onStartJourney"
            />
          </template>
        </div>
      </AccountProfileZone>

      <IdentitySelector
        v-if="showNewGameSetup"
        v-model="background"
        class="IndexPage__identity"
      />

      <div v-if="hasActiveRun" class="IndexPage__start IndexPage__start--secondary">
        <button
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

      <div v-else class="IndexPage__start IndexPage__start--secondary">
        <button
          v-if="showNewGameSetup"
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
          <div class="IndexPage__slotGrid">
            <PlaySlotSummaryCard
              v-for="slotId in SLOT_IDS"
              :key="slotId"
              :slot-id="slotId"
              :run="activeRunsBySlot[slotId] ?? null"
              :is-active="selectedNewGameSlot === slotId"
              @click="onSlotCardClick(slotId)"
            />
          </div>

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

.IndexPage__profile {
  margin-top: 24px;
}

.IndexPage__identity {
  margin-top: 24px;
}

.IndexPage__start {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.IndexPage__start--secondary {
  margin-top: 16px;
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

.IndexPage__bundlePicker {
  width: 100%;
  max-width: 420px;
}

.IndexPage__headJarHint {
  width: 100%;
  max-width: 420px;
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
  text-align: center;
}

.IndexPage__slotGrid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
  margin-bottom: 20px;
}

.IndexPage__glassBtn {
  width: 100%;
  max-width: 320px;
  text-align: center;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(180, 220, 255, 0.85);
  background: transparent;
  border: 1px dashed rgba(120, 200, 255, 0.35);
  border-radius: 8px;
  padding: 8px 12px;
  box-sizing: border-box;
  cursor: pointer;
}
.IndexPage__glassBtn:hover {
  color: var(--neon-cyan);
  border-color: rgba(120, 200, 255, 0.55);
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
  width: 100%;
  min-width: 0;
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
  max-height: 800px;
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
