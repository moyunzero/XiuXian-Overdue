# 文档索引

本目录收录**可公开**的设计说明、贡献流程与架构笔记。项目概况见 [README 根文档](../README.md)。

AI 编码代理请先读 **[AGENTS.md](../AGENTS.md)**（交付门禁、关键路径、边界）。

**交付前必跑**：[Harness Engineering](./harness-engineering.md) → `yarn harness:verify` → **HARNESS_OK**

> 里程碑 PLAN、内部 PRD、路线图等**开发文档**位于本地 `docs/planning/`、`docs/ROADMAP-*.md` 等路径，已加入 `.gitignore`，不随公开仓库发布。克隆公开仓库后若无这些文件，以 README 与 AGENTS 为准即可参与贡献。

---

## 参与贡献

| 文档 | 说明 |
|------|------|
| [事件贡献指南](./事件贡献指南.md) | **无需编程**：在 GitHub 上编辑 JSON、开 PR |
| [事件创作指南](./事件创作指南.md) | 事件 JSON 字段、触发器、`effects` 与校验 |

### 内容数据校验

| 数据文件 | 命令 |
|----------|------|
| `data/events.json` | `yarn validate:events` |
| `data/pressureCards.json` | `yarn validate:pressure-cards` |
| `data/inboxTemplates.json` | `yarn validate:inbox-templates` |
| `data/jobs.json` | `yarn validate:jobs` |
| `data/realmTemplates.json` | `yarn validate:realm-templates` |

---

## 工程

| 文档 | 说明 |
|------|------|
| [harness-engineering.md](./harness-engineering.md) | PEV 工作流、验证门禁、CI |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Composable 架构（含 legacy `useGame`） |

---

## 设计与数值（参考）

| 文档 | 说明 |
|------|------|
| [ROADMAP-v3-endless-only.md](./ROADMAP-v3-endless-only.md) | **v3 主线**：S0 → Endless 单线；废弃 sprint/campaign |
| [系统逻辑总览](./系统逻辑总览.md) | 时间轴、分班、债务与行动（含 legacy `/game` 描述） |
| [开发者技术架构指南](./开发者技术架构指南.md) | 模块边界与扩展点 |
| [交互流程图](./交互流程图.md) | 主要界面与状态流转 |
| [代码全流程与功能事件概率总览](./代码全流程与功能事件概率总览.md) | 代码路径与事件概率 |
| [事件与数值联动关系表](./事件与数值联动关系表.md) | 事件与数值对应 |
| [事件触发概率手册](./事件触发概率手册.md) | 触发条件与概率 |
| [数值影响与边际效应指南](./数值影响与边际效应指南.md) | 属性与经济边际 |
| [PSY系统与叙事螺旋](./PSY系统与叙事螺旋.md) | 心理 / 叙事机制 |
| [身体系统深度解析](./身体系统深度解析.md) | 抵押、赎身与完整度 |

---

## 资源

- [screenshots/](./screenshots/) — README 引用截图（部分为 legacy UI）
