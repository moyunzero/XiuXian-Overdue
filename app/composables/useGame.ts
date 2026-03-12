import type { ActionId, GameState, PendingEvent, SlotId, StartConfig } from '~/types/game'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'

const STORAGE_KEY = 'kunxu_sim_save_v2'
const LEGACY_STORAGE_KEY = 'kunxu_sim_save_v1'

type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3'

interface SaveSlotMeta {
  id: SaveSlotId
  label: string
  updatedAt: number
  started: boolean
  day: number
  week: number
  tier: GameState['school']['classTier']
  cash: number
  debt: number
}

interface SaveContainer {
  activeSlot: SaveSlotId
  slots: Partial<Record<SaveSlotId, { meta: SaveSlotMeta; state: GameState }>>
}

function defaultState(): GameState {
  return {
    started: false,
    seed: Math.floor(Math.random() * 1_000_000_000),
    stats: {
      daoXin: 1,
      faLi: 6.8,
      rouTi: 0.6,
      fatigue: 25,
      focus: 55
    },
    econ: {
      cash: 1200,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 0
    },
    school: {
      day: 1,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 0,
      lastRank: 999,
      perks: {
        mealSubsidy: 0,
        focusBonus: 0
      }
    },
    contract: {
      active: false,
      name: '请神契约',
      patron: '布娃娃（邪神代理）',
      progress: 0,
      vigilance: 35,
      lastTriggerDay: 0
    },
    logs: []
  }
}

function slotOrder(): SlotId[] {
  return ['morning', 'afternoon', 'night']
}

function describeSlot(slot: SlotId) {
  if (slot === 'morning') return '清晨'
  if (slot === 'afternoon') return '午后'
  return '深夜'
}

function scoreForExam(g: GameState, rand: () => number) {
  const { daoXin, faLi, rouTi, focus, fatigue } = g.stats
  const tier = g.school.classTier
  const tierBoost = tier === '示范班' ? 10 : tier === '普通班' ? 0 : -8
  const debtPenalty = Math.min(18, Math.log10(1 + g.econ.debtPrincipal / 1000) * 6)
  const fatiguePenalty = Math.max(0, (fatigue - 55) * 0.25)
  const focusBonus = (focus + g.school.perks.focusBonus) * 0.05

  const base =
    520 +
    daoXin * 8 +
    faLi * 6.5 +
    rouTi * 35 +
    tierBoost +
    focusBonus -
    debtPenalty -
    fatiguePenalty

  const noise = (rand() - 0.5) * 14
  return Math.round(base + noise)
}

function determineTier(score: number) {
  if (score >= 600) return '示范班' as const
  if (score >= 540) return '普通班' as const
  return '末位班' as const
}

function perksForTier(tier: GameState['school']['classTier']) {
  if (tier === '示范班') return { mealSubsidy: 160, focusBonus: 10 }
  if (tier === '普通班') return { mealSubsidy: 40, focusBonus: 0 }
  return { mealSubsidy: 0, focusBonus: -6 }
}

