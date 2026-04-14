# UI/UX 改版实施计划 (2026)

## 阶段一：首页重构

- [ ] 1.1 创建首页 Hero 区域组件
  - 创建 `app/components/home/HeroSection.vue`
  - 实现标题 + 副标题 + 背景渐变动画
  - 支持 prefers-reduced-motion 禁用动画

- [ ] 1.2 创建身份选择器组件
  - 创建 `app/components/home/IdentitySelector.vue`
  - 实现横向滚动卡片（贫民/中产/富户）
  - 卡片选中高亮状态
  - 移动端触摸滑动支持

- [ ] 1.3 创建快速开始按钮组件
  - 创建 `app/components/home/QuickStartButton.vue`
  - 大号渐变按钮 + 悬停发光效果
  - 点击波纹动画

- [ ] 1.4 创建存档可视化组件
  - 创建 `app/components/home/SaveSlotCard.vue`
  - 展示天数/债务/班级信息
  - 债务压力进度条（颜色编码）
  - 悬停展开详情

- [ ] 1.5 创建存档列表组件
  - 创建 `app/components/home/SaveSlotList.vue`
  - 横向排列存档卡片
  - 响应式：移动端2列/桌面3-4列

- [ ] 1.6 重构首页布局
  - 修改 `app/pages/index.vue`
  - 单列垂直布局：Hero → 身份选择 → 开始按钮 → 存档列表
  - 添加高级选项折叠区（天赋/债务滑块）

- [ ] 1.7 创建粒子背景动画
  - 创建 `app/components/home/ParticleBackground.vue`
  - Canvas 粒子系统（≤100粒子）
  - 霓虹青/品红/紫色渐变
  - 性能优化：requestAnimationFrame

---

## 阶段二：移动端体验优化

- [ ] 2.1 重构游戏页面布局
  - 修改 `app/pages/game.vue`
  - 移动端单列：Stats → Debt → Actions → Logs → Perks
  - 3D 模型默认折叠

- [ ] 2.2 创建移动端行动网格
  - 创建 `app/components/game/MobileActionGrid.vue`
  - 2×3 大触控按钮布局
  - 最小触控区域 48×48px
  - 长按显示说明 tooltip

- [ ] 2.3 创建移动端底部工具栏
  - 创建 `app/components/game/MobileToolbar.vue`
  - 悬浮固定：存档/统计/分享图标
  - 半透明玻璃效果
  - 滚动时自动隐藏

- [ ] 2.4 创建日志抽屉组件
  - 创建 `app/components/game/LogDrawer.vue`
  - 底部滑入抽屉
  - 手势下拉关闭

- [ ] 2.5 优化按钮触控反馈
  - 修改 `app/components/ui/Button.vue`
  - 添加触摸波纹效果
  - 长按 loading 状态

- [ ] 2.6 优化债务面板触控
  - 修改 `app/components/game/DebtDashboard.vue`
  - 触控拖拽展开详情

---

## 阶段三：命运卡分享功能

- [ ] 3.1 创建命运卡组件
  - 创建 `app/components/share/FateCard.vue`
  - 卡片模板：标题/数据/死因/遗言
  - 深色渐变 + 霓虹描边
  - 债务清偿进度条

- [ ] 3.2 创建命运卡生成器
  - 创建 `app/components/share/FateCardGenerator.vue`
  - 整合游戏状态生成数据
  - 多种样式模板

- [ ] 3.3 实现图片导出
  - 创建 `app/utils/html2canvas.ts`
  - DOM 转图片（1080×1920）
  - 添加水印

- [ ] 3.4 创建分享 composable
  - 创建 `app/composables/useShare.ts`
  - 封装分享逻辑
  - 平台检测（微信/微博/Twitter）

- [ ] 3.5 创建分享弹窗
  - 创建 `app/components/share/ShareModal.vue`
  - 命运卡预览
  - 平台图标按钮
  - 保存/复制功能

---

## 阶段四：云存档架构

- [ ] 4.1 定义云存档类型
  - 创建 `app/types/cloud.ts`
  - CloudSave 接口
  - DeviceId 生成策略
  - 版本管理

