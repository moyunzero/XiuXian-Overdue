#!/usr/bin/env node

/**
 * Shared CLI exit helper for Zod-backed validate scripts.
 */

import { formatZodErrors } from './format-zod-errors.ts'

/**
 * @param {string} label
 * @param {{ success: true, data: unknown } | { success: false, error: import('zod').ZodError | { issues: Array<{ path: unknown[], message: string }> }}} result
 * @param {(data: unknown) => string | undefined} [successMessage]
 */
export function exitOnZodFailure(label, result, successMessage) {
  if (!result.success) {
    console.error(`${label} FAILED\n`)
    const issues =
      'issues' in result.error
        ? result.error.issues.map((issue) => {
            const path = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : '(root)'
            return `${path}: ${issue.message}`
          })
        : formatZodErrors(result.error)
    for (const line of issues) {
      console.error(`  - ${line}`)
    }
    process.exit(1)
  }
  const msg = successMessage?.(result.data)
  console.log(msg ?? `${label} OK`)
}
