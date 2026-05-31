import type { ZodError } from 'zod'

/** Flatten Zod issues into CLI-friendly lines (path + message). */
export function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)'
    return `${path}: ${issue.message}`
  })
}
