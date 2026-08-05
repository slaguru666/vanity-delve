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
let offMotifDecisions = 0, offMotifTemptations = 0, offMotifFeatures = 0, checked = 0;
for (let i = 0; i < 40; i++) {
  const d = generateDelve({ pack, seed: `scope-${i}`, areas: 6 });
  const m = pack.motifs[d.skeleton.motif.id];
  const okD = new Set((m.decisions ?? []).map(x => x.cue));
  const okT = new Set((m.temptations ?? []).map(x => x.id));
  for (const a of d.areas) {
    checked++;
    if (a.decision && !okD.has(a.decision.cue)) offMotifDecisions++;
    if (a.temptation && !okT.has(a.temptation.id)) offMotifTemptations++;
    if (a.cueFragments[1] && !(m.features ?? []).includes(a.cueFragments[1])) offMotifFeatures++;
  }
}
t('decisions come from the delve\'s own motif', offMotifDecisions === 0, `${offMotifDecisions}/${checked} off-motif`);
t('features come from the delve\'s own motif', offMotifFeatures === 0, `${offMotifFeatures}/${checked} off-motif`);
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

// every decision must be resolvable, and no decision may gate progress without an escape
let noResolve = 0, noEscape = 0, halfSpecified = 0;
for (const m of Object.values(pack.motifs)) {
  for (const dec of m.decisions ?? []) {
    const r = dec.resolve;
    if (!r) { noResolve++; continue; }
    if (!r.orElse) noEscape++;
    if (r.roll && (!r.success || !r.failure)) halfSpecified++;
  }
}
t('every decision has a resolution', noResolve === 0, `${noResolve} missing`);
t('every decision offers an attempt, not just a pick', (() => { let n = 0; for (const m of Object.values(pack.motifs)) for (const dec of m.decisions ?? []) if (!dec.resolve?.roll) n++; return n === 0; })(), 'a decision with no roll is a menu, not a situation');
t('no decision gates progress without an alternative', noEscape === 0, `${noEscape} gated — playtest 1 died on one`);
t('every rolled decision states success AND failure', halfSpecified === 0, `${halfSpecified} half-specified`);

// {priorCue} must always be substituted — an unresolved token would print a literal placeholder
let unresolvedToken = 0;
for (let i = 0; i < 40; i++) {
  const d = generateDelve({ pack, seed: `tok-${i}`, areas: 6 });
  for (const a of d.areas) if (a.decision?.resolve?.success?.includes('{')) unresolvedToken++;
}
t('no unresolved {tokens} reach the page', unresolvedToken === 0, `${unresolvedToken}`);

// every area must arrive as a place, and no situation may repeat inside one delve
let noSit = 0, dupSit = 0, offMotifSit = 0;
for (let i = 0; i < 40; i++) {
  const d = generateDelve({ pack, seed: `sit-${i}`, areas: 6 });
  const m = pack.motifs[d.skeleton.motif.id];
  const ids = [];
  for (const a of d.areas) {
    if (!a.situation?.occupant) { noSit++; continue; }
    ids.push(a.situation.occupant + a.situation.doing);
    if (!(m.situations ?? []).some(x => x.occupant === a.situation.occupant && x.doing === a.situation.doing)) offMotifSit++;
  }
  if (new Set(ids).size !== ids.length) dupSit++;
}
t('every area arrives as a situation', noSit === 0, `${noSit} bare areas`);
t('situations come from the delve\'s own motif', offMotifSit === 0, `${offMotifSit} off-motif`);
t('no repeated situation inside one delve', dupSit === 0, `${dupSit}/40`);

// the subtraction pass must remove BLOCKS, not information
let lost = [];
for (let i = 0; i < 20; i++) {
  const d = generateDelve({ pack, seed: `keep-${i}`, areas: 6 });
  const md = renderMarkdown(d);
  for (const a of d.areas) {
    const must = [
      ['situation', a.situation?.occupant], ['onArrival', a.situation?.onArrival],
      ['because', a.situation?.because], ['offer', a.situation?.offer],
      ['decision', a.decision?.cue], ['orElse', a.decision?.resolve?.orElse],
      ['trigger', a.trigger], ['fallback', a.fallback?.route],
      ['temptation', a.temptation?.cue], ['roster', a.encounter?.roster?.line],
    ];
    for (const [name, v] of must) {
      if (!v) continue;
      const probe = String(v).replace(/^./, c => c.toUpperCase());
      if (!md.includes(String(v)) && !md.includes(probe)) lost.push(`${name}@a${a.index}`);
    }
  }
}
t('subtraction removed blocks, not information', lost.length === 0, lost.slice(0,4).join(', ') || 'all fields still rendered');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
