import { createJiti } from 'jiti'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const SCRIPTS_DIR = path.resolve(__dirname, '..')

const jiti = createJiti(import.meta.url, { interopDefault: true })

/** @param {string} relativePath path relative to scripts/ */
export function loadSchemaModule(relativePath) {
  return jiti(path.resolve(SCRIPTS_DIR, relativePath))
}
