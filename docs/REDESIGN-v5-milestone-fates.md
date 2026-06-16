# REDESIGN v5：无限里程碑 · 命运态可续玩

| 字段 | 内容 |
|------|------|
| **状态** | **Draft · Brainstorming 已确认**（2026-06-16） |
| **取代** | v4「四十周灵贷契约 = 有终点一章」作为**主路径**（内容可迁移，终点语义废弃） |
| **上位** | [CURRENT-STATE.md](./CURRENT-STATE.md) · [REDESIGN-v4-chapter-institutional.md](./REDESIGN-v4-chapter-institutional.md) · 《没钱修什么仙》气质 |
| **非目标** | 宗门爽游 · 战力榜 · 原著人名 · 强制 Game Over 式「永久死亡停档」 |

---

## 0. Understanding Summary

1. **产品内核保留**：分数=权限、债务=倒计时、身体=耗材；现代修仙 **每一步要钱、每一步要卷**。
2. **体验对标**：**A** Reigns 式抉择后果 · **B** 中国式家长式排程/考试 · **D** 复利/系统反噬（Paperclips 气质）。
3. **结构**：**无限阶段里程碑 ladder** + **随时触发的命运态里程碑**；**无 W40 式终点**。
4. **玩家定位**：像修仙小说里的 **小角色/路人** — 忙、穷、还不清，可能抵押、剩头、鬼化，**仍可继续玩**。
5. **命运态模型**：**C** — 一个 **主形态（互斥）** + 多个 **制度 debuff 标签（可叠加）**。
6. **存档**：单档主形态 **一般不可逆**；账号可 **新开人类档**；**meta 跨档继承**。
7. **技术**：**UX 优先** — 保留 Nuxt + `app/logic/*` + harness；Vue/motion 做主交互，局部 Pixi/CSS 演出。

---

## 1. Assumptions

| ID | 假设 |
|----|------|
| A1 | Web 桌面优先；移动后做 |
| A2 | 单账号多存档槽；meta 存独立键 |
| A3 | 规则仍在 `app/logic/*`；Vue 只编排 |
| A4 | 「无限」= 阶段 ladder 无限续，非 realm 数值跑步机 |
| A5 | 试玩仍要 V4-7 级「现实 ↔ 昆墟」指认 |
| A6 | MVP vertical slice：2 primaryFate + 3 tag，可玩 20+ 周 |
| A7 | **赎头/回退**：默认 **不可从 `head_jar` 回到完整 human`**；极稀有 setpiece 可「赎出容器」→ 回到 `mortgaged`（残体），作后期内容 |

---

## 2. Decision Log

| 决策 | 选择 | 备选 | 理由 |
|------|------|------|------|
| 与 v4 Ch0 | **无限 milestone 取代 forty-week 终点** | 双模式并存 | 明确无限流；Ch0 拆为前段 stage |
| 头部参考 | **A+B+D** | 纯 RPG | 契合钱/卷/制度，非动作 |
| 里程碑挡玩 | **否** | M5 终局分叉 | 惨状是可玩新常态 |
| 命运结构 | **C：主形态互斥 + tag 叠加** | 纯互斥 / 纯叠加 | 换壳清晰 + 制度可叠 |
| 鬼/剩头 | **单档形态锁定**；新档可人类 | 全账号锁 | 降挫败，保留多周目 |
| Meta | **跨档继承** | 仅 cosmetic | 再开一局动力 |
| 技术路线 | **方案 1：Nuxt 壳 + UX 重做** | 全 Phaser | harness 与迭代速度 |
| 赎头 | **默认不可回满血人** | 付费赎头 | 贴合「小角色」不可逆 |

---

## 3. 两层里程碑

### 3.1 Layer 1 · 阶段里程碑（Stage · 无限续）

人生段落，**无通关**；只换 mandate 池、考试密度、利率 tier。

```text
[M0] Act1 入学前夜
[M1] 灵贷签约
[M2] 高中卷
[M3] 预科/择宗
[M4] 职场（tier 可参数化：company / gig / startup）
[M5+] 无限续段（debt tier、exam 频率、mandate 模板）
```

原 `ch0-forty-week-contract` **拆入 M1–M4**，删除「W40 必终局」语义。

### 3.2 Layer 2 · 命运态里程碑（Fate · 随时触发 · 不挡玩）

与 stage **正交**。触发 → 灵籍动画 + 永久记录 + **下周继续**。

**设计原则**

- 从修仙伊始即可滑落（非单点 M5）。
- 玩家是 **耗材型小角色**，非天命主角。
- 每种 fate 换 **规则子集 + UI 壳**，不是 Run End。

---

## 4. 主命运形态（Primary Fate · 互斥）

`primaryFate` 每档一个；沿惨度树前进或分支跳转，**不回「未签约凡人」**。

```text
                    [human] 肉身修士
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    [indentured]   [mortgaged]    [ghost_voluntary]
     身契役徒        抵押运行        自愿鬼籍
           │             │             │
           └──────┬──────┘             │
                  ▼                    │
            [head_jar] 器藏维生 ◄──────┘
                  │
                  ▼
            [ghost_bound] 鬼籍奴役
                  │
                  ▼
            [shattered] 灵形打散（极深 · 仍 playable）
