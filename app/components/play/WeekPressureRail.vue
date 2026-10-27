<script setup lang="ts">
import { computed } from 'vue'
import type { DebtDashboardVM } from '~/types/play'

const props = withDefaults(
  defineProps<{
    lines: string[]
    debt: DebtDashboardVM
    weeksRemaining?: number
    emphasis?: 'debt' | 'vitality'
    integrity?: number
    integrityCap?: number
    maintenanceBill?: number
    antiPatternHeadline?: string
    dualLedgerYang?: number
    dualLedgerMing?: number
  }>(),
  {
    emphasis: 'debt'
  }
)

const pressurePct = computed(() => {
  const cash = Math.max(1, props.debt.cash)
  return Math.min(100, Math.round((props.debt.totalDue / (props.debt.totalDue + cash)) * 100))
})

const delinquencyPct = computed(() =>
  Math.min(100, Math.round((props.debt.delinquencyLevel / 5) * 100))
)

const integrityPct = computed(() =>
  props.integrity != null ? Math.round(props.integrity * 100) : null
)

const integrityCapPct = computed(() =>
  props.integrityCap != null ? Math.round(props.integrityCap * 100) : null
)

const railTag = computed(() => (props.emphasis === 'vitality' ? '维生侧栏' : '账期侧栏'))

const integrityCapNotice = computed(() => {
  if (props.emphasis !== 'debt' || integrityCapPct.value == null) return null
  if (integrityPct.value == null) return null
  if (integrityPct.value >= integrityCapPct.value - 1) {
    return `抵押运行：完整度上限 ${integrityCapPct.value}%，再跌只能抽血或认罚。`
  }
  return null
})
</script>

