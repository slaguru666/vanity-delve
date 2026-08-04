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
  const deal = (list, n, tag) => {
    const r = rng.derive(tag);
    const out = [];
    while (out.length < n) out.push(...r.shuffle(list));
    return out.slice(0, n);
  };
  const features = deal(pack.features ?? [], plan.areas.length, 'features');
  const decisions = deal(pack.decisions ?? [], plan.areas.length, 'decisions');

  const built = plan.areas.map((planned, i) => {
    const beat = baneBeatFor(planned, pressure, rng.derive('banebeat', String(planned.index)));
    if (beat) pressure.bankBane('(offered)', beat, planned.index);
    const area = buildArea({ skeleton, planned, pack, pressure, rng, baneBeat: beat, feature: features[i], decision: decisions[i] });
    area.fallback = fallbackRoute(area, skeleton);
    return area;
  });

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
      question: endingQuestion(skeleton),
      authored: plan.ending.mode === 'authored',
    },
    triggerGlossary: pack.triggerGlossary ?? {},
    budget: plan.budget,
    pressure: pressure.summary(),
  };
}

/** The bottom problem asks one thing. It is the same question the whole delve has been about. */
function endingQuestion(sk) {
  const q = {
    seen: '"How do I look?"',
    remembered: '"Say my name."',
    obeyed: '"Do as you are told."',
    young: '"Tell me I have not changed."',
    envied: '"What did you bring me?"',
    attended: '"You are not leaving."',
    forgiven: '"Tell me it was not a sin."',
    first: '"Who goes first?"',
  };
  return q[sk.knot.appetiteId] ?? '"Well?"';
}
