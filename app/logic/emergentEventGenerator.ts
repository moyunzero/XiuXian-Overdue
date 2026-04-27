import type {
  EventTemplate,
  EventContext,
  EmergentEvent,
  TemplateCondition,
  OptionTemplate,
  EffectTemplate,
  EventOptionDefinition,
  GameState,
  PersonalityProfile,
  HiddenModifiers,
  CausalNode,
  EventEffectKind
} from '~/types/game'
import eventsData from '../../data/eventTemplates.json'

const templateData = eventsData as { version: number; templates: EventTemplate[] }

let templateCache: EventTemplate[] | null = null

function loadTemplates(): EventTemplate[] {
  if (templateCache) {
    return templateCache
  }
  templateCache = templateData.templates
  return templateCache
}

export function generateEmergentEvent(
  context: EventContext,
  rand: () => number = Math.random
): EmergentEvent | null {
  const templates = loadTemplates()

  const scoredTemplates = templates
    .map(template => ({
      template,
      score: scoreTemplateRelevance(template, context)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scoredTemplates.length === 0) {
    return null
  }

  const totalWeight = scoredTemplates.reduce((sum, item) => sum + item.template.weight, 0)
  let random = rand() * totalWeight

  let selectedTemplate: EventTemplate | null = null
  for (const item of scoredTemplates) {
    random -= item.template.weight
    if (random <= 0) {
      selectedTemplate = item.template
      break
    }
  }

  if (!selectedTemplate) {
    selectedTemplate = scoredTemplates[0].template
  }

  try {
    return fillTemplate(selectedTemplate, context)
  } catch {
    return null
  }
}

export function scoreTemplateRelevance(
  template: EventTemplate,
  context: EventContext
): number {
  if (!evaluateConditions(template.triggerConditions, context)) {
    return 0
  }

  let baseScore = template.weight * 10

  const stressModifier = context.stressLevel > 70 ? 1.5 : context.stressLevel > 40 ? 1.0 : 0.8
  baseScore *= stressModifier

  const profileMatch = calculateProfileMatch(template, context.profile)
  baseScore *= (0.5 + profileMatch * 0.5)

  if (template.tone === 'danger' && context.stressLevel > 60) {
    baseScore *= 1.3
  }

  return baseScore
}

function calculateProfileMatch(
  template: EventTemplate,
  profile: PersonalityProfile
): number {
  let match = 0
  let checks = 0

  for (const condition of template.triggerConditions) {
    if (condition.variable.startsWith('profile.')) {
      checks++
      const profileKey = condition.variable.replace('profile.', '') as keyof PersonalityProfile
      const profileValue = profile[profileKey]

      if (typeof profileValue === 'string' && condition.value === profileValue) {
        match += 1
      } else if (condition.operator === 'in' && Array.isArray(condition.value)) {
        if (condition.value.includes(profileValue)) {
          match += 1
        }
      }
    }
  }

  return checks > 0 ? match / checks : 0.5
}

export function evaluateConditions(
  conditions: TemplateCondition[],
  context: EventContext
): boolean {
  for (const condition of conditions) {
    if (!evaluateSingleCondition(condition, context)) {
      return false
    }
  }
  return true
}

export function evaluateSingleCondition(
  condition: TemplateCondition,
  context: EventContext
): boolean {
  const value = getNestedValue(context, condition.variable)

  if (value === undefined || value === null) {
    return false
  }

  switch (condition.operator) {
    case 'gt':
      return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value
    case 'lt':
      return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value
    case 'gte':
      return typeof value === 'number' && typeof condition.value === 'number' && value >= condition.value
    case 'lte':
      return typeof value === 'number' && typeof condition.value === 'number' && value <= condition.value
    case 'eq':
      return value === condition.value
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    case 'contains':
      if (typeof value === 'string' && typeof condition.value === 'string') {
        return value.includes(condition.value)
      }
      if (Array.isArray(value)) {
        return value.includes(condition.value)
      }
      return false
    default:
      return false
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

export function fillTemplate(
  template: EventTemplate,
  context: EventContext
): EmergentEvent {
  const filledTitle = fillStringTemplate(template.titleTemplate, context)
  const filledBody = fillStringTemplate(template.bodyTemplate, context)

  const options: EventOptionDefinition[] = template.optionTemplates.map(optTemplate => ({
    id: optTemplate.id,
    label: fillStringTemplate(optTemplate.labelTemplate, context),
    tone: optTemplate.tone,
    description: '',
    effects: optTemplate.effectTemplates.map(effectTemplate => ({
      kind: effectTemplate.kind,
      target: effectTemplate.targetTemplate.replace('${', '').replace('}', '') as any,
      delta: evaluateDeltaTemplate(effectTemplate.deltaTemplate, context)
    }))
  }))

  return {
    id: `emergent_${template.id}_${Date.now()}`,
    title: filledTitle,
    body: filledBody,
    options,
    tone: template.tone,
    tier: template.tier,
    isEmergent: true,
    generatedAt: Date.now()
  }
}

function fillStringTemplate(template: string, context: EventContext): string {
  let result = template

  result = result.replace(/\$\{playerName\}/g, context.state.startConfig?.playerName || '修士')

  result = result.replace(/\$\{econ\.(\w+)\}/g, (_, key) => {
    const value = (context.state.econ as Record<string, unknown>)[key]
    return String(value ?? '')
  })

  result = result.replace(/\$\{stats\.(\w+)\}/g, (_, key) => {
    const value = (context.state.stats as Record<string, unknown>)[key]
    return typeof value === 'number' ? value.toFixed(1) : String(value ?? '')
  })

  result = result.replace(/\$\{school\.(\w+)\}/g, (_, key) => {
    const value = (context.state.school as Record<string, unknown>)[key]
    return String(value ?? '')
  })

  result = result.replace(/\$\{profile\.(\w+)\}/g, (_, key) => {
    const value = (context.profile as Record<string, unknown>)[key]
    return String(value ?? '')
  })

  result = result.replace(/\$\{hiddenVariables\.(\w+)\}/g, (_, path) => {
    const value = getNestedValue(context.hiddenModifiers as unknown as Record<string, unknown>, path)
    return String(value ?? '0')
  })

  result = result.replace(/\$\{requiredCash\}/g, String(Math.floor(context.state.econ.cash * 0.5 + 500)))

  return result
}

function evaluateDeltaTemplate(deltaTemplate: string, context: EventContext): number {
  const trimmed = deltaTemplate.trim()

  if (trimmed.startsWith('-') || trimmed.startsWith('+') || /^\d/.test(trimmed)) {
    const match = trimmed.match(/^([+-]?)(\d+(?:\.\d+)?)$/)
    if (match) {
      const sign = match[1] === '-' ? -1 : 1
      const value = parseFloat(match[2])
      return sign * value
    }
  }

  if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
    const varPath = trimmed.slice(2, -1)
    const value = getNestedValue(context as unknown as Record<string, unknown>, varPath)
    if (typeof value === 'number') {
      return value
    }
  }

  const evaluated = evaluateMathExpression(trimmed, context)
  return evaluated
}

function evaluateMathExpression(expr: string, context: EventContext): number {
  let result = expr

  result = result.replace(/\$\{stats\.(\w+)\}/g, (_, key) => {
    const value = (context.state.stats as Record<string, unknown>)[key]
    return String(typeof value === 'number' ? value : 0)
  })

  result = result.replace(/\$\{econ\.(\w+)\}/g, (_, key) => {
    const value = (context.state.econ as Record<string, unknown>)[key]
    return String(typeof value === 'number' ? value : 0)
  })

  try {
    const sanitized = result.replace(/[^0-9+\-*/().]/g, '')
    if (sanitized && /^[\d+\-*/().]+$/.test(sanitized)) {
      const fn = new Function(`return ${sanitized}`)
      return fn()
    }
  } catch {
    // ignore
  }

  const num = parseFloat(result)
  return isNaN(num) ? 0 : num
}

export function fallbackToStaticEvent(
  state: GameState,
  phase: 'afterAction' | 'endOfDay',
  rand: () => number = Math.random
): { eventId: string; weight: number } | null {
  return null
}

export function getTemplatesByFamily(family: string): EventTemplate[] {
  const templates = loadTemplates()
  return templates.filter(t => t.family === family)
}

export function getTemplatesByPhase(phase: 'afterAction' | 'endOfDay'): EventTemplate[] {
  const templates = loadTemplates()
  return templates.filter(t => t.phase === phase)
}

export function getAllTemplates(): EventTemplate[] {
  return loadTemplates()
}

export function validateTemplate(template: unknown): template is EventTemplate {
  if (typeof template !== 'object' || template === null) {
    return false
  }

  const t = template as Record<string, unknown>

  if (typeof t.id !== 'string') return false
  if (typeof t.family !== 'string') return false
  if (typeof t.titleTemplate !== 'string') return false
  if (typeof t.bodyTemplate !== 'string') return false
  if (!Array.isArray(t.triggerConditions)) return false
  if (!Array.isArray(t.optionTemplates)) return false
  if (typeof t.weight !== 'number') return false
  if (typeof t.tone !== 'string') return false

  for (const condition of t.triggerConditions) {
    if (typeof condition !== 'object' || condition === null) return false
    if (typeof (condition as Record<string, unknown>).variable !== 'string') return false
    if (typeof (condition as Record<string, unknown>).operator !== 'string') return false
  }

  for (const option of t.optionTemplates) {
    if (typeof option !== 'object' || option === null) return false
    if (typeof (option as Record<string, unknown>).id !== 'string') return false
    if (typeof (option as Record<string, unknown>).labelTemplate !== 'string') return false
  }

  return true
}
