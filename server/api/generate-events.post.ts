/**
 * AI 事件生成 API
 * 接收玩家画像和游戏上下文，调用 Groq AI 生成个性化事件
 * 
 * POST /api/generate-events
 * Body: { profile, gameState, recentEvents }
 * Response: EventDefinition[]
 */

import { defineEventHandler, readBody, createError } from 'h3'

/** AI API 调用超时（毫秒） */
export const AI_API_TIMEOUT = 15_000

/** 生成事件数量范围 */
export const MIN_EVENTS = 3
export const MAX_EVENTS = 6

export default defineEventHandler(async (event) => {
  // 仅允许 POST 请求
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  // 解析请求体
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid JSON body'
    })
  }

  // 验证必需字段
  const context = body as Record<string, unknown>
  if (!context || typeof context !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body must be an object'
    })
  }

  // 构建 Prompt
  const prompt = buildGenerationPrompt(context)

  // 调用 AI API
  const events = await callGroqAI(prompt)

  // 校验并返回
  return validateAndFilterEvents(events)
})

/**
 * 构建 AI 生成 Prompt
 */
export function buildGenerationPrompt(context: Record<string, unknown>): string {
  const profile = context.profile as Record<string, unknown> | undefined
  const gameState = context.gameState as Record<string, unknown> | undefined
  const recentEvents = context.recentEvents as Array<Record<string, unknown>> | undefined

  // 提取画像信息
  const tags = Array.isArray(profile?.tags) ? profile.tags.join(', ') : '无'
  const financialRisk = (profile?.financialRisk as string) ?? 'unknown'
  const compliance = (profile?.compliance as string) ?? 'unknown'
  const educationCredit = (profile?.educationCredit as string) ?? 'unknown'
  const bodyAsset = (profile?.bodyAsset as string) ?? 'unknown'

  // 提取游戏状态
  const schoolDay = (gameState?.school as Record<string, unknown>)?.day as number | undefined
  const cash = (gameState?.econ as Record<string, unknown>)?.cash as number | undefined
  const debt = (gameState?.econ as Record<string, unknown>)?.debtPrincipal as number | undefined
  const delinquency = (gameState?.econ as Record<string, unknown>)?.delinquency as number | undefined
  const fatigue = (gameState?.stats as Record<string, unknown>)?.fatigue as number | undefined
  const classTier = (gameState?.school as Record<string, unknown>)?.classTier as string | undefined

  // 近期已触发事件
  const recentEventList = Array.isArray(recentEvents)
    ? recentEvents.slice(0, 10).map(e => `- ${e.family ?? 'unknown'}: ${e.title ?? 'unknown'}`).join('\n')
    : '无'

  return `你是一个赛博朋克修仙世界"修仙欠费中"的事件设计师。请根据以下玩家画像生成 ${MIN_EVENTS}~${MAX_EVENTS} 个个性化事件。

## 玩家画像
- 行为标签：${tags}
- 财务风险等级：${financialRisk}
- 制度顺从等级：${compliance}
- 教育信用等级：${educationCredit}
- 身体资产等级：${bodyAsset}

## 游戏状态
- 当前天数：${schoolDay ?? '未知'}
- 班级：${classTier ?? '未知'}
- 现金：¥${cash ?? 0}
- 债务：¥${debt ?? 0}
- 逾期等级：${delinquency ?? 0}
- 疲劳值：${fatigue ?? 0}/100

## 近期已触发事件（避免重复）
${recentEventList}

## 世界观与风格要求
1. **世界观**：赛博朋克修仙世界，修仙学院实行学分制和贷款制度，学生借贷修仙，毕业后面临催收
2. **基调**：压抑、讽刺、现实主义，反映当代教育内卷、零工经济、消费贷、社会信用体系等现实问题
3. **事件类型**：应覆盖以下多个主题
   - 催收压迫类（短信轰炸、上门威胁、社交羞辱）
   - 打工诱惑类（黑中介、克扣工资、过劳）
   - 修仙挫折类（补习班陷阱、升学压力、资源垄断）
   - 制度压迫类（社会信用体系、校园霸凌、权力滥用）
   - 身体偿还类（器官抵押、医疗剥削）
   - 社交关系类（人际关系异化、朋友背叛、利益交换）

## 选项设计要求（核心，必须遵守）

每个事件的选项必须满足以下要求：

### 1. 选项与事件情境强绑定
选项的 label 和 effects 必须直接反映事件描述中的具体情境。
- 催收电话事件 → 选项应该是"接听协商"、"挂断拉黑"、"假装没看见"，而不是通用的"接受"/"拒绝"
- 打工机会事件 → 选项应该是"接单赚钱（疲劳+现金+）"、"婉拒（保留精力）"，effects 要体现打工的具体代价
- 修仙挫折事件 → 选项应该是"花钱买补给（-cash, +faLi）"、"硬撑（+fatigue, 少量+faLi）"、"放弃（-daoXin）"

### 2. 选项之间必须有实质差异
同一事件的不同选项，effects 必须不同，且体现不同的权衡取舍：
- 不能所有选项都只改 focus
- 不能所有选项的 delta 数值相同
- 至少有一个选项涉及经济代价（cash/debt），一个选项涉及状态代价（fatigue/focus）
- "积极选项"和"消极选项"的 effects 方向应该相反或互补

### 3. 选项数量：每个事件 2~3 个选项，不要超过 3 个

### 4. 参考示例（正确的差异化设计）：
事件：催收员上门
- 选项A "开门协商"：effects: [{kind:"econ",target:"cash",delta:-500}, {kind:"stat",target:"focus",delta:-3}]
- 选项B "装不在家"：effects: [{kind:"debt",mode:"addInterest",amount:200}, {kind:"stat",target:"fatigue",delta:5}]
- 选项C "报警驱离"：effects: [{kind:"econ",target:"collectionFee",delta:300}, {kind:"stat",target:"focus",delta:-8}]

事件：黑市补给商
- 选项A "买一份"：effects: [{kind:"econ",target:"cash",delta:-200}, {kind:"stat",target:"fatigue",delta:-10}, {kind:"stat",target:"focus",delta:5}]
- 选项B "走开"：effects: [{kind:"stat",target:"focus",delta:-2}]（什么都没得到，但也没损失）


- **cash delta**：单个选项的现金变化不超过 ±5000
- **stat delta**：单个属性的变化不超过 ±20
- **debt delta**：债务变化不超过总债务的 30%
- **weight**：权重范围 0.5~2.0

## Effect 字段约束（严格遵守，否则效果不生效）

### stat effect 的 target 只能是以下之一：
- daoXin（道心，修仙等级）
- faLi（法力值）
- rouTi（肉体强度）
- fatigue（疲劳，0~100）
- focus（专注，0~100）

### econ effect 的 target 只能是以下之一：
- cash（现金）
- collectionFee（催收费）
- debtPrincipal（债务本金）
- debtInterestAccrued（累计利息）
- delinquency（逾期等级）

### debt effect 必须包含 mode 字段：
- mode: 'addPrincipal'（增加本金）或 'addInterest'（增加利息）
- amount: 数字

### 禁止使用的无效 target（这些字段不存在，会被忽略）：
- compliance、cultivation、bodyAsset、reputation 等均无效，禁止使用

## 输出格式
请输出纯 JSON 数组（不要使用 Markdown 代码块），每个事件必须符合以下 TypeScript 接口：

interface EventDefinition {
  id: string;                    // 唯一标识，格式：ai-{当前Unix毫秒时间戳}-{4位随机数}，每个事件必须不同
  title: string;                 // 事件标题，简洁有力
  body: string;                  // 事件描述，100~300 字
  type: string;                  // 事件类型，如：collection、parttime、cultivation、institution、body、social
  family?: string;               // 事件家族，用于冷却互斥
  tone?: 'info' | 'warn' | 'danger' | 'ok';  // 情感基调
  phase?: 'afterAction';         // 触发阶段，默认 afterAction
  weight?: number;               // 权重，默认 1.0
  cooldownDays?: number;         // 冷却天数，默认 7
  maxTimes?: number;             // 最大触发次数
  trigger?: {                    // 触发条件（可选）
    financialRiskIn?: ('low' | 'medium' | 'high' | 'extreme')[];
    educationCreditIn?: ('excellent' | 'good' | 'fair' | 'poor')[];
    complianceIn?: ('rebel' | 'neutral' | 'compliant' | 'domesticated')[];
    bodyAssetIn?: ('intact' | 'partial' | 'severe')[];
    profileTagIn?: ('workaholic' | 'cultivator' | 'defaulter' | 'good_student' | 'rebel' | 'contract_slave' | 'body_seller')[];
  };
  options: Array<{
    id: string;                  // 选项 ID
    label: string;               // 选项标签
    tone?: 'info' | 'warn' | 'danger' | 'ok';
    effects: Array<{
      kind: 'stat' | 'econ' | 'debt' | 'log';
      target?: string;           // stat 只能用：daoXin/faLi/rouTi/fatigue/focus；econ 只能用：cash/collectionFee/debtPrincipal/debtInterestAccrued/delinquency
      delta?: number;
      amount?: number;
      mode?: 'addPrincipal' | 'addInterest';
      title?: string;            // log effect 用
      detail?: string;           // log effect 用
    }>;
  }>;
}

请直接输出 JSON 数组，不要包含任何解释或其他文字。`
}

