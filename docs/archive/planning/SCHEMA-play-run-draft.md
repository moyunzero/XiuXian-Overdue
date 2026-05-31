# Schema 草案（共享）：PlayRunState 与存档 v4

> **ARCHIVED 2026-05-31** — 三模式草案已过时。现网见 `app/types/play.ts`（`RunMode: 'chapter' | 'endless'`）与 [CURRENT-STATE.md](../../CURRENT-STATE.md)。

| 字段 | 内容 |
|------|------|
| 状态 | **Archived**（原 Draft） |
| 适用范围 | M1～M9 共用；各里程碑 SCHEMA 只描述**本阶段新增/修改字段** |
| 上位 | [ROADMAP v2.2](../../ROADMAP-next-iterations.md) |

---

## 1. 设计原则

- **一局一档**：`PlayRunState` 为 v2 主存档体；与 v1 `GameState`（`kunxu_sim_save_v2`）并存过渡期可双写或迁移函数
- **双轴进度**：`lifeStage`（人生叙事）+ `realmTier`（境界跑步机）
- **三模式**：`runMode: sprint | campaign | endless`
- **不破坏 Act1**：`act1BySlot` 保留；M1 起 Act1 进度写入 `PlayRunState.act1` 或继续 slot 键，由 M1 SCHEMA 定稿

---

## 2. 核心枚举

```ts
type RunMode = 'sprint' | 'campaign' | 'endless'

type LifeStage = 'pre' | 'hs' | 'uni' | 'work' | 'done'

/** 境界 ID，无尽模式主进度；字符串可扩展 */
type RealmTierId =
  | 'mortal'      // 未入道（人生阶段）
  | 'lianqi'
  | 'zhuji'
  | 'zifu'
  | 'jiedan'
  | 'yuanying'
  | 'huashen'
  | 'lianxu'
  | string

type ChapterIndex = number  // 阶段内子章节，从 0 起
```

---

## 3. PlayRunState（草案）

```ts
interface PlayRunState {
  schemaVersion: 4
  runId: string
  runMode: RunMode
  createdAt: string
  updatedAt: string

  // --- 进度 ---
  lifeStage: LifeStage
  chapterIndex: ChapterIndex
  realmTier: RealmTierId
  realmIndex: number           // 无尽：0=mortal, 1=lianqi, ...

  // --- 开局（来自 StartConfig）---
  start: StartConfig
  carryoverFromPriorRun?: Act1Carryover

  // --- 经济（与 GameState.econ 对齐，便于迁移）---
  econ: EconomyState

  // --- 学校/排名（高中及以前）---
  school?: SchoolState

  // --- 玩家属性 ---
  stats: PlayerStats

  // --- 压力牌（M2+）---
  pressure?: {
    round: number
    offeredCardIds: string[]
    playedCardIds: string[]
    skippedEffects: Record<string, SkippedCardEffect>
  }

  // --- 灵信线程（M1+ UI，M3+ 内容）---
  inbox?: InboxThread[]

  // --- 无尽专用（M9+）---
  endless?: {
    maintenanceStack: number
    harvestRate: number
    irreversibleLiens: LienRecord[]
    lastBreakthroughDay?: number
  }

  // --- Act1 嵌入（M1 定是否整包迁入）---
  act1?: Act1State

  // --- 日志 / 档案 ---
  logs: LogEntry[]
  profileTags: string[]

  // --- 终局 ---
  runStatus: 'active' | 'collapsed' | 'archived'
  collapseReason?: string
}
```

---

## 4. 存档容器（localStorage）

```ts
interface KunxuSaveV4 {
  saveSchemaVersion: 4
  activeRunId: string | null
  runs: Record<string, PlayRunState>
  /** 元进度：跨 run 解锁，与现有 priorMetaUnlocks 合并 */
  meta: {
    priorMetaUnlocks: string[]
    completedCampaignOnce?: boolean
  }
  /** 兼容：旧 slot 的 Act1 / GameState 迁移前保留 */
  legacy?: {
    slots?: unknown
  }
}
```

**迁移**：`saveSchemaVersion: 3 → 4` 时，若存在 `game` 且无 `runs`，生成默认 `PlayRunState` 并 `lifeStage: 'hs'`。

---

## 5. 数据文件（按里程碑落地）

| 文件 | 里程碑 | 说明 |
|------|--------|------|
| `data/pressureCards.json` | M2 | 压力牌定义 |
| `data/realmTemplates.json` | M9 | 境界规则包 |
| `data/inboxTemplates.json` | M3+ | 灵信消息模板 |

校验脚本（计划）：`scripts/validate-pressure-cards.mjs`、`scripts/validate-realm-templates.mjs`

---

## 6. 与现有类型对照

| 现有 | PlayRunState |
|------|----------------|
| `GameState` | `econ` + `school` + `stats` + `logs` 字段级迁移 |
| `Act1State` | `act1` 嵌套或链接 `act1BySlot` |
| `Act1Carryover` | `carryoverFromPriorRun` |

---

## 7. 开放问题（各 M PLAN 须闭合）

- [ ] M1：`/play` 与 `/act1`、`/game` 路由策略（重定向 vs 并存）
- [ ] M1：新局是否默认 `runMode: sprint` + `lifeStage: 'pre'`
- [ ] M4：`runStatus: collapsed` 与 v1 精神驯化字段合并方式
- [ ] M9：`realmIndex` 与 `lifeStage: done` 的切换时机
