import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 玩法层静态合规：玩家可见代码不得把 profileTags / educationTags 直接 join 成文案。
 * 须走 formatProfileTags / formatPlayerFacingTagLine（见 playerFacingCopy.ts）。
 */
const PLAY_SCAN_ROOTS = [
  join(process.cwd(), 'app/logic/play'),
  join(process.cwd(), 'app/components/play'),
  join(process.cwd(), 'app/pages/play'),
  join(process.cwd(), 'app/composables')
]

const BANNED_PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: 'profileTags 直接 join',
    re: /\bprofileTags\b[^;\n]{0,120}\.join\s*\(/
  },
  {
    name: 'educationTags 直接 join',
    re: /\beducationTags\b[^;\n]{0,120}\.join\s*\(/
  },
  {
    name: '压力牌 offered 用上一张 ID 凑满四张',
    re: /ids\.push\s*\(\s*ids\[\s*ids\.length\s*-\s*1\s*\]/
  }
]

const ALLOW_LINE =
  /formatProfileTags|formatPlayerFacingTagLine|formatProfileTagsLine|formatArchiveTopTags/

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!statSync(dir).isDirectory()) return acc
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules') continue
      collectSourceFiles(full, acc)
    } else if (
      /\.(ts|vue)$/.test(name) &&
      !name.endsWith('.spec.ts') &&
      name !== 'playerFacingCopy.ts'
    ) {
      if (dir.includes('composables') && !/^usePlay/.test(name)) continue
      acc.push(full)
    }
  }
  return acc
}

function lineAllowed(line: string): boolean {
  return ALLOW_LINE.test(line)
}

describe('play compliance · 玩家可见标签', () => {
  it('玩法相关源码不得对 profileTags/educationTags 直接 join', () => {
    const files = PLAY_SCAN_ROOTS.flatMap((root) => collectSourceFiles(root))
    const hits: string[] = []

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!
        for (const { name, re } of BANNED_PATTERNS) {
          if (re.test(line) && !lineAllowed(line)) {
            hits.push(`${file}:${i + 1}: ${name}`)
          }
        }
      }
    }

    expect(hits).toEqual([])
  })
})

describe('play compliance · 压力牌四选二', () => {
  it('PressureDeck 不得仅用 card.id 作 v-for key（重复 ID 会渲染成四张同牌）', () => {
    const file = join(process.cwd(), 'app/components/play/PressureDeck.vue')
    const content = readFileSync(file, 'utf8')
    expect(content).not.toMatch(/v-for="card in cards"[\s\S]*?:key="card\.id"/)
    expect(content).toMatch(/:key="`\$\{index\}-\$\{card\.id\}`"/)
  })
})
