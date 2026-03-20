<script setup lang="ts">
import type { Background, StartConfig, Talent } from '~/types/game'
import { useGame } from '~/composables/useGame'
import { computed, onMounted, ref } from 'vue'
import { navigateTo } from '#app'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'
import Pill from '~/components/ui/Pill.vue'

const { game, startNew, reset, listSlots, loadFromSlot, saveToSlot, activeSlot, migrateLegacy } = useGame()

const playerName = ref('龙傲天')
const background = ref<Background>('贫民')
const talent = ref<Talent>('无灵根')
const startingCity = ref('xx市')
const initialDebt = ref(20_000)

const bgDesc = computed(() => {
  if (background.value === '贫民') return '现金紧，利率高，靠命卷。'
  if (background.value === '中产') return '现金一般，利率中等，容错稍高。'
  return '现金充足，利率更低，但你依旧会被分数定义。'
})

const talentDesc = computed(() => {
  if (talent.value === '无灵根') return '入门慢，但更贴近"底层修仙"真实体验。'
  if (talent.value === '伪灵根') return '修行效率更稳定，适合新手上手。'
  return '起步更强，但也更容易被系统盯上（你会想更快、更高）。'
})

const canContinue = computed(() => game.value.started)

onMounted(() => {
  migrateLegacy()
})

function onStart() {
  const cfg: StartConfig = {
    playerName: playerName.value.trim() || '无名氏',
    background: background.value,
    talent: talent.value,
    initialDebt: initialDebt.value,
    startingCity: startingCity.value.trim() || '嵩阳市'
  }
  startNew(cfg)
  saveToSlot('slot1', `第1局·${cfg.playerName}`)
  activeSlot.value = 'slot1'
  navigateTo('/game')
}

function resume(slotId: 'autosave' | 'slot1' | 'slot2' | 'slot3') {
  const ok = loadFromSlot(slotId)
  if (ok) navigateTo('/game')
}
</script>

