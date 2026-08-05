#!/usr/bin/env node
/**
 * DELVE — an authoring system for VANITY delves.
 *
 *   new       node cli.mjs --new --seed=X --areas=6 --file=my-delve.json
 *   worksheet node cli.mjs --file=my-delve.json --worksheet
 *   reroll    node cli.mjs --file=my-delve.json --reroll=3:situation
 *   lock      node cli.mjs --file=my-delve.json --lock=3:decision
 *   write     node cli.mjs --file=my-delve.json --write=3:readAloud --text="..."
 *   play      node cli.mjs --file=my-delve.json --play
 *
 * The JSON file is the working document. Rerolling never touches written prose.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { newWorkingFile, reroll, lock, unlock, setAuthored, outstanding } from './authoring.mjs';
import { renderWorksheet, renderPlay } from './render-authoring.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...rest] = a.replace(/^--/, '').split('=');
  const v = rest.join('=');
  return [k, v === '' ? true : (/^\d+$/.test(v) ? Number(v) : v)];
}));

const index = JSON.parse(readFileSync(join(here, 'content', 'index.json'), 'utf8'));
if (args.themes) { console.log(index.themes.map(t => `${t.id.padEnd(10)} ${t.geometry.padEnd(8)} ${t.motifs} motifs`).join('\n')); process.exit(0); }
const themeId = args.theme ?? 'barrow';
if (!index.themes.some(t => t.id === themeId)) {
  console.error(`unknown theme "${themeId}" — available: ${index.themes.map(t => t.id).join(', ')}`);
  process.exit(1);
}
const pack = JSON.parse(readFileSync(join(here, 'content', `${themeId}.json`), 'utf8'));
const file = args.file;
const load = () => JSON.parse(readFileSync(file, 'utf8'));
const save = d => writeFileSync(file, JSON.stringify(d, null, 2));

let d;
if (args.new || !file || !existsSync(file)) {
  d = newWorkingFile({ pack, ...args });
  if (file) { save(d); console.error(`created ${file} — seed ${d.seed}`); }
} else {
  d = load();
}

const target = spec => { const [i, c] = String(spec).split(':'); return [i === 'ending' ? 'ending' : Number(i), c]; };

if (args.reroll) { const [i, c] = target(args.reroll); reroll(d, i, c, pack); save(d); console.error(`rerolled ${c} in area ${i}`); }
if (args.lock)   { const [i, c] = target(args.lock);   lock(d, i, c);   save(d); console.error(`locked ${c} in area ${i}`); }
if (args.unlock) { const [i, c] = target(args.unlock); unlock(d, i, c); save(d); console.error(`unlocked ${c} in area ${i}`); }
if (args.write)  {
  const [i, f] = target(args.write);
  setAuthored(d, i, f, args.text ?? '');
  save(d); console.error(`wrote ${f} for ${i}`);
}

const out = args.play ? renderPlay(d)
  : args.json ? JSON.stringify(d, null, 2)
  : args.todo ? outstanding(d).map(t => `[ ] ${t.where} — ${t.what}`).join('\n')
  : renderWorksheet(d);

if (args.out) writeFileSync(args.out, out); else console.log(out);
