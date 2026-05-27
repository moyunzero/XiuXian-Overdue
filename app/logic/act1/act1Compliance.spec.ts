import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** PRD §14：入学前夜文案合规扫描（静态，不读 best.md） */
const BANNED_PATTERNS: { name: string; re: RegExp }[] = [
  { name: '原著常见人名', re: /韩立|李火旺|方源|萧炎|林动/ },
  { name: 'best.md 引用', re: /best\.md/i }
]

const ACT1_ROOT = join(process.cwd(), 'app/logic/act1')
const ACT1_COMPONENTS = join(process.cwd(), 'app/components/act1')

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules') continue
      collectTsFiles(full, acc)
    } else if (/\.(ts|vue)$/.test(name) && !name.endsWith('act1Compliance.spec.ts')) {
      acc.push(full)
    }
  }
  return acc
}

describe('act1 compliance', () => {
  it('Act1 源码不含禁用人名或 best.md 引用', () => {
    const files = [...collectTsFiles(ACT1_ROOT), ...collectTsFiles(ACT1_COMPONENTS)]
    const hits: string[] = []

    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const { name, re } of BANNED_PATTERNS) {
        if (re.test(text)) hits.push(`${file}: ${name}`)
      }
    }

    expect(hits).toEqual([])
  })
})
