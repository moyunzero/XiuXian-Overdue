# SSR 水合修复与 Props 类型校验实施计划

## 问题背景

### 问题一：SSR 水合不匹配警告

**现象**：
- 服务端渲染 `0 / 4`，客户端渲染真实数据 `2 / 4`
- DOM 节点不匹配：服务端 `svg/span`，客户端 `div`
- 样式 class 不一致：空状态、激活态、危险态类名两端渲染差异
- 子元素数量不统一

**根因**：
- 服务端无浏览器环境，无法访问 `localStorage`，存档数据初始为空
- 客户端读取本地存档产生真实数据
- 条件渲染逻辑两端不同步

### 问题二：Props 类型校验失败

**现象**：
- `creditLimit` 属性校验异常：要求传入数字，实际传入函数，产生 `NaN`

**根因**：
- `useGame()` 返回的 `creditLimit` 是 `ComputedRef<number>` 类型
- 模板中直接传递 `creditLimit` 而未确保其为数字类型

---

## 任务列表

- [ ] 1. 识别并隔离 SSR 不安全的组件
  - [ ] 1.1 检查 `SaveSlotList` 组件的水合问题
    - 分析 `activeSlots` 计算属性在 SSR/客户端的差异
    - 检查 `slots` prop 的数据来源（`listSlots` 依赖 `localStorage`）
  - [ ] 1.2 检查 `IdentitySelector` 组件的 SSR 安全性
    - 确认 `background` ref 的初始值是否会导致水合不匹配
  - [ ] 1.3 检查 `SaveSlotCard` 组件的条件渲染逻辑
    - 分析 `is-active` class 和空状态样式的水合差异

- [ ] 2. 修复 SSR 水合不匹配问题
  - [ ] 2.1 在 `index.vue` 中对存档列表组件使用 `ClientOnly` 包装
    - 使用 `<ClientOnly>` 包裹 `<SaveSlotList>` 组件
    - 确保服务端不渲染存档列表 DOM 结构
    - 参考问题描述中的"组件局部SSR隔离"方案

  - [ ] 2.2 统一两端渲染条件
    - 检查 `SaveSlotList` 中 `v-if`、`v-for` 逻辑
    - 确保服务端正确定义默认空值状态
    - 确保 `totalSlots` 在两端均为固定值 `4`

  - [ ] 2.3 修复条件 class 渲染不一致
    - 检查 `SaveSlotCard` 中的动态 class 绑定
    - 确保 `is-active`、`is-empty` 等状态在服务端初始状态与客户端一致

- [ ] 3. 修复 Props 类型校验问题
  - [ ] 3.1 修复 `creditLimit` 传递类型错误
    - 在 `game.vue` 中检查 `creditLimit` 的使用方式
    - 确保传递的是 `.value` 解包后的数字而非 ComputedRef 对象
    - 参考 Vue 3 模板中 ref 自动解包的特性和问题描述中的"修正传参规则"

  - [ ] 3.2 添加类型守卫确保 Props 为数字
    - 在 `BorrowModal.vue` 中为 `creditLimit` prop 添加默认值处理
    - 使用 `toRaw()` 或可选链确保接收到的值为数字类型
    - 添加防御性编程：`<Pill variant="warning">可借额度：¥{{ Math.floor(Number(creditLimit) || 0).toLocaleString() }}</Pill>`

- [ ] 4. 验证修复效果
  - [ ] 4.1 运行开发服务器检查水合警告
    - 执行 `npm run dev` 启动开发服务器
    - 访问首页和控制台，检查是否仍有水合警告
    - 检查存档列表是否正常显示

  - [ ] 4.2 检查 Props 校验错误是否解决
    - 检查借贷弹窗是否能正常显示 `creditLimit` 数值
    - 确认 `Math.floor(creditLimit)` 不再产生 `NaN`

  - [ ] 4.3 运行测试套件确保无回归
    - 执行 `npm test` 运行所有测试
    - 确保 489 个测试全部通过

- [ ] 5. 检查点
  - 确保所有测试通过,如有疑问请询问用户
