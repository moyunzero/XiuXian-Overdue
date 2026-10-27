# Phase 5 UAT · Playwright 自动化验收

> 对应 `.planning/phases/05-meta-multi-save/05-UAT.md`。覆盖账号档案 codex strip、TraumaArchiveChip、开局条款包与 harness `fate-meta-unlock`。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-19T15:44:10.243Z |
| 结束 | 2026-06-19T15:44:39.175Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase5-uat/`](../e2e/artifacts/phase5-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | FateCodexStrip mortgaged unlock | PASS | `e2e/artifacts/phase5-uat/test-01-codex-mortgaged-unlocked.png`<br>`e2e/artifacts/phase5-uat/test-01-codex-mortgaged-blurb.png` |
| 2 | TraumaArchiveChip after overlay | PASS | `e2e/artifacts/phase5-uat/test-02-overlay-before-dismiss.png`<br>`e2e/artifacts/phase5-uat/test-02-trauma-chip-visible.png`<br>`e2e/artifacts/phase5-uat/test-02-trauma-chip-dismissed.png` |
| 3 | StartBundlePicker demo bundle | PASS | `e2e/artifacts/phase5-uat/test-03-bundle-row.png`<br>`e2e/artifacts/phase5-uat/test-03-bundle-selected.png` |
| 4 | Harness fate-meta-unlock | PASS | `e2e/artifacts/phase5-uat/test-04-harness-ok.png` |

## 步骤明细

### Test 1 · codex mortgaged unlocked

- **操作**: meta mortgaged seen → homepage codex
- **视口**: 1440×900
- **URL**: http://localhost:3000/
- **结果**: PASS
- **断言**:
  - 账号档案 region
  - mortgaged stamp enabled
  - head_jar locked
- **截图**: [e2e/artifacts/phase5-uat/test-01-codex-mortgaged-unlocked.png](../e2e/artifacts/phase5-uat/test-01-codex-mortgaged-unlocked.png)

### Test 1 · codex mortgaged blurb

- **操作**: 点击抵押运行 stamp → trauma blurb
- **URL**: http://localhost:3000/
- **结果**: PASS
- **断言**:
  - FateCodexStrip__blurb visible
  - 抵押运行档 blurb
- **截图**: [e2e/artifacts/phase5-uat/test-01-codex-mortgaged-blurb.png](../e2e/artifacts/phase5-uat/test-01-codex-mortgaged-blurb.png)

### Test 2 · overlay before dismiss

- **操作**: fateUpdatePending → overlay visible, no chip
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase5-uat/test-02-overlay-before-dismiss.png](../e2e/artifacts/phase5-uat/test-02-overlay-before-dismiss.png)

### Test 2 · trauma chip after dismiss

- **操作**: 跳过 overlay → TraumaArchiveChip
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - overlay gone
  - TraumaArchiveChip visible
  - 创伤档案归档 copy
- **截图**: [e2e/artifacts/phase5-uat/test-02-trauma-chip-visible.png](../e2e/artifacts/phase5-uat/test-02-trauma-chip-visible.png)

### Test 2 · chip dismissed

- **操作**: 跳过 trauma chip
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase5-uat/test-02-trauma-chip-dismissed.png](../e2e/artifacts/phase5-uat/test-02-trauma-chip-dismissed.png)

### Test 3 · bundle row collapsed

- **操作**: meta bundle catalog → 携带条款包 row
- **URL**: http://localhost:3000/
- **结果**: PASS
- **截图**: [e2e/artifacts/phase5-uat/test-03-bundle-row.png](../e2e/artifacts/phase5-uat/test-03-bundle-row.png)

### Test 3 · bundle expanded selected

- **操作**: 展开 → 抵押档案副本
- **URL**: http://localhost:3000/
- **结果**: PASS
- **断言**:
  - StartBundleRow expanded
  - 抵押档案副本 radio
- **截图**: [e2e/artifacts/phase5-uat/test-03-bundle-selected.png](../e2e/artifacts/phase5-uat/test-03-bundle-selected.png)

### Test 4 · harness:verify --quick

- **操作**: beforeAll yarn harness:verify --quick
- **URL**: http://localhost:3000/
- **结果**: PASS
- **断言**:
  - HARNESS_OK
  - fate-meta-unlock contract
- **截图**: [e2e/artifacts/phase5-uat/test-04-harness-ok.png](../e2e/artifacts/phase5-uat/test-04-harness-ok.png)
