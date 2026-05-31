import type { Act1State } from '~/types/act1'
import type { InboxThread } from '~/types/play'

export function buildInboxPlaceholders(act1: Act1State | null): InboxThread[] {
  const day = act1?.day ?? 1
  const hasInterview = act1?.pendingTodos.includes('todo-interview-open') ?? false
  const hasLoan = (act1?.loans.length ?? 0) > 0

  const threads: InboxThread[] = [
    {
      id: 'thread-family',
      kind: 'family',
      title: '家庭群',
      unreadCount: hasInterview ? 1 : 0,
      messages: [
        {
          id: 'msg-family-1',
          threadId: 'thread-family',
          sender: '母亲',
          preview: hasInterview ? '明天面试别忘了…' : '家里还好，别乱花钱。',
          body: hasInterview
            ? '明天面试别忘了。要是缺钱跟家里说，但别碰那些乱七八糟的网贷。'
            : '家里还好，别乱花钱。',
          day,
          read: !hasInterview,
          required: hasInterview
        }
      ]
    },
    {
      id: 'thread-loan',
      kind: 'loan',
      title: '灵信借呗',
      unreadCount: hasLoan ? 1 : 0,
      messages: [
        {
          id: 'msg-loan-1',
          threadId: 'thread-loan',
          sender: '系统',
          preview: hasLoan ? '您的账单即将到期' : '授信额度已更新',
          body: hasLoan
            ? '您的账单即将到期。按时还款可提升信用分。'
            : '授信额度已更新，点击查看详情。',
          day,
          read: !hasLoan,
          required: false
        }
      ]
    },
    {
      id: 'thread-system',
      kind: 'system',
      title: '修行办通知',
      unreadCount: 1,
      messages: [
        {
          id: 'msg-sys-1',
          threadId: 'thread-system',
          sender: '修行办',
          preview: '入学前档案核验提醒',
          body: '请在入学前完成档案核验与面试预约。未完成将影响学籍绑定。',
          day,
          read: false,
          required: false
        }
      ]
    }
  ]

  return threads
}
