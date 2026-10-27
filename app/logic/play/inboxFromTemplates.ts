import inboxTemplatesJson from '../../../data/inboxTemplates.json'
import { buildMandateInboxPending } from '~/logic/play/mandateDelivery'
import { getMandateDef } from '~/logic/play/mandateRegistry'
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

export function mergeMandateInboxThreads(run: PlayRunState, threads: InboxThread[]): InboxThread[] {
  const pending = run.mandate?.pendingDeliveryIds ?? []
  if (!pending.length) {
    return threads.filter((t) => t.id !== 'thread-mandate')
  }
  const inboxPending = buildMandateInboxPending(run)
  const firstId = pending[0]!
  const def = getMandateDef(firstId)
  const day = run.school?.day ?? run.act1?.day ?? 1
  const mandateThread: InboxThread = {
    id: 'thread-mandate',
    kind: 'system',
    title: inboxPending?.issuerLabel ?? '仙司来文',
    unreadCount: pending.length,
    messages: [
      {
        id: `msg-mandate-${firstId}`,
        threadId: 'thread-mandate',
        sender: inboxPending?.issuerLabel ?? '仙司',
        title: inboxPending?.title ?? def?.title ?? '来文',
        preview: def?.body?.slice(0, 48) ?? inboxPending?.body?.slice(0, 48) ?? '',
        body: inboxPending?.body ?? def?.body ?? '',
        day,
        read: false,
        required: true
      }
    ]
  }
  return [mandateThread, ...threads.filter((t) => t.id !== 'thread-mandate')]
}

export function refreshRunInbox(run: PlayRunState, stage?: LifeStage): PlayRunState {
  const lifeStage = stage ?? run.lifeStage
  if (lifeStage !== 'hs' && lifeStage !== 'uni' && lifeStage !== 'work') return run
  const threads = mergeMandateInboxThreads(run, buildInboxFromTemplates(run))
  return { ...run, inbox: threads }
}
