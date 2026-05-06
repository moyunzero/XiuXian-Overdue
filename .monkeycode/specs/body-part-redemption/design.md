# 身体抵押赎身机制设计

## 1. 概述

### 1.1 背景
当前游戏中，玩家选择身体部位偿还债务后，债务被锁定（`debtLock = 'bodyLocked'`），现金无法用于还款。这个设计意图是创造"堕落不可逆"的体验，但完全锁定会让玩家感到"无路可走"而非"越陷越深"。

### 1.2 目标
引入**赎身机制**，让玩家在身体抵押后仍有机会用现金解锁债务，但代价越来越高。核心体验：
- **有希望但渺茫**：理论上永远可以赎身，但实际成本指数增长
- **后悔感**：赎身金额基于当初抵押时减免的金额，"当初贪多少现在补多少"
- **残缺感**：赎身后债务解了，但身体部位不恢复

### 1.3 设计原则
- 不是系统禁止玩家还款，而是玩家"自己发现付不起"
- 每次抵押都在缩小逃生窗口
- 金钱代价 + 永久性身体损失 = 双重惩罚

---

## 2. 核心机制

### 2.1 债务锁定（保持现有）

身体抵押后，锁定金额等于该部位减免的债务总额：

```typescript
g.econ.debtLock = 'bodyLocked'
g.econ.lockedDebtAmount = reduction  // 本次抵押减免的金额
```

### 2.2 赎身金额计算

**公式**：`赎身金额 = lockedDebtAmount × 倍率`

**倍率表**（基于累计抵押次数）：

| 抵押次数 | 倍率 | 示例（减免¥8,000） |
|---------|------|-------------------|
| 第 1 次 | ×1.5 | ¥12,000 |
| 第 2 次 | ×3.0 | ¥24,000 |
| 第 3 次 | ×6.0 | ¥48,000 |
| 第 4 次 | ×12.0 | ¥96,000 |
| 第 n 次 | ×1.5 × 2^(n-1) | 指数增长 |

**抵押次数**：`g.bodyPartRepayment` 中 `true` 值的数量

### 2.3 赎身后的状态变化

```
输入：支付赎身金额（从现金扣除）

效果：
  - g.econ.debtLock = null           // 解除锁定
  - g.econ.lockedDebtAmount = 0      // 清空锁定金额
  - 身体部位不恢复                    // g.bodyPartRepayment 保持不变
  - g.bodyIntegrity 不恢复            // 身体完整性保持抵押后的值
  - 记录日志：赎身完成，但伤痕永在
```

### 2.4 状态流转图

```
正常状态（无锁定）
    ↓ 选择身体抵押
锁定状态（debtLock = 'bodyLocked'）
    ↓
    ├── 现金还款 → 拒绝（提示：债务已锁定）
    ├── 继续抵押 → 锁定金额累加，倍率翻倍
    └── 赎身解锁
            ↓
        检查：现金 >= lockedDebtAmount × 倍率？
            ↓ 是
        扣除现金 → 解除锁定 → 身体不恢复
            ↓ 否
        提示：赎身金额不足（显示差额）
```

---

## 3. UI/UX 变更

### 3.1 还款界面变化

#### 当前（无赎身）
```
┌─────────────────────────────────┐
│        还款                      │
├─────────────────────────────────┤
│ 当前债务：¥50,000               │
│ 现金余额：¥12,000               │
│                                 │
│ [输入金额] [还款按钮（灰色）]     │
│                                 │
│ ⚠️ 该债务已被系统锁定，必须通过  │
│    身体抵押方式偿还。            │
└─────────────────────────────────┘
```

#### 新设计（增加赎身选项）
```
┌─────────────────────────────────┐
│        还款                      │
├─────────────────────────────────┤
│ 当前债务：¥50,000               │
│ 现金余额：¥12,000               │
│                                 │
│ 🔒 债务已锁定（¥8,000）          │
│                                 │
│ [输入金额] [还款按钮（灰色）]     │
│                                 │
│ ─── 赎身解锁 ────                │
│ 赎回所需：¥12,000                │
│ （已减免 ¥8,000 × 1.5 倍）       │
│                                 │
│ [赎身按钮（如果现金够则高亮）]     │
│                                 │
│ ⚠️ 赎身后债务可恢复正常还款，    │
│    但已抵押的身体部位无法恢复。   │
└─────────────────────────────────┘
```

### 3.2 状态提示

当债务锁定且玩家现金不足以赎身时：

```
💡 提示：你需要额外 ¥X,XXX 才能赎身。
   继续抵押会使赎身代价翻倍。
```

当玩家尝试现金还款时：

