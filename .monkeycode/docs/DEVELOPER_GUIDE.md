# 开发指南

## 1. 环境要求

- **Node.js**: >= 18.0.0
- **包管理器**: npm / pnpm / yarn
- **浏览器**: Chrome/Firefox/Safari 现代版本

## 2. 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:3000`

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 3. 项目结构

```
/workspace/
├── app/
│   ├── app.vue              # 根组件
│   ├── assets/css/          # 全局样式 (CSS Variables)
│   ├── components/
│   │   ├── ui/              # 基础 UI 组件
│   │   ├── game/            # 游戏组件
│   │   └── HumanViewer.vue  # 3D 模型查看器
│   ├── composables/         # Vue Composables
│   │   ├── useGame.ts       # 主游戏逻辑
│   │   ├── useGame.*.ts     # 模块化拆分
│   │   └── useGameStorage.ts # 存档系统
│   ├── logic/               # 纯函数引擎
│   │   ├── gameEngine.ts    # 核心引擎
│   │   └── eventInstitutionalLog.ts
│   ├── pages/               # 路由页面
│   ├── types/               # TypeScript 类型
│   └── utils/               # 工具函数
├── data/
│   └── events.json          # 游戏事件数据
├── public/
│   └── models/               # 3D 模型文件
└── scripts/
    └── validate-events.mjs   # 事件数据验证
```

## 4. 开发规范

### 组件规范

1. **使用 `<script setup lang="ts">` 语法**
2. **Props 使用类型定义**：
   ```typescript
   interface Props {
     variant?: 'primary' | 'secondary'
     size?: 'sm' | 'md'
   }
   const props = withDefaults(defineProps<Props>(), {
     variant: 'primary',
     size: 'md'
   })
   ```
3. **事件使用 `emit` 定义**：
   ```typescript
   const emit = defineEmits<{
     (e: 'resolve', optionId: string): void
   }>()
   ```

### 样式规范

1. **使用 CSS Variables** 定义设计 tokens（在 `assets/css/main.css`）
2. **避免内联样式**，优先使用 class
3. **遵循现有命名约定**：
   - 布局类：`.Container`, `.Grid2`, `.Grid3`, `.Row`
   - 组件类：`.Card`, `.Btn`, `.Modal`, `.Stat`
   - 效果类：`.neon-glow-*`, `.glass-effect`, `.scanlines`

### 游戏逻辑规范

1. **engine 层必须是纯函数**：无副作用，确定性输出
2. **副作用统一在 composable 层处理**
3. **状态更新通过 `game.value = { ... }`**

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `EventModal.vue` |
| composable | camelCase | `useGame.ts` |
| 类型/接口 | PascalCase | `GameState`, `ActionId` |
| 常量 | UPPER_SNAKE | `SLOT_ORDER` |
| CSS 类 | kebab-case | `.card-inner` |

## 5. 测试

### 运行所有测试

```bash
npm test
```

### 运行测试（监视模式）

```bash
npm test -- --watch
```

### 运行指定测试文件

```bash
npm test -- useGame.actions.spec.ts
```

### 测试文件分布

| 测试文件 | 覆盖范围 |
|---------|---------|
| `useGame.spec.ts` | 主逻辑 |
| `useGame.actions.spec.ts` | 行动系统 |
| `useGame.debt.spec.ts` | 债务系统 |
| `useGame.class.spec.ts` | 分班制度 |
| `useGame.loop.spec.ts` | 游戏循环 |
| `useGame.events.spec.ts` | 事件系统 |
| `useGame.psy.spec.ts` | 心理系统 |
| `useGame.conflict.spec.ts` | 冲突系统 |
| `useGame.feedback.spec.ts` | 反馈系统 |
| `useGameStorage.spec.ts` | 存档系统 |
| `gameEngine.psy.spec.ts` | 引擎心理计算 |
| `gameEngine.events.spec.ts` | 引擎事件判定 |

### 编写测试

```typescript
import { describe, it, expect } from 'vitest'
import { calculateWeeklyMinPayment } from '~/logic/gameEngine'

describe('calculateWeeklyMinPayment', () => {
  it('returns 0 for zero debt', () => {
    expect(calculateWeeklyMinPayment(0, 0)).toBe(0)
  })

  it('returns minimum 280 for small debt', () => {
    expect(calculateWeeklyMinPayment(1000, 0)).toBe(280)
  })
})
```

## 6. 调试

### 启用源码映射

开发模式下默认启用。检查 `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  devtools: { enabled: true }
})
```

### 存档调试

1. 打开浏览器 DevTools → Application → Local Storage
2. 查看 `xiuxian_qianfei_autosave` 和 `xiuxian_qianfei_slots`

### 事件调试

开发测试页面 `/dev/event-lab` 提供事件系统调试界面。

## 7. 事件数据

### 事件结构

编辑 `data/events.json` 添加/修改事件：

```json
{
  "id": "collector_basic",
  "title": "催收提醒",
  "body": "你的手机震动不止...",
  "type": "collection",
  "tone": "warn",
  "phase": "afterAction",
  "weight": 5,
  "cooldownDays": 1,
  "trigger": {
    "minDelinquency": 0,
    "maxDelinquency": 1
  },
  "options": [
    {
      "id": "ok",
      "label": "强装镇定",
      "effects": [
        { "kind": "stat", "target": "focus", "delta": -2 }
      ]
    }
  ]
}
```

### 验证事件数据

```bash
node scripts/validate-events.mjs
```

## 8. 构建与部署

### Vercel 部署

项目配置了 `vercel.json`，可直接部署到 Vercel：

```bash
npm run build
```

或连接 GitHub 仓库实现自动部署。

### 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `NUXT_PUBLIC_SITE_URL` | 站点 URL | - |

## 9. 常见问题

### 热更新不生效

```bash
npm run dev -- --force
```

### 清除缓存

```bash
rm -rf .nuxt node_modules/.cache
npm install
```

### TypeScript 类型错误

```bash
npx nuxi typecheck
```