<template>
  <aside
    class="WeekPressureRail AgGlassSubcard"
    :class="`WeekPressureRail--emphasis-${emphasis}`"
    :aria-label="railTag"
  >
    <header class="WeekPressureRail__head">
      <span class="WeekPressureRail__tag">{{ railTag }}</span>
      <span v-if="weeksRemaining != null" class="WeekPressureRail__countdown">
        契约剩余 {{ weeksRemaining }} 周
      </span>
    </header>

    <template v-if="emphasis === 'vitality'">
      <div
        class="WeekPressureRail__meter WeekPressureRail__meter--primary"
        role="img"
        :aria-label="integrityPct != null ? `完整度 ${integrityPct}%` : '完整度'"
      >
        <span class="WeekPressureRail__meterLabel">完整度</span>
        <div class="WeekPressureRail__meterTrack">
          <span
            class="WeekPressureRail__meterFill WeekPressureRail__meterFill--vitality"
            :style="{ width: `${integrityPct ?? 0}%` }"
          />
        </div>
        <span class="WeekPressureRail__meterVal">{{ integrityPct ?? '—' }}%</span>
      </div>

      <div
        v-if="maintenanceBill != null"
        class="WeekPressureRail__meter WeekPressureRail__meter--secondary"
        role="img"
        aria-label="维生账单"
      >
        <span class="WeekPressureRail__meterLabel">维生账单</span>
        <div class="WeekPressureRail__meterTrack">
          <span
            class="WeekPressureRail__meterFill WeekPressureRail__meterFill--bill"
            :style="{ width: `${Math.min(100, Math.round((maintenanceBill / Math.max(maintenanceBill, debt.cash)) * 100))}%` }"
          />
        </div>
        <span class="WeekPressureRail__meterVal">¥{{ maintenanceBill.toLocaleString() }}</span>
      </div>
    </template>

    <template v-else>
      <div class="WeekPressureRail__meter WeekPressureRail__meter--primary" role="img" aria-label="债务压力">
        <span class="WeekPressureRail__meterLabel">债务压强</span>
        <div class="WeekPressureRail__meterTrack">
          <span class="WeekPressureRail__meterFill" :style="{ width: `${pressurePct}%` }" />
        </div>
        <span class="WeekPressureRail__meterVal">{{ pressurePct }}%</span>
      </div>

      <div
        v-if="integrityPct != null && emphasis === 'debt' && integrityCapPct != null"
        class="WeekPressureRail__meter WeekPressureRail__meter--integrity"
        role="img"
        :aria-label="`完整度 ${integrityPct}%，上限 ${integrityCapPct}%`"
      >
        <span class="WeekPressureRail__meterLabel">完整度</span>
        <div class="WeekPressureRail__meterTrack WeekPressureRail__meterTrack--cap">
          <span
            class="WeekPressureRail__meterFill WeekPressureRail__meterFill--integrity"
            :style="{ width: `${integrityPct}%` }"
          />
          <span
            v-if="integrityCapPct != null"
            class="WeekPressureRail__capMarker"
            :style="{ left: `${integrityCapPct}%` }"
          />
        </div>
        <span class="WeekPressureRail__meterVal">
          {{ integrityPct }}%
          <template v-if="integrityCapPct != null"> · 上限 {{ integrityCapPct }}%</template>
        </span>
      </div>

      <div
        v-else-if="debt.delinquencyLevel > 0"
        class="WeekPressureRail__meter WeekPressureRail__meter--danger"
      >
        <span class="WeekPressureRail__meterLabel">逾期档位</span>
        <div class="WeekPressureRail__meterTrack">
          <span
            class="WeekPressureRail__meterFill WeekPressureRail__meterFill--danger"
            :style="{ width: `${delinquencyPct}%` }"
          />
        </div>
        <span class="WeekPressureRail__meterVal">{{ debt.delinquencyLevel }} / 5</span>
      </div>
    </template>

    <p v-if="integrityCapNotice" class="WeekPressureRail__capNotice">{{ integrityCapNotice }}</p>

    <section
      v-if="dualLedgerYang != null"
      class="WeekPressureRail__dualLedger"
      aria-label="双账压强"
    >
      <p v-if="antiPatternHeadline" class="WeekPressureRail__antiPattern">{{ antiPatternHeadline }}</p>
      <div class="WeekPressureRail__ledgerRow">
        <span class="WeekPressureRail__ledgerItem">
          阳债 <strong>¥{{ dualLedgerYang.toLocaleString() }}</strong>
        </span>
        <span v-if="dualLedgerMing != null" class="WeekPressureRail__ledgerItem">
          冥币 <strong>{{ dualLedgerMing.toLocaleString() }}</strong>
        </span>
      </div>
    </section>

    <p v-if="debt.compoundWarning" class="WeekPressureRail__warn">{{ debt.compoundWarning }}</p>

    <p v-if="debt.projectedWeeklyInterest" class="WeekPressureRail__interest">
      本周预估利息
      <strong>¥{{ debt.projectedWeeklyInterest.toLocaleString() }}</strong>
    </p>

    <div v-if="debt.workCollectionTitle" class="WeekPressureRail__collection">
      <span class="WeekPressureRail__collectionTitle">{{ debt.workCollectionTitle }}</span>
      <span v-if="debt.workCollectionBody" class="WeekPressureRail__collectionBody">
        {{ debt.workCollectionBody }}
      </span>
    </div>

    <section class="WeekPressureRail__logs" aria-label="本周流水">
      <h3 class="WeekPressureRail__logsTitle">本周流水</h3>
      <ul v-if="lines.length" class="WeekPressureRail__list">
        <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
      </ul>
      <p v-else class="WeekPressureRail__empty">账期尚未写入备注。</p>
    </section>

    <footer class="WeekPressureRail__foot">
      <template v-if="emphasis === 'vitality'">
        现金 ¥{{ debt.cash.toLocaleString() }}
        <template v-if="maintenanceBill != null && maintenanceBill > debt.cash">
          · 维生欠费
        </template>
      </template>
      <template v-else>
        最低 ¥{{ debt.minPayment.toLocaleString() }} · 现金 ¥{{ debt.cash.toLocaleString() }}
      </template>
    </footer>
  </aside>
</template>

<style scoped>
.WeekPressureRail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 12px 14px;
  border: 1px solid var(--fate-rail-border, rgba(255, 80, 100, 0.22));
  border-radius: 10px;
  background:
    linear-gradient(165deg, rgba(24, 8, 16, 0.92), rgba(8, 10, 20, 0.96)),
    repeating-linear-gradient(
      -12deg,
      transparent,
      transparent 10px,
      rgba(255, 60, 80, 0.03) 10px,
      rgba(255, 60, 80, 0.03) 11px
    );
  box-sizing: border-box;
}

