/** Regenerate content/index.json — the browser cannot list a directory, so packs need a manifest. */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const dir = join(dirname(fileURLToPath(import.meta.url)), 'content');
const themes = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json')
  .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .map(p => ({ id: p.id, label: p.label ?? p.id, geometry: p.forgeStageType, motifs: Object.keys(p.motifs ?? {}).length }))
  .sort((a, b) => a.label.localeCompare(b.label));
writeFileSync(join(dir, 'index.json'), JSON.stringify({ schema: 1, themes }, null, 2));
console.log(`  ${themes.length} themes: ${themes.map(t => t.id).join(', ')}`);
