#!/usr/bin/env node
/**
 * Console API types generation.
 * - Services OpenAPI -> schema.d.ts
 * - Core OpenAPI -> core-schema.d.ts
 *
 * openapi-ts v7 returns AST nodes when passed a JS object. We use the TypeScript printer to convert them to .d.ts text.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTs from 'openapi-typescript'
import yaml from 'js-yaml'
import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONSOLE_ROOT = join(__dirname, '..')
const REPO_ROOT = join(CONSOLE_ROOT, '..', '..')

function normalize(sourcePath) {
  let s = readFileSync(sourcePath, 'utf8')
  s = s.replace(/^openapi: .+$/m, 'openapi: 3.0.3', 1)
  s = s.replace('secondary_color:{ type:', 'secondary_color: { type:')
  s = s.replace(
    /"503": \{ \$ref: '#\/components\/responses\/ServiceUnavailable' \}/g,
    `"503":
          description: 依赖不可用（code=SERVICE_UNAVAILABLE）
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }`,
  )
  return yaml.load(s)
}

async function generate(name, sourcePath, outputPath) {
  console.log(`→ ${name} OpenAPI → ${join(outputPath).split('/').pop()}`)
  const schema = normalize(sourcePath)
  // openapi-ts v7 with JS object returns AST node array
  const nodes = await openapiTs(schema)

  // Convert AST nodes to d.ts text using TypeScript's printer
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const sourceFile = ts.createSourceFile('temp.d.ts', '', ts.ScriptTarget.Latest)

  const text = nodes.map(node =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
  ).join('\n\n')

  writeFileSync(outputPath, text)
  console.log(`✅ ${name} API types → ${text.length} chars`)
}

async function main() {
  mkdirSync(join(CONSOLE_ROOT, '.cache'), { recursive: true })

  await generate(
    'services',
    join(REPO_ROOT, 'openapi', 'services', 'v1.yaml'),
    join(CONSOLE_ROOT, 'src', 'api', 'schema.d.ts'),
  )

  await generate(
    'core',
    join(REPO_ROOT, 'openapi', 'v1.yaml'),
    join(CONSOLE_ROOT, 'src', 'api', 'core-schema.d.ts'),
  )

  console.log('✅ Console API types generated')
}

main().catch(e => { console.error(e); process.exit(1) })
