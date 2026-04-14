# 接口定义

## 1. 页面路由

| 路径 | 页面文件 | 用途 |
|------|---------|------|
| `/` | `app/pages/index.vue` | 首页（存档选择/新游戏配置） |
| `/game` | `app/pages/game.vue` | 游戏主界面 |
| `/dev/*` | `app/pages/dev/*.vue` | 开发测试页 |

## 2. Composables 接口

### useGame

主游戏逻辑组合器，位于 `app/composables/useGame.ts`。

```typescript
function useGame(): {
  // 状态
  game: Ref<GameState>
  pendingEvent: Ref<PendingEvent | undefined>
  totalDebt: ComputedRef<number>
  minPayment: ComputedRef<number>
  nextLabel: ComputedRef<string>
  remainingSlots: ComputedRef<number>
  summaryPanelOpen: Ref<boolean>

  // 游戏控制
  startNew(cfg: StartConfig): void
  act(action: ActionId): Promise<void>
  borrow(amount: number): void
  repay(amount: number): void
  resolveEvent(optionId: string): void

  // 存档
  saveToSlot(slot: string): void
  loadFromSlot(slot: string): void
  listSlots(): Promise<GameSlotMeta[]>

  // 总结面板
  openSummaryPanel(): void
  acknowledgeSummaryAndContinue(): void
  closeSummaryPanelWithoutMarking(): void

  // 重置
  reset(): void
}
```

### useGameState

游戏状态定义与管理，位于 `app/composables/useGameState.ts`。

```typescript
function useGameState(): {
  game: Ref<GameState>
  activeSlot: Ref<string>
}

function defaultState(): GameState
```

### useGameStorage

存档系统管理，位于 `app/composables/useGameStorage.ts`。

```typescript
function useGameStorage(): {
  saveToSlot(slot: string): Promise<void>
  loadFromSlot(slot: string): Promise<void>
  listSlots(): Promise<GameSlotMeta[]>
  deleteSlot(slot: string): Promise<void>
  activeSlot: Ref<string>
}
```

## 3. 组件接口

### UI 基础组件

#### Button

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}
```

#### Card

```typescript
interface CardProps {
  variant?: 'default' | 'glass' | 'elevated' | 'danger' | 'success'
  padding?: 'sm' | 'md' | 'lg'
}
```

#### Pill

```typescript
interface PillProps {
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success'
  size?: 'sm' | 'md'
}
```

#### ProgressBar

```typescript
interface ProgressBarProps {
  value: number        // 0-100
  variant?: 'default' | 'gradient' | 'danger' | 'success'
  height?: 'sm' | 'md' | 'lg'
}
```

### 游戏组件

#### EventModal

```typescript
interface EventModalProps {
  payload: EventModalPayload
  onResolve: (optionId: string) => void
  onSkip?: () => void
}

interface EventModalPayload {
  title: string
  body: string
  illustration?: string
  options: EventOptionDisplay[]
  mandatory?: boolean
  tier?: 'critical' | 'normal'
  systemSummary?: string
  systemDetails?: string
  defaultOptionId?: string
}
```

#### DebtDashboard

显示债务概览仪表盘，包括本金、利息、费用池等。

#### StatPanel

显示玩家属性面板，包括道心、法力、肉体强度、疲劳、专注等。

#### LogPanel

日志滚动面板，显示游戏事件记录。

```typescript
interface LogPanelProps {
  logs: LogEntryDisplay[]
  onSelect?: (log: LogEntryDisplay) => void
}
```

#### SummaryPanel

冷数据总结面板（PSY-03），显示游戏统计摘要。

#### HumanModelViewer

Three.js 3D 人体模型查看器。

```typescript
interface HumanModelViewerProps {
  bodyParts: Record<BodyPartId, boolean>  // 已偿还的部位
  bodyIntegrity?: number                    // 0.0-1.0
}
```

## 4. 类型定义

核心类型定义位于 `app/types/game.ts`。

### GameState

主游戏状态对象：

```typescript
interface GameState {
  started: boolean
  seed: number
  startConfig?: StartConfig
  stats: PlayerStats              // 道心/法力/肉体/疲劳/专注
  econ: EconomyState             // 现金/债务/逾期
  school: SchoolState             // 日期/班级/分数
  contract: ContractState        // 契约状态
  logs: LogEntry[]                // 日志历史
  eventHistory?: Record<string, { lastDay: number; times: number }>
  familyHistory?: Record<string, { lastDay: number }>
  pendingEvent?: PendingEvent
  bodyPartRepayment?: Record<string, boolean>
  lastBodyPartRepaymentDay?: number
  bodyIntegrity?: number          // 0.0~1.0
  bodyReputation?: 'clean' | 'marked'
  domestication?: number          // 0~100
  numbness?: number              // 0~100
  summaryUnlocked?: boolean
  summarySeen?: boolean
  collapseFirstDone?: Record<string, boolean>
  collapseModifierActive?: boolean
  // ...
}
```

### ActionId

玩家可执行的行动：

```typescript
type ActionId = 'study' | 'tuna' | 'train' | 'parttime' | 'buy' | 'borrow' | 'repay' | 'rest'
```

### SlotId

每日时段：

```typescript
type SlotId = 'morning' | 'afternoon' | 'night'
```

## 5. 事件系统接口

事件数据位于 `data/events.json`。

### EventDefinition

```typescript
interface EventDefinition {
  id: string
  title: string
  body: string
  type: string
  family?: string                 // 同族互斥
  tone?: 'info' | 'warn' | 'danger' | 'ok'
  phase?: 'afterAction' | 'endOfDay'
  weight?: number
  cooldownDays?: number
  maxTimes?: number
  trigger?: EventTrigger
  tier?: 'critical' | 'normal'
  mandatory?: boolean
  options: EventOptionDefinition[]
}
```

### EventEffect

事件效果类型：

```typescript
type EventEffect =
  | StatEventEffect      // kind: 'stat'
  | EconEventEffect      // kind: 'econ'
  | DebtEventEffect      // kind: 'debt'
  | ContractEventEffect  // kind: 'contract'
  | SchoolEventEffect    // kind: 'school'
  | LogEventEffect       // kind: 'log'
```

## 6. 数据层接口

### localStorage 结构

```
xiuxian_qianfei_slots    -> GameSlotMeta[]
xiuxian_qianfei_autosave -> GameState
xiuxian_qianfei_slot_*   -> GameState
```

## 7. 纯函数引擎接口

游戏引擎位于 `app/logic/gameEngine.ts`，所有函数均为纯函数。

### 核心计算

```typescript
fullDebt(g: GameState): number
scoreForExam(g: GameState, rand: () => number): number
calculateWeeklyMinPayment(totalDebt: number, delinquency: number): number
determineTier(score: number): '示范班' | '普通班' | '末位班'
```

### 状态判定

```typescript
eventMatchesTrigger(event: EventDefinition, g: GameState): boolean
shouldTriggerRepaymentEvent(g: GameState): boolean
shouldUnlockSummary(g: GameState): boolean
canTriggerStrongCollapse(g: GameState): boolean
contractWouldTrigger(g: GameState): boolean
```

### 辅助函数

```typescript
slotOrder(): SlotId[]
describeSlot(slot: SlotId): string
describeDebtPressure(delinquency: number): '低' | '中' | '高' | '极高'
```