<template>
  <div class="Container">
    <div class="Row" style="align-items: baseline">
      <h1 class="Title">修仙欠费中</h1>
      <Pill>模拟修仙 · 每天三段行动 · 周结算</Pill>
      <span class="Spacer" />
      <Button variant="ghost" size="sm" @click="reset">清空存档</Button>
    </div>
    
    <p class="Sub">
      <br />
      这一版是可玩 MVP：一局建议先跑满 7 天，看第一次月考如何把你分门别类。
    </p>

    <div class="Grid2" style="margin-top: 14px">
      <!-- Left: Configuration Form -->
      <Card padding="md">
        <div class="Row">
          <Pill variant="info">自定义开局</Pill>
          <span class="Spacer" />
          <Button variant="primary" @click="onStart">开始这局</Button>
          <Button variant="secondary" :disabled="!canContinue" @click="navigateTo('/game')">
            继续
          </Button>
        </div>

        <div class="Grid2" style="margin-top: 12px">
          <div>
            <div class="Label">角色名</div>
            <input v-model="playerName" class="Field" placeholder="输入名字" />
          </div>
          <div>
            <div class="Label">城市</div>
            <input v-model="startingCity" class="Field" placeholder="例如：嵩阳市" />
          </div>
        </div>

        <div class="Grid2" style="margin-top: 12px">
          <div>
            <div class="Label">出身</div>
            <select v-model="background" class="Field">
              <option value="贫民">贫民</option>
              <option value="中产">中产</option>
              <option value="富户">富户</option>
            </select>
            <div class="MonoSmall" style="margin-top: 8px">{{ bgDesc }}</div>
          </div>
          <div>
            <div class="Label">天赋</div>
            <select v-model="talent" class="Field">
              <option value="无灵根">无灵根</option>
              <option value="伪灵根">伪灵根</option>
              <option value="天灵根">天灵根</option>
            </select>
            <div class="MonoSmall" style="margin-top: 8px">{{ talentDesc }}</div>
          </div>
        </div>

        <div style="margin-top: 12px">
          <div class="Row">
            <div class="Label">初始债务：¥{{ initialDebt.toLocaleString() }}</div>
            <span class="Spacer" />
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
          <div class="Row" style="margin-top: 10px; gap: 8px">
            <Button size="sm" @click="initialDebt = 5000">5千</Button>
            <Button size="sm" @click="initialDebt = 20000">2万</Button>
            <Button size="sm" @click="initialDebt = 70000">7万</Button>
            <Button size="sm" @click="initialDebt = 150000">15万</Button>
            <span class="Spacer" />
            <span class="MonoSmall">提示：这只是"本金"。利息会自己长出来。</span>
          </div>
        </div>
      </Card>

      <!-- Right: Game Info & Saves -->
      <div style="display: flex; flex-direction: column; gap: 14px">
        <Card padding="md">
          <div class="Row">
            <Pill variant="info">你将面对什么</Pill>
          </div>

          <div class="MonoSmall" style="margin-top: 10px">
            <div style="margin-bottom: 10px">
              - <b>分数=权限</b>：每 7 天一次月考，决定你在学校里的待遇。<br />
              - <b>债务=倒计时</b>：利息按时间段滚动，逾期会升级"催收事件"。<br />
              - <b>身体=耗材</b>：炼体与补给能加速，但疲劳会吞掉专注与效率。<br />
              - <b>系统的恶意</b>：老师推销、零工诱惑、催收羞辱，会把你拉回现实。
            </div>

            <Card variant="glass" padding="sm">
              <div class="Label">小目标（建议第一局）</div>
              <div style="margin-top: 8px">
                1) 跑满 7 天完成第一次月考<br />
                2) 让现金别归零<br />
                3) 观察"示范班/普通班/末位班"对你的影响
              </div>
            </Card>

            <div class="Row" style="margin-top: 12px; gap: 8px">
              <Button variant="primary" @click="onStart">开始</Button>
              <Button :disabled="!canContinue" @click="navigateTo('/game')">
                继续（当前）
              </Button>
              <span class="Spacer" />
              <Pill size="sm">Nuxt · 本地存档</Pill>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div class="Row">
            <div class="Label">存档槽</div>
            <span class="Spacer" />
            <Pill size="sm">当前：{{ activeSlot }}</Pill>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px">
            <div 
              v-for="meta in listSlots" 
              :key="meta?.id || Math.random()" 
              class="Row" 
              style="gap: 8px; flex-wrap: wrap"
            >
              <template v-if="meta">
                <Pill size="sm">{{ meta.label }}</Pill>
                <Pill size="sm">第{{ meta.day }}天</Pill>
                <Pill size="sm">分班：{{ meta.tier }}</Pill>
                <Pill size="sm">现金：¥{{ meta.cash.toLocaleString() }}</Pill>
                <Pill size="sm" variant="danger">债务：¥{{ meta.debt.toLocaleString() }}</Pill>
                <span class="Spacer" />
                <Button size="sm" @click="resume(meta.id)">载入</Button>
              </template>
              <template v-else>
                <Pill size="sm" variant="default">空槽</Pill>
                <span class="Spacer" />
              </template>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Debt Slider ── */
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
    #3b82f6 0%,
    #3b82f6 var(--pct, 10%),
    rgba(255,255,255,0.12) var(--pct, 10%),
    rgba(255,255,255,0.12) 100%
  );
}

/* Thumb – WebKit */
.DebtSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #fff;
  box-shadow: 0 0 6px rgba(59,130,246,0.6);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.DebtSlider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(59,130,246,0.8);
}

/* Thumb – Firefox */
.DebtSlider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #fff;
  box-shadow: 0 0 6px rgba(59,130,246,0.6);
  cursor: pointer;
}

/* Track – Firefox */
.DebtSlider::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
}
.DebtSlider::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: #3b82f6;
}
</style>
