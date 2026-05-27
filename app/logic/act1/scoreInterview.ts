import type { Act1Modifiers, InterviewResult } from '~/types/act1'
import type { StartConfig } from '~/types/game'

const REJECT_THRESHOLD = 28
const CONDITIONAL_THRESHOLD = 42
const SPECIAL_THRESHOLD = 62

function pointsFromAnswers(answers: Record<string, string>): { score: number; tags: string[] } {
  let score = 50
  const tags: string[] = []

  switch (answers.sleep) {
    case 'under2':
      score += 18
      tags.push('sleep-optimized')
      break
    case '2-4':
      score += 6
      break
    case '5plus':
      score -= 14
      tags.push('sleep-deficit')
      break
  }

  switch (answers.course) {
    case 'finished':
      score -= 8
      tags.push('curriculum-ahead-claim')
      break
    case 'finishing':
      score += 2
      break
    case 'behind':
      score -= 16
      tags.push('curriculum-lag')
      break
  }

  switch (answers['family-invest']) {
    case 'full':
      score += 4
      tags.push('family-all-in')
      break
    case 'partial':
      score += 8
      break
    case 'none':
      score -= 12
      tags.push('family-withdrawn')
      break
  }

  switch (answers['track-organ']) {
    case 'signed':
      score += 14
      tags.push('track-organ-loan')
      break
    case 'aware':
      score += 6
      break
    case 'unknown':
      score -= 4
      break
  }

  switch (answers['track-soul']) {
    case 'committed':
      score += 10
      tags.push('track-soul')
      break
    case 'considering':
      score += 4
      break
  }

  switch (answers['track-metabolism']) {
    case 'adapted':
      score += 8
      tags.push('track-metabolism')
      break
    case 'trial':
      score += 3
      break
  }

  switch (answers['track-gender']) {
    case 'filed':
      score += 6
      tags.push('track-gender-file')
      break
    case 'open':
      score += 2
      break
  }

  if (answers.honesty === 'mostly') {
    score -= 6
    tags.push('honesty-qualified')
  }

  return { score, tags }
}

export function scoreInterview(
  answers: Record<string, string>,
  cfg: StartConfig,
  mods: Act1Modifiers
): { score: number; result: InterviewResult; tags: string[] } {
  const { score: raw, tags } = pointsFromAnswers(answers)
  let score = raw + mods.interviewBias

  if (cfg.initialDebt > 0) {
    score -= 6
    tags.push('prior-debt-mentioned')
  }
  if (cfg.background === '富户') score += 4
  if (cfg.background === '贫民') score -= 4

  const hasTrack =
    tags.includes('track-organ-loan') ||
    tags.includes('track-soul') ||
    tags.includes('track-metabolism')

  let result: InterviewResult = 'reject'
  if (
    score >= SPECIAL_THRESHOLD &&
    cfg.talent === '天灵根' &&
    hasTrack &&
    answers.honesty === 'yes'
  ) {
    result = 'special'
    tags.push('special-track-invite')
  } else if (score >= CONDITIONAL_THRESHOLD) {
    result = 'conditional'
  } else if (score >= REJECT_THRESHOLD) {
    result = 'conditional'
    tags.push('conditional-marginal')
  } else {
    result = 'reject'
    tags.push('interview-rejected')
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), result, tags }
}
