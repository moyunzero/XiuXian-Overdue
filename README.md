# 修仙欠费中

<div align="center">

> **在压迫中挣扎求存 · 在绝望中寻找出路**  
> 一款探索修仙世界中阶级固化、债务螺旋与生存压力的赛博朋克风格生存模拟

[![在线体验](https://img.shields.io/badge/🎮_在线体验-debt--xiuxian.online-00DC82?style=for-the-badge)](https://debt-xiuxian.online/)

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5.30-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-800%2B-729B1B?logo=vitest)](./app/)
[![License](https://img.shields.io/badge/License-学习交流-blue)](./LICENSE)

[在线游玩](https://debt-xiuxian.online/) · [快速开始](#-快速开始) · [贡献指南](#-贡献指南) · [文档索引](./docs/README.md)

</div>

---

## 项目简介

**修仙欠费中**是一款 Web 单机生存模拟：玩家从**入学前夜**挤进体制，在分数、债务与身体三条制度线下讨价还价。本作**不是**宗门爽游或战力排行榜游戏。

核心机制：

| 主题 | 含义 |
|------|------|
| **分数 = 权限** | 月考/关口决定分班、资源与待遇 |
| **债务 = 倒计时** | 复利、逾期、催收与灵贷条款 |
| **身体 = 耗材** | 抵押、赎身、完整度与制度折价 |
| **系统的恶意** | 推销、零工、排名与「庆典后更重的一击」 |

视觉气质：赛博朋克 / 反乌托邦 —— 霓虹、档案、冷制度口吻。

---

## 当前玩法（v4 · 四十周灵贷契约）

**主入口**：[`/play`](./app/pages/play/index.vue)（首页「开始修行 / 继续修行」均进入此壳）

```text
首页 / → 开局配置 → /play
                    ├─ S0 入学前夜（Act1 桌面：面试 / 灵贷 / 家庭）
                    └─ Chapter 0 · 四十周灵贷契约（runMode: chapter）
                         ├─ 高中 → 大学预科 → 职场（40 周内自动推进）
                         ├─ 主循环：周仪表盘（还灵贷 / 刷题 / 吐纳 / 零工 / 休息）
                         ├─ 仙司来文（制度推送，取代 endless 4 选 2 压力牌主路径）
                         ├─ 天道审判关（月考、筑基、择宗、择业、W40 终局）
                         └─ 崩盘：债务 / 身体 / 断供 / 审查
```

**Legacy**：旧版 Endless 压力牌壳与 [`/game`](./app/pages/game.vue) 三段式已下线或迁移；读档时 `endless + hs` 可迁移为 `chapter`。`/act1`、`/profile` 重定向至主路径。

**存档**：浏览器 `localStorage` 键 **`kunxu_sim_save_v5`**，根级 `saveSchemaVersion: 6`（chapter 字段），多槽位 + 跨周目元进度（`meta`）。

### 开发状态（2026-05-31）

| 维度 | 状态 |
|------|------|
| v3 单线 pivot（M-pivot-1） | ✅ 已交付（`c80db1c`） |
| v4 Ch0 契约章（R-chapter-0 + U-ch0） | 🔶 逻辑 ✅ · **U5 人玩 / Beta 待办** |
| 工程门禁 | ✅ `HARNESS_OK` + E2E 2/2 |
| 人玩 / Beta | 🔶 [playtest-checklist-ch0.md](./docs/playtest-checklist-ch0.md) |
| meta / 移动 / 离线 | ❌ 未开始（见 [ROADMAP-v3-endless-only.md](./docs/ROADMAP-v3-endless-only.md)） |

---

## 项目亮点

- **周计划 + 制度来文**：Ch0 主循环为「本周怎么活」仪表盘 + 仙司来文，非 endless 每回合抽牌
- **人生阶梯叙事**：入学前夜 → 高中 → 大学 → 职场 → 无尽境，阶段内自动推进，无需选手动模式
- **规则与 UI 分离**：数值与流程在 `app/logic/*` 纯函数；Vue composable 只编排
- **Harness 机械门禁**：`yarn harness:verify` → `HARNESS_OK`，契约 spec 防玩家卡点回归
- **800+ 单元测试**：Vitest 覆盖 logic / composable / 流程契约
- **可选 AI 事件**：Groq LLM 动态生成事件（需 `.env` 配置，非必玩路径）

---

## 截图

> 下列截图为早期 `/game` 界面，主玩法 UI 已迁移至 `/play`；视觉风格一致，布局以在线版为准。

<div align="center">

<img src="./docs/screenshots/screenshot-start.png" alt="开局配置" width="800"/>

<img src="./docs/screenshots/screenshot-game.png" alt="游戏主界面（legacy）" width="800"/>

<img src="./docs/screenshots/screenshot-body-repayment.png" alt="身体偿还" width="800"/>

</div>

---

## 快速开始

### 在线体验（推荐）

[https://debt-xiuxian.online/](https://debt-xiuxian.online/)

### 本地运行

**环境**：Node.js 18+ · **包管理器推荐 Yarn**

```bash
git clone https://github.com/moyunzero/XiuXian-Overdue.git
cd XiuXian-Overdue
yarn install
yarn dev          # http://localhost:3000
```

### 验证与测试

```bash
yarn test                    # 全量 Vitest
yarn test:act1               # Act1 / 家庭线
yarn harness:verify          # 交付门禁（须 HARNESS_OK）
yarn harness:verify --full     # PR / 发布前
yarn validate:events           # data/events.json
yarn validate:pressure-cards   # data/pressureCards.json
yarn build                     # 生产构建
```

可选 E2E：`yarn test:e2e`（Playwright，需本地 dev 或 preview）。

### AI 事件（可选）

根目录 `.env`：

```bash
GROQ_API_KEY=your_api_key_here
```

---

## 项目结构

```text
xiuxian-sim/
├── app/
│   ├── pages/
│   │   ├── index.vue          # 开局、存档槽、继续修行
│   │   ├── play/index.vue     # ★ 主玩法 /play
│   │   ├── game.vue           # Legacy 重定向
│   │   └── dev/               # 开发试验页
│   ├── components/
│   │   ├── play/              # PlayShell、压力牌、债务盘、setpiece 屏…
│   │   ├── act1/              # 入学前夜桌面壳
│   │   ├── home/              # 首页
│   │   └── game/              # Legacy 组件（供后续复用）
│   ├── composables/
│   │   ├── usePlayStorage.ts  # v5 存档
│   │   ├── useAct1Session.ts  # S0 编排
│   │   └── usePlay*Session.ts # 高中 / 大学 / 职场 / 无尽
│   ├── logic/
│   │   ├── play/              # ★ 压力牌、章节、无尽、setpiece…
│   │   ├── act1/              # 入学前夜规则
│   │   └── gameEngine.ts      # Legacy 核心规则（债务/考试/身体抵押）
│   └── types/
│       ├── play.ts            # PlayRunState、LifeStage、RunMode
│       └── act1.ts
├── data/
│   ├── pressureCards.json     # 压力牌
│   ├── inboxTemplates.json    # 灵信模板
│   ├── jobs.json              # 职场岗位
│   ├── realmTemplates.json    # 无尽境界
│   ├── events.json            # Legacy 基础事件
│   └── eventTemplates.json
├── docs/                      # 公开文档（见 docs/README.md）
├── .harness/manifest.json     # Gate / 契约表
└── e2e/                       # Playwright 冒烟
```

### 架构原则

- **规则在 `app/logic`**，禁止 logic 层 import Vue / pages / components
- **全屏玩法页**须铺满视口宽度（PlayShell / Act1 桌面壳）
- **Setpiece 与压力恢复**统一走 `app/logic/play/setpieceFlow.ts`
- 贡献者与 AI Agent 薄索引：[AGENTS.md](./AGENTS.md)

---

## 核心系统（玩家向 · Ch0）

### 周计划与账期

每周在仪表盘确认一次「本周怎么活」：还灵贷（档位）、刷题/吐纳/零工/休息小时分配。顶栏与债务盘显示 **第 N/40 周账期**；推进后触发计息、来文与审判关。

### 仙司来文

制度推送落到灵信桌面（非 endless 时代的每回合 4 选 2 抽牌）。拖延或硬扛会抬高下周压力；麻木/驯化会灰掉部分选项。

### 债务与身体

- 借贷 / 还款 / 逾期档位 / 断供链（`supplyCutStreak`）
- 身体完整度与抵押；完整度影响刷题效率，吐纳不受影响
- 崩盘：债务压力、身体底线、审查关未过

### 关口与 setpiece

月考、筑基、择宗、三轨择业、W40 终局等**强节拍**界面；确认后回到周仪表盘或进入下一段。

### 制度档案与标签

局末 **征信灵籍**（W40）或 **崩盘归档**（含「怎么走到这一步」复盘）；标签影响来文权重与文案。

---

## 贡献

### 我能做什么？

| 方式 | 说明 |
|------|------|
| **写事件 / 压力牌** | 编辑 `data/events.json`、`data/pressureCards.json` 等，跑对应 `yarn validate:*` |
| **报 Bug** | [Issues](https://github.com/moyunzero/XiuXian-Overdue/issues) |
| **提建议** | [Discussions](https://github.com/moyunzero/XiuXian-Overdue/discussions) |
| **提代码** | Fork → 分支 → `yarn harness:verify` 通过 → PR |

事件作者请先读 [事件贡献指南](./docs/事件贡献指南.md) 与 [事件创作指南](./docs/事件创作指南.md)。

### 代码规范（摘要）

- TypeScript + Vue 3 Composition API
- 改 `app/logic/*` 须带或更新 `*.spec.ts`
- 交付前 **`yarn harness:verify`** 输出 `HARNESS_OK`
- 禁止提交 `.env`、密钥；`best.md` 仅本地策划参考，**不得入库**

---

## 产品方向（公开摘要）

> **修仙不是逆天改命，而是无休止的还贷。**

长线体验是**人生阶梯 + 无尽境界跑步机**：每升一阶以为逃出底层，结算却发现只是换了一张更贵的账单。详细里程碑与迭代计划为**仓库内本地开发文档**，不随公开仓库发布；对外以可玩版本与上述核心命题为准。

**刻意不做**：战力榜、签到成就、云存档优先、多人在线 —— 与「孤立受压」主题冲突。

---

## 文档

| 文档 | 说明 |
|------|------|
| [docs/CURRENT-STATE.md](./docs/CURRENT-STATE.md) | **产品 + 工程单一真相** |
| [docs/README.md](./docs/README.md) | 公开文档索引 |
| [AGENTS.md](./AGENTS.md) | AI / 贡献者薄索引（命令、关键路径） |
| [docs/harness-engineering.md](./docs/harness-engineering.md) | 验证门禁与 PEV 工作流 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Composable 架构（含 legacy useGame） |
| [docs/事件贡献指南.md](./docs/事件贡献指南.md) | 无需编程的贡献流程 |

---

## 致谢

设计灵感来自小说《没钱修什么仙？》（熊狼狗）对**分数、债务与系统性压迫**的呈现；气质参考赛博朋克反乌托邦与制度生存类作品（如 *Papers, Please* 式压迫感）。

技术支持：Nuxt · Vue · TypeScript · Vitest · Vercel

---

## 许可证

本项目仅供学习与交流使用。

---

<div align="center">

**欠费不停，修行不止。**

[立即体验](https://debt-xiuxian.online/) · [文档](./docs/) · [贡献](#贡献)

</div>
