<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && snapshot"
        class="SummaryBackdrop"
        role="presentation"
        @click.self="$emit('dismiss')"
      >
        <div
          class="SummaryDialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-title"
        >
          <Card padding="md">
            <h2 id="summary-title" class="SummaryTitle">主题收束 · 制度记录</h2>
            <p class="SummaryClosing">
              下列为截至当前局面的冷数据归档。系统不评价你是否「努力」，只记录你如何被记录。
            </p>
            <p class="SummaryClosing">
              收束不等于结束；沙盒循环仍继续。
            </p>

            <div class="SummaryTableWrap">
              <table class="SummaryTable">
                <tbody>
                  <tr>
                    <th scope="row">游戏日 / 周</th>
                    <td>第 {{ snapshot.schoolDay }} 日 · 第 {{ snapshot.schoolWeek }} 周</td>
                  </tr>
                  <tr>
                    <th scope="row">总债务</th>
                    <td>¥{{ snapshot.totalDebt.toLocaleString() }}</td>
                  </tr>
                  <tr>
                    <th scope="row">分项</th>
                    <td>
                      费用 ¥{{ snapshot.collectionFee.toLocaleString() }} · 本金 ¥{{
                        snapshot.debtPrincipal.toLocaleString()
                      }}
                      · 利息 ¥{{ snapshot.debtInterestAccrued.toLocaleString() }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">现金 / 逾期</th>
                    <td>¥{{ snapshot.cash.toLocaleString() }} · 逾期等级 {{ snapshot.delinquency }}</td>
                  </tr>
                  <tr>
                    <th scope="row">分班</th>
                    <td>{{ snapshot.classTier }}</td>
                  </tr>
                  <tr>
                    <th scope="row">契约</th>
                    <td>
                      {{ snapshot.contractActive ? snapshot.contractName : '未激活' }} · 缠绕
                      {{ Math.round(snapshot.contractProgress) }}% · 监工
                      {{ Math.round(snapshot.contractVigilance) }}%
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">驯化 / 麻木</th>
                    <td>{{ snapshot.domestication }} / {{ snapshot.numbness }}</td>
                  </tr>
                  <tr>
                    <th scope="row">完整崩溃种类</th>
                    <td>{{ snapshot.fullCollapseKinds }}</td>
                  </tr>
                  <tr>
                    <th scope="row">最近强冲击日</th>
                    <td>
                      {{ snapshot.lastStrongCollapseDay != null ? `第 ${snapshot.lastStrongCollapseDay} 日` : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="SaveHint">关闭本页前将写入当前活动槽位。</p>
            <div class="SummaryActions">
              <Button variant="primary" @click="$emit('confirm')">已阅并保存</Button>
              <Button variant="ghost" @click="$emit('dismiss')">稍后再看</Button>
            </div>
          </Card>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { SummarySnapshot } from '~/logic/gameEngine'
import type { PropType } from 'vue'
import Button from '~/components/ui/Button.vue'
import Card from '~/components/ui/Card.vue'

defineProps({
  show: { type: Boolean, default: false },
  snapshot: { type: Object as PropType<SummarySnapshot | null>, default: null }
})

defineEmits<{
  confirm: []
  dismiss: []
}>()
</script>

<style scoped>
.SummaryBackdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(4px);
}

.SummaryDialog {
  width: min(100%, 520px);
  max-height: min(92vh, 720px);
  overflow: auto;
}

.SummaryTitle {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.94);
}

.SummaryClosing {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}

.SummaryTableWrap {
  margin-top: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.SummaryTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.88);
}

.SummaryTable th,
.SummaryTable td {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 10px;
  vertical-align: top;
  text-align: left;
  word-break: break-word;
}

.SummaryTable th {
  width: 34%;
  min-width: 7.5rem;
  color: rgba(255, 255, 255, 0.62);
  font-weight: 500;
}

.SaveHint {
  margin: 14px 0 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.SummaryActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
