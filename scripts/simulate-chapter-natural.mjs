#!/usr/bin/env node
/**
 * V4-8：章节 40 周自然/激进玩法崩盘率分布（委托 vitest 跑 chapterNaturalSim.spec.ts 中的批量逻辑）
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function runVitest(pattern) {
  const r = spawnSync(
    'yarn',
    ['vitest', '--run', pattern],
    { cwd: root, stdio: 'inherit', env: process.env }
  )
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('=== Chapter natural sim (V4-8) ===\n')
runVitest('app/logic/play/chapterNaturalSim.spec.ts')
console.log('\nDone. See spec output for collapse rate bands.')
