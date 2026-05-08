# useGame Composable Architecture

## Overview

The `useGame` composable manages the core game state and orchestrates specialized sub-modules for different concerns. This document describes the refactored architecture.

## Module Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                           useGame.ts                                  │
│                         (204 lines)                                  │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ useGameState│  │useGameStorage│ │useCausalGraph│ │socialNetwork│ │
│  │   (state)   │  │  (slots)    │  │(action graph)│ │  (engine)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼─────────────────┼────────────────┼───────────────┼────────┘
          │                 │                │               │
          ▼                 ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Composed in useGame()                           │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Sub-Module Composables                           │
├──────────────┬──────────────┬──────────────┬─────────────────────────┤
│ useGame      │ useEmotional │ useGame      │ useGame                │
│ Computed     │ Memory       │ Economy      │ Event                  │
│ (metrics)    │ Storage      │ Actions     │ Resolver               │
├──────────────┴──────────────┼──────────────┴─────────────────────────┤
│                             │                                        │
│                     useGameActionExecutor                             │
│                      (action orchestration)                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### useGame.ts (204 lines)
- Central orchestrator
- UI state management (summary panel)
- Module composition
- Return API surface

### useGameComputed.ts
Computes derived game metrics:
- `totalDebt`: Current total debt with interest
- `creditLimit`: Available credit based on debt
- `minPayment`: Minimum payment required
- `accumulatedMinPayment`: Accumulated minimum payments
- `profileSnapshot`: Current social profile
- `profileHistory`: Profile change history (max 50 entries)
- `profileDigest`: Profile hash for change detection
- `classPressureDigest`: Class tier pressure hash
- `remainingSlots`: Available action slots
- `refreshProfileSnapshot()`: Detects profile changes, creates history entries

### useEmotionalMemoryStorage.ts
Persistent session memory:
- `loadEmotionalMemory()`: Load from localStorage
- `saveEmotionalMemory()`: Persist to localStorage
- `recordCurrentSession()`: Track session state
- Session timing and anti-profile streak tracking

### useGameEconomyActions.ts
Financial operations:
- `borrow()`: Take on new debt
- `repay()`: Make debt payments
- Debt locking logic
- Transaction logging

### useGameEventResolver.ts
Event system:
- `resolveEvent()`: Process event option selections
- `applyEventEffects()`: Apply event consequences
- `randomPoolAfterAction()`: Trigger random events
- `computeHiddenContributions()`: Calculate hidden modifiers

### useGameActionExecutor.ts
Action orchestration:
- `act()`: Execute player actions
- Period/day advancement
- Contract triggers
- Action statistics

## Dependency Flow

```typescript
useGame()
├── useGameState()           // Core state
├── useGameStorage()         // Slot persistence
├── useCausalGraph()         // Action graph tracking
├── socialNetwork           // Social engine
│
├── useGameComputed(game)           // Metrics
├── useEmotionalMemoryStorage()     // Memory
├── useGameEconomyActions()         // Finances
├── useGameEventResolver()          // Events
│
└── useGameActionExecutor(..., recordGameAction)
    └── Coordinates all subsystems
```

## Design Decisions

### Separation of Concerns
Each module handles one domain:
- **Computed**: Read-only calculations
- **Storage**: Persistence concerns
- **Actions**: State mutations
- **Events**: Event system logic
- **Executor**: Action orchestration

### Dependency Injection
Modules receive dependencies as parameters rather than creating them internally, enabling:
- Easier testing with mocks
- Clear dependency contracts
- Better code organization

### Backward Compatibility
The `useGame()` return API remains unchanged after refactoring:
- All existing usages continue to work
- New modules are internal implementation details

## Testing Strategy

Each module has its own spec file:
- `useGameComputed.spec.ts`
- `useEmotionalMemoryStorage.spec.ts`
- `useGameEconomyActions.spec.ts`
- `useGameEventResolver.spec.ts`
- `useGameActionExecutor.spec.ts`

Total: 489 tests

## Migration History

| Phase | Module | Lines Removed | Date |
|-------|--------|---------------|------|
| 1 | useGameComputed | 55 | Phase 1 |
| 2 | useEmotionalMemoryStorage | 41 | Phase 2 |
| 3 | useGameEconomyActions | 96 | Phase 3 |
| 4 | useGameEventResolver | 252 | Phase 4 |
| 5 | useGameActionExecutor | 178 | Phase 5 |
| **Total** | | **622** | |

## 制度档案系统

### 页面结构

```
pages/profile.vue (制度档案页面)
├── 风险评分仪表盘
│   ├── conic-gradient 圆形仪表盘 (综合风险评分)
│   ├── 四维维度等级卡片 (财务风险/教育信用/制度顺从/身体资产)
│   └── 系统评语 (generateSystemNote)
├── 标签时间线
│   ├── 垂直时间轴布局 (最新在前)
│   ├── 按类型着色 (红/蓝/绿/紫)
│   └── 收起/展开 (默认显示最近5条)
├── 评估历史表格
│   ├── 日期/触发原因/风险分/主要维度/系统备注
│   └── 风险分颜色编码
└── 空状态组件 (components/profile/EmptyState.vue)
    ├── 脉冲动画
    └── SVG 图标动画
```

### 数据流

```
useGameComputed.refreshProfileSnapshot()
├── JSON.stringify 深度比对新旧画像
├── 变化时创建 ProfileHistoryEntry
│   ├── timestamp: 时间戳
│   ├── profile: 画像快照
│   ├── riskScore: 风险评分 (calculateRiskScore)
│   ├── tags: 标签列表
│   └── triggerReason: 触发原因
├── slice(-50) 限制历史记录上限
└── pages/profile.vue 读取并渲染
```

### 风险评估算法

```typescript
calculateRiskScore(profile): number
├── financialRisk: low=10, medium=30, high=60, extreme=100 (权重 0.35)
├── educationCredit: discarded=80, unstable=50, investable=25, preferred=10 (权重 0.25)
├── compliance: resistant=70, softened=50, obedient=30, domesticated=10 (权重 0.20)
└── bodyAsset: intact=10, marked=30, mortgaged=60, depleted=90 (权重 0.20)

generateSystemNote(profile): string
├── 基于标签组合生成评语
├── 高风险标签 → 警告语气
├── 优等标签 → 肯定语气
└── 混合标签 → 平衡评价
```

### 旧档迁移

```typescript
// useGameStorage.ts
加载存档时:
├── 无 profileHistory → 初始化为 []
├── 有 profileSnapshot 但无历史 → 创建首条记录
└── 后续通过 refreshProfileSnapshot() 自动追加
```