```

| ID | 玩家可见名 | 主循环变化 |
|----|------------|------------|
| `human` | 肉身修士 | 标准四格排程 + 来文 |
| `indentured` | 身契役徒 | 零工↑；自由格 -1 |
| `mortgaged` | 抵押运行 | 可抽血换现；完整度上限↓ |
| `head_jar` | 器藏维生 | 无零工/吐纳；委托指令卡 + 维生费周扣 |
| `ghost_voluntary` | 鬼籍（自愿） | 冥币；阳债转冥司 |
| `ghost_bound` | 鬼籍（奴役） | 阴司 mandatory 工单 |
| `shattered` | 灵形打散 | 周期强制 setpiece；选项最窄 |

**触发源（示例）**

| 条件组合 | 可能 fate |
|----------|-----------|
| 逾期 + 选「抵押灵根」 | `mortgaged` |
| 审查失败 + 身契来文 | `indentured` |
| 完整度低于阈值 / 维生失败 | `head_jar` |
| 主动「求死解脱」来文链 | `ghost_voluntary` |
| 阳间债未清 + 死亡 | `ghost_bound` |

---

## 5. 制度 Debuff 标签（Institutional Tags · 可叠加）

`institutionalTags: string[]` — 灰选项、改来文权重、改利率。

| Tag | 含义 |
|-----|------|
| `supply_cut` | 灵气断供 |
| `credit_blacklist` | 征信黑名单 |
| `exam_probation` | 留校察看 |
| `mandate_flood` | 来文洪峰 |
| `family_leverage` | 家庭连坐 |
| `organelle_liens` | 器官留置 |

示例：`mortgaged` + `supply_cut` + `credit_blacklist` → 仍 playable，选项收至「认罚 / 灰产 / 卖剩余部位」。

---

## 6. 主循环（A+B+D 合成）

### 6.1 一周四拍（目标 1～2 分钟 / 周）

```text
① 账期开门（B·D）— 顶栏债/身/分；复利 tick
② 本周排程（B）— 还账|卷|零工|休息（格数随 primaryFate 变）
③ 来文链（A）— 1～3 张抉择卡，本周末可见后果
④ 周末结算（D）— 账本滚动、milestone 进度、命运 transition 判定
```

### 6.2 `tickWeek` 逻辑顺序（logic 层）

```text
applyTagModifiers()
applyPrimaryFateRules()
schedulePhase(B)
mandateChain(A)
compoundSettlement(D)
checkFateTransitions()
checkStageAdvance()
```

### 6.3 形态与 A/B/D 权重

| 形态 | B | A | D |
|------|---|---|---|
| human / indentured / mortgaged | 全或减格 | 标准 | 灵贷复利 |
| head_jar | → 委托槽 | 加密（绑维生费） | 维生账单 |
| ghost_* | 工单槽 | 阴司 + 追魂 | 冥币/阳债双账 |

---

## 7. Meta 继承（账号级）

**`MetaProgress`**（独立 storage 键）

| 类型 | 例 | 新人类档 |
|------|-----|----------|
| 档案收藏 | 器藏维生、鬼籍奴役 | 征信馆展示 |
| 被动特质 | 识得条款小字 | 多 1 次看清隐藏代价 |
| 开局包 | 阴司介绍信 | 改首月来文，非裸 +属性 |
| 禁忌 | 锁更好结局 | 防 meta 碾压 |

解锁条件：**本账号曾触发该 primaryFate**。

---

## 8. 《没钱修什么仙》气质对照（扩展）

| 原著意象 | v5 落点 | 禁止 |
|----------|---------|------|
| 嵩阳面试、灵根检测 | Act1 + 早期 mandate | 原著人名 |
| 法力贷、以贷养贷 | 周排程 + D 复利 | 无条款 fantasy 贷 |
| 断电断水 | `supply_cut` + 来文 | 仅 log |
| 补习班内卷 | B 排程 + 月考节点 | 纯抽牌 |
| 配角陨落、器官抵押 | `mortgaged` → `head_jar` | 一次性 Game Over |
| 鬼差、阴司奴役 | `ghost_bound` | 鬼=自由 |
| **路人感** | 任意周可 fate；无主角光环被动 | 必筑基、必飞升 |

---

## 9. 架构

```text
Meta（账号）: 收藏 · 跨档被动 · 开局包
       │
