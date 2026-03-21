# Requirements: 修仙高压生存模拟（暂定名）

**Defined:** 2026-03-21
**Core Value:** 让玩家在完整一局后切身感受到：在某些系统面前，“努力”也可能只是更高级的自我奴役。

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Time Loop

- [x] **LOOP-01**: 玩家可以在无限天数模式下持续推进循环，每天包含 3 段可分配行动时间
- [x] **LOOP-02**: 玩家每段时间只能执行一个行动，系统会明确显示行动消耗与当天剩余时间
- [x] **LOOP-03**: 玩家完成每日 3 段后，系统会自动结算并推进到下一天，并在满足剧情条件时可触发情节结局

### Core Actions

- [x] **ACT-01**: 玩家可以执行“修炼”行动并获得长期成长，同时承受疲劳与受伤风险
- [x] **ACT-02**: 玩家可以执行“上课刷分”行动并提升分数，用于影响权限与后续制度待遇
- [x] **ACT-03**: 玩家可以执行“打工还债”行动并获得现金，以用于偿还债务
- [x] **ACT-04**: 玩家可以执行“休息”行动并显著恢复状态，同时在契约条件下可能触发反噬
- [x] **ACT-05**: 玩家可以执行“买补给”行动获得短期增益，并累积身体劣化代价

### Economy and Debt

- [x] **DEBT-01**: 玩家可以查看债务构成（本金、利息、逾期等级）并进行还款
- [x] **DEBT-02**: 玩家若未按期还款会触发逾期升级与催收压力，且压力会影响后续事件或资源
- [x] **DEBT-03**: 玩家在任何阶段都不会被硬性判定 Game Over，但债务压力会持续放大精神与制度惩罚

### Score and Class System

- [x] **CLASS-01**: 玩家分数会影响权限或资源获取能力，并在界面中可追踪
- [x] **CLASS-02**: 系统每 7 天进行一次考核并执行分班，分班结果会改变后续收益与风险
- [x] **CLASS-03**: 玩家可以在“上课刷分”和“打工还债”之间形成可感知且持续的冲突后果

### Event and Narrative Feedback

- [x] **EVT-01**: 系统可以基于玩家状态触发随机事件，并避免短周期内重复刷同类事件
- [x] **EVT-02**: 每次关键事件会同时提供叙事反馈与系统反馈，让玩家理解“发生了什么、为什么发生”
- [ ] **EVT-03**: 社交、试功、法赛等内容在 v1 以内嵌事件方式出现，而非独立行动系统

### Psychological Defeat Expression

- [ ] **PSY-01**: 玩家可在中后期体验“休息恢复 vs 成长推进”的高压冲突，且冲突会逐步加重
- [ ] **PSY-02**: 系统会通过崩溃点与麻木化反馈表达精神性失败，而非直接结束游戏
- [ ] **PSY-03**: 玩家完成一局后能够从结果与过程中感知“被系统驯化”的主题表达

### Save and Platform

- [ ] **SAVE-01**: 玩家可以使用本地存档保存和继续当前局进度，无需账号登录
- [ ] **SAVE-02**: 玩家可以快速重开新一局，并保留“高压循环可重复体验”的节奏
- [ ] **SAVE-03**: 游戏主流程在 Web 桌面与移动端均可正常操作与阅读（响应式适配）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social and Expansion

- **SOC-01**: 玩家可以在联网环境下使用账号与云存档同步进度
- **SOC-02**: 玩家可以查看排行榜或周目对比等轻社交内容
- **SOC-03**: 玩家可以体验独立社交行动系统（非事件化）

### Content Deepening

- **CNT-01**: 玩家可以体验大规模扩展玩法（如法赛、试药、灵根租赁等）并形成新策略流派
- **CNT-02**: 玩家可以在 30 天之外体验长局模式（如 90 天+）
- **CNT-03**: 玩家可以体验更复杂的多结局与长期角色关系系统

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 账号体系与云存档 | v1 聚焦单机闭环与快速验证，不引入鉴权和云端复杂度 |
| 排行榜/PvP/强社交比较 | 与“孤立受压”的核心情绪方向冲突 |
| 开放世界地图探索 | 会稀释高压决策节奏并显著增加制作成本 |
| 完整 NPC 社交恋爱系统 | 文本与状态成本过高，v1 先事件化承载 |
| 固定硬天数强制终止（如第30天直接结束） | 与“无限天沙盒 + 情节结局触发”的新方向冲突 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOOP-01 | Phase 1 | Complete |
| LOOP-02 | Phase 1 | Complete |
| LOOP-03 | Phase 1 | Complete |
| ACT-01 | Phase 1 | Complete |
| ACT-02 | Phase 1 | Complete |
| ACT-03 | Phase 1 | Complete |
| ACT-04 | Phase 1 | Complete |
| ACT-05 | Phase 1 | Complete |
| DEBT-01 | Phase 2 | Complete |
| DEBT-02 | Phase 2 | Complete |
| DEBT-03 | Phase 2 | Complete |
| CLASS-01 | Phase 2 | Complete |
| CLASS-02 | Phase 2 | Complete |
| CLASS-03 | Phase 2 | Complete |
| EVT-01 | Phase 3 | Complete |
| EVT-02 | Phase 3 | Complete |
| EVT-03 | Phase 3 | Pending |
| PSY-01 | Phase 4 | Pending |
| PSY-02 | Phase 4 | Pending |
| PSY-03 | Phase 4 | Pending |
| SAVE-01 | Phase 5 | Pending |
| SAVE-02 | Phase 5 | Pending |
| SAVE-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✅

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after mode pivot (infinite-day sandbox)*
