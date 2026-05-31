/** 职场段催收展示（与 Act1 家庭线独立，仅文案档位） */

export interface WorkCollectionBeat {
  stage: number
  title: string
  body: string
}

const BEATS: WorkCollectionBeat[] = [
  {
    stage: 0,
    title: '账单提醒',
    body: '灵贷专员：最低还款已生成。逾期档位上浮前，你还有几个发薪日窗口。'
  },
  {
    stage: 1,
    title: 'HR 并线催收',
    body: '人事系统备注：本月 KPI 与还款挂钩。同事群里有你的逾期截图——不是谣言。'
  },
  {
    stage: 2,
    title: '联系人升级',
    body: '催收脚本进入「紧急联系人」档。家里会收到礼貌短信，你仍可选择独自扛下。'
  },
  {
    stage: 3,
    title: '职场公示',
    body: '办公楼大屏轮播欠款区间。学历标签被 HR 重新朗读一遍——羞辱是流程的一部分。'
  },
  {
    stage: 4,
    title: '资产处置预告',
    body: '制度判定：现金流无法覆盖本周复利。岗位保留不等于身体留置不会被重新定价。'
  }
]

export function getWorkCollectionBeat(delinquency: number): WorkCollectionBeat {
  const stage = Math.min(4, Math.max(0, Math.floor(delinquency)))
  return BEATS[stage]!
}