Save Slot: weekIndex∞ · stageId · primaryFate · tags[] · 灵籍时间轴
       │ tickWeek
 Schedule(B) ─ Mandate(A) ─ Settlement(D)
       │
 fateTransition? / tagAdd? → 继续下周
```

---

## 10. 代码迁移（方案 1）

| 现有 | v5 |
|------|-----|
| `chapterWeekFlow.ts` | `milestoneWeekFlow.ts`（无限 week + stage） |
| `chapterCollapse.ts` | `fateTransition.ts` + 可选 `archiveRun`（非强制） |
| `bodyMortgage.ts` | 抵押 → fate，非默认 collapse |
| `mandateDelivery.ts` | + `requiredFate` / `requiredTags` / weights |
| Ch0 JSON | `data/stages/*` · `data/fates/*` · `data/fate-transitions/*` |
| `buildRunArchive.ts` | + 命运时间轴、tag 年表 |
| `runMode: chapter` | `runMode: ladder`（名待定） |
| harness | + `fateContinuityFlow.spec.ts` · `fateMetaUnlock.spec.ts` |

**保留**：Act1、`setpieceFlow`（审判关）、`debtDashboard` 文案模式、harness 体系。

**冷库**：v4 forty-week 终点 UI 文案、endless 4选2 主路径。

---

## 11. 技术 / UX

| 层 | 选型 |
|----|------|
| 壳 | Nuxt 4 + Vue 3 |
| 卡牌/排程 | Vue + motion-v |
| 演出 | Pixi 或 CSS（灵信、维生舱、鬼籍 stamp） |
| 规则 | `app/logic/*` 纯函数 |
| 内容 | JSON + validate 脚本 |

**UX 要点**

1. Fate 切换：~15s 全屏「灵籍更新」+ 壳层换皮。
2. 顶栏恒定三字：债 / 身（或维生）/ 权限。
3. debuff 红章可点开查来源。
4. 「下周预览」：还不上 → 可能触发某 fate（loss aversion）。

---

## 12. MVP 范围（Vertical Slice）

**Phase 1 可玩验证**

- Stage：M0 Act1 + M1～M2（或压缩 M1）
- Fate 链：`human` → `mortgaged` → `head_jar`（20+ 周不断）
- 旁支：`ghost_bound`（1 条来文链）
- Tags：`supply_cut`、`credit_blacklist`、`family_leverage`

**成功标准**

- 试玩：「我像书里路人，不是主角」
- 剩头后无教程再玩 5 周
- 10 分钟内懂排程 + 来文 + 账单
- `yarn harness:verify` → HARNESS_OK

---

## 13. Implementation Handoff（Phase）

| Phase | 交付 | 验证 |
|-------|------|------|
| **P0** | 类型：`primaryFate`、`institutionalTags`、`MetaProgress`；`milestoneWeekFlow` 骨架；存档 v7 迁移草案 | spec：fate 字段读写 |
| **P1** | UI：Reigns 卡 + 四格排程；human→mortgaged→head_jar 规则与换皮 | `fateContinuityFlow.spec.ts` |
| **P2** | ghost 经济、双账本、meta 解锁 UI | `fateMetaUnlock.spec.ts` |
| **P3** | Stage ladder 无限模板、Act1/Ch0 内容迁入 | harness 全绿 + 短局试玩 |

---

## 14. 开放项（实现前可再讨论）

- `runMode` 正式命名（`ladder` / `endless-v5` / `fate-run`）
- `shattered` 是否进 MVP 或仅 meta 收藏
- 鬼/人 **双档同时开** 的上限（建议 3 槽）

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-16 | v5 初稿：Brainstorming 确认（A+B+D、无限 fate、C 模型、meta 继承） |
