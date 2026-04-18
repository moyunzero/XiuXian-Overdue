<script setup lang="ts">
import type { Background, StartConfig, Talent } from '~/types/game'
import { useGame } from '~/composables/useGame'
import type { SaveSlotId } from '~/composables/useGameStorage'
import { computed, ref } from 'vue'
import { navigateTo } from '#app'
import HeroSection from '~/components/home/HeroSection.vue'
import IdentitySelector from '~/components/home/IdentitySelector.vue'
import QuickStartButton from '~/components/home/QuickStartButton.vue'
import SaveSlotList from '~/components/home/SaveSlotList.vue'
import ParticleBackground from '~/components/home/ParticleBackground.vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'

const { game, startNew, reset, listSlots, loadFromSlot, saveToSlot, activeSlot } = useGame()

const saveSlotOrder: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']

const slotRows = computed(() =>
  saveSlotOrder.map((id, idx) => ({
    id,
    meta: listSlots.value[idx] ?? null
  }))
)

const selectedNewGameSlot = ref<'slot1' | 'slot2' | 'slot3'>('slot1')
const playerName = ref('龙傲天')
const background = ref<Background>('贫民')
const talent = ref<Talent>('无灵根')
const startingCity = ref('xx市')
const initialDebt = ref(20_000)
const showAdvanced = ref(false)

const canContinue = computed(() => game.value.started)

async function onStart() {
  const cfg: StartConfig = {
    playerName: playerName.value.trim() || '无名氏',
    background: background.value,
    talent: talent.value,
    initialDebt: initialDebt.value,
    startingCity: startingCity.value.trim() || '嵩阳市'
  }
  startNew(cfg)
  const slot = selectedNewGameSlot.value
  const n = slot.slice(-1)
  saveToSlot(slot, `第${n}局·${cfg.playerName}`)
  activeSlot.value = slot
  await navigateTo('/game')
}

async function resume(slotId: SaveSlotId) {
  const ok = loadFromSlot(slotId)
  if (ok) await navigateTo('/game')
}

function onClearSaves() {
  const ok = window.confirm(
    '将清除本机「全部」存档槽位（含自动存档与手动槽）记录。该操作不可逆，按制度立即执行。'
  )
  if (ok) reset()
}

const slotData = computed(() =>
  saveSlotOrder.map((id, idx) => ({
    id,
    meta: listSlots.value[idx]
      ? {
          day: listSlots.value[idx]!.day,
          tier: listSlots.value[idx]!.tier,
          cash: listSlots.value[idx]!.cash,
          debt: listSlots.value[idx]!.debt
        }
      : null
  }))
)
</script>

<template>
  <div class="IndexPage">
    <ClientOnly>
      <ParticleBackground />
    </ClientOnly>
    <div class="Container">
      <HeroSection />

      <IdentitySelector
        v-model="background"
        class="IndexPage__identity"
      />

      <div class="IndexPage__start">
        <QuickStartButton
          :disabled="!selectedNewGameSlot"
          @click="onStart"
        />

        <button
          class="IndexPage__advanced-toggle"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '收起高级选项' : '自定义角色' }}
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
          </div>
        </Card>
      </Transition>

      <SaveSlotList
        :slots="slotData"
        :active-slot="activeSlot"
        class="IndexPage__saves"
        @select="resume"
      />

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

.IndexPage__saves {
  margin-top: 32px;
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