.WeekPressureRail--emphasis-vitality {
  background:
    linear-gradient(165deg, rgba(8, 24, 28, 0.92), rgba(4, 12, 18, 0.96)),
    repeating-linear-gradient(
      -12deg,
      transparent,
      transparent 10px,
      rgba(0, 200, 220, 0.03) 10px,
      rgba(0, 200, 220, 0.03) 11px
    );
}

.WeekPressureRail__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}

.WeekPressureRail__tag {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--fate-rail-accent, rgba(255, 140, 160, 0.95));
  letter-spacing: 0.08em;
}

.WeekPressureRail__countdown {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}

.WeekPressureRail__meter {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.WeekPressureRail__meterLabel {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.WeekPressureRail__meterTrack {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.45);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.WeekPressureRail__meterTrack--cap {
  overflow: visible;
}

.WeekPressureRail__meterFill {
  display: block;
  height: 100%;
  background: var(--fate-meter-primary, linear-gradient(90deg, rgba(255, 120, 80, 0.5), var(--danger)));
  box-shadow: 0 0 12px rgba(255, 60, 60, 0.35);
  transition: width 0.25s ease;
}

.WeekPressureRail__meterFill--vitality {
  background: var(--fate-meter-primary, linear-gradient(90deg, rgba(0, 180, 200, 0.45), rgba(80, 220, 240, 0.85)));
  box-shadow: 0 0 12px rgba(0, 200, 220, 0.25);
}

.WeekPressureRail__meterFill--bill {
  background: var(--fate-meter-secondary, linear-gradient(90deg, rgba(255, 100, 80, 0.45), var(--danger)));
}

.WeekPressureRail__meterFill--integrity {
  background: var(--fate-meter-secondary, rgba(255, 160, 80, 0.85));
  box-shadow: 0 0 10px rgba(255, 140, 60, 0.25);
}

.WeekPressureRail__meterFill--danger {
  background: linear-gradient(90deg, rgba(255, 80, 40, 0.65), #ff2244);
}

.WeekPressureRail__capMarker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  margin-left: -1px;
  background: var(--fate-integrity-warn, rgba(255, 140, 60, 0.9));
  box-shadow: 0 0 6px rgba(255, 140, 60, 0.6);
  pointer-events: none;
}

.WeekPressureRail__meterVal {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: rgba(255, 180, 180, 0.95);
}

.WeekPressureRail--emphasis-vitality .WeekPressureRail__meterVal {
  color: rgba(160, 230, 240, 0.95);
}

.WeekPressureRail__capNotice {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 140, 60, 0.35);
  background: rgba(80, 40, 10, 0.25);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 200, 150, 0.95);
  line-height: 1.45;
}

.WeekPressureRail__dualLedger {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(140, 100, 200, 0.35);
  background: rgba(40, 20, 60, 0.28);
}

.WeekPressureRail__antiPattern {
  margin: 0 0 6px;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 180, 140, 0.95);
  line-height: 1.45;
}

.WeekPressureRail__ledgerRow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.WeekPressureRail__ledgerItem {
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(200, 180, 255, 0.92);
}

.WeekPressureRail__ledgerItem strong {
  color: rgba(220, 200, 255, 0.98);
  font-weight: 600;
}

.WeekPressureRail__warn {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 80, 80, 0.35);
  background: rgba(120, 20, 30, 0.35);
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: rgba(255, 200, 200, 0.95);
  line-height: 1.45;
}

.WeekPressureRail__interest {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.WeekPressureRail__interest strong {
  color: var(--warning);
}

.WeekPressureRail__collection {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 120, 60, 0.35);
  background: rgba(80, 20, 10, 0.25);
}

.WeekPressureRail__collectionTitle {
  display: block;
  font-family: var(--mono);
  font-size: var(--text-xs);
  color: var(--warning);
  font-weight: 600;
}

.WeekPressureRail__collectionBody {
  display: block;
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.WeekPressureRail__logs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--fate-rail-border, rgba(255, 80, 100, 0.15));
}

.WeekPressureRail__logsTitle {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.65rem;
  color: rgba(120, 210, 255, 0.85);
  letter-spacing: 0.06em;
}

.WeekPressureRail__list {
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.WeekPressureRail__empty {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--text-muted);
}

.WeekPressureRail__foot {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .WeekPressureRail__meterFill {
    transition: none;
  }
}
</style>
