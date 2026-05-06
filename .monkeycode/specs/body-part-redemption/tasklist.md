# 需求实施计划

- [x] 1. 在 gameEngine.ts 中实现赎身核心逻辑函数
   - [x] 1.1 实现 calculateRedemptionCost 函数
     - 检查 debtLock === 'bodyLocked'，否则返回 0
     - 读取 lockedDebtAmount，为 0 则返回 0
     - 计算 bodyPartRepayment 中 true 的数量作为抵押次数
     - 按公式 1.5 × 2^(n-1) 计算倍率
     - 返回 floor(lockedDebtAmount × 倍率)（设计文档 2.2 节）
   - [x] 1.2 实现 canRedeem 函数
     - 调用 calculateRedemptionCost 获取赎身金额
     - 返回 cost > 0 且 cash >= cost（设计文档 2.3 节）
   - [x] 1.3 实现 executeRedemption 函数
     - 验证债务是否锁定，未锁定返回失败
     - 验证现金是否充足，不足返回失败（含具体金额提示）
     - 扣除现金：g.econ.cash -= cost
     - 解除锁定：debtLock = null, lockedDebtAmount = 0
     - 身体部位不恢复（bodyPartRepayment 保持不变）
     - 记录日志到 g.logs.unshift（标题"赎身完成"，tone: 'warn'）
     - 返回 { success: true, cost, message }（设计文档 2.3 节、4.1 节）
  - [x]* 1.4 为赎身核心函数编写单元测试
     - 测试第 1 次抵押后赎身金额计算（8000 × 1.5 = 12000）
     - 测试第 2 次抵押后赎身金额计算（16000 × 3.0 = 48000）
     - 测试现金不足时 canRedeem 返回 false
     - 测试 executeRedemption 成功后债务解锁但身体不恢复
     - 测试债务未锁定时调用赎身返回失败

- [x] 2. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户

- [x] 3. 修改 useGameEconomyActions.ts 集成赎身功能
   - [x] 3.1 修改 repay 函数的锁定状态提示
     - 在 isDebtLocked(g) 分支中调用 Engine.calculateRedemptionCost(g)
     - 提示信息增加：赎身所需金额、当前现金、还差多少
     - 示例："该债务已被系统锁定。赎身所需：¥12,000（你的现金：¥5,000）还需要 ¥7,000"（设计文档 3.2 节、4.2 节）
   - [x] 3.2 新增 redeem 函数
     - 调用 Engine.executeRedemption(g)
     - 成功后记录日志（tone: 'ok'）并刷新画像
     - 失败后记录错误日志（tone: 'danger'）
     - 保存存档（设计文档 4.2 节）
   - [x] 3.3 导出 redeem 函数
     - 在 return 对象中添加 redeem（设计文档 4.2 节）

- [x] 4. 修改 useGameEventResolver.ts 增加事件还款弹窗的赎身提示
   - [x] 4.1 修改 immediate_payment 分支
     - 在 isDebtLocked(g) 检查中调用 Engine.calculateRedemptionCost(g)
     - 日志提示改为："该债务已被系统锁定。赎身所需：¥{cost.toLocaleString()}。"（设计文档 4.2 节）

- [x] 5. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户

- [x] 6. 更新 useGame.ts 导出 redeem 函数
   - [x] 6.1 在 useGame 的返回对象中暴露 redeem
     - 从 useGameEconomyActions 返回值中解构 redeem
     - 添加到导出对象中，供外部调用

- [x]* 7. 编写集成测试
   - 测试完整流程：抵押 → 锁定 → 尝试还款失败 → 赎身 → 恢复正常还款
   - 测试多次抵押后赎身金额累加和倍率增长
   - 测试赎身后立即再次抵押的场景
