import type { EventEffect, PlayerStats, EconomyState } from '~/types/game'
import { round1 } from '~/utils/rng'

/** 从选项 effects 生成主日志用冷制度摘要（不含事件正文；忽略 kind:log 叙事项）（D-06、D-08） */
export function buildInstitutionalEventLogDetail(effects: EventEffect[]): string {
  const structural = effects.filter((e) => e.kind !== 'log')
  if (structural.length === 0) {
    return '变更摘要：无结构化数值更新。'
  }
  const parts: string[] = []
  for (const e of structural) {
    if (e.kind === 'stat') {
      const label = statLabel(e.target)
      const d = e.target === 'faLi' || e.target === 'rouTi' ? round1(e.delta) : e.delta
      parts.push(`${label}${signed(d)}`)
    } else if (e.kind === 'econ') {
      const label = econLabel(e.target)
      parts.push(`${label}${signed(e.delta)}`)
    } else if (e.kind === 'debt') {
      if (e.mode === 'addPrincipal') parts.push(`本金+¥${Math.floor(e.amount)}`)
      else parts.push(`利息追加（制度结算）`)
    } else if (e.kind === 'contract') {
      if (e.target === 'progress' && e.delta !== undefined) parts.push(`契约缠绕${signed(e.delta)}`)
      else if (e.target === 'vigilance' && e.delta !== undefined) parts.push(`监工敏感${signed(e.delta)}`)
      else if (e.target === 'active') parts.push(`契约状态：${e.value ? '激活' : '关闭'}`)
    } else if (e.kind === 'school' && e.target === 'classTier') {
      parts.push(`分班：${e.value}`)
    }
  }
  return parts.length ? `变更摘要：${parts.join('；')}。` : '变更摘要：无结构化数值更新。'
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function statLabel(k: keyof PlayerStats): string {
  const map: Partial<Record<keyof PlayerStats, string>> = {
    daoXin: '道心',
    faLi: '法力',
    rouTi: '肉体',
    fatigue: '疲劳',
    focus: '专注'
  }
  return map[k] ?? String(k)
}

function econLabel(k: keyof EconomyState): string {
  if (k === 'cash') return '现金'
  if (k === 'debtPrincipal') return '本金'
  if (k === 'debtInterestAccrued') return '利息池'
  if (k === 'collectionFee') return '费用池'
  if (k === 'delinquency') return '逾期等级'
  return String(k)
}
