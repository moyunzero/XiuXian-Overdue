# 移动端体验深化 实施计划

- [ ] 1. 创建移动端状态管理 composable
  - 创建 `useMobileState.ts` 管理移动端 UI 状态
  - 定义 `MobileState` 接口（toolbarExpanded、activeQuickAction、gesture）
  - 实现手势识别逻辑（touchstart/touchmove/touchend）
  - 编写单元测试验证状态管理

- [ ] 2. 增强 MobileToolbar 组件
  - 添加"更多"按钮展开快捷操作面板
  - 显示当前债务摘要（点击展开详情）
  - 显示当前时段指示器
  - 实现展开/收起动画（300ms ease）
  - 编写组件测试

- [ ] 3. 创建 MobileQuickActions 面板组件
  - 实现快捷操作按钮（借贷/还款/推演/总结）
  - 实现遮罩层点击关闭
  - 添加 TouchFeedback 视觉反馈
  - 编写组件测试

- [ ] 4. 创建 MobileGestureHandler 组件
  - 实现右滑返回手势（> 50px 显示提示，> 100px 执行返回）
  - 集成到 game.vue
  - 添加手势方向检测逻辑
  - 编写单元测试

- [ ] 5. 增强 MobileActionGrid 触摸反馈
  - 添加按下状态视觉反馈（scale + 边框高亮）
  - 添加操作成功/失败的边框闪烁效果
  - 优化按钮内间距和字体大小
  - 编写组件测试

- [ ] 6. 增强日志面板（移动端）
  - 添加日志条目点击展开功能
  - 添加日期分组显示
  - 实现"加载更多"功能（每页 20 条）
  - 编写组件测试

- [ ] 7. 创建 SwipeableCard 组件
  - 实现左滑显示删除按钮
  - 实现滑动手势阈值（50px 显示，> 100px 自动展开）
  - 添加删除确认对话框
  - 集成到 SaveSlotList
  - 编写组件测试

- [ ] 8. 更新 game.vue 集成
  - 引入 MobileGestureHandler
  - 引入增强的 MobileToolbar
  - 移除重复的抽屉按钮逻辑
  - 验证移动端布局正确

- [ ] 9. 检查点 - 确保所有测试通过

- [ ] 10. 手动移动设备测试
  - 在真机上测试触摸响应
  - 测试手势识别准确性
  - 验证不同屏幕尺寸的布局
