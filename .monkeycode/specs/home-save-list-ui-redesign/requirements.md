# Requirements Document

## Introduction

优化首页存档列表的 UI 设计，使其更加直观、美观，并改进删除功能的用户体验。当前存档卡片已集成 SwipeableCard 组件支持滑动删除，但缺少明确的视觉删除提示，整体布局和信息展示需要优化。

## Glossary

- **存档卡片**: 显示单个存档信息的可交互卡片组件
- **滑动删除**: 通过向左滑动卡片露出删除操作的手势交互
- **存档槽位**: 游戏存档的存储位置，包括自动存档和 3 个手动槽位
- **债务压力**: 存档中债务与现金的比例指标

## Requirements

### Requirement 1: 存档列表布局优化

**User Story:** AS 玩家, I WANT 存档列表有清晰的布局和间距, SO THAT 我能快速浏览所有存档信息

#### Acceptance Criteria

1. WHEN 存档列表渲染, 存档列表组件 SHALL 使用响应式网格布局，在桌面端显示 4 列，平板端 3 列，移动端 2 列，小屏移动端 1 列
2. WHEN 存档列表渲染, 存档列表组件 SHALL 在标题和卡片网格之间保持 12px 的间距
3. WHEN 存档列表渲染, 存档列表组件 SHALL 在卡片之间保持 12px 的间距
4. WHILE 存档列表显示, 存档列表组件 SHALL 显示标题"已有存档"和活跃槽位计数

### Requirement 2: 存档卡片视觉优化

**User Story:** AS 玩家, I WANT 存档卡片有清晰的视觉层次和信息展示, SO THAT 我能快速了解每个存档的关键信息

#### Acceptance Criteria

1. WHEN 存档卡片渲染, 存档卡片组件 SHALL 显示存档标题、天数、班级、现金、债务信息
2. WHEN 存档卡片渲染, 存档卡片组件 SHALL 根据债务压力值显示不同的边框颜色（正常/警告/危险）
3. WHEN 存档卡片为当前活跃存档, 存档卡片组件 SHALL 在左侧显示绿色高亮边框
4. WHEN 存档卡片为空, 存档卡片组件 SHALL 显示虚线边框和"新建游戏"提示
5. WHEN 用户悬停在存档卡片上, 存档卡片组件 SHALL 显示轻微的上移动画和边框高亮

### Requirement 3: 滑动删除功能可视化

**User Story:** AS 玩家, I WANT 存档卡片支持滑动删除并有明确的视觉提示, SO THAT 我能方便地删除不需要的存档

#### Acceptance Criteria

1. WHEN 用户向左滑动存档卡片超过 50px, 存档卡片组件 SHALL 露出右侧的删除按钮区域
2. WHEN 存档卡片滑动超过阈值, 存档卡片组件 SHALL 固定偏移 80px 显示删除按钮
3. WHEN 用户点击删除按钮, 存档卡片组件 SHALL 弹出确认对话框
4. IF 用户确认删除, 存档列表组件 SHALL 触发删除事件并通知父组件
5. IF 用户取消删除, 存档卡片组件 SHALL 复位到原始位置

### Requirement 4: 删除按钮视觉指示器

**User Story:** AS 玩家, I WANT 存档卡片有明确的删除功能提示, SO THAT 我知道可以通过滑动来删除存档

#### Acceptance Criteria

1. WHEN 存档卡片渲染, SwipeableCard 组件 SHALL 在卡片右侧隐藏显示红色的删除按钮区域
2. WHEN 用户向左滑动卡片, SwipeableCard 组件 SHALL 平滑过渡显示删除按钮
3. WHILE 删除按钮区域可见, SwipeableCard 组件 SHALL 显示垃圾桶图标和红色背景
4. WHEN 用户点击删除按钮, SwipeableCard 组件 SHALL 显示确认对话框

### Requirement 5: 响应式设计

**User Story:** AS 移动端玩家, I WANT 存档列表在不同屏幕尺寸下都有良好的显示效果, SO THAT 我能在各种设备上方便地管理存档

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 480px, 存档列表组件 SHALL 使用单列布局
2. WHEN 屏幕宽度在 480px 到 768px 之间, 存档列表组件 SHALL 使用双列布局
3. WHEN 屏幕宽度在 768px 到 1024px 之间, 存档列表组件 SHALL 使用三列布局
4. WHEN 屏幕宽度大于 1024px, 存档列表组件 SHALL 使用四列布局
5. WHILE 移动端显示, 存档卡片组件 SHALL 保持最小触摸区域 48px × 48px

### Requirement 6: 空状态处理

**User Story:** AS 新玩家, I WANT 空的存档槽位有明确的提示, SO THAT 我知道可以点击创建新游戏

#### Acceptance Criteria

1. WHEN 存档槽位为空, 存档卡片组件 SHALL 显示虚线边框样式
2. WHEN 存档槽位为空, 存档卡片组件 SHALL 显示"+"图标和"新建游戏"文字
3. WHEN 用户点击空存档卡片, 存档列表组件 SHALL 触发选择事件创建新游戏
4. WHILE 空存档卡片显示, 存档卡片组件 SHALL 降低透明度以区分有内容的存档
