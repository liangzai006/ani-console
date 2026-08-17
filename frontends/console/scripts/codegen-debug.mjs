#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import openapiTs from 'openapi-typescript'
import yaml from 'js-yaml'

const CONSOLE_ROOT = new URL('../', import.meta.url).pathname.replace(/\\/g, '/')
const REPO_ROOT = CONSOLE_ROOT.replace(/frontends\/console$/, '')

function loadSchema(path) {
  let s = readFileSync(path, 'utf8')
  s = s.replace(/^openapi: .+$/m, 'openapi: 3.0.3', 1)
  s = s.replace('secondary_color:{ type:', 'secondary_color: { type:')
  return yaml.load(s)
}

async function main() {
  mkdirSync(join(CONSOLE_ROOT, '.cache'), { recursive: true })

  for (const [name, src, out] of [
    ['Services', join(REPO_ROOT, 'openapi', 'services', 'v1.yaml'), join(CONSOLE_ROOT, 'src', 'api', 'schema.d.ts')],
    ['Core', join(REPO_ROOT, 'openapi', 'v1.yaml'), join(CONSOLE_ROOT, 'src', 'api', 'core-schema.d.ts')],
  ]) {
    console.log(`→ ${name}`)
    const schema = loadSchema(src)
    const result = await openapiTs(schema, { indentLevel: 0 })
    console.log('result type:', typeof result, Array.isArray(result))
    if (Array.isArray(result)) {
      console.log('array length:', result.length)
    }
    writeFileSync(out, typeof result === 'string' ? result : String(result))
  }
  console.log('done')
}
main().catch(e => { console.error(e); process.exit(1) })
