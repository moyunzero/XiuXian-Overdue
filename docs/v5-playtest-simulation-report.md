# v5 模拟真人试玩记录（Playwright + 浏览器 API）

> 对应 [`docs/playtest-checklist-v5.md`](./playtest-checklist-v5.md) §1–§4。三名虚拟试玩员串行跑局；每步含主持人观察说明与全页截图。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-20T06:38:15.489Z |
| 结束 | 2026-06-20T06:39:30.090Z |
| 设备 / 视口 | Playwright Chromium（模拟桌面 Chrome） · 1440×900 |
| 结果 | PASS |
| 截图目录 | [`e2e/artifacts/v5-playtest/`](../e2e/artifacts/v5-playtest/) |
| 对照清单 | [playtest-checklist-v5.md](./playtest-checklist-v5.md) |

## 试玩员一览

| 代号 | 脚本 | 最高到达 | 主形态 |
|------|------|----------|--------|
| 小林 | §1 短局（真实点击 Act1 → W1–3） | M1 · W3+ | human |
| 阿青 | §2 中局关键节点（fixture 种子） | M2 · W41 | human → 关口屏 |
| 老周 | §3 命运链加深 | overlay / trauma / ghost | mortgaged → ghost_bound |

## 步骤总览

| # | § | 试玩员 | 环节 | 主持人观察 | 截图 |
|---|-----|--------|------|------------|------|
| 1 | §1 | 小林（§1 短局） | StartConfig · 账号档案 | FateCodexStrip / 槽位可读；默认「签署契约并开始」可见 | [`e2e/artifacts/v5-playtest/pA-01-home-startconfig.png`](../e2e/artifacts/v5-playtest/pA-01-home-startconfig.png) |
| 2 | §1 | 小林（§1 短局） | 入学前夜 · 面试开场 | 是否进入制度叙事而非爽游开场 | [`e2e/artifacts/v5-playtest/pA-02-act1-interview-start.png`](../e2e/artifacts/v5-playtest/pA-02-act1-interview-start.png) |
| 3 | §1 | 小林（§1 短局） | 面试提交完成 | 8 题路径是否让玩家感到「被筛选」 | [`e2e/artifacts/v5-playtest/pA-03-act1-interview-done.png`](../e2e/artifacts/v5-playtest/pA-03-act1-interview-done.png) |
| 4 | §1 | 小林（§1 短局） | 灵贷签约完成 | 是否懂「签了什么」— 利率/动用条款可见 | [`e2e/artifacts/v5-playtest/pA-04-act1-loan-signed.png`](../e2e/artifacts/v5-playtest/pA-04-act1-loan-signed.png) |
| 5 | §1 | 小林（§1 短局） | 家庭最短结案 | 家庭催收情绪铺垫是否到位 | [`e2e/artifacts/v5-playtest/pA-05-act1-family-settled.png`](../e2e/artifacts/v5-playtest/pA-05-act1-family-settled.png) |
| 6 | §1 | 小林（§1 短局） | 四瓷片周排程 · 第 1 周 | 无 endless 4 选 2 误解；WeekPlan 四格可见 | [`e2e/artifacts/v5-playtest/pA-06-week1-dashboard.png`](../e2e/artifacts/v5-playtest/pA-06-week1-dashboard.png) |
| 7 | §1 | 小林（§1 短局） | 调整还款/刷题/零工/休息 | 玩家能否读懂四格含义并动手调参 | [`e2e/artifacts/v5-playtest/pA-07-weekplan-adjusted.png`](../e2e/artifacts/v5-playtest/pA-07-weekplan-adjusted.png) |
| 8 | §1 | 小林（§1 短局） | 债务仪表盘展开 | 总债务/最低还款/账单日是否可读 | [`e2e/artifacts/v5-playtest/pA-08-debt-dashboard.png`](../e2e/artifacts/v5-playtest/pA-08-debt-dashboard.png) |
| 9 | §1 | 小林（§1 短局） | 第 1 周确认 | 「确认本周计划」闭环是否清晰 | [`e2e/artifacts/v5-playtest/pA-09-week1-confirmed.png`](../e2e/artifacts/v5-playtest/pA-09-week1-confirmed.png) |
| 10 | §1 | 小林（§1 短局） | 第 2 周推进 | 非节点周节奏是否可沿用上周 | [`e2e/artifacts/v5-playtest/pA-11-week2-advanced.png`](../e2e/artifacts/v5-playtest/pA-11-week2-advanced.png) |
| 11 | §1 | 小林（§1 短局） | 第 3 周推进 | 非节点周节奏是否可沿用上周 | [`e2e/artifacts/v5-playtest/pA-11-week3-advanced.png`](../e2e/artifacts/v5-playtest/pA-11-week3-advanced.png) |
| 12 | §2 | 阿青（§2 中局） | 月考结算屏（关口感） | 审判/月考是否像「关口」而非普通弹窗 | [`e2e/artifacts/v5-playtest/pB-01-exam-boss-gate.png`](../e2e/artifacts/v5-playtest/pB-01-exam-boss-gate.png) |
| 13 | §2 | 阿青（§2 中局） | 月考确认并继续 | 关口关闭后回到周循环 | [`e2e/artifacts/v5-playtest/pB-02-exam-boss-dismissed.png`](../e2e/artifacts/v5-playtest/pB-02-exam-boss-dismissed.png) |
| 14 | §2 | 阿青（§2 中局） | 择宗关口 | W17 择宗选项是否像制度分流 | [`e2e/artifacts/v5-playtest/pB-03-sect-choice.png`](../e2e/artifacts/v5-playtest/pB-03-sect-choice.png) |
| 15 | §2 | 阿青（§2 中局） | 择宗首项 | 择宗后是否可继续而非终局 | [`e2e/artifacts/v5-playtest/pB-04-sect-choice-picked.png`](../e2e/artifacts/v5-playtest/pB-04-sect-choice-picked.png) |
| 16 | §2 | 阿青（§2 中局） | W40 仍显示周排程 | 不出现「契约终局」全屏；v5 主路径可续玩 | [`e2e/artifacts/v5-playtest/pB-05-w40-no-finale.png`](../e2e/artifacts/v5-playtest/pB-05-w40-no-finale.png) |
| 17 | §2 | 阿青（§2 中局） | W41 进入 M2 学籍段 | stage ladder 续玩；可继续排程 | [`e2e/artifacts/v5-playtest/pB-06-w41-m2-dashboard.png`](../e2e/artifacts/v5-playtest/pB-06-w41-m2-dashboard.png) |
| 18 | §3 | 老周（§3 命运链） | 灵籍更新 overlay | 制度通知感；非删档结局 | [`e2e/artifacts/v5-playtest/pC-01-fate-overlay.png`](../e2e/artifacts/v5-playtest/pC-01-fate-overlay.png) |
| 19 | §3 | 老周（§3 命运链） | 跳过 overlay → 回到周排程 | 更新后仍可玩 | [`e2e/artifacts/v5-playtest/pC-02-overlay-dismissed.png`](../e2e/artifacts/v5-playtest/pC-02-overlay-dismissed.png) |
| 20 | §3 | 老周（§3 命运链） | 创伤档案归档 chip | 抵押运行档归档提示；抽血 grit 语境 | [`e2e/artifacts/v5-playtest/pC-03-trauma-chip.png`](../e2e/artifacts/v5-playtest/pC-03-trauma-chip.png) |
| 21 | §3 | 老周（§3 命运链） | 幽影档 · 双账 DelegationPanel | 人账/鬼账 settlement 语境；维生+委托 | [`e2e/artifacts/v5-playtest/pC-04-ghost-bound-panel.png`](../e2e/artifacts/v5-playtest/pC-04-ghost-bound-panel.png) |
| 22 | §3 | 老周（§3 命运链） | 账号档案 FateCodexStrip | 多形态 codex 可读；抵押运行已解锁 | [`e2e/artifacts/v5-playtest/pC-05-meta-codex.png`](../e2e/artifacts/v5-playtest/pC-05-meta-codex.png) |

