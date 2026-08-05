import { readFileSync } from 'fs';
import { Rng } from './rng.mjs';
import { generateDelve } from './delve.mjs';
import { renderMarkdown } from './render.mjs';

const pack = JSON.parse(readFileSync('./content/barrow.json', 'utf8'));
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? ' ok ' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// determinism
const a = generateDelve({ pack, seed: 'x-1' }), b = generateDelve({ pack, seed: 'x-1' });
t('determinism: same seed → identical delve', JSON.stringify(a) === JSON.stringify(b));
t('different seeds differ', JSON.stringify(generateDelve({ pack, seed: 'x-2' })) !== JSON.stringify(a));

// invariants across many seeds and parameter combos
let nullCues = 0, missingDecision = 0, missingTrigger = 0, missingFallback = 0, crashes = 0, endingNull = 0;
const kernels = new Set(), places = new Set(), fragmentUse = new Map();
const combos = [];
for (const areas of [3, 6, 9, 12]) for (const depth of [1, 3, 5]) for (const density of ['sparse','standard','infested'])
  combos.push({ areas, depth, density });

for (let i = 0; i < 60; i++) {
  const p = combos[i % combos.length];
  try {
    const d = generateDelve({ pack, seed: `seed-${i}`, ...p });
    kernels.add(`${d.skeleton.knot.appetiteId}/${d.skeleton.knot.accommodationId}/${d.skeleton.knot.claimant}`);
    places.add(d.skeleton.placeName);
    for (const ar of d.areas) {
      if (!ar.cueFragments.length || ar.cueFragments.some(c => !c)) nullCues++;
      if (!ar.decision) missingDecision++;
      if (!ar.trigger) missingTrigger++;
      if (!ar.fallback?.route) missingFallback++;
      for (const c of ar.cueFragments) fragmentUse.set(c, (fragmentUse.get(c) ?? 0) + 1);
    }
    if (!d.ending.cueFragments.length) endingNull++;
    renderMarkdown(d);
  } catch (e) { crashes++; console.log('   crash:', e.message.slice(0, 80)); }
}
t('no crashes across 60 delves × param combos', crashes === 0, `${crashes} crashes`);
t('no null/empty cue fragments', nullCues === 0, `${nullCues}`);
t('every area has a decision', missingDecision === 0);
t('every area has an attention trigger', missingTrigger === 0);
t('every area has a fallback route', missingFallback === 0, 'playtest 1 died on a gate with no fallback');
t('every ending has a cue', endingNull === 0, `${endingNull} empty`);
t('kernels are varied', kernels.size >= 40, `${kernels.size} distinct kernels in 60`);
t('place names track the claimant', places.size >= 20, `${places.size} distinct`);

// within-delve repetition — the thing facets exist to prevent
let repeats = 0;
for (let i = 0; i < 30; i++) {
  const d = generateDelve({ pack, seed: `rep-${i}`, areas: 6 });
  const all = d.areas.flatMap(x => x.cueFragments).concat(d.ending.cueFragments);
  if (new Set(all).size !== all.length) repeats++;
}
t('no repeated cue fragment inside one delve', repeats === 0, `${repeats}/30 had repeats`);

// motif-scoping: the furniture must belong to the fiction, not a global pool
let offMotifDecisions = 0, offMotifTemptations = 0, checked = 0;
for (let i = 0; i < 40; i++) {
  const d = generateDelve({ pack, seed: `scope-${i}`, areas: 6 });
  const m = pack.motifs[d.skeleton.motif.id];
  const okD = new Set((m.decisions ?? []).map(x => x.cue));
  const okT = new Set((m.temptations ?? []).map(x => x.id));
  for (const a of d.areas) {
    checked++;
    if (a.decision && !okD.has(a.decision.cue)) offMotifDecisions++;
    if (a.temptation && !okT.has(a.temptation.id)) offMotifTemptations++;
  }
}
t('decisions come from the delve\'s own motif', offMotifDecisions === 0, `${offMotifDecisions}/${checked} off-motif`);
t('temptations come from the delve\'s own motif', offMotifTemptations === 0, `${offMotifTemptations} off-motif`);

// no repeated decision or temptation inside one delve
let dupD = 0, dupT = 0;
for (let i = 0; i < 40; i++) {
  for (const areas of [6, 9]) {
    const d = generateDelve({ pack, seed: `dup-${i}`, areas });
    const ds = d.areas.map(a => a.decision?.cue).filter(Boolean);
    const ts = d.areas.map(a => a.temptation?.id).filter(Boolean);
    if (new Set(ds).size !== ds.length) dupD++;
    if (new Set(ts).size !== ts.length) dupT++;
  }
}
t('no repeated decision inside one delve', dupD === 0, `${dupD}/80`);
t('no repeated temptation inside one delve', dupT === 0, `${dupT}/80`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