function randomEventAfterAction(g: GameState, rand: () => number): PendingEvent | undefined {
  const d = g.school.day
  const debt = g.econ.debtPrincipal + g.econ.debtInterestAccrued

  // 请神契约：第2周开始更容易遇到"走投无路的选项"
  if (!g.contract.active) {
    const pRitual = clamp(
      0.0 +
        (d >= 8 ? 0.05 : 0) +
        (debt >= 30_000 ? 0.05 : 0) +
        (g.econ.cash < 500 ? 0.04 : 0) +
        (g.econ.delinquency >= 1 ? 0.05 : 0),
      0,
      0.25
    )
    if (rand() < pRitual) {
      return {
        title: '请神广告：三个愿望（限时）',
        body:
          '你刷到一条"修仙贷"广告，画面里是一个破旧布娃娃。它说：你只要点头，就能把"潜力"激发出来。代价？合同里写得很小很小。',
        options: [
          { id: 'accept', label: '签（我没得选）', tone: 'danger' },
          { id: 'ignore', label: '划走（先苟住）' }
        ]
      }
    }
  }

  // 催收升级：逾期越高越常出现
  const pCollector = clamp(0.02 + g.econ.delinquency * 0.05 + (debt > 50_000 ? 0.02 : 0), 0, 0.30)
  if (rand() < pCollector) {
    const level = g.econ.delinquency

    // 逾期2级以上提供债务重组选项
    if (level >= 2 && rand() < 0.35) {
      return {
        title: '债务重组机会',
        body:
          '催收部门联系你，提供一次"债务重组"机会：延长还款期限，但总利息会增加30%。这能让你暂时喘口气，但代价不小。',
        options: [
          { id: 'restructure', label: '接受重组（延长期限，增加利息）', tone: 'primary' },
          { id: 'decline', label: '拒绝（继续承受压力）', tone: 'danger' }
        ]
      }
    }

    const title = level >= 2 ? '催收升级：线下核验' : '催收提醒：请及时还款'
    const body =
      level >= 2
        ? '你的通讯录被"温柔"地翻了一遍。对方表示：再拖下去，会去你"背调所在地"核查。你的道心开始发紧。'
        : '你的手机震动不止。对方说话像念咒：逾期、违约、后果自负。你听得心烦意乱。'
    return {
      title,
      body,
      options: [
        { id: 'ok', label: '把手机扣在桌面上（强装镇定）', tone: 'primary' },
        { id: 'panic', label: '点开消息反复确认（焦虑加重）', tone: 'danger' }
      ]
    }
  }

  // 老师推销 / "正规渠道"
  const pTeacher = clamp(0.05 + (g.school.classTier === '末位班' ? 0.05 : 0) + (d <= 7 ? 0.03 : 0), 0, 0.22)
  if (rand() < pTeacher) {
    return {
      title: '老师的"关心"',
      body:
        '老师把你叫到一旁，先夸你"基础不错"，再递来一张价目表：功能增强剂、静心剂、天灵根体验券……最后补一句：走正规渠道，最安全。',
      options: [
        { id: 'buy_small', label: '买一份便宜的（心里发痛）', tone: 'primary' },
        { id: 'refuse', label: '婉拒（感觉被记了一笔）' }
      ]
    }
  }

  // 零工机会：缺钱时更常出现
  const pJob = clamp(0.04 + (g.econ.cash < 600 ? 0.06 : 0) + (g.stats.fatigue < 70 ? 0.02 : -0.02), 0, 0.20)
  if (rand() < pJob) {
    return {
      title: '零工通知：临时安保/搬运',
      body:
        '中介发来消息：今晚有四小时临时活，按小时结算。强度不低，但钱很干净——至少看起来是。',
      options: [
        { id: 'take', label: '接单（赚钱优先）', tone: 'primary' },
        { id: 'skip', label: '放弃（保留精力修炼）' }
      ]
    }
  }

  return undefined
}

function applyEventChoice(g: GameState, choiceId: string) {
  const e = g.pendingEvent
  if (!e) return

  const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }

  if (e.title.includes('催收')) {
    if (choiceId === 'panic') {
      g.stats.focus = clamp(g.stats.focus - 8, 0, 100)
      g.stats.fatigue = clamp(g.stats.fatigue + 4, 0, 100)
      addLog('催收干扰', '你越看越烦，注意力像被掏空了一块。', 'warn')
    } else {
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
      addLog('强装镇定', '你把它当成噪音，但噪音还是噪音。', 'info')
    }
  }

  if (e.title === '债务重组机会') {
    if (choiceId === 'restructure') {
      // 债务重组：降低逾期等级，但增加30%总利息
      const totalDebt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
      const additionalInterest = Math.floor(totalDebt * 0.30)
      g.econ.debtInterestAccrued += additionalInterest
      g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
      g.econ.lastPaymentDay = g.school.day // 重置还款日期
      addLog('债务重组完成', `逾期等级降低，但总利息增加¥${additionalInterest.toLocaleString()}。你换来了喘息的时间。`, 'warn')
    } else {
      g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
      addLog('拒绝重组', '你选择硬扛。压力还在，但至少债务没有变得更重。', 'info')
    }
  }

  if (e.title.startsWith('请神广告')) {
    if (choiceId === 'accept') {
      g.contract.active = true
      g.contract.progress = 12
      g.contract.vigilance = clamp(g.contract.vigilance + 18, 0, 100)
      g.stats.focus = clamp(g.stats.focus - 6, 0, 100)
      addLog('请神契约生效', '你签下去那一刻，世界安静了一秒。然后你知道：你再也没有“纯休息”的权利了。', 'danger')
    } else {
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      addLog('你划走了', '你告诉自己：等缓过来再说。你也知道这话通常是假的。', 'info')
    }
  }

  if (e.title === '老师的“关心”') {
    if (choiceId === 'buy_small') {
      const cost = 180
      if (g.econ.cash >= cost) {
        g.econ.cash -= cost
        g.stats.focus = clamp(g.stats.focus + 6, 0, 100)
        g.stats.fatigue = clamp(g.stats.fatigue - 4, 0, 100)
        addLog('买了点“正规货”', `花了¥${cost}，短期状态变好。你知道这不是免费的。`, 'ok')
      } else {
        addLog('想买但买不起', '你把手缩回去。老师没有说话，只是记住了。', 'warn')
        g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
      }
    } else {
      g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
      addLog('婉拒', '你拒绝了，空气里多了一点冷。', 'warn')
    }
  }

  if (e.title.startsWith('零工通知')) {
    if (choiceId === 'take') {
      const pay = 700
      g.econ.cash += pay
      g.stats.fatigue = clamp(g.stats.fatigue + 10, 0, 100)
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
      addLog('接了零工', `赚到¥${pay}，但你明显更累了。`, 'ok')
    } else {
      addLog('放弃零工', '你选择把时间留给修炼与考试。', 'info')
    }
  }

  g.pendingEvent = undefined
}

