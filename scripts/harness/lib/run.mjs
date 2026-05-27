import { spawn } from 'node:child_process'

/**
 * @param {string} command
 * @param {{ cwd?: string; env?: NodeJS.ProcessEnv }} [opts]
 * @returns {Promise<{ ok: boolean; code: number; stdout: string; stderr: string; ms: number }>}
 */
export function runCommand(command, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const start = Date.now()

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...opts.env, FORCE_COLOR: '0' },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
        ms: Date.now() - start
      })
    })

    child.on('error', (err) => {
      resolve({
        ok: false,
        code: 1,
        stdout,
        stderr: `${stderr}\n${err.message}`,
        ms: Date.now() - start
      })
    })
  })
}

/**
 * @param {string} text
 * @param {number} max
 */
export function tail(text, max = 4000) {
  if (!text) return ''
  const t = text.trim()
  if (t.length <= max) return t
  return `…(truncated)\n${t.slice(-max)}`
}
