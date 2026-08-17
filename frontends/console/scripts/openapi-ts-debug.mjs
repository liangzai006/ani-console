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

console.log('__dirname:', __dirname);
console.log('CONSOLE:', CONSOLE);
console.log('REPO:', REPO);

let s = fs.readFileSync(path.join(REPO, 'openapi', 'services', 'v1.yaml'), 'utf8')
  .replace(/^openapi: .+$/m, 'openapi: 3.0.3', 1);
let obj = yaml.load(s);
let r = openapiTs(obj, { indentLevel: 0 });
console.log('type:', typeof r, r?.constructor?.name);
if (r instanceof Promise) {
  r.then(x => {
    console.log('promise resolved type:', typeof x);
    console.log('has text:', 'text' in x);
    console.log('has default:', 'default' in x);
    if (typeof x === 'string') console.log('string length:', x.length);
    if (x && typeof x === 'object') console.log('keys:', Object.keys(x));
  });
} else {
  console.log('sync type:', typeof r);
  console.log('has text:', 'text' in r);
  if (typeof r === 'string') console.log('length:', r.length);
}