function contractWouldTrigger(g: GameState, action: ActionId) {
  if (!g.contract.active) return false
  // 监工讨厌：休息、放弃赚钱、放弃还款、以及“明显能做正事却不做”的瞬间
  if (action === 'rest') return true
  if (action === 'parttime') return false
  // 疲劳极高时稍微放你一马（但仍可能触发）
  if (g.stats.fatigue >= 88) return false
  // 债务压力越大，越不允许“散漫”
  const debt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
  const strict = clamp(0.25 + g.contract.vigilance / 160 + (debt > 60_000 ? 0.12 : 0), 0.15, 0.65)
  // 对“买补给/借贷”等旁路不一定触发，对“躺平”更容易触发
  if (action === 'buy' && strict < 0.45) return false
  return Math.random() < strict
}

function makeContractBacklashEvent(g: GameState, intended: ActionId): PendingEvent {
  return {
    title: '反噬倒计时：不要故意拖延',
    body:
      `你刚准备“${intended === 'rest' ? '休息' : '摸鱼'}”，脑海里就响起一个冷静到不像人的声音：\n\n“请遵守契约，努力完成愿望。10…9…8…”\n\n你明白：要么立刻做正事，要么付出代价。`,
    options: [
      { id: 'forced_tuna', label: '立刻吐纳（把呼吸拧成一条线）', tone: 'primary' },
      { id: 'forced_study', label: '立刻刷题（把分数当护身符）', tone: 'primary' },
      { id: 'defy', label: '硬抗（我就要休息）', tone: 'danger' }
    ]
  }
}