## 步骤明细

### pA-01-home · StartConfig · 账号档案

- **清单**: §1 0–2min 首页
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 清除存档后打开首页
- **主持人观察**: FateCodexStrip / 槽位可读；默认「签署契约并开始」可见
- **URL**: http://localhost:3000/
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-01-home-startconfig.png](../e2e/artifacts/v5-playtest/pA-01-home-startconfig.png)

### pA-02-s0-start · 入学前夜 · 面试开场

- **清单**: §1 2–15min Act1
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 点击「签署契约并开始」→ /play
- **主持人观察**: 是否进入制度叙事而非爽游开场
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-02-act1-interview-start.png](../e2e/artifacts/v5-playtest/pA-02-act1-interview-start.png)

### pA-03-interview · 面试提交完成

- **清单**: §1 Act1 面试
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 8 题首项 → 提交并评分
- **主持人观察**: 8 题路径是否让玩家感到「被筛选」
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-03-act1-interview-done.png](../e2e/artifacts/v5-playtest/pA-03-act1-interview-done.png)

### pA-04-loan · 灵贷签约完成

- **清单**: §1 Act1 灵贷
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 比价悬停 30s + 勾选 + 签署并动用
- **主持人观察**: 是否懂「签了什么」— 利率/动用条款可见
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-04-act1-loan-signed.png](../e2e/artifacts/v5-playtest/pA-04-act1-loan-signed.png)