```
❌ 还款被拒绝：该债务已被系统锁定。
   当前锁定金额：¥8,000
   赎身所需：¥12,000（你的现金：¥5,000）
```

---

## 4. 代码改动

### 4.1 新增文件/函数

#### `app/logic/gameEngine.ts`

```typescript
// 新增：计算当前赎身所需金额
export function calculateRedemptionCost(g: GameState): number {
  if (g.econ.debtLock !== 'bodyLocked') return 0
  
  const lockedAmount = g.econ.lockedDebtAmount ?? 0
  if (lockedAmount <= 0) return 0
  
  // 计算累计抵押次数
  const repaidParts = g.bodyPartRepayment ?? {}
  const mortgageCount = Object.values(repaidParts).filter(Boolean).length
  
  // 倍率 = 1.5 × 2^(n-1)
  const multiplier = 1.5 * Math.pow(2, mortgageCount - 1)
  
  return Math.floor(lockedAmount * multiplier)
}

// 新增：检查是否可以赎身
export function canRedeem(g: GameState): boolean {
  const cost = calculateRedemptionCost(g)
  return cost > 0 && g.econ.cash >= cost
}

// 新增：执行赎身
export function executeRedemption(g: GameState): {
  success: boolean
  cost: number
  message: string
} {
  if (g.econ.debtLock !== 'bodyLocked') {
    return { success: false, cost: 0, message: '债务未锁定，无需赎身' }
  }
  
  const cost = calculateRedemptionCost(g)
  if (g.econ.cash < cost) {
    return { 
      success: false, 
      cost, 
      message: `现金不足：需要 ¥${cost.toLocaleString()}，你有 ¥${g.econ.cash.toLocaleString()}` 
    }
  }
  
  // 扣除现金
  g.econ.cash -= cost
  
  // 解除锁定
  g.econ.debtLock = null
  g.econ.lockedDebtAmount = 0
  
  // 记录日志
  g.logs.unshift({
    id: `log_${Date.now()}`,
    day: g.school.day,
    title: '赎身完成',
    detail: `你花费 ¥${cost.toLocaleString()} 赎回了还款自由。但抵押出去的身体部位没有回来。钱花了，伤痕还在。`,
    tone: 'warn'
  })
  if (g.logs.length > 120) g.logs.pop()
  
  return { success: true, cost, message: '赎身成功，债务已解锁' }
}
```

### 4.2 修改现有文件

#### `app/composables/useGameEconomyActions.ts`

**修改 `repay` 函数**：增加锁定状态下的提示优化

```typescript
const repay = (amount: number) => {
  const g = game.value
  const a = Math.max(0, Math.floor(amount))
  if (a <= 0) return
  if (g.econ.cash <= 0) return

  if (Engine.isDebtLocked(g)) {
    // 新增：计算赎身信息并提示
    const redemptionCost = Engine.calculateRedemptionCost(g)
    const canRedeem = g.econ.cash >= redemptionCost
    
    let detail = `该债务已被系统锁定，现金无法直接抵扣。`
    if (redemptionCost > 0) {
      detail += ` 赎身所需：¥${redemptionCost.toLocaleString()}（你的现金：¥${g.econ.cash.toLocaleString()}）`
      if (!canRedeem) {
        detail += ` 还需要 ¥${(redemptionCost - g.econ.cash).toLocaleString()}`
      }
    }
    
    addLog(g, '还款被拒绝', detail, 'warn')
    storage.saveToSlot(storage.activeSlot.value)
    return
  }
  
  // ... 其余逻辑不变
}

// 新增：赎身函数
const redeem = () => {
  const g = game.value
  const result = Engine.executeRedemption(g)
  
  if (result.success) {
    addLog(g, '赎身完成', result.message, 'ok')
    gameComputed.refreshProfileSnapshot()
  } else {
    addLog(g, '赎身失败', result.message, 'danger')
  }
  
  storage.saveToSlot(storage.activeSlot.value)
}

// 导出新增函数
return {
  creditLimit,
  borrow,
  repay,
  redeem  // 新增
}
```

#### `app/composables/useGameEventResolver.ts`

**修改还款事件处理**：在 `immediate_payment` 分支增加赎身检查

```typescript
} else if (optionId === 'immediate_payment') {
  if (Engine.isDebtLocked(g)) {
    // 新增：提示赎身选项
    const cost = Engine.calculateRedemptionCost(g)
    addLog(
      g, 
      '还款被拒绝', 
      `该债务已被系统锁定。赎身所需：¥${cost.toLocaleString()}。`, 
      'warn'
    )
  } else {
    // ... 原有逻辑不变
  }
}
```

#### `app/types/game.ts`

**无需修改**：现有类型已支持

