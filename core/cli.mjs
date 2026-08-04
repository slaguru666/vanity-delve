#!/usr/bin/env node
/** DELVE CLI — map-free by necessity: forgeStage needs browser APIs (see spike report §3A). */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateDelve } from './delve.mjs';
import { renderMarkdown } from './render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v = true] = a.replace(/^--/, '').split('=');
  return [k, v === true ? true : (/^\d+$/.test(v) ? Number(v) : v)];
}));

const theme = args.theme ?? 'barrow';
const pack = JSON.parse(readFileSync(join(here, 'content', `${theme}.json`), 'utf8'));
const delve = generateDelve({ pack, ...args });

if (args.json) { const out = JSON.stringify(delve, null, 2); args.out ? writeFileSync(args.out, out) : console.log(out); }
else { const md = renderMarkdown(delve); args.out ? writeFileSync(args.out, md) : console.log(md); }