### pA-05-family · 家庭最短结案

- **清单**: §1 Act1 家庭
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 培元药剂包 → 知道了 → 你扛下 → 接受迁出
- **主持人观察**: 家庭催收情绪铺垫是否到位
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-05-act1-family-settled.png](../e2e/artifacts/v5-playtest/pA-05-act1-family-settled.png)

### pA-06-play-entry · 四瓷片周排程 · 第 1 周

- **清单**: §1 15–18min 进入 Play
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 制度档案「确认并进入昆墟高中」
- **主持人观察**: 无 endless 4 选 2 误解；WeekPlan 四格可见
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - .WeekPlan visible
- **截图**: [e2e/artifacts/v5-playtest/pA-06-week1-dashboard.png](../e2e/artifacts/v5-playtest/pA-06-week1-dashboard.png)

### pA-07-plan-adjust · 调整还款/刷题/零工/休息

- **清单**: §1 18–28min W1–3
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 按 natural 人格填本周四格
- **主持人观察**: 玩家能否读懂四格含义并动手调参
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-07-weekplan-adjusted.png](../e2e/artifacts/v5-playtest/pA-07-weekplan-adjusted.png)

### pA-08-debt · 债务仪表盘展开

- **清单**: §1 债务仪表盘
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 展开 DebtDash 明细
- **主持人观察**: 总债务/最低还款/账单日是否可读
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - .DebtDash visible
- **截图**: [e2e/artifacts/v5-playtest/pA-08-debt-dashboard.png](../e2e/artifacts/v5-playtest/pA-08-debt-dashboard.png)

### pA-09-week1-confirm · 第 1 周确认

- **清单**: §1 确认本周
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 点击确认本周计划
- **主持人观察**: 「确认本周计划」闭环是否清晰
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-09-week1-confirmed.png](../e2e/artifacts/v5-playtest/pA-09-week1-confirmed.png)

### pA-11-week2 · 第 2 周推进

- **清单**: §1 38–45min 自由周
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 确认第 2 周计划
- **主持人观察**: 非节点周节奏是否可沿用上周
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-11-week2-advanced.png](../e2e/artifacts/v5-playtest/pA-11-week2-advanced.png)

### pA-11-week3 · 第 3 周推进

