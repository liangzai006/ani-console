#!/usr/bin/env node
import openapiTs from 'openapi-typescript';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONSOLE = path.join(__dirname, '..');
const REPO = path.join(CONSOLE, '..', '..');

let s = fs.readFileSync(path.join(REPO, 'openapi', 'services', 'v1.yaml'), 'utf8')
  .replace(/^openapi: .+$/m, 'openapi: 3.0.3', 1);
let obj = yaml.load(s);
let r = await openapiTs(obj, { indentLevel: 0 });
console.log('result type:', typeof r);
console.log('is promise:', r instanceof Promise);
console.log('is array:', Array.isArray(r));
console.log('is object:', typeof r === 'object' && r !== null);
console.log('keys:', Object.keys(r));
console.log('has default:', 'default' in r);
console.log('has text:', 'text' in r);

// Check if it has .then
if (typeof r === 'object' && typeof r.then === 'function') {
  console.log('it IS a Promise');
  const resolved = await r;
  console.log('resolved type:', typeof resolved);
  console.log('resolved keys:', Object.keys(resolved));
  if (resolved.text) console.log('has text after await:', resolved.text.length);
  if (resolved.default) console.log('has default');
} else if (typeof r === 'object') {
  console.log('object values:', Object.entries(r).slice(0, 5).map(([k, v]) => `${k}: ${typeof v} (${typeof v === 'string' ? v.length : 'n/a'})`));
}