```typescript
// 现有类型已包含
econ: {
  debtLock?: 'bodyLocked' | null
  lockedDebtAmount?: number
}
```

### 4.3 新增还款界面组件（可选）

如果需要在还款弹窗中直接显示赎身按钮：

```vue
<!-- app/components/debt/RedemptionPanel.vue -->
<script setup lang="ts">
import { Engine } from '~/logic/gameEngine'

const props = defineProps<{
  gameState: GameState
}>()

const emit = defineEmits<{
  redeem: []
}>()

const redemptionCost = computed(() => Engine.calculateRedemptionCost(props.gameState))
const canRedeem = computed(() => Engine.canRedeem(props.gameState))
const mortgageCount = computed(() => {
  const parts = props.gameState.bodyPartRepayment ?? {}
  return Object.values(parts).filter(Boolean).length
})
const multiplier = computed(() => 1.5 * Math.pow(2, mortgageCount.value - 1))
</script>

<template>
  <div class="redemption-panel">
    <h3>赎身解锁</h3>
    <div class="redemption-info">
      <p>已锁定债务：¥{{ gameState.econ.lockedDebtAmount?.toLocaleString() }}</p>
      <p>当前倍率：×{{ multiplier.toFixed(1) }}（第{{ mortgageCount }}次抵押）</p>
      <p class="cost">赎身所需：<strong>¥{{ redemptionCost.toLocaleString() }}</strong></p>
      <p>你的现金：¥{{ gameState.econ.cash.toLocaleString() }}</p>
    </div>
    
    <button 
      :disabled="!canRedeem"
      @click="emit('redeem')"
      class="redeem-button"
    >
      {{ canRedeem ? '确认赎身' : '现金不足' }}
    </button>
    
    <p class="warning">
      ⚠️ 赎身后债务可恢复正常还款，但已抵押的身体部位无法恢复。
    </p>
    <p class="warning" v-if="mortgageCount >= 2">
      💡 下次抵押后，赎身倍率将翻倍至 ×{{ (multiplier * 2).toFixed(1) }}
    </p>
  </div>
</template>
```

---

## 5. 边界情况处理

### 5.1 多次抵押后赎身

**场景**：玩家抵押了 2 个部位，每次减免 ¥8,000

```
第 1 次抵押：锁定 ¥8,000，倍率 ×1.5，赎身 ¥12,000
第 2 次抵押：锁定累加至 ¥16,000，倍率 ×3.0，赎身 ¥48,000
```

**实现**：`lockedDebtAmount` 累加，抵押次数基于 `bodyPartRepayment` 计算

### 5.2 部分还款后赎身

**场景**：锁定 ¥8,000，玩家已用其他方式（如事件效果）减少了部分债务

**处理**：`lockedDebtAmount` 保持不变，因为它是"当初锁定的金额"，不随债务变化而变化

### 5.3 赎身金额超过总债务

**场景**：赎身需要 ¥48,000，但总债务只有 ¥30,000

**处理**：仍然按计算金额收取。这是设计的本意——惩罚的不仅是债务本身，而是"选择"的代价

### 5.4 赎身后立即再次抵押

**场景**：玩家赎身后，立刻又选择抵押身体部位

**处理**：允许。但抵押次数会累加，下次赎身倍率继续增长

---

## 6. 测试用例

### 6.1 单元测试

```typescript
describe('赎身机制', () => {
  it('计算第 1 次抵押后的赎身金额', () => {
    const g = createGameState({
      econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
      bodyPartRepayment: { LeftPalm: true }
    })
    
    expect(Engine.calculateRedemptionCost(g)).toBe(12000)  // 8000 × 1.5
    expect(Engine.canRedeem(g)).toBe(true)
  })

  it('计算第 2 次抵押后的赎身金额', () => {
    const g = createGameState({
      econ: { debtLock: 'bodyLocked', lockedDebtAmount: 16000, cash: 50000 },
      bodyPartRepayment: { LeftPalm: true, RightPalm: true }
    })
    
    expect(Engine.calculateRedemptionCost(g)).toBe(48000)  // 16000 × 3.0
    expect(Engine.canRedeem(g)).toBe(true)
  })

  it('现金不足时无法赎身', () => {
    const g = createGameState({
      econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 5000 },
      bodyPartRepayment: { LeftPalm: true }
    })
    
    expect(Engine.canRedeem(g)).toBe(false)
    
    const result = Engine.executeRedemption(g)
    expect(result.success).toBe(false)
    expect(result.message).toContain('现金不足')
  })

  it('赎身后债务解锁但身体不恢复', () => {
    const g = createGameState({
      econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
      bodyPartRepayment: { LeftPalm: true },
      bodyIntegrity: 0.8
    })
    
    const result = Engine.executeRedemption(g)
    expect(result.success).toBe(true)
    
    expect(g.econ.debtLock).toBeNull()
    expect(g.econ.lockedDebtAmount).toBe(0)
    expect(g.bodyPartRepayment.LeftPalm).toBe(true)  // 身体不恢复
    expect(g.bodyIntegrity).toBe(0.8)                 // 完整性不恢复
    expect(g.econ.cash).toBe(3000)                    // 15000 - 12000
  })

  it('债务未锁定时调用赎身返回失败', () => {
    const g = createGameState({
      econ: { debtLock: null, lockedDebtAmount: 0, cash: 50000 }
    })
    
    const result = Engine.executeRedemption(g)
    expect(result.success).toBe(false)
    expect(result.message).toContain('无需赎身')
  })
})
```

