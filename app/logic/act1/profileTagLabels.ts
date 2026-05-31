/**
 * 档案标签内部 ID → 玩家可见中文（制度档案口吻）。
 * 玩家可见处禁止对 profileTags / educationTags 直接 `.join()`；须用 formatProfileTags 或
 * `~/logic/play/playerFacingCopy` 的 formatPlayerFacingTagLine（见 playCompliance.spec.ts）。
 */

const PROFILE_TAG_LABELS: Record<string, string> = {
  // 开局 / 征信
  'prior-debt': '既有负债记录',
  'prior-debt-mentioned': '面试提及征信',

  // 面试 · 公开问卷
  'sleep-optimized': '睡眠达标（药物维持）',
  'sleep-deficit': '睡眠赤字',
  'curriculum-ahead-claim': '课程进度自报超前',
  'curriculum-lag': '课程进度滞后',
  'family-all-in': '家庭全力供养',
  'family-withdrawn': '家庭支持收缩',

  // 面试 · 轨道
  'track-organ-loan': '器官贷轨道知情',
  'track-soul': '魂修轨道',
  'track-metabolism': '促智环境适应',
  'track-gender-file': '性别转换备案意向',
  'honesty-qualified': '诚信表述存疑',
  'special-track-invite': '特招轨道邀请',
  'conditional-marginal': '附条件录取（压线）',
  'interview-rejected': '面试硬拒',

  // 灵贷
  'ad-resistant': '多次关闭推广',
  'price-aware': '比价阅读记录',
  signed: '合同已签署',
  popup: '弹窗渠道获客',
  'enrollment-fee-rider': '借读费分期附件',
  'platform-standard': '天灵信贷·备用修为',
  'aggressive-plus': '急用修为包',
  low: '风控档位·低',
  mid: '风控档位·中',
  high: '风控档位·高',

  // 家庭 · 催收
  'grace-requested': '申请还款宽限',
  'family-contacted': '催收联系家人',
  'collection-shielded': '独自扛下催收',
  'family-saved-costly': '高代价挽留家人',
  'family-guarantor': '家庭担保人',
  'mother-left': '监护人迁出',
  'witness-departure': '见证离场（制度备注）',
  'family-false-hope': '家庭周转贷·假希望',
  'family-bridge': '家庭周转贷入账',
  'loan-prior-credit': '既有征信欠款',
  'family-exhausted': '家庭韧性耗尽',

  // 高中 / 预科 / 身体
  'hs-graduated': '高中阶段已结转',
  'uni-enrolled': '预科学籍已登记',
  'body-marked': '身体留置已入账',
  'sect-cloud': '择宗·云箓宗预科',
  'sect-iron': '择宗·铁券阁预科',
  'sect-ash': '择宗·灰炉院预科',

  // 分班 / 职场
  'tier-elite': '分班·示范班履历',
  'tier-normal': '分班·普通班履历',
  'tier-tail': '分班·末位班履历',
  'work-enrolled': '职场学籍已登记'
}

const FAMILY_EXPENSE_LABELS: Record<string, string> = {
  'rent-root': '租灵根',
  'pill-pack': '培元药剂',
  'cram-vip': '补习班 VIP',
  'borrow-fee': '借读费首期'
}

function labelFromPrefix(tag: string, prefix: string, verb: string): string | null {
  if (!tag.startsWith(prefix)) return null
  const id = tag.slice(prefix.length)
  const name = FAMILY_EXPENSE_LABELS[id]
  return name ? `${verb}·${name}` : null
}

/** 单条标签转中文；未知 ID 尽量推断，否则返回简短说明 */
export function formatProfileTag(tag: string): string {
  const fixed = PROFILE_TAG_LABELS[tag]
  if (fixed) return fixed

  const spent = labelFromPrefix(tag, 'spent-', '已支出')
  if (spent) return spent

  const request = labelFromPrefix(tag, 'request-', '已向家里索要')
  if (request) return request

  return `档案备注（${tag}）`
}

/** 去重后格式化；可选限制条数 */
export function formatProfileTags(tags: string[], limit?: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of tags) {
    const label = formatProfileTag(tag)
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
    if (limit !== undefined && out.length >= limit) break
  }
  return out
}

export function formatProfileTagsLine(tags: string[], limit = 12): string {
  const labels = formatProfileTags(tags, limit)
  return labels.length ? labels.join(' · ') : '无'
}
