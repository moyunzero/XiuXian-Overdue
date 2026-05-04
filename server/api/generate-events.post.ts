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

## 数值约束（必须遵守）
- **cash delta**：单个选项的现金变化不超过 ±5000
- **stat delta**：单个属性的变化不超过 ±20
- **debt delta**：债务变化不超过总债务的 30%
- **weight**：权重范围 0.5~2.0

## 输出格式
请输出纯 JSON 数组（不要使用 Markdown 代码块），每个事件必须符合以下 TypeScript 接口：

interface EventDefinition {
  id: string;                    // 唯一标识，格式：ai-{timestamp}-{random}
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
      kind: 'stat' | 'econ' | 'debt' | 'contract' | 'school' | 'log';
      target?: string;
      delta?: number;
      amount?: number;
      mode?: 'addPrincipal' | 'addInterest';
      value?: number | boolean | string;
      title?: string;
      detail?: string;
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
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: '你是一个专业的 JSON 输出引擎。只输出有效的 JSON，不要包含任何 Markdown 代码块标记或其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
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
      console.warn('[generate-events] Groq API 返回空内容')
      return []
    }

    // 尝试解析 JSON
    return parseJsonFromContent(content)
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
      return JSON.parse(match[1])
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

/**
 * 校验并过滤生成的事件
 */
export function validateAndFilterEvents(events: unknown[]): unknown[] {
  if (!Array.isArray(events)) return []

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

      return true
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