/**
 * 调用 Groq AI API
 */
async function callGroqAI(prompt: string): Promise<unknown[]> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.warn('[generate-events] GROQ_API_KEY 未配置，返回空数组')
    return []
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_API_TIMEOUT)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: '你是一个专业的 JSON 输出引擎。只输出有效的 JSON 数组（以 [ 开头，以 ] 结尾），不要包含任何 Markdown 代码块标记或其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`[generate-events] Groq API 错误: ${response.status} ${errorText}`)
      return []
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.warn('[generate-events] Groq API 返回空内容，完整响应:', JSON.stringify(data).slice(0, 500))
      return []
    }

    console.log('[generate-events] Groq 原始返回 (前300字):', content.slice(0, 300))

    // 尝试解析 JSON
    const parsed = parseJsonFromContent(content)
    console.log(`[generate-events] parseJsonFromContent 结果: ${parsed.length} 条`)
    return parsed
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[generate-events] Groq API 调用超时')
    } else {
      console.error('[generate-events] Groq API 调用失败:', error)
    }
    return []
  }
}

/**
 * 从 AI 响应内容中解析 JSON
 */
export function parseJsonFromContent(content: string): unknown[] {
  // 尝试直接解析
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
    if (parsed.events && Array.isArray(parsed.events)) return parsed.events
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data
  } catch {
    // 忽略
  }

  // 尝试从 Markdown 代码块中提取
  const codeBlockRegex = /```(?:json)?\s*\n([\s\S]*?)```/
  const match = content.match(codeBlockRegex)
  if (match) {
    try {
      return JSON.parse(match[1] ?? '')
    } catch {
      // 忽略
    }
  }

  // 尝试找到 JSON 数组的开始和结束
  const arrayStart = content.indexOf('[')
  const arrayEnd = content.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(content.slice(arrayStart, arrayEnd + 1))
    } catch {
      // 忽略
    }
  }

  console.warn('[generate-events] 无法从 AI 响应中解析 JSON 数组')
  return []
}