- **清单**: §1 38–45min 自由周
- **试玩员**: 小林（§1 短局）
- **玩家操作**: 确认第 3 周计划
- **主持人观察**: 非节点周节奏是否可沿用上周
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pA-11-week3-advanced.png](../e2e/artifacts/v5-playtest/pA-11-week3-advanced.png)

### pB-01-exam · 月考结算屏（关口感）

- **清单**: §2 高中 W4/8/12 月考
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: fixture chapter-exam-boss
- **主持人观察**: 审判/月考是否像「关口」而非普通弹窗
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pB-01-exam-boss-gate.png](../e2e/artifacts/v5-playtest/pB-01-exam-boss-gate.png)

### pB-02-exam-dismiss · 月考确认并继续

- **清单**: §2 W16 筑基审判（代表关口）
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: 确认并继续
- **主持人观察**: 关口关闭后回到周循环
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pB-02-exam-boss-dismissed.png](../e2e/artifacts/v5-playtest/pB-02-exam-boss-dismissed.png)

### pB-03-sect · 择宗关口

- **清单**: §2 大学 W17 择宗
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: fixture chapter-sect-choice
- **主持人观察**: W17 择宗选项是否像制度分流
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pB-03-sect-choice.png](../e2e/artifacts/v5-playtest/pB-03-sect-choice.png)

### pB-04-sect-pick · 择宗首项

- **清单**: §2 W17
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: 择宗第一项
- **主持人观察**: 择宗后是否可继续而非终局
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pB-04-sect-choice-picked.png](../e2e/artifacts/v5-playtest/pB-04-sect-choice-picked.png)

### pB-05-w40 · W40 仍显示周排程

- **清单**: §2 W40 续玩
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: fixture phase8-w40-continuity
- **主持人观察**: 不出现「契约终局」全屏；v5 主路径可续玩
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - WeekPlan visible
  - 无契约终局文案
- **截图**: [e2e/artifacts/v5-playtest/pB-05-w40-no-finale.png](../e2e/artifacts/v5-playtest/pB-05-w40-no-finale.png)

### pB-06-w41 · W41 进入 M2 学籍段

- **清单**: §2 W41 → M2
- **试玩员**: 阿青（§2 中局）
- **玩家操作**: fixture phase8-w41-m2
- **主持人观察**: stage ladder 续玩；可继续排程
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - .WeekPlan visible
- **截图**: [e2e/artifacts/v5-playtest/pB-06-w41-m2-dashboard.png](../e2e/artifacts/v5-playtest/pB-06-w41-m2-dashboard.png)

### pC-01-overlay · 灵籍更新 overlay

- **清单**: §3 human→mortgaged
- **试玩员**: 老周（§3 命运链）
- **玩家操作**: fixture phase8-fate-overlay
- **主持人观察**: 制度通知感；非删档结局
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pC-01-fate-overlay.png](../e2e/artifacts/v5-playtest/pC-01-fate-overlay.png)

### pC-02-overlay-skip · 跳过 overlay → 回到周排程

- **清单**: §3 overlay 关闭
- **试玩员**: 老周（§3 命运链）
- **玩家操作**: 跳过
- **主持人观察**: 更新后仍可玩
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pC-02-overlay-dismissed.png](../e2e/artifacts/v5-playtest/pC-02-overlay-dismissed.png)

### pC-03-trauma · 创伤档案归档 chip

- **清单**: §3 TraumaArchiveChip
- **试玩员**: 老周（§3 命运链）
- **玩家操作**: overlay 跳过后 TraumaArchiveChip
- **主持人观察**: 抵押运行档归档提示；抽血 grit 语境
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - 创伤档案归档 copy
- **截图**: [e2e/artifacts/v5-playtest/pC-03-trauma-chip.png](../e2e/artifacts/v5-playtest/pC-03-trauma-chip.png)

### pC-04-ghost · 幽影档 · 双账 DelegationPanel