### 6.2 集成测试

```typescript
it('完整流程：抵押 → 锁定 → 赎身 → 恢复正常还款', () => {
  const { game, act, repay, redeem } = useGame()
  
  // 初始状态
  game.value.econ.cash = 20000
  game.value.econ.debtPrincipal = 50000
  
  // 选择身体抵押（通过事件）
  triggerBodyPartRepayment('LeftPalm')
  
  // 验证锁定
  expect(game.value.econ.debtLock).toBe('bodyLocked')
  expect(game.value.econ.lockedDebtAmount).toBeGreaterThan(0)
  
  // 尝试现金还款 → 失败
  repay(10000)
  expect(game.value.logs[0].title).toBe('还款被拒绝')
  
  // 攒钱后赎身
  game.value.econ.cash = 50000
  redeem()
  
  // 验证解锁
  expect(game.value.econ.debtLock).toBeNull()
  expect(game.value.bodyPartRepayment.LeftPalm).toBe(true)  // 身体未恢复
  
  // 现在可以正常还款
  repay(5000)
  expect(game.value.logs[0].title).toBe('还款')
})
```

---

## 7. 实施步骤

### 阶段 1：核心逻辑（约 2 小时）

1. 在 `gameEngine.ts` 中新增三个函数：
   - `calculateRedemptionCost`
   - `canRedeem`
   - `executeRedemption`

2. 在 `useGameEconomyActions.ts` 中新增：
   - `redeem` 函数
   - 修改 `repay` 函数的提示信息

### 阶段 2：UI 集成（约 2 小时）

1. 在还款界面增加赎身面板
2. 在事件还款弹窗中增加赎身提示
3. 添加状态提示和警告信息

### 阶段 3：测试与优化（约 1 小时）

1. 编写单元测试
2. 编写集成测试
3. 手动测试边界情况

---

## 8. 风险评估

### 8.1 潜在问题

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 赎身金额过高，玩家永远付不起 | 挫败感 | 确保早期抵押的赎身金额在可达成范围内 |
| 玩家不理解"倍率翻倍"机制 | 困惑 | UI 上明确显示当前倍率和下次倍率 |
| 赎身与身体抵押的事件冲突 | 逻辑混乱 | 确保赎身和抵押是互斥操作 |

### 8.2 回滚方案

如果玩家反馈过于残酷，可以：
- 调整倍率表（如改为 1.2x → 1.5x → 2x → 2.5x）
- 增加"首次赎身折扣"
- 允许特定事件触发"免费赎身"机会

---

## 9. 设计验证

### 9.1 是否符合项目定位？

✅ **符合**。赛博朋克修仙世界的核心主题是"制度剥削"和"越陷越深"。赎身机制：
- 保留了选择的幻觉（可以赎身）
- 但代价越来越重（指数增长）
- 最终让玩家自己意识到"我回不去了"

### 9.2 是否符合"越陷越深"体验？

✅ **符合**。与"完全锁定"相比：
- 完全锁定："系统不让我还钱" → 外部归因
- 赎身机制："我还得起，但越来越贵" → 内部归因（是我自己的选择）

### 9.3 数值是否合理？

以典型游戏进程验证：

```
Day 1-7:   债务 ¥10,000，现金 ¥2,000
           抵押左手掌，减免 ¥8,000
           赎身：¥12,000（1.5x）→ 需要打工约 4 天

Day 15:    债务 ¥30,000，现金 ¥5,000
           又抵押右手掌，锁定累加 ¥16,000
           赎身：¥48,000（3x）→ 需要打工约 16 天

Day 30:    债务 ¥60,000，现金 ¥10,000
           又抵押左臂，锁定累加 ¥31,000
           赎身：¥186,000（6x）→ 几乎不可能
```

**结论**：早期有希望，中期困难，后期绝望——符合"越陷越深"的设计目标。
