# 项目现状（单一真相 · v5 · 2026-06-20）

> **读者**：策划、程序、AI Agent。与 [README](../README.md)、[AGENTS.md](../AGENTS.md) 对齐。  
> **验证**：`yarn harness:verify --full` → **HARNESS_OK** · 存档 schema **v7** · 主路径 **`runMode: fate_run`**（新局经 `ensureFateRunMode`）

---

## 1. 产品形态（当前可玩）

```text
/ → 开局 StartConfig → /play
                        ├─ S0 入学前夜（Act1 · useAct1Session）
                        └─ v5 无限里程碑（fate_run · useChapterSession · milestoneWeekFlow）
                             ├─ **Stage ladder**：`data/stages/*` 指针包
                             │    ├─ M0 入学前夜 · M1 灵贷契约（ch0 指针）· M2–M4 骨架
                             │    └─ W40 **无终局** · W41→M2（`stage-m2-hs`）续玩
                             ├─ **账号 meta**：`kunxu_sim_meta_v1` · FateCodexStrip · 多槽 · 条款包
                             ├─ **周循环**：四瓷片 + 仙司来文 → scheduleMandateFlow → 周结算
                             ├─ **命运链**：human → mortgaged → head_jar → ghost_bound（可续玩）
                             │    ├─ `fateCatalog` JSON 真源 · `FateUpdateOverlay` · `TraumaArchiveChip`
                             │    └─ ghost_bound：双账 settlement（人账/鬼账）
                             ├─ 审判关：setpieceFlow（月考/筑基/择宗/三轨…）
                             └─ 崩盘/归档：可选 archive；**非** W40 强制终局
```

| 维度 | 当前 | Legacy |
|------|------|--------|
| 主循环 | 四瓷片 + 来文 + 周结算 | Endless 4 选 2 |
| runMode | **fate_run**（周推 `milestoneWeekFlow`） | `chapter` 读档可 coerce |
| 内容解析 | `stageRegistry` + chapter 指针 | 仅 `chapterRegistry` |
| 试玩清单 | [playtest-checklist-v5.md](./playtest-checklist-v5.md) | [playtest-checklist-ch0.md](./playtest-checklist-ch0.md) |

**人玩放行**：v5 checklist + `yarn test:e2e:phase8-uat` preflight。

---

## 2. 技术栈与门禁

| 项 | 值 |
|----|-----|
| 框架 | Nuxt 4.3 · Vue 3.5 · TypeScript |
| 规则层 | `app/logic/*` |
| 编排 | `useChapterSession` · `useAct1Session` |
| 存档 | `kunxu_sim_save_v5` · **saveSchemaVersion: 7** · meta `kunxu_sim_meta_v1` |
| 交付 | `yarn harness:verify --full` → **HARNESS_OK** |
| UI preflight | `yarn test:e2e:phase8-uat` |
| 契约 | `stage-content-flow` · `ghost-bound-flow` · `fate-continuity-flow` · `fate-meta-unlock` · `validate:stages` 等 → `.harness/manifest.json` |

---

## 3. 主路径代码地图

| 环节 | 路径 |
|------|------|
| 路由 | `app/pages/play/index.vue` → `PlayChapterScreenHost` |
| 屏幕 | `resolvePlayScreen.ts` |
| Stage | `stageRegistry.ts` · `data/stages/*/stage.json` |
| 章指针 | `chapterRegistry.ts` · `ch0-forty-week-contract.json` |
| 周推 | **`milestoneWeekFlow.ts`** · `chapterWeekFlow.ts` · `scheduleMandateFlow.ts` |
| 命运 | `fateCatalog.ts` · `fateTransition.ts` · `fateShellRegistry.ts` |
| 来文 | `mandateRegistry.ts` · `mandateDelivery.ts` |
| setpiece | `setpieceFlow.ts` |
| meta | `useMetaStorage.ts` · `metaProgress.ts` |

---

## 4. 文档分层

### 必读

| 文档 | 用途 |
|------|------|
| **本文件** | v5 工程真相 |
| [REDESIGN-v5-milestone-fates.md](./REDESIGN-v5-milestone-fates.md) | v5 设计锁 |
| [playtest-checklist-v5.md](./playtest-checklist-v5.md) | 对外试玩（主持人） |
| [harness-engineering.md](./harness-engineering.md) | PEV · `--full` · phase8 UAT |
| [交互流程图.md](./交互流程图.md) | 路由 / 屏 ID |

### 参考

| 文档 | 说明 |
|------|------|
| [REDESIGN-v4-chapter-institutional.md](./REDESIGN-v4-chapter-institutional.md) | v4 章制史 |
| [playtest-checklist-ch0.md](./playtest-checklist-ch0.md) | v4 试玩（W40 终局版） |
| [事件创作指南.md](./事件创作指南.md) | 事件 + §10 stage 包 |

---

## 5. 常见误区

| 过期说法 | 现行 |
|----------|------|
| W40 必出契约终局 | fate_run **W40 续玩**；无 `contract-finale` 闸门 |
| save v6 | **v7** |
| 仅 chapter 主路径 | **fate_run** + stage manifest |
| Ch0 JSON 即唯一内容源 | M1 经 `data/stages/m1-contract/stage.json` 指针 |

---

## 6. 修订

| 日期 | 说明 |
|------|------|
| 2026-06-20 | **Phase 8**：v5 工程真相切换 · playtest-checklist-v5 · phase8 handoff UAT · harness `--full` |
| 2026-06-20 | Phase 7：stage manifests · fate catalog · `stage-content-flow` |
| 2026-06-20 | Phase 6：ghost_bound 双账 |
| 2026-06-19 | Phase 4–5：命运切片 · meta 档案 |
