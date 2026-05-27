export interface InterviewOption {
  value: string
  label: string
}

export interface InterviewQuestion {
  id: string
  section: 'public' | 'track' | 'confirm'
  prompt: string
  hint?: string
  options: InterviewOption[]
}

/** 入学面试问卷（≥8 步） */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'sleep',
    section: 'public',
    prompt: '公开问卷 · 你上一周的平均睡眠时长？',
    hint: '系统备注：优秀样本通常由药物维持清醒。',
    options: [
      { value: 'under2', label: '≤2 小时（药物维持）' },
      { value: '2-4', label: '2～4 小时' },
      { value: '5plus', label: '约 5 小时及以上' }
    ]
  },
  {
    id: 'course',
    section: 'public',
    prompt: '公开问卷 · 高中课程进度自评？',
    options: [
      { value: 'finished', label: '已自学完成高中课程' },
      { value: 'finishing', label: '正在收尾，预计本月完成' },
      { value: 'behind', label: '仍差一学年左右' }
    ]
  },
  {
    id: 'family-invest',
    section: 'public',
    prompt: '公开问卷 · 家庭对进修的投入态度？',
    options: [
      { value: 'full', label: '全力供养，可抵押资产' },
      { value: 'partial', label: '有限支持，需分期' },
      { value: 'none', label: '基本自理，不愿再借' }
    ]
  },
  {
    id: 'track-organ',
    section: 'track',
    prompt: '追加问询 · 器官抵押贷款知情情况？',
    options: [
      { value: 'signed', label: '已签知情，家庭在办' },
      { value: 'aware', label: '听说过，尚未办理' },
      { value: 'unknown', label: '不了解该轨道' }
    ]
  },
  {
    id: 'track-soul',
    section: 'track',
    prompt: '追加问询 · 魂修特长生（放弃肉身）意向？',
    options: [
      { value: 'committed', label: '已纳入家庭规划' },
      { value: 'considering', label: '在考虑，看录取结果' },
      { value: 'no', label: '不考虑' }
    ]
  },
  {
    id: 'track-metabolism',
    section: 'track',
    prompt: '追加问询 · 促智环境（代谢法器）适应？',
    options: [
      { value: 'adapted', label: '已适应，有副作用记录' },
      { value: 'trial', label: '短期试用中' },
      { value: 'no', label: '未接触' }
    ]
  },
  {
    id: 'track-gender',
    section: 'track',
    prompt: '追加问询 · 性别转换招生轨道（仅备案）',
    options: [
      { value: 'filed', label: '家庭已提交备案意向' },
      { value: 'open', label: '保持开放，未提交' },
      { value: 'decline', label: '明确不选' }
    ]
  },
  {
    id: 'honesty',
    section: 'confirm',
    prompt: '最终确认 · 以上信息是否如实填写？',
    options: [
      { value: 'yes', label: '是，愿承担征信核查' },
      { value: 'mostly', label: '基本属实，个别口径待核对' }
    ]
  }
]
