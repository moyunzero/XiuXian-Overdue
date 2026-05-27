# Harness Engineering（AI Agent 验证体系）

本仓库采用 **Plan → Execute → Verify（PEV）** 与 **机械门禁（Mechanical Gates）**，让 AI Agent 在写代码过程中自行发现错误，而不是交付后由人工点流程排查。

参考实践：[awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering)、GitHub 企业级 Agent 治理（2026）、以及本仓库从「家庭账本卡点」类事故中沉淀的**流程契约测试**。

---

## 1. 核心原则

| 原则 | 本仓库做法 |
|------|------------|
| **验证与实现分离** | 规则在 `app/logic/*` + Vitest；UI 只编排。Agent 不得「改完让你点一下」。 |
| **机械门禁优先于口头约定** | `yarn harness:verify` 失败 = 任务未完成。 |
| **错误一次，测试锁一辈子** | 玩家卡点、展示与状态脱节 → 必须加 `*.spec.ts`（见 `act1FamilyFlow.spec.ts`）。 |
| **规则在仓库里，不在对话里** | `AGENTS.md`、`.cursor/rules/harness.mdc`、`.harness/manifest.json` 跨会话生效。 |
| **增量验证** | 默认按 `git diff` 只跑相关 gate，节省时间。 |

---

## 2. 一键命令（Agent 必知）

```bash
# 推荐：按变更文件选择 gates + 契约 spec
yarn harness:verify

# 快路径：跳过 build 等慢 gate
yarn harness:verify --quick

# 发布前 / PR 前：全量 gates
yarn harness:verify --full

# 含 Nuxt build（慢）
yarn harness:verify --full --with-build

# JSON 报告（CI / 脚本解析）
yarn harness:verify --json

# 仅架构边界
yarn harness:architecture
```

报告写入 `.harness/last-verify.json`（本地，已 gitignore）。

---

## 3. Gate 清单（`.harness/manifest.json`）

| Gate ID | 命令 | 何时触发 |
|---------|------|----------|
| `architecture` | `architecture-check.mjs` | 改 `app/logic` / composables / pages / components |
| `test` | `yarn test` | 改 logic / composables |
| `test:act1` | `yarn test:act1` | 改 Act1 相关路径 |
| `validate:events` | `yarn validate:events` | 改 `data/events.json` 等 |
| `test:storage` | `useGameStorage.spec.ts` | 改存档 / `GameState` |
| `build` | `yarn build` | 仅 `--full --with-build` |

**契约（Contracts）**：除 gate 外，若变更命中 `manifest.contracts[].triggerPaths`，会额外跑对应 spec（例如改 `familyLedger.ts` 必跑 `act1FamilyFlow.spec.ts`）。

---

## 4. PEV 工作流（每个需求）

### Plan

1. 复制 [`.harness/PEV.template.md`](../.harness/PEV.template.md) → `.harness/PEV.md`（可选提交）。
2. 写清**可验证**成功标准（测试名、命令、状态变化），禁止「应该没问题」。
3. 列出将改文件 + 将跑的 `yarn harness:*` / spec。

### Execute

1. **规则进 `app/logic`**，Vue 只调用逻辑函数。
2. 新分支/门槛/结局 → **同步** `*.spec.ts`。
3. 小步改、小步跑：`yarn harness:verify --quick`。

### Verify

1. `yarn harness:verify`（或 `--full`）直到 `HARNESS_OK`。
2. 在 PEV.md 记录命令与结果。
3. 仅当 spec 无法覆盖时，才在 PEV 中注明「需人工看一眼」的范围（应用 CSS 像素级等）。

跨会话：用 [`.harness/progress.template.md`](../.harness/progress.template.md) 维护 `.harness/progress.md`。

---

## 5. 架构边界（自动检查）

`scripts/harness/architecture-check.mjs` 强制：

- `app/logic/**` 不得 `import` `~/pages`、`~/components`、`vue`、`#app`
- `app/composables/**` 不得 `import` `~/pages`

违反即 exit 1，Agent 应在 Verify 阶段自行修复，而非交给人工 code review 才发现。

---

## 6. 与 CI 的关系

- **PR / push**：`.github/workflows/harness.yml` 跑 `yarn harness:verify --full`。
- **events 专用**：`.github/workflows/validate-events.yml`（路径触发，保留）。

本地与 CI 使用同一套 manifest，避免「我机器上过了」。

---

## 7. 新增功能时 Agent 检查表

- [ ] 成功标准能否写成 Vitest 或 `validate:*`？
- [ ] 是否误把数值/门控写在 `.vue` 里？
- [ ] 是否更新 `manifest.json` 的 `triggerPaths`（若新目录）？
- [ ] 是否跑 `yarn harness:verify` 并在回复中贴 `HARNESS_OK`？
- [ ] 是否避免「请用户手动测 3 遍流程」？

---

## 8. 文件索引

| 路径 | 用途 |
|------|------|
| [AGENTS.md](../AGENTS.md) | Agent 主手册（含 Act1 契约） |
| [.harness/manifest.json](../.harness/manifest.json) | Gate 定义（机器可读） |
| [scripts/harness/verify.mjs](../scripts/harness/verify.mjs) | 验证编排 |
| [scripts/harness/architecture-check.mjs](../scripts/harness/architecture-check.mjs) | 分层检查 |
| [app/logic/act1/act1FamilyFlow.spec.ts](../app/logic/act1/act1FamilyFlow.spec.ts) | 家庭线防卡点范例 |

---

## 9. 扩展 Harness

1. 在 `manifest.json` 的 `gates` 增加一项（`id`、`command`、`triggerPaths`）。
2. 在 `package.json` 增加对应 `yarn` 脚本（如需）。
3. 跑 `yarn harness:verify --full` 确认 manifest 合法。
4. 在本文档 Gate 表补一行说明。

**不要**只靠 AGENTS.md 口头要求；**要**让 `verify.mjs` 跑得到。
