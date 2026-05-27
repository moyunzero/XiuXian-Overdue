# 修仙模拟器：PSY 系统、契约反噬与叙事螺旋

> 本文档深入解析 PSY (Psychological System) 系统的数学逻辑、阶段演化以及如何通过「叙事螺旋」引导玩家进入中后期的生存焦虑。

---

## 1. 精神压力分数 (Psych Pressure Score)

系统通过 `computePsychologicalPressureScore` 动态量化玩家的精神状态，这是所有崩溃事件的底层判定标准。

### 1.1 构成因子 (Score Composition)
```text
Score = Contract_Part + Stats_Part
```
- **Contract_Part (契约压力)**: `progress * 0.38 + vigilance * 0.22`。契约缠绕度与监工警觉共同构成 60% 的基础压力。
- **Stats_Part (属性压力)**: `fatigue * 0.32 + (100 - focus) * 0.14 + (daoXin - 1) * 1.8`。疲劳和专注损失是日常压力的主要来源。

---

## 2. 阶段门闩：中后期 (Mid-Late Phase)

系统通过 `isMidLatePhase` 判定是否开启高压模式：
- **判定条件**: `day >= 10` 或 `contract.progress >= 50%`。
- **开启后影响**:
  - 允许触发「精神崩溃 (Strong Collapse)」。
  - 允许触发「麻木休息 (Numb Rest)」。
  - 启用冲突加压阶梯。

---

## 3. 精神崩溃 (Strong Collapse)

### 3.1 触发频率 (Gaps)
- **间隔**: 两次崩溃之间必须相隔 10~15 天（由 `mulberry32` 随机抖动生成）。
- **门控概率**: `clamp(0.18 + Score / 520, 0.05, 0.48)`。

### 3.2 首次与回声 (Full vs Echo)
- **首次 (Full)**: 弹出事件弹窗，激活全局修正 `collapseModifierActive = true`（收益 × 0.88）。
- **回声 (Echo)**: 仅在日志区产生一条短句提示，不弹窗，不重复触发修正。
- **修正清除**: 仅在下周结算日（Weekly Settlement）清除。

---

## 4. 驯化与麻木 (Domestication & Numbness)

这两个指标不直接参与战斗计算，但作为「生存深度」的度量：

### 4.1 驯化度 (Domestication)
- **同步机制**: 每次契约 `progress` 或 `vigilance` 正向增加时同步。
- **计算**: `add = deltaProgress * 0.28 + deltaVigilance * 0.12`。

### 4.2 麻木度 (Numbness)
- **触发**: `rest` 行动在签约且中后期时，有 `0.07 + (progress/100)*0.45` 的概率转为「麻木休息」。
- **后果**: 专注回升为 0，`numbness + 4`。

---

## 5. 叙事螺旋：总结面板解锁

满足以下任一条件，系统将解锁 `SummaryPanel`：
1.  **副指标达标**: `domestication` 或 `numbness` ≥ 50。
2.  **关键叙事**: 触发过「情节结局：麻木化时刻」或「精神崩溃：下坠螺旋」。
3.  **时间积累**: 游戏天数 ≥ 30。

### 5.1 冷数据快照 (Summary Snapshot)
解锁时，系统会生成一份 `SummarySnapshot`，包含所有关键数值的「冷冰冰的统计」，不带任何情感描述，作为对玩家生存状态的终极审视。
- **包含字段**: 累计利息、逾期等级、分班历史、驯化与麻木最终数值。
