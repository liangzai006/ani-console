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
let files = await openapiTs(obj, { indentLevel: 0 });
console.log('type:', files?.constructor?.name);
console.log('Array.isArray:', Array.isArray(files));
console.log('length:', files.length);
console.log('file 0 keys:', Object.keys(files[0]));
console.log('file 0 .text:', typeof files[0].text);
console.log('file 0 .text length:', files[0].text?.length);
console.log('first 200 chars:');
console.log(files[0].text.slice(0, 200));
