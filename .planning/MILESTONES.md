# Milestones

## v1.0 修仙高压生存模拟 v1 (Shipped: 2026-03-21)

**Phases completed:** 5 phases, 15 plans, 36 tasks

**Key accomplishments:**

- 三时段行动循环已被锁定为可回归行为：90 次动作验证、夜间自动换日、30 天上限停表与周结算四项摘要日志同步生效。
- 五大基础行动已形成可测闭环：点击前看趋势与剩余时段，点击后用统一日志给出叙事结果与三项核心变化。
- Infinite-day loop semantics now replace fixed day30 stopping, with state-driven narrative ending events and post-day30 ACT-01..05 regression coverage.
- 交付了可回归测试驱动的债务制度主链路：逾期 5 级封顶、周最低还款、固定清偿顺序与制度化冷反馈。
- 分班制度已从标签升级为持续影响学习收益与债务风险的周节律系统，并在 UI 中可追踪展示。
- 连续路线 streak 驱动的边际递减、事件概率与现金链费用抽检，配合冷制度日志与顶栏偏科趋势提示，完成 CLASS-03 可测闭环。
- 行动后单一主随机链上实现 id/family 双轨冷却、最短 3 日下限，以及周结算日前段对非强制随机的 baseP 降权（×0.65），并以 gameEngine.events.spec 为回归权威。
- 关键事件 `tier`、折叠制度区、主日志单条冷摘要，以及 ESC/遮罩映射 `defaultOptionId`（末选项回退）已落地并通过 Vitest。
- `family` 为「社交|试功|法赛」的六条 afterAction 事件 + validate-events 聚合规则与 `getEvt03Events` 辅助，满足每类条数与双维度门禁且不扩张 ActionId。
- 中后期门闩与周阶梯可测；契约缠绕降低休息恢复倍率；麻木休息路径与反噬分流；驯化/麻木副指标存档并在契约变动时同步；契约 Pill 旁单行副指标。
- 可配置 collapse deck（10～15 日抖动间隔）、每类首次完整弹窗与后续回声日志、首次后轻量修正至周界清除；act 管线与还款/叙事结局三墙顺序明确。
- 三轨先到解锁冷数据总结页；叙事麻木结局与累计日解锁解耦；读后存档提示并无限天继续。
- localStorage 存档 schema、活跃槽与 autosave 双写、损坏槽冷处理；首页槽位/新局流程；README 记录旧档不兼容；三断点响应式与触控目标，完成 SAVE-01~03。

### Known Gaps / Follow-ups

- 未运行独立 `v1.0-MILESTONE-AUDIT.md`（可选：补 `/gsd-audit-milestone` 仅作文档化）。
- 移动端可继续做深度抽检（非 v1 阻塞项）。

---
