#!/usr/bin/env node
/**
 * Generate Core API types for Console from openapi/v1.yaml.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTs from 'openapi-typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONSOLE_ROOT = join(__dirname, '..')
const REPO_ROOT = join(CONSOLE_ROOT, '..', '..')
const source = join(REPO_ROOT, 'openapi', 'v1.yaml')
const cacheDir = join(CONSOLE_ROOT, '.cache')
const normalized = join(cacheDir, 'core-openapi.normalized.yaml')
const output = join(CONSOLE_ROOT, 'src', 'api', 'core-schema.d.ts')

let yaml = readFileSync(source, 'utf8')
// openapi-typescript 7.x requires openapi: 3.0.x (not 3.1.x)
yaml = yaml.replace(/^openapi: .+$/m, 'openapi: 3.0.3', 1)
// Fix inline map syntax
yaml = yaml.replace('secondary_color:{ type:', 'secondary_color: { type:')
// branding/logo references undefined ServiceUnavailable; inline as ErrorResponse
yaml = yaml.replace(
  /"503": \{ \$ref: '#\/components\/responses\/ServiceUnavailable' \}/g,
  `"503":
          description: 依赖不可用（code=SERVICE_UNAVAILABLE）
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }`,
)

mkdirSync(cacheDir, { recursive: true })
writeFileSync(normalized, yaml)

const result = await openapiTs(normalized)
writeFileSync(output, result)

console.log(`✅ Core API types → ${relative(CONSOLE_ROOT, output)}`)