const VALID_STAT_TARGETS = new Set(['daoXin', 'faLi', 'rouTi', 'fatigue', 'focus'])
const VALID_ECON_TARGETS = new Set(['cash', 'collectionFee', 'debtPrincipal', 'debtInterestAccrued', 'delinquency'])

/**
 * 检查一个事件的所有选项 effects 是否完全相同（模板化问题）
 */
function hasIdenticalOptions(event: Record<string, unknown>): boolean {
  const options = event.options as Array<Record<string, unknown>>
  if (options.length < 2) return false
  const signatures = options.map(opt =>
    JSON.stringify((opt.effects as unknown[]).map((e: unknown) => {
      const ef = e as Record<string, unknown>
      // 只比较 kind + target + delta/amount/mode，忽略 log 的 title/detail
      return ef.kind === 'log'
        ? { kind: 'log' }
        : { kind: ef.kind, target: ef.target, delta: ef.delta, amount: ef.amount, mode: ef.mode }
    }))
  )
  return signatures.every(s => s === signatures[0])
}

/**
 * 校验并过滤生成的事件
 */
export function validateAndFilterEvents(events: unknown[]): unknown[] {
  if (!Array.isArray(events)) return []

  const usedIds = new Set<string>()

  return events
    .filter((e): e is Record<string, unknown> => {
      if (typeof e !== 'object' || e === null) return false
      const event = e as Record<string, unknown>

      // 必需字段校验
      if (typeof event.id !== 'string' || !event.id) return false
      if (typeof event.title !== 'string' || !event.title) return false
      if (typeof event.body !== 'string' || !event.body) return false
      if (typeof event.type !== 'string' || !event.type) return false

      // options 校验
      if (!Array.isArray(event.options) || event.options.length === 0) return false

      for (const opt of event.options) {
        if (typeof opt !== 'object' || opt === null) return false
        const option = opt as Record<string, unknown>
        if (typeof option.id !== 'string' || !option.id) return false
        if (typeof option.label !== 'string' || !option.label) return false
        if (!Array.isArray(option.effects)) return false
      }

      // 过滤选项 effects 完全相同的事件（模板化问题）
      if (hasIdenticalOptions(event)) {
        console.warn(`[generate-events] 过滤模板化事件（所有选项 effects 相同）: "${event.title}"`)
        return false
      }

      return true
    })
    .map(event => {
      // 修复重复或固定的 id，确保唯一
      let id = event.id as string
      if (usedIds.has(id) || /^ai-\d{10}-/.test(id)) {
        // 秒级时间戳（10位）说明是固定值，重新生成
        id = `ai-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
      }
      usedIds.add(id)
      event.id = id

      // 过滤每个 option 中无效 target 的 effects
      const options = event.options as Array<Record<string, unknown>>
      for (const option of options) {
        const effects = option.effects as Array<Record<string, unknown>>
        option.effects = effects.filter(effect => {
          const kind = effect.kind as string
          if (kind === 'stat') {
            const valid = VALID_STAT_TARGETS.has(effect.target as string)
            if (!valid) console.warn(`[generate-events] 过滤无效 stat target: "${effect.target}"`)
            return valid
          }
          if (kind === 'econ') {
            const valid = VALID_ECON_TARGETS.has(effect.target as string)
            if (!valid) console.warn(`[generate-events] 过滤无效 econ target: "${effect.target}"`)
            return valid
          }
          // debt/log 类型保留
          return kind === 'debt' || kind === 'log'
        })

        // 过滤后如果 effects 为空，补一个兜底 log effect
        if ((option.effects as Array<unknown>).length === 0) {
          option.effects = [{
            kind: 'log',
            title: '系统记录',
            detail: '你做出了选择，系统已记录。',
            tone: 'info'
          }]
        }
      }

      return event
    })
    .map(applyNumericalConstraints)
}

/**
 * 应用数值平衡约束
 */
export function applyNumericalConstraints(event: Record<string, unknown>): Record<string, unknown> {
  const maxCashDelta = 5000
  const maxStatDelta = 20

  // 确保 phase 默认值
  if (!event.phase) {
    event.phase = 'afterAction'
  }

  // 确保 weight 范围
  const weight = event.weight as number | undefined
  if (weight !== undefined) {
    event.weight = Math.max(0.5, Math.min(2.0, weight))
  } else {
    event.weight = 1.0
  }

  // 确保 cooldownDays 默认值
  if (!event.cooldownDays || typeof event.cooldownDays !== 'number') {
    event.cooldownDays = 7
  }

  // 约束 effects 数值
  const options = event.options as Array<Record<string, unknown>>
  for (const option of options) {
    const effects = option.effects as Array<Record<string, unknown>>
    for (const effect of effects) {
      if (effect.kind === 'stat' && typeof effect.delta === 'number') {
        effect.delta = Math.max(-maxStatDelta, Math.min(maxStatDelta, effect.delta))
      }
      if (effect.kind === 'econ' && typeof effect.delta === 'number') {
        effect.delta = Math.max(-maxCashDelta, Math.min(maxCashDelta, effect.delta))
      }
    }
  }

  return event
}
