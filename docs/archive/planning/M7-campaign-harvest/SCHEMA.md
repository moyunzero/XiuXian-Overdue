# M7 Schema 草案：战役串联 + 收割总账

| 里程碑 | M7 |

## `runMode: 'campaign'`

```ts
interface CampaignProgress {
  completedStages: LifeStage[]   // pre, hs, uni, work
  stageDebtSnapshot: Partial<Record<LifeStage, number>>
  stageHarvestRate: Partial<Record<LifeStage, number>>
}
```

## 收割总账屏

```ts
interface HarvestLedger {
  stages: {
    stage: LifeStage | RealmTierId
    label: string
    realmOrRankPeak: string
    debtAtExit: number
    maintenancePaid: number
    harvestTaken: number      // 平台抽成累计
    netWorthDelta: number
  }[]
  verdict: string
  playableQuote: string       // 「爬得越高，欠得越多」
}
```

## 战役存档

- `lifeStage` 顺序强制：pre → hs → uni → work → done
- 债务 **跨阶段继承**，`maintenanceStack` 累加（接 shared endless 字段）

## 衔接 endless

```ts
interface CampaignToEndlessHandoff {
  inheritedDebt: number
  inheritedLiens: LienRecord[]
  startRealmTier: RealmTierId   // 默认 zhuji
}
```
