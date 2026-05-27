import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @param {string} pattern glob-like ** segment
 * @param {string} filePath
 */
export function matchPath(pattern, filePath) {
  const norm = filePath.replace(/\\/g, '/')
  const pat = pattern.replace(/\\/g, '/')

  if (pat.endsWith('/**')) {
    const prefix = pat.slice(0, -3)
    return norm === prefix || norm.startsWith(`${prefix}/`)
  }
  if (pat.includes('**')) {
    const [head, tail] = pat.split('**')
    if (head && !norm.startsWith(head)) return false
    if (tail && !norm.includes(tail.replace(/^\//, ''))) return false
    return true
  }
  return norm === pat || norm.endsWith(`/${pat}`)
}

/**
 * @param {string[]} patterns
 * @param {string[]} files
 */
export function anyPathMatches(patterns, files) {
  for (const file of files) {
    for (const pattern of patterns) {
      if (matchPath(pattern, file)) return true
    }
  }
  return false
}

/**
 * @returns {string[]}
 */
export function getChangedFiles() {
  const commands = [
    'git diff --name-only HEAD',
    'git diff --name-only --cached',
    'git diff --name-only'
  ]

  const seen = new Set()
  for (const cmd of commands) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
      for (const line of out.split('\n')) {
        const p = line.trim()
        if (p) seen.add(p)
      }
    } catch {
      // not a git repo or no commits
    }
  }
  return [...seen]
}

/**
 * @param {import('node:fs').PathLike} root
 */
export function loadManifest(root) {
  const path = join(root, '.harness/manifest.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * @param {ReturnType<typeof loadManifest>} manifest
 * @param {string[]} changedFiles
 * @param {{ full?: boolean; quick?: boolean }} opts
 */
export function selectGates(manifest, changedFiles, opts = {}) {
  const { full = false, quick = false } = opts

  if (full || changedFiles.length === 0) {
    return manifest.gates.filter((g) => {
      if (quick && g.excludeFromQuick) return false
      if (quick && g.slow) return false
      return true
    })
  }

  return manifest.gates.filter((gate) => {
    if (quick && gate.excludeFromQuick) return false
    if (quick && gate.slow) return false
    if (!gate.triggerPaths?.length) return gate.required
    return anyPathMatches(gate.triggerPaths, changedFiles)
  })
}

/**
 * @param {ReturnType<typeof loadManifest>} manifest
 * @param {string[]} changedFiles
 */
export function selectContracts(manifest, changedFiles) {
  if (!manifest.contracts?.length) return []
  if (changedFiles.length === 0) return manifest.contracts

  return manifest.contracts.filter((c) =>
    anyPathMatches(c.triggerPaths ?? [], changedFiles)
  )
}
