import inboxTemplatesJson from '../../../data/inboxTemplates.json'
import type {
  InboxMessage,
  InboxTemplate,
  InboxThread,
  InboxThreadKind,
  LifeStage,
  PlayRunState
} from '~/types/play'

export const INBOX_TEMPLATES: InboxTemplate[] = inboxTemplatesJson as InboxTemplate[]

function matchesTrigger(tpl: InboxTemplate, run: PlayRunState): boolean {
  const t = tpl.trigger
  if (t.lifeStage !== undefined && run.lifeStage !== t.lifeStage) return false
  if (t.chapterIndex !== undefined && run.chapterIndex !== t.chapterIndex) return false

  const day = run.school?.day ?? run.act1?.day ?? 1
  if (t.minDay !== undefined && day < t.minDay) return false
  if (t.maxDay !== undefined && day > t.maxDay) return false

  const delinquency = run.econ?.delinquency ?? run.act1?.delinquency ?? 0
  if (t.minDelinquency !== undefined && delinquency < t.minDelinquency) return false

  const tier = run.school?.classTier
  if (t.classTierIn?.length) {
    if (!tier || !t.classTierIn.includes(tier)) return false
  }

  if (t.tags?.length) {
    const has = t.tags.some((tag) => run.profileTags.includes(tag))
    if (!has) return false
  }

  return true
}

function messageFromTemplate(tpl: InboxTemplate, run: PlayRunState): InboxMessage {
  const day = run.school?.day ?? run.act1?.day ?? 1
  return {
    id: `msg-${tpl.id}`,
    threadId: tpl.threadId,
    sender: tpl.sender,
    title: tpl.title,
    preview: tpl.preview ?? tpl.body.slice(0, 48),
    body: tpl.body,
    day,
    read: false,
    required: tpl.required
  }
}

export function buildInboxFromTemplates(run: PlayRunState): InboxThread[] {
  const matched = INBOX_TEMPLATES.filter((tpl) => matchesTrigger(tpl, run))
  const byThread = new Map<string, InboxThread>()

  for (const tpl of matched) {
    const msg = messageFromTemplate(tpl, run)
    const existing = byThread.get(tpl.threadId)
    if (existing) {
      existing.messages.push(msg)
      if (!msg.read) existing.unreadCount += 1
      continue
    }
    byThread.set(tpl.threadId, {
      id: tpl.threadId,
      kind: tpl.threadKind as InboxThreadKind,
      title: tpl.threadTitle,
      unreadCount: msg.read ? 0 : 1,
      messages: [msg]
    })
  }

  return [...byThread.values()]
}

export function refreshRunInbox(run: PlayRunState, stage?: LifeStage): PlayRunState {
  const lifeStage = stage ?? run.lifeStage
  if (lifeStage !== 'hs' && lifeStage !== 'uni') return run
  return { ...run, inbox: buildInboxFromTemplates(run) }
}
