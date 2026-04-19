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

            <div v-if="snapshot.profile" class="ProfileSection">
              <h3 class="ProfileSectionTitle">社会画像归档</h3>
              <div class="ProfileSummary">
                <div class="ProfilePrimary">
                  <span class="ProfileLabel">主导维度</span>
                  <span class="ProfileValue">{{ snapshot.profileDigest.primaryLabel }}</span>
                </div>
                <div class="ProfileTags">
                  <span class="ProfileLabel">主要标签</span>
                  <span class="ProfileValue">{{ snapshot.profileDigest.tagsSummary }}</span>
                </div>
              </div>
              <table class="SummaryTable">
                <tbody>
                  <tr>
                    <th scope="row">财务风险</th>
                    <td>
                      <span :class="['RiskBadge', `risk-${snapshot.profile.financialRisk}`]">
                        {{ levelLabels[snapshot.profile.financialRisk] || snapshot.profile.financialRisk }}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">教育信用</th>
                    <td>
                      <span :class="['RiskBadge', `edu-${snapshot.profile.educationCredit}`]">
                        {{ levelLabels[snapshot.profile.educationCredit] || snapshot.profile.educationCredit }}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">制度顺从</th>
                    <td>
                      <span :class="['RiskBadge', `comp-${snapshot.profile.compliance}`]">
                        {{ levelLabels[snapshot.profile.compliance] || snapshot.profile.compliance }}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">身体资产</th>
                    <td>
                      <span :class="['RiskBadge', `body-${snapshot.profile.bodyAsset}`]">
                        {{ levelLabels[snapshot.profile.bodyAsset] || snapshot.profile.bodyAsset }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="snapshot.profileDigest.recentChanges.length > 0" class="ProfileChanges">
                <span class="ProfileLabel">近期变化</span>
                <ul class="ChangeList">
                  <li v-for="change in snapshot.profileDigest.recentChanges" :key="change" class="ChangeItem">
                    {{ change }}
                  </li>
                </ul>
              </div>
              <div v-if="snapshot.profile.tags.length > 0" class="ProfileAllTags">
                <span class="ProfileLabel">完整标签</span>
                <div class="TagList">
                  <span v-for="tag in snapshot.profile.tags" :key="tag" class="TagItem">
                    {{ tag }}
                  </span>
                </div>
              </div>
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

const levelLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险',
  discarded: '已放弃',
  unstable: '不稳定',
  investable: '可投资',
  preferred: '优选',
  resistant: '抵抗',
  softened: '软化',
  obedient: '顺从',
  domesticated: '驯化',
  intact: '完整',
  marked: '已标记',
  mortgaged: '已抵押',
  depleted: '枯竭'
}
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
  width: min(100%, 560px);
  max-height: min(92vh, 800px);
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

.ProfileSection {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.ProfileSectionTitle {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
}

.ProfileSummary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.ProfilePrimary,
.ProfileTags {
  flex: 1;
  min-width: 140px;
}

.ProfileLabel {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.ProfileValue {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.RiskBadge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.risk-low { background: rgba(76, 175, 80, 0.25); color: #81c784; }
.risk-medium { background: rgba(255, 193, 7, 0.25); color: #ffd54f; }
.risk-high { background: rgba(255, 152, 0, 0.25); color: #ffb74d; }
.risk-extreme { background: rgba(244, 67, 54, 0.25); color: #e57373; }

.edu-discarded { background: rgba(158, 158, 158, 0.25); color: #bdbdbd; }
.edu-unstable { background: rgba(255, 193, 7, 0.25); color: #ffd54f; }
.edu-investable { background: rgba(33, 150, 243, 0.25); color: #64b5f6; }
.edu-preferred { background: rgba(76, 175, 80, 0.25); color: #81c784; }

.comp-resistant { background: rgba(244, 67, 54, 0.25); color: #e57373; }
.comp-softened { background: rgba(255, 193, 7, 0.25); color: #ffd54f; }
.comp-obedient { background: rgba(33, 150, 243, 0.25); color: #64b5f6; }
.comp-domesticated { background: rgba(156, 39, 176, 0.25); color: #ce93d8; }

.body-intact { background: rgba(76, 175, 80, 0.25); color: #81c784; }
.body-marked { background: rgba(255, 193, 7, 0.25); color: #ffd54f; }
.body-mortgaged { background: rgba(255, 152, 0, 0.25); color: #ffb74d; }
.body-depleted { background: rgba(244, 67, 54, 0.25); color: #e57373; }

.ProfileChanges {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.ChangeList {
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
}

.ChangeItem {
  margin-bottom: 3px;
}

.ProfileAllTags {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.TagList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.TagItem {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
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
