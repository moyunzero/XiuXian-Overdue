# PEV — [任务标题]

> Agent：实现前复制本模板到 `.harness/PEV.md`（可提交或仅本地）。完成前必须 `yarn harness:verify` 全绿。

## Plan（计划）

**目标（一句话）：**

**成功标准（可验证，非「能跑就行」）：**

- [ ] 
- [ ] 

**不在范围内：**

**假设 / 待确认：**

**将改动的文件（预估）：**

| 路径 | 改动类型 |
|------|----------|
| | |

**将运行的验证（勾选）：**

- [ ] `yarn harness:verify`（或 `--quick` / `--full`）
- [ ] `yarn test:act1`（若动 Act1）
- [ ] `yarn validate:events`（若动 events.json）
- [ ] 新增/更新 spec：`app/logic/.../*.spec.ts`

---

## Execute（执行）

**实际改动摘要：**

**与计划的偏差：**

---

## Verify（验证）

```bash
yarn harness:verify
# 结果：HARNESS_OK / HARNESS_FAIL
# 失败 gate：
```

**新增回归用例（防再犯）：**

| 用例文件 | 锁住的行为 |
|----------|------------|
| | |

**人工仅当（spec 无法覆盖时）：**

- [ ] 无 / 说明：

---

## 签收

- [ ] 所有 required gates 通过
- [ ] 契约 spec 已更新（若改业务规则）
- [ ] 未要求用户「帮忙点一下确认没 bug」