- **清单**: §3 ghost_bound
- **试玩员**: 老周（§3 命运链）
- **玩家操作**: fixture phase8-ghost-bound
- **主持人观察**: 人账/鬼账 settlement 语境；维生+委托
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pC-04-ghost-bound-panel.png](../e2e/artifacts/v5-playtest/pC-04-ghost-bound-panel.png)

### pC-05-codex · 账号档案 FateCodexStrip

- **清单**: §0 meta + §3 形态记录
- **试玩员**: 老周（§3 命运链）
- **玩家操作**: 首页 meta codex
- **主持人观察**: 多形态 codex 可读；抵押运行已解锁
- **URL**: http://localhost:3000/
- **结果**: PASS
- **截图**: [e2e/artifacts/v5-playtest/pC-05-meta-codex.png](../e2e/artifacts/v5-playtest/pC-05-meta-codex.png)

## §4 结束访谈（模拟记录）

> 自动化试玩无法替代真人原话；以下为根据 UI 行为与产品期望生成的**模拟访谈**，供主持人对照真人局时替换为原话。

### 小林（§1 短局）

1. **路人感**：（模拟）像被制度和账单推着走的普通人，面试和灵贷像在填表过关，不是天命主角开局。
2. **续玩意愿**：（模拟）愿意再开几周，想看看最低还款会不会压垮现金。
3. **10 分钟懂循环**：（模拟）这周先排四格时间和还款，仙司来文要回，最后点确认开本周；钱来自零工和现金结余。
- **主持人备注**：自动化：Act1 最短路径 + 3 周 UI 点击无卡死。

### 阿青（§2 中局）

1. **路人感**：（模拟）月考和择宗像被系统分流，不是选天命宗门爽点。
2. **续玩意愿**：（模拟）W40 还能玩让人意外，愿意看看 M2 学籍段有什么。
3. **10 分钟懂循环**：（模拟）关口是周程里的钉子，打完回来还是排程+来文+开周。
- **主持人备注**：自动化：W40 无终局、W41 M2 排程可见。

### 老周（§3 命运链）

1. **路人感**：（模拟）灵籍更新像路人档案被改写，Trauma chip 像制度归档而非英雄觉醒。
2. **续玩意愿**：（模拟）抵押/幽影后仍想无教程再玩 5 周，验证不是结局屏。
3. **10 分钟懂循环**：（模拟）形态变了但循环还是排程—来文—开周；双账是额外账本。
- **主持人备注**：自动化：overlay/chip/ghost_bound/codex 全可见。

## 附录 A · 单局记录表（自动化填充）

| 字段 | 小林 | 阿青 | 老周 |
|------|------|------|------|
| 日期 | 2026-06-20 | 同左 | 同左 |
| 设备 / 分辨率 | Playwright Chromium（模拟桌面 Chrome） 1440×900 | 同左 | 同左 |
| StartConfig | 默认槽 · 无条款包 | fixture 种子 | fixture 种子 |
| 最高周 / stage | M1 W3+ | W41 · M2 | overlay 周 |
| 触发主形态 | human | human（关口屏） | mortgaged / ghost_bound |
| §4 三问 | 见上节模拟访谈 | 见上节 | 见上节 |
| 卡死 >3min | 无 | 无 | 无 |

## Cursor 浏览器复核（CDP / 实时 dev）

> Playwright 串行跑局后，用 Cursor 内置浏览器连接 `yarn dev` 实例做二次目视复核。

| 项 | 值 |
|----|-----|
| URL | `http://localhost:3000/play`（本地已有修行档案） |
| 视口 | 桌面宽屏 · 周排程可见 |
| 观察 | 债务条、四瓷片排程、无右侧留白 |
| 截图 | [`e2e/artifacts/v5-playtest/cursor-spot-live-play.png`](../e2e/artifacts/v5-playtest/cursor-spot-live-play.png) |

复跑命令：

```bash
yarn dev
yarn test:e2e:v5-playtest
```
