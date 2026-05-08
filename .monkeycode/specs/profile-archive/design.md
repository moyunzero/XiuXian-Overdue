# 制度档案页面设计

## 概述

在「修仙信用社会模拟器」定位下，新增独立的「制度档案」页面，让玩家能够直观查看自己被系统定义的画像标签、风险评估和历史变更记录。页面采用「征信报告」风格设计，强化「被系统持续监控和定义」的核心体验。

## 架构设计

### 核心结构

新增独立页面 `app/pages/profile.vue`，整体布局分为三个区域：

**顶部 Header**：
- 标题：「修仙信用社会 · 制度档案」
- 副标题：档案编号（基于玩家ID生成）、建档日期
- 右上角：返回游戏按钮

**主体内容区**（三段式布局）：
1. **身份摘要卡片**：玩家姓名、当前班级、社会画像四维等级、综合风险评分（0-100）
2. **标签时间线**：垂直时间轴展示所有获得的系统标签，带获取日期和触发原因
3. **系统评估记录**：表格形式展示历史评估快照，包括评估日期、画像状态变更、系统备注

**数据流**：
- 从 `useGame().profileSnapshot` 读取当前画像
- 从新增的 `profileHistory` 数组读取历史记录（存储在存档中）
- 所有数据均为只读展示，不修改游戏状态

**路由入口**：
- 主游戏页面 Header 新增「档案」按钮
- 开局页面也可查看历史周目的档案（多周目扩展）

## 组件设计

### 核心组件结构

```
app/pages/profile.vue                    # 档案页面容器
├── app/components/profile/
│   ├── ArchiveHeader.vue                # 档案头部（标题、编号、返回按钮）
│   ├── IdentitySummary.vue              # 身份摘要卡片（四维画像、风险评分）
│   ├── LabelTimeline.vue                # 标签时间线（垂直时间轴）
│   ├── AssessmentHistory.vue            # 系统评估记录（表格）
│   └── RiskMeter.vue                    # 风险评分仪表盘（0-100）
```

### 关键组件说明

**IdentitySummary.vue**：
- 卡片布局展示四维画像
- 每个维度显示：等级名称、等级图标、进度条（该维度在等级内的位置）
- 综合风险评分使用环形仪表盘（征信报告风格）
- 底部显示系统评语（根据画像组合生成的描述性文本）

**LabelTimeline.vue**：
- 垂直时间轴，最新的标签在顶部
- 每个标签项包含：标签名称（带颜色标记）、获取时间、触发原因
- 标签颜色按类型区分：财务风险（红色）、教育信用（蓝色）、制度顺从（绿色）、身体资产（紫色）
- 支持收起/展开，默认显示最近5个标签

**AssessmentHistory.vue**：
- 表格形式，每行代表一次画像快照
- 列：评估日期 | 财务风险 | 教育信用 | 制度顺从 | 身体资产 | 系统备注
- 点击行可展开查看该次评估的完整画像详情
- 数据来源：存档中新增的 `profileHistory` 字段

**RiskMeter.vue**：
- 环形仪表盘，0-100分
- 颜色渐变：0-30绿色 → 30-60黄色 → 60-80橙色 → 80-100红色
- 中心显示分数和等级文字
- 底部显示分数构成说明（各维度权重）

## 数据流与状态管理

### 数据存储

在存档系统中新增 `profileHistory` 字段：

```typescript
interface ProfileHistoryEntry {
  timestamp: number           // 评估时间戳
  digest: ProfileDigest       // 画像快照（四维等级+标签列表）
  riskScore: number           // 综合风险评分
  trigger: string             // 触发评估的原因
  systemNote: string          // 系统备注（根据画像生成的评语）
}
```

**存储策略**：
- 在 `useGameStorage.ts` 中扩展存档 schema，添加 `profileHistory: ProfileHistoryEntry[]`
- 每次 `refreshProfileSnapshot()` 调用时，如果画像发生变化，自动向 history 数组追加新记录
- 历史记录上限 50 条，超过时删除最早的记录
- 旧档迁移：如果存档中没有 `profileHistory` 字段，初始化为空数组

### 数据流路径

```
游戏行动/事件触发
    ↓
useGame.refreshProfileSnapshot()
    ↓
gameEngine.buildSocialProfile()  ← 计算新画像
    ↓
对比上一次 profileSnapshot，检测变化
    ↓
如果有变化：
    ├─ 生成 riskScore（加权计算）
    ├─ 生成 systemNote（根据标签组合生成评语）
    ├─ 创建 ProfileHistoryEntry
    └─ 追加到 profileHistory 数组
    ↓
useGameStorage 自动落盘（防抖合并）
    ↓
profile.vue 页面读取 profileHistory 和 profileSnapshot 展示
```

### 综合风险评分算法

```typescript
function calculateRiskScore(profile: SocialProfile): number {
  const weights = {
    financialRisk: 0.35,    // 财务风险权重最高
    educationCredit: 0.20,  // 教育信用
    bodyAsset: 0.25,        // 身体资产
    compliance: 0.20        // 制度顺从
  }
  
  // 各等级映射为 0-100 分数（越高风险越高）
  const scoreMap = {
    financialRisk: { low: 10, medium: 40, high: 70, extreme: 95 },
    educationCredit: { preferred: 10, investable: 40, unstable: 70, discarded: 90 },
    bodyAsset: { intact: 5, marked: 30, mortgaged: 65, depleted: 95 },
    compliance: { resistant: 70, softened: 50, obedient: 30, domesticated: 85 }
  }
  
  // 加权求和，clamp 到 0-100
}
```

### 系统评语生成

基于标签组合生成描述性文本，例如：
- `「高风险修士」+「可投资优等生」` → 「该对象呈现矛盾特征：债务风险高但教育价值突出，建议持续观察」
- `「身体抵押者」+「高风险修士」` → 「该对象已进入身体偿债阶段，风险等级极高，加强催收频率」
- `「制度顺从者」+「低负债稳定对象」` → 「该对象表现良好，符合制度预期，维持当前待遇」

## 错误处理与边界情况

### 空状态处理

**无历史记录时**：
- 页面显示空状态提示：「档案建立中... 系统正在收集你的行为数据」
- 配合动态的「数据采集中」动画（虚线边框 + 脉冲效果）
- 底部提示：「完成首次行动后，系统将生成你的第一份档案」

### 数据一致性

**画像变更检测**：
- 使用 `JSON.stringify` 深度比较当前画像与上一次快照
- 只有当四维等级或标签列表发生变化时才记录新历史
- 防止频繁无意义的快照

**存档迁移**：
- 旧存档可能没有 `profileHistory` 字段
- 在 `useGameStorage.ts` 的加载逻辑中添加迁移代码
- 如果旧存档有 `profileSnapshot` 但无历史，初始化时自动创建第一条历史记录

### 性能优化

**大存档处理**：
- `profileHistory` 限制 50 条记录
- 每条记录约 200-300 字节，50 条约 15KB，对 localStorage 影响极小
- 渲染时使用虚拟滚动（如果历史记录超过 20 条）

**组件懒加载**：
- `profile.vue` 页面使用 Nuxt 的动态路由懒加载
- 风险评估组件在页面可见时才初始化

### 错误边界

**数据损坏**：
- 如果 `profileHistory` 中的某条记录格式不正确，跳过该条记录并记录警告日志
- 不影响其他正常记录的展示
- 在控制台输出：`[ProfileArchive] 跳过损坏的档案记录: index=5`

**时间戳异常**：
- 如果时间戳为 0 或负数，显示为「未知时间」
- 不影响排序逻辑（异常时间戳排在最后）
