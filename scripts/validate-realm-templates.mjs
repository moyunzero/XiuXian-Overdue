#!/usr/bin/env node

import path from 'node:path'
import url from 'node:url'
import { loadSchemaModule } from './schemas/load-schema.mjs'
import { exitOnZodFailure } from './schemas/validate-with-zod.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const REALM_PATH = path.resolve(__dirname, '../data/realmTemplates.json')
const COLLAPSE_PATH = path.resolve(__dirname, '../data/collapseEndings.json')

const { validateRealmTemplatesBundle } = loadSchemaModule('./schemas/realmTemplates.schema.ts')

const result = validateRealmTemplatesBundle(REALM_PATH, COLLAPSE_PATH)
exitOnZodFailure('validate-realm-templates', result, () => 'validate-realm-templates: OK')
