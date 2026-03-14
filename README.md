# 修仙欠费中

> **在压迫中挣扎求存**  
> 一款探索修仙世界中阶级固化与生存压力的模拟经营游戏。。
[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5.30-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## 📖 项目简介

**修仙欠费中**是一款沉浸式的修仙模拟经营游戏，玩家扮演一名背负债务的高中生，在修仙高中的体系中挣扎求存。游戏核心机制围绕四个主题展开：
- **分数 = 权限**：每 7 天一次月考，决定你的分班（示范班/普通班/末位班）和待遇
- **债务 = 倒计时**：利息按时间段滚动，逾期会触发催收事件
- **身体 = 耗材**：炼体与补给能加速修行，但疲劳会吞噬专注与效率
- **系统的恶意**：老师推销、零工诱惑、催收羞辱，将你拉回现实

游戏采用赛博朋克/反乌托邦美学风格，通过视觉设计强化"债务压迫"和"系统剥削"的核心体验。

---

## ✨ 核心特性

### 游戏机制
- **三段式时间系统**：每天分为清晨、午后、深夜三个时间段，每段只能执行一次行动
- **多维度属性系统**：道心、法力、肉体强度、疲劳、专注等多项指标相互影响
- **动态分班系统**：月考成绩决定分班，不同班级享受不同待遇和资源
- **债务管理系统**：本金、利息、日利率、逾期等级，模拟真实的债务压力
- **随机事件系统**：催收提醒、老师推销、零工通知、请神契约等多种事件
- **存档系统**：支持自动存档和 3 个手动存档槽

### 技术特性
- **现代化技术栈**：Nuxt 3 + Vue 3 Composition API + TypeScript
- **原生 CSS 设计系统**：完整的 CSS 变量系统，支持赛博朋克主题
- **响应式设计**：支持桌面端、平板端和移动端
- **组件化架构**：原子组件（Button, Card, ProgressBar, Pill）+ 复合组件（StatPanel, LogPanel, DebtDashboard, EventModal）
- **状态管理**：基于 Vue 3 Composition API 的 `useGame` composable
- **类型安全**：完整的 TypeScript 类型定义

---

## 🎮 游戏玩法

### 开局配置
- 自定义角色名、城市、出身（贫民/中产/富户）
- 选择天赋（无灵根/伪灵根/天灵根）
- 设置初始债务（0-20万灵石）

### 核心行动
- **上课/刷题**：提升法力和专注，维持学习成绩
- **吐纳**：提升法力，修炼仙道基础
- **炼体**：提升肉体强度，增强战斗力
- **打工**：赚取现金，但消耗疲劳和专注
- **买补给**：花费现金恢复状态
- **休息**：恢复疲劳和专注

### 债务管理
- **借贷**：快速获得现金，但利息会不断累积
- **还款**：偿还债务，优先偿还利息
- **逾期后果**：逾期等级上升，触发更频繁的催收事件

### 月考与分班
- 每 7 天进行一次月考
- 成绩决定分班：示范班（最佳待遇）、普通班（中等待遇）、末位班（最差待遇）
- 不同分班影响餐补、专注加成等资源获取

---

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm / pnpm / yarn / bun

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 pnpm
pnpm install

# 使用 yarn
yarn install

# 使用 bun
bun install
```

### 开发模式

启动开发服务器，访问 `http://localhost:3000`：

```bash
# 使用 npm
npm run dev

# 使用 pnpm
pnpm dev

# 使用 yarn
yarn dev

# 使用 bun
bun run dev
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 📁 项目结构

```
xiuxian-sim/
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css              # 全局样式和设计系统
│   ├── components/
│   │   ├── ui/                       # 原子组件
│   │   │   ├── Button.vue
│   │   │   ├── Card.vue
│   │   │   ├── Pill.vue
│   │   │   └── ProgressBar.vue
│   │   └── game/                     # 复合组件
│   │       ├── StatPanel.vue
│   │       ├── LogPanel.vue
│   │       ├── DebtDashboard.vue
│   │       └── EventModal.vue
│   ├── composables/
│   │   └── useGame.ts                # 游戏状态管理
│   ├── pages/
│   │   ├── index.vue                 # 开局页
│   │   ├── game.vue                  # 游戏主页
│   │   └── body.vue                  # 3D 模型查看器
│   ├── types/
│   │   └── game.ts                   # TypeScript 类型定义
│   └── utils/
│       └── rng.ts                    # 随机数生成器
├── data/
│   └── events.json                   # 事件数据
├── docs/
│   └── 交互流程图.md                  # 交互流程文档
├── public/
│   └── models/                       # 3D 模型资源
├── nuxt.config.ts                    # Nuxt 配置
├── package.json                      # 项目依赖
└── tsconfig.json                     # TypeScript 配置
```

---

## 🎨 设计系统

### 配色方案
- **背景色**：深黑色（#000000, #121212, #0A0E27）
- **霓虹强调色**：Matrix Green (#00FF00), Magenta (#FF00FF), Cyan (#00FFFF)
- **功能色**：Primary (#1E40AF), Danger (#FF3B3B), Warning (#FFD24A), Success (#44FF9A)

### 字体系统
- **标题字体**：Fira Code (monospace)
- **正文字体**：Fira Sans (sans-serif)
- **中文字体**：Source Han Sans, Noto Sans SC

### 视觉效果
- **霓虹发光**：多层 text-shadow 实现发光效果
- **玻璃态**：backdrop-filter: blur(10px) + 半透明背景
- **CRT 扫描线**：repeating-linear-gradient 实现复古效果（可选）

---

## 🛠️ 技术栈

- **框架**：[Nuxt 3](https://nuxt.com) - Vue 3 全栈框架
- **UI 库**：[Vue 3](https://vuejs.org) - 渐进式 JavaScript 框架
- **语言**：[TypeScript](https://www.typescriptlang.org) - JavaScript 的超集
- **3D 渲染**：[Three.js](https://threejs.org) - WebGL 3D 库
- **样式**：原生 CSS + CSS 变量系统

---

## 📚 文档

- [事件创作指南](./docs/事件创作指南.md) - 面向非开发者的事件 JSON 编写说明
- [部署指南](./DEPLOY.md) - 如何将项目上传到 GitHub
- [UI/UX 设计规范](./.kiro/specs/ui-ux-game-optimization/) - 完整的 UI/UX 设计系统文档

---
## 🎯 开发路线图

### 已完成
- ✅ 核心游戏循环（三段式时间系统）
- ✅ 基础行动系统（上课、吐纳、炼体、打工、休息、买补给）
- ✅ 债务管理系统（借贷、还款、利息滚动）
- ✅ 月考与分班系统
- ✅ 随机事件系统
- ✅ 存档系统（自动存档 + 3 个手动存档槽）
- ✅ 基础 UI 组件库

### 进行中
- 🚧 UI/UX 优化（赛博朋克主题）
- 🚧 响应式布局优化
- 🚧 性能优化（虚拟滚动、懒加载）

### 计划中
- 📋 试功/试药系统
- 📋 法赛系统（奖金驱动）
- 📋 灵根租赁系统
- 📋 静室系统
- 📋 老师推销系统扩展
- 📋 债务重组系统
- 📋 更多随机事件
- 📋 成就系统
- 📋 多结局系统

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 Composition API 最佳实践
- 保持组件单一职责
- 编写清晰的注释和文档

---

## 📄 许可证

本项目仅供学习和交流使用。

---

## 🙏 致谢

- **灵感来源**：小说《没钱修什么仙？》（作者：熊狼狗）- 本模拟器的核心设计灵感源于该小说对修仙世界中分数、债务与系统性压迫的深刻探讨
- **UI/UX 设计灵感**：赛博朋克 2077、Blade Runner
- **技术支持**：Nuxt 3, Vue 3, Three.js 社区

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 Issue
- 发起 Discussion
- 提交 Pull Request

---
---

**记住：欠费不停，修仙不止。**