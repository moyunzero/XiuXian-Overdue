#!/usr/bin/env node

import path from 'node:path'
import url from 'node:url'
import { loadSchemaModule } from './schemas/load-schema.mjs'
import { exitOnZodFailure } from './schemas/validate-with-zod.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const CARDS_PATH = path.resolve(__dirname, '../data/pressureCards.json')

const { validatePressureCardsFile } = loadSchemaModule('./schemas/pressureCards.schema.ts')

const result = validatePressureCardsFile(CARDS_PATH)
exitOnZodFailure('validate-pressure-cards', result, (data) => {
  const cards = /** @type {unknown[]} */ (data)
  return `validate-pressure-cards OK (${cards.length} cards)`
})
