/**
 * generateDelve — the whole core, composed. Emits a plain data object; no Foundry, no prose.
 * The CLI renders it to markdown; the Foundry adapter renders it to a panel and Forge calls.
 */
import { Rng, coinSeed } from './rng.mjs';
import { planDelve } from './director.mjs';
import { generateSkeleton } from './skeleton.mjs';
import { buildArea, fallbackRoute } from './beat.mjs';
import { Pressure } from './pressure.mjs';
import { baneBeatFor } from './director.mjs';

export const GENERATOR_VERSION = '0.1.0';

export function generateDelve(params = {}) {
  const {
    pack,
    seed = coinSeed(),
    areas = 6, depth = 2, party = 4,
    deadliness = 'standard', density = 'standard', greed = 'standard',
    clock = 'standard', ending = 'authored',
  } = params;

  if (!pack) throw new Error('generateDelve requires a theme pack');

  const rng = new Rng(seed);
  const plan = planDelve({ areas, depth, party, deadliness, density, greed, ending, rng });
  const skeleton = generateSkeleton({ pack, areas, ending, rng });
  const pressure = new Pressure({ areas, clock });

  // Deal features and decisions without replacement, cycling only if the delve outruns the pack.
  // Deal without replacement. If a delve outruns its motif pool, top up from the generic pool
  // before ever repeating — a repeated decision reads as a bug, generic furniture only as thin.
  const deal = (list, n, tag, overflow = []) => {
    const r = rng.derive(tag);
    const out = [...r.shuffle(list)];
    if (out.length < n) out.push(...r.shuffle(overflow.filter(x => !out.includes(x))));
    while (out.length < n) out.push(...r.shuffle(list));
    return out.slice(0, n);
  };
  // Motif-scoped furniture. Global pools are a fallback only: drawing decisions and temptations
  // globally made the output "a consistent wrapper around generic room furniture" — the fiction
  // cohered but the things in the rooms did not belong to it.
  const motifPack = pack.motifs?.[skeleton.motif.id] ?? {};
  const decisionPool = motifPack.decisions?.length ? motifPack.decisions : (pack.decisions ?? []);
  const featurePool = motifPack.features?.length ? motifPack.features : (pack.features ?? []);
  const features = deal(featurePool, plan.areas.length, 'features', pack.features ?? []);
  // A room must arrive as a place with something happening in it. Without this an area is a
  // prompt plus a resolver: the review's verdict was "choices attached to prompts, not spaces
  // that naturally produce play".
  const situations = deal(motifPack.situations ?? [], plan.areas.length, 'situations');

  // Names are dealt globally, not per role: two `complication` areas both drawing from the same
  // four-name list produced two scenes called "The Lesser Vault" in one dungeon.
  const nameRng = rng.derive('names');
  const usedNames = new Set();
  const allNames = Object.values(pack.areaNames ?? {}).flat();
  const areaNames = plan.areas.map(a => {
    const forRole = (pack.areaNames?.[a.role] ?? []).filter(n => !usedNames.has(n));
    const pool = forRole.length ? forRole : allNames.filter(n => !usedNames.has(n));
    const pick = nameRng.pick(pool.length ? pool : allNames);
    if (pick) usedNames.add(pick);
    return pick;
  });
  const decisions = deal(decisionPool, plan.areas.length, 'decisions', pack.decisions ?? []);

  // Temptations are dealt across the areas that carry a hoard, for the same reason as decisions:
  // picking independently per area from a pool of three repeated in 75 of 80 test delves.
  const temptPool = motifPack.temptations?.length ? motifPack.temptations : (pack.temptations ?? []);
  const hoardCount = plan.areas.filter(a => a.hoard).length;
  const temptations = deal(temptPool, hoardCount, 'temptations');   // no generic overflow — see note
  let tIdx = 0;

  const built = plan.areas.map((planned, i) => {
    const beat = baneBeatFor(planned, pressure, rng.derive('banebeat', String(planned.index)));
    if (beat) pressure.bankBane('(offered)', beat, planned.index);
    const area = buildArea({ skeleton, planned, pack, pressure, rng, baneBeat: beat, feature: features[i], decision: decisions[i], situation: situations[i], name: areaNames[i], temptation: planned.hoard ? temptations[tIdx++] : null });
    area.fallback = fallbackRoute(area, skeleton);
    return area;
  });

  // Resolve {priorCue} against a cue from an earlier area, so an investigation route points at
  // something the table has already been shown rather than granting the answer by fiat.
  for (let i = 0; i < built.length; i++) {
    const rv = built[i].decision?.resolve;
    if (!rv?.success?.includes('{priorCue}')) continue;
    const prior = built.slice(0, i).flatMap(a => a.cueFragments).filter(Boolean);
    const pick = prior.length ? rng.derive('priorcue', String(i)).pick(prior) : null;
    built[i] = { ...built[i], decision: { ...built[i].decision, resolve: { ...rv,
      success: rv.success.replace('{priorCue}', pick ?? 'what the approach already showed you') } } };
  }

  const endFs = skeleton.foreshadow.find(f => f.role === 'ending');

  return {
    schema: 1,
    generatorVersion: GENERATOR_VERSION,
    catalogVersion: `${pack.id}@${pack.schema ?? 1}`,
    seed,
    params: { areas, depth, party, deadliness, density, greed, clock, ending, theme: pack.id },
    skeleton,
    areas: built,
    ending: {
      ...plan.ending,
      name: (pack.areaNames?.ending ?? ['The Ending'])[0],
      cueFragments: [endFs?.fragment].filter(Boolean),
      question: endingQuestion(skeleton, pack),
      authored: plan.ending.mode === 'authored',
    },
    triggerGlossary: pack.triggerGlossary ?? {},
    budget: plan.budget,
    pressure: pressure.summary(),
  };
}

/**
 * The bottom problem asks one thing, and it is the same question the whole delve has been about.
 * It lives on the appetite in the theme pack — hardcoding it here meant any theme whose appetite
 * ids differed from barrow's silently fell through to a generic line.
 */
function endingQuestion(sk, pack) {
  const appetite = pack?.appetites?.find(a => a.id === sk.knot.appetiteId);
  return appetite?.asks ?? '"Well?"';
}