export function useGame() {
  const game = useState<GameState>('game', () => defaultState())
  const activeSlot = useState<SaveSlotId>('activeSlot', () => 'autosave')

  const buildMeta = (id: SaveSlotId, label: string, g: GameState): SaveSlotMeta => {
    const debt = Math.max(0, g.econ.debtPrincipal + g.econ.debtInterestAccrued)
    return {
      id,
      label,
      updatedAt: Date.now(),
      started: g.started,
      day: g.school.day,
      week: g.school.week,
      tier: g.school.classTier,
      cash: Math.floor(g.econ.cash),
      debt: Math.floor(debt)
    }
  }

  const saveContainer = (container: SaveContainer) => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
    } catch {
      // ignore
    }
  }

  const loadContainer = (): SaveContainer | null => {
    if (import.meta.server) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as SaveContainer
    } catch {
      return null
    }
  }

  const saveToSlot = (id: SaveSlotId, label?: string) => {
    const container = loadContainer() ?? { activeSlot: activeSlot.value, slots: {} }
    const slotLabel = label ?? container.slots[id]?.meta.label ?? (id === 'autosave' ? '自动存档' : `存档${id.slice(-1)}`)
    container.activeSlot = id
    activeSlot.value = id
    container.slots[id] = {
      meta: buildMeta(id, slotLabel, game.value),
      state: game.value
    }
    saveContainer(container)
  }

  const loadFromSlot = (id: SaveSlotId) => {
    const container = loadContainer()
    const payload = container?.slots?.[id]
    if (!payload) return false
    game.value = payload.state
    activeSlot.value = id
    return true
  }

  const listSlots = computed(() => {
    const container = loadContainer()
    const ids: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']
    return ids.map((id) => container?.slots?.[id]?.meta ?? null)
  })

  const migrateLegacy = () => {
    if (import.meta.server) return
    const already = localStorage.getItem(STORAGE_KEY)
    if (already) return
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw) return
    try {
      const legacyState = JSON.parse(legacyRaw) as GameState
      const container: SaveContainer = {
        activeSlot: 'autosave',
        slots: {
          autosave: {
            meta: buildMeta('autosave', '自动存档（迁移）', legacyState),
            state: legacyState
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const reset = () => {
    game.value = defaultState()
    saveToSlot('autosave', '自动存档')
  }

  const startNew = (cfg: StartConfig) => {
    const g = defaultState()
    g.started = true
    g.startConfig = cfg
    g.seed = Math.floor(Math.random() * 1_000_000_000)

    const bgCash = cfg.background === '贫民' ? 800 : cfg.background === '中产' ? 3200 : 12_000
    const bgRate = cfg.background === '贫民' ? 0.008 : cfg.background === '中产' ? 0.006 : 0.007

    const tFa = cfg.talent === '无灵根' ? 6.2 : cfg.talent === '伪灵根' ? 7.4 : 9.2
    const tFocus = cfg.talent === '无灵根' ? 52 : cfg.talent === '伪灵根' ? 58 : 64

    g.econ.cash = bgCash
    g.econ.dailyRate = bgRate
    g.econ.debtPrincipal = Math.max(0, Math.floor(cfg.initialDebt))
    g.stats.faLi = round1(tFa)
    g.stats.focus = tFocus
    g.stats.daoXin = 1
    g.stats.rouTi = 0.6
    g.school.classTier = '普通班'
    g.school.perks = perksForTier('普通班')
    g.logs = [
      {
        id: uid('log'),
        day: 1,
        title: '开局',
        detail: `你叫“${cfg.playerName}”。城市：${cfg.startingCity}。出身：${cfg.background}。天赋：${cfg.talent}。债务：¥${g.econ.debtPrincipal.toLocaleString()}。`,
        tone: 'info'
      }
    ]

    game.value = g
    saveToSlot('autosave', '自动存档')
  }

  const totalDebt = computed(() => Math.max(0, game.value.econ.debtPrincipal + game.value.econ.debtInterestAccrued))

  const minPayment = computed(() => {
    const debt = totalDebt.value
    if (debt <= 0) return 0
    return Math.max(280, Math.floor(debt * 0.08))
  })

  const borrow = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    g.econ.debtPrincipal += a
    g.econ.cash += a
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '借贷到账',
      detail: `你借到¥${a.toLocaleString()}。利息不会因为你的梦想而心软。`,
      tone: 'warn'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const repay = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (g.econ.cash <= 0) return
    const pay = Math.min(a, g.econ.cash, totalDebt.value)
    g.econ.cash -= pay
    // 优先还利息
    const interestPay = Math.min(pay, g.econ.debtInterestAccrued)
    g.econ.debtInterestAccrued -= interestPay
    const remain = pay - interestPay
    g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - remain)
    g.econ.lastPaymentDay = g.school.day
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '还款',
      detail: `你还了¥${pay.toLocaleString()}。债务像潮水退了一点，但海还在。`,
      tone: 'ok'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const act = (action: ActionId) => {
    const g = game.value
    if (!g.started) return
    if (g.pendingEvent) return

    // 契约监工：在“你想休息/散漫”的瞬间把你按回去
    if (contractWouldTrigger(g, action)) {
      g.contract.lastTriggerDay = g.school.day
      g.contract.lastTriggerSlot = g.school.slot
      g.contract.progress = clamp(g.contract.progress + 2, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + (action === 'rest' ? 6 : 2), 0, 100)
      g.pendingEvent = makeContractBacklashEvent(g, action)
      saveToSlot(activeSlot.value)
      return
    }

    const rand = mulberry32(g.seed + g.school.day * 31 + slotOrder().indexOf(g.school.slot) * 997)

    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }

    // 行动基础耗能
    const fatigueUp = action === 'rest' ? -14 : action === 'tuna' ? 3 : action === 'study' ? 5 : action === 'train' ? 10 : action === 'parttime' ? 12 : 6
    g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)

    if (action === 'study') {
      const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
      g.stats.faLi = round1(g.stats.faLi + 0.05 + focusFactor * 0.06)
      g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
      addLog('上课/刷题', `你把时间换成了0.1点不到的优势。对别人来说，这足够决定命运。`, 'info')
    }

    if (action === 'tuna') {
      g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
      g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
      addLog('吐纳', '你把呼吸拧成一条线。法力像细流汇入气海。', 'ok')
    }

    if (action === 'train') {
      const risk = clamp((g.stats.fatigue - 60) / 120, 0, 0.25)
      const gain = 0.06 + (g.stats.rouTi < 1.2 ? 0.02 : 0)
      g.stats.rouTi = round1(g.stats.rouTi + gain)
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
      if (rand() < risk) {
        g.stats.focus = clamp(g.stats.focus - 6, 0, 100)
        addLog('训练过猛', '你的胸口像被钉住。内伤不大，但足够拖慢你。', 'warn')
      } else {
        addLog('炼体', '肌肉在撕裂与修复之间学会服从。', 'ok')
      }
    }

    if (action === 'parttime') {
      const pay = Math.floor(260 + rand() * 260) + (g.school.classTier === '示范班' ? 120 : 0)
      g.econ.cash += pay
      g.stats.focus = clamp(g.stats.focus - 4, 0, 100)
      addLog('打工', `你赚到¥${pay}。这点钱能换来一口气，或者一针药。`, 'ok')
    }

    if (action === 'buy') {
      const cost = 260
      if (g.econ.cash >= cost) {
        g.econ.cash -= cost
        g.stats.focus = clamp(g.stats.focus + 10, 0, 100)
        g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
        addLog('购买补给', `花¥${cost}买到“能让你更像机器”的东西。`, 'warn')
      } else {
        addLog('想买补给', '余额像嘲笑。你只能把手缩回去。', 'danger')
        g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
      }
    }

    if (action === 'rest') {
      g.stats.focus = clamp(g.stats.focus + 6, 0, 100)
      addLog('休息', '你偷回了一点人味。', 'info')
    }

    // 日利息滚动（每个时间段都滚一点，让压力更“实时”）
    if (totalDebt.value > 0) {
      const daily = g.econ.dailyRate
      const segmentRate = daily / 3
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + (g.econ.debtPrincipal + g.econ.debtInterestAccrued) * segmentRate)
    }

    // 食堂补贴（按天结算）
    if (g.school.slot === 'morning') {
      g.econ.cash += g.school.perks.mealSubsidy
    }

    // 行动后随机事件（把“系统的恶意”压回来）
    g.pendingEvent = randomEventAfterAction(g, rand)

    // 推进时间段
    const idx = slotOrder().indexOf(g.school.slot)
    if (idx < slotOrder().length - 1) {
      g.school.slot = slotOrder()[idx + 1]
    } else {
      endDay()
    }

    saveToSlot(activeSlot.value)
  }

  const endDay = () => {
    const g = game.value
    // 新的一天
    g.school.day += 1
    g.school.slot = 'morning'

    // 疲劳自然回落一点（但不会自动清空）
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.stats.focus = clamp(g.stats.focus + 1, 0, 100)

    // 每 7 天月考/分班结算
    if ((g.school.day - 1) % 7 === 0) {
      const rand = mulberry32(g.seed + g.school.week * 777)
      const score = scoreForExam(g, rand)
      const tier = determineTier(score)
      g.school.lastExamScore = score
      g.school.classTier = tier
      g.school.perks = perksForTier(tier)

      // 粗略排名：用分数映射到 1~200
      const rank = clamp(201 - Math.floor((score - 480) / 1.2), 1, 200)
      g.school.lastRank = rank

      g.logs.unshift({
        id: uid('log'),
        day: g.school.day - 1,
        title: `月考结算（第${g.school.week}周）`,
        detail: `总分：${score}；排名：约第${rank}名；分班：${tier}。在昆墟里，“约”也足够杀人。`,
        tone: tier === '示范班' ? 'ok' : tier === '末位班' ? 'danger' : 'info'
      })
      if (g.logs.length > 120) g.logs.pop()

      // 周期性最低还款检查
      const needPay = minPayment.value
      if (needPay > 0) {
        const daysSincePay = (g.school.day - 1) - g.econ.lastPaymentDay
        if (daysSincePay > 7) {
          const prevDelinquency = g.econ.delinquency
          g.econ.delinquency += 1
          
          // 逾期惩罚分级
          if (g.econ.delinquency === 1) {
            // 1级：警告
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期警告（1级）',
              detail: `你超过一周没还款。这是第一次警告，请尽快还款。`,
              tone: 'warn'
            })
          } else if (g.econ.delinquency === 2) {
            // 2级：利率上浮20%
            const oldRate = g.econ.dailyRate
            g.econ.dailyRate = round1(g.econ.dailyRate * 1.2)
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期升级（2级）- 利率上浮',
              detail: `连续逾期。日利率从 ${(oldRate * 100).toFixed(2)}% 上浮至 ${(g.econ.dailyRate * 100).toFixed(2)}%。`,
              tone: 'danger'
            })
          } else if (g.econ.delinquency >= 3) {
            // 3级：强制扣款
            const forcedDeduction = Math.min(g.econ.cash, Math.floor(totalDebt.value * 0.15))
            if (forcedDeduction > 0) {
              g.econ.cash -= forcedDeduction
              // 优先还利息
              const interestPay = Math.min(forcedDeduction, g.econ.debtInterestAccrued)
              g.econ.debtInterestAccrued -= interestPay
              const remain = forcedDeduction - interestPay
              g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - remain)
            }
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期严重（3级）- 强制扣款',
              detail: `严重逾期。系统强制扣除 ¥${forcedDeduction.toLocaleString()}。`,
              tone: 'danger'
            })
          }
          if (g.logs.length > 120) g.logs.pop()
        }
      }

      g.school.week += 1
    }

    // 末位班的持续压迫：道心磨损
    if (g.school.classTier === '末位班') {
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
    }
  }

  const resolveEvent = (choiceId: string) => {
    // 先处理反噬类强制选项：它本质是一次“强行改行动”
    const e = game.value.pendingEvent
    if (e?.title.startsWith('反噬倒计时')) {
      const g = game.value
      const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
        g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
        if (g.logs.length > 120) g.logs.pop()
      }
      if (choiceId === 'forced_tuna') {
        g.pendingEvent = undefined
        addLog('被迫吐纳', '你不是自律，你是被契约牵着走。', 'warn')
        act('tuna')
        return
      }
      if (choiceId === 'forced_study') {
        g.pendingEvent = undefined
        addLog('被迫刷题', '你把恐惧塞进题海里，希望它别再冒出来。', 'warn')
        act('study')
        return
      }
      if (choiceId === 'defy') {
        // 不做结局，但要让玩家感到“痛”
        g.pendingEvent = undefined
        g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
        g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
        g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
        g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
        addLog('反噬惩罚', '你确实休息到了，但代价被写进了你的身体和账单里。', 'danger')
        saveToSlot(activeSlot.value)
        return
      }
    }

    applyEventChoice(game.value, choiceId)
    saveToSlot(activeSlot.value)
  }

  const nextLabel = computed(() => {
    const g = game.value
    return `第${g.school.day}天 · ${describeSlot(g.school.slot)}`
  })

  onMounted(() => {
    migrateLegacy()
    const loaded = loadFromSlot(activeSlot.value)
    if (!loaded) {
      // 尝试从 autosave 启动
      loadFromSlot('autosave')
    }
  })

  watch(
    () => game.value,
    () => saveToSlot(activeSlot.value),
    { deep: true }
  )

  return {
    game,
    activeSlot,
    listSlots,
    totalDebt,
    minPayment,
    nextLabel,
    startNew,
    reset,
    act,
    borrow,
    repay,
    resolveEvent,
    saveToSlot,
    loadFromSlot
  }
}

