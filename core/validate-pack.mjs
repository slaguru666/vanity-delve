/**
 * Theme pack validator.
 *
 * A pack is ~136 authored entries and every structural rule in it was learned the hard way:
 * situations that render as broken English, decisions with no way through, motifs too thin to
 * fill six areas without repeating. Rather than rediscover those per theme, this checks them.
 *
 * Run: node validate-pack.mjs [name ...]     (default: every pack in content/)
 */
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const FACETS = ['institution', 'ritual', 'demand', 'wound', 'anchor'];
const ROLES = ['approach', 'complication', 'turn', 'descent', 'threshold', 'ending'];
const GEOMETRIES = ['barrow', 'cave', 'fen', 'village', 'forest'];
const HEATS = ['skirmish', 'fight', 'battle', 'nightmare'];

/** Minimums sized so a 6-area delve never repeats — the default and most common case. */
const MIN = { fragmentsPerFacet: 3, features: 6, decisions: 6, temptations: 5, situations: 6, areaNamesPerRole: 4 };

export function validatePack(pack, name = pack?.id ?? '?') {
  const errs = [], warns = [];
  const E = m => errs.push(m), W = m => warns.push(m);

  if (!pack.id) E('no id');
  if (!GEOMETRIES.includes(pack.forgeStageType))
    E(`forgeStageType "${pack.forgeStageType}" is not one VANITY can build (${GEOMETRIES.join(', ')})`);

  for (const k of ['appetites', 'accommodations', 'claimants', 'motifs', 'prizes', 'areaNames', 'factions', 'rosters'])
    if (!pack[k]) E(`missing ${k}`);
  if (errs.length) return { name, errs, warns };

  const motifIds = Object.keys(pack.motifs);

  for (const a of pack.appetites) {
    for (const f of ['id', 'want', 'lack', 'purpose', 'motif', 'prize', 'conscript', 'appeasement', 'asks'])
      if (!a[f]) E(`appetite ${a.id ?? '?'}: missing ${f}`);
    if (a.motif && !motifIds.includes(a.motif)) E(`appetite ${a.id}: motif "${a.motif}" does not exist`);
    if (a.prize && !pack.prizes?.[a.prize]) E(`appetite ${a.id}: prize "${a.prize}" has no entry`);
    const ap = a.appeasement ?? {};
    for (const f of ['move', 'attribute', 'successes', 'why', 'gain', 'cost'])
      if (ap[f] === undefined) E(`appetite ${a.id}: appeasement missing ${f}`);
  }

  // Every appetite must have at least one accommodation that fits it, or the kernel cannot form.
  for (const a of pack.appetites) {
    const fits = pack.accommodations.filter(x => !x.fits || x.fits.includes(a.id));
    if (!fits.length) E(`appetite ${a.id}: no accommodation fits it`);
  }
  for (const acc of pack.accommodations) {
    if (!acc.text?.includes('{conscript}')) W(`accommodation ${acc.id}: no {conscript} slot — will read oddly`);
  }

  for (const [id, m] of Object.entries(pack.motifs)) {
    for (const f of ['danger', 'dangerLine', 'trigger', 'facets'])
      if (!m[f]) E(`motif ${id}: missing ${f}`);
    for (const facet of FACETS) {
      const n = (m.facets?.[facet] ?? []).length;
      if (n < MIN.fragmentsPerFacet) E(`motif ${id}: facet ${facet} has ${n} fragments, needs ${MIN.fragmentsPerFacet}`);
    }
    for (const [key, min] of [['features', MIN.features], ['decisions', MIN.decisions],
                              ['temptations', MIN.temptations], ['situations', MIN.situations]]) {
      const n = (m[key] ?? []).length;
      if (n < min) E(`motif ${id}: ${n} ${key}, needs ${min} so a 6-area delve never repeats`);
    }

    for (const d of m.decisions ?? []) {
      const r = d.resolve;
      if (!r) { E(`motif ${id}: decision "${String(d.cue).slice(0, 40)}" has no resolve`); continue; }
      if (!r.roll) E(`motif ${id}: decision "${String(d.cue).slice(0, 40)}" has no attempt roll — a pick, not a situation`);
      if (r.roll && (!r.success || !r.failure)) E(`motif ${id}: decision "${String(d.cue).slice(0, 40)}" states only half its outcomes`);
      if (!r.orElse) E(`motif ${id}: decision "${String(d.cue).slice(0, 40)}" gates progress with no alternative`);
    }

    // The opener reads "<occupant> — <doing>. When you walk in, <onArrival>."
    for (const s of m.situations ?? []) {
      for (const f of ['occupant', 'doing', 'onArrival', 'because', 'offer'])
        if (!s[f]) E(`motif ${id}: situation missing ${f}`);
      if (/\b(is|are|but)\b|—/.test(s.occupant ?? '')) E(`motif ${id}: occupant "${s.occupant}" carries a verb; must be a noun phrase`);
      if (!/^\w+ing\b/.test(s.doing ?? '') || /^(some|no|any|every)thing\b/.test(s.doing ?? ''))
        E(`motif ${id}: doing "${String(s.doing).slice(0, 40)}" must be a participle phrase`);
    }

    for (const t of m.temptations ?? []) {
      for (const f of ['id', 'cue', 'benefit', 'useCost', 'standingDrawback'])
        if (!t[f]) E(`motif ${id}: temptation ${t.id ?? '?'} missing ${f}`);
    }
  }

  for (const r of ROLES) {
    const n = (pack.areaNames?.[r] ?? []).length;
    if (n < MIN.areaNamesPerRole) E(`areaNames.${r}: ${n} names, needs ${MIN.areaNamesPerRole}`);
  }
  const allNames = Object.values(pack.areaNames ?? {}).flat();
  if (new Set(allNames).size !== allNames.length) E('areaNames contains duplicates across roles');

  for (const h of HEATS) {
    const r = pack.rosters?.[h];
    if (!r) { E(`rosters.${h} missing`); continue; }
    if (!r.line || !r.foes?.length) E(`rosters.${h}: needs a line and foes`);
    if (!r.harmedBy) E(`rosters.${h}: must say what harms them — a party discovering an immunity by failing is how playtest 1 died`);
    if (!r.avoid) W(`rosters.${h}: no avoidance note`);

    /**
     * A restriction the party cannot discover safely must be told to them before initiative, and
     * it must be said exactly once. This lived as a renderer heuristic — synthesise the warning
     * whenever `harmedBy` contained the word ONLY — which printed twice on the rosters that
     * already said it in prose, and vanished from twelve rosters when the heuristic was removed.
     * It is authored data now, and this is the check that keeps it that way.
     */
    if (/say so before initiative/i.test(`${r.harmedBy} ${r.avoid ?? ''}`))
      E(`rosters.${h}: put the initiative warning in beforeInitiative, not in the prose — it renders twice otherwise`);
    if (r.harmedBy.includes('ONLY') && !r.beforeInitiative)
      E(`rosters.${h}: harmedBy restricts what works, so it needs beforeInitiative — the party cannot discover this safely`);
    for (const f of r.foes ?? [])
      for (const k of ['n', 'name', 'atk', 'def', 'grit', 'nerve'])
        if (f[k] === undefined) E(`rosters.${h}: foe ${f.name ?? '?'} missing ${k}`);
  }

  for (const r of ROLES) if (!pack.facetProgression?.[r]) E(`facetProgression.${r} missing`);
  if (!pack.triggerGlossary || Object.keys(pack.triggerGlossary).length < 3) W('triggerGlossary is thin');

  return { name, errs, warns };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(here, 'content');
  const names = process.argv.slice(2).length
    ? process.argv.slice(2)
    : readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.replace('.json', ''));
  let bad = 0;
  for (const n of names) {
    const pack = JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8'));
    const { errs, warns } = validatePack(pack, n);
    const counts = `${Object.keys(pack.motifs ?? {}).length} motifs`;
    if (!errs.length) console.log(`  ✅ ${n.padEnd(10)} ${counts}${warns.length ? `  (${warns.length} warnings)` : ''}`);
    else { bad++; console.log(`  ❌ ${n.padEnd(10)} ${errs.length} errors`); for (const e of errs.slice(0, 12)) console.log(`       ${e}`); }
    for (const w of warns.slice(0, 4)) console.log(`       ⚠ ${w}`);
  }
  process.exit(bad ? 1 : 0);
}