- [ ] 4.2 实现云存储工具
  - 创建 `app/utils/cloudStorage.ts`
  - Firebase/Supabase SDK 初始化
  - 匿名设备登录
  - 上传/下载逻辑

- [ ] 4.3 扩展存档管理 composable
  - 修改 `app/composables/useGameStorage.ts`
  - 添加 syncToCloud() 方法
  - 添加 loadFromCloud() 方法
  - 冲突处理

- [ ] 4.4 创建同步状态组件
  - 创建 `app/components/game/CloudSyncStatus.vue`
  - 同步状态指示器
  - 进度/离线提示

---

## 阶段五：成就系统

- [ ] 5.1 定义成就类型
  - 创建 `app/types/achievement.ts`
  - Achievement 接口
  - AchievementType 枚举
  - 条件/奖励配置

- [ ] 5.2 配置成就数据
  - 创建 `app/data/achievements.json`
  - 初入仙途/七天炼气/百万负翁/永不放弃/全身而退

- [ ] 5.3 创建成就 composable
  - 创建 `app/composables/useAchievement.ts`
  - 事件监听
  - 条件判定
  - 解锁动画触发

- [ ] 5.4 集成成就检查
  - 修改 `app/composables/useGame.ts`
  - 关键节点调用成就检查
  - 结算/月考/债务等

- [ ] 5.5 创建成就通知组件
  - 创建 `app/components/game/AchievementToast.vue`
  - 解锁弹窗
  - 3秒自动消失

- [ ] 5.6 创建成就面板
  - 创建 `app/components/game/AchievementPanel.vue`
  - 已解锁/未解锁列表
  - 进度展示

---

## 阶段六：每日签到

- [ ] 6.1 扩展游戏状态类型
  - 修改 `app/types/game.ts`
  - 添加 DailyReward 接口
  - 签到状态字段

- [ ] 6.2 配置签到奖励
  - 创建 `app/data/dailyRewards.json`
  - 7天奖励配置
  - 累计阶梯

- [ ] 6.3 创建签到 composable
  - 创建 `app/composables/useDailyReward.ts`
  - 签到状态管理
  - 奖励领取
  - 周期重置

- [ ] 6.4 创建签到 UI
  - 创建 `app/components/game/DailyCheckIn.vue`
  - 月历式面板
  - 连续签到高亮

---

## 技术债务清理

- [ ] 清理废弃 CSS 类
  - 移除 `.Grid2`/`.Grid3` 等旧布局类
  - 统一使用新布局系统

- [ ] 统一命名规范
  - 组件文件：PascalCase
  - Composable：camelCase
  - CSS 类：kebab-case

- [ ] 添加 TypeScript 严格模式
  - 启用 strict 编译选项
  - 修复类型错误

- [ ] 性能优化
  - 图片懒加载
  - 组件按需加载
  - 粒子数量限制

---

## 检查点

- [ ] 检查点 1：首页重构验证
  - 首页 → 游戏转化率测试
  - 移动端布局检查

- [ ] 检查点 2：触控操作验证
  - 按钮点击准确率
  - 手势操作流畅度

- [ ] 检查点 3：分享功能验证
  - 图片生成成功率
  - 各平台分享测试

- [ ] 检查点 4：云存档验证
  - 多设备同步测试
  - 离线状态处理

---

## 依赖关系

```
阶段一（首页重构）
    ↓
阶段二（移动端优化）
    ↓
阶段三（命运卡分享）
    ↓
阶段四（云存档）  ← 可与阶段三并行
阶段五（成就系统）← 可与阶段三/四并行
    ↓
阶段六（每日签到）← 依赖阶段五
```

---

## 预估工时

| 阶段 | 功能 | 预估 |
|------|------|------|
| 阶段一 | 首页重构 | 8h |
| 阶段二 | 移动端优化 | 6h |
| 阶段三 | 命运卡分享 | 5h |
| 阶段四 | 云存档 | 8h |
| 阶段五 | 成就系统 | 4h |
| 阶段六 | 每日签到 | 3h |
| 技术债务 | 清理 | 2h |
| **总计** | | **36h** |
