# v5 对外试玩 Checklist（无限里程碑 · 命运态可续玩）

| 字段 | 内容 |
|------|------|
| **版本** | v5.0 · `fate_run` + stage ladder（M0–M4） |
| **用途** | 2～3 人小规模试玩 + 主持人记录；**不发给玩家** |
| **成功标准来源** | [REDESIGN-v5-milestone-fates.md](./REDESIGN-v5-milestone-fates.md) §12 · [CURRENT-STATE.md](./CURRENT-STATE.md) |
| **v4 历史清单** | [playtest-checklist-ch0.md](./playtest-checklist-ch0.md)（四十周终局版，仅作对照） |
| **建议时长** | **短局 45～60 分钟** · **中局 75～90 分钟**（含 Act1） |

---

## 0. 试玩前（主持人 · 15 分钟）

### 工程 preflight（必须绿才开人玩）

- [ ] `yarn harness:verify --full` → **HARNESS_OK**
- [ ] `yarn test:e2e:phase8-uat` → **7/7 PASS**（串行；截图见 `e2e/artifacts/phase8-uat/`）
- [ ] `yarn test:e2e:v5-playtest` → **3 试玩员串行 PASS**（§1–§4 模拟；截图见 `e2e/artifacts/v5-playtest/`）
- [ ] 报告：[`docs/v5-playtest-simulation-report.md`](./v5-playtest-simulation-report.md)
- [ ] 发布前推荐：`yarn harness:verify --full --with-build`

### 环境

- [ ] `yarn dev` → `http://localhost:3000` 或 preview URL
- [ ] **硬刷新 / 无痕**；存档 `kunxu_sim_save_v5`（schema **v7**）· meta `kunxu_sim_meta_v1`
- [ ] 桌面 Chrome/Safari；宽屏无右侧黑边

### 自动化对照表

| Checklist | Playwright UAT | 截图 |
|-----------|----------------|------|
| §0 meta | UAT-1 | `test-01-meta-codex.png` |
| §1 周循环 | UAT-2 | `test-02-m1-dashboard.png` |
| §1 来文 | UAT-3 | `test-03-mandate-inbox.png` |
| §3 灵籍 | UAT-4 | `test-04-overlay-before.png` · `test-04-overlay-dismissed.png` |
| §2 W40 | UAT-5 | `test-05-w40-continuity.png` |
| §2 W41→M2 | UAT-6 | `test-06-w41-m2.png` |
| §3 幽影 | UAT-7 | `test-07-ghost-bound.png` |

---

## 1. 短局脚本（45～60 分钟）

> 目标：10 分钟内懂 **排程 + 来文 + 账单**（REDESIGN §12）。

| 分钟 | 阶段 | 玩家做什么 | 主持人观察 |
|------|------|------------|------------|
| 0–2 | 首页 | StartConfig → **开始修行** | 账号档案 / FateCodexStrip 是否可读 |
| 2–15 | Act1 | 面试 → 灵贷 → 家庭（最短路径） | 是否懂「签了什么」 |
| 15–18 | 进入 Play | `/play` 四瓷片周排程 | **无** endless 4 选 2 误解 |
| 18–28 | W1–3 | 调还款/刷题/零工/休息 → **确认本周** | 债务仪表盘可读 |
| 28–38 | 来文 | 处理 1～2 张仙司来文 | 是否像「被甩脸」 |
| 38–45 | 自由 1～2 周 | 可沿用上周 | 非节点周节奏 |

**短局结束访谈**（§4）— 不必打满 W40。

---

## 2. 中局脚本（75～90 分钟）

> 目标：验证 **W40 无终局**、**W41→M2 续玩**、关键审判关仍像「关口」。

| 段落 | 契约周 | 必观察 | 勾选 |
|------|--------|--------|------|
| Act1 | — | 情绪铺垫 | ☐ |
| 高中 | W1–16 | 月考 W4/8/12；W16 筑基审判 | ☐ |
| 大学 | W17–28 | W17 择宗；W28 预科结业 | ☐ |
| 职场 | W29+ | W29 三轨（可选） | ☐ |
| **续玩** | **W40** | **仍显示周排程；不出现「契约终局」全屏** | ☐ |
| **学籍段** | **W41** | **进入 M2 学籍段，可继续排程** | ☐ |

---

## 3. 命运链观察（可选加深）

| 形态 | 观察点 |
|------|--------|
| human → mortgaged | 灵籍更新 overlay · 抽血 grit · TraumaArchiveChip |
| mortgaged → head_jar | DelegationPanel 维生+委托 |
| head_jar → ghost_bound | 阴司来文链 · 人账/鬼账 settlement（中局可选） |

主持人记录：玩家是否感到「像书里路人，不是主角」。

---

## 4. 结束访谈（必问 · REDESIGN §12）

1. **路人感**：「我像修仙小说里的配角/路人，还是像天命主角？」（期望：配角/路人）
2. **续玩意愿**：抵押或器藏后，愿不愿意**无教程再玩 5 周**？
3. **10 分钟懂循环**：能否用自己的话说清「这周怎么活、钱从哪来、卷在哪」？

记录原话；困惑句、关游戏冲动、黑色幽默反应单独标注。

---

## 附录 A · 单局记录表（主持人）

| 字段 | 记录 |
|------|------|
| 日期 / 设备 / 分辨率 | |
| StartConfig 差异 | |
| 最高到达周 / stage | |
| 触发主形态 | human / mortgaged / head_jar / ghost_bound |
| §4 三问摘要 | |
| 卡死 >3min 或 bug | |

---

## 附录 B · 玩家提示卡（可转发）

- 这是**周账期**生存模拟：先排本周四格，再回仙司来文，最后开本周。
- 分数和债务决定你能点什么；身体完整度会掉。
- 灵籍可能更新（抵押、器藏、幽影档）——**更新后仍可继续玩**，不是删档结局。
- W40 之后若还能玩，是**续学籍/下一段**，不是「通关画面」。

---

## 相关文档

- [REDESIGN-v5-milestone-fates.md](./REDESIGN-v5-milestone-fates.md)
- [harness-engineering.md](./harness-engineering.md) §10
- [事件创作指南.md](./事件创作指南.md) §10 Stage 内容包
- [phase8-uat-playwright-report.md](./phase8-uat-playwright-report.md)
- [v5-playtest-simulation-report.md](./v5-playtest-simulation-report.md)
