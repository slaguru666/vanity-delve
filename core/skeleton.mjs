/**
 * The skeleton: the fiction, generated before any area exists. Draft 5 §1.
 *
 * The hard problem this solves is coherence. Four independent draws — a crown, a flood, goblins,
 * mirrors — produce nonsense. So there is exactly ONE root draw, and everything else is projected
 * from it:
 *
 *      APPETITE  ──> motif ──> danger, trigger, every cue fragment
 *          │     ──> prize kind
 *          │     ──> who was conscripted
 *          └─ + ACCOMMODATION ──> the transgression, the bottom problem, the primary faction
 *
 * Content therefore scales additively, not combinatorially: 8 appetites × 6 accommodations ×
 * 7 claimants = 336 kernels from 21 authored lines.
 *
 * The foreshadow chain is a fixed FACET progression mapped onto the arc. Area 2's held bows
 * (ritual) and area 4's scratched-out eyes (wound) point at the same faceless queen because both
 * are facets of one motif, drawn in a deliberate order. That progression was reverse-engineered
 * from the hand-authored paper delve, which had arrived at it by instinct.
 */

import { arcRole } from './director.mjs';

/** Fills {conscript}-style slots. */
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/** Facet order used when a facet is exhausted — borrow from a neighbour before repeating. */
const FACET_ORDER = ['institution', 'ritual', 'demand', 'wound', 'anchor'];

/**
 * Draw an unused fragment for a facet. Light motifs carry only one fragment per facet, so
 * without borrowing, two areas sharing a role would print the same image twice.
 */
function drawFragment(motif, facet, used, rng) {
  const order = [facet, ...FACET_ORDER.filter(f => f !== facet)];
  for (const f of order) {
    const fresh = (motif.facets?.[f] ?? []).filter(x => !used.has(x));
    if (fresh.length) { const pick = rng.pick(fresh); used.add(pick); return pick; }
  }
  return null;
}

export function generateSkeleton({ pack, areas = 6, ending = 'authored', rng }) {
  if (!pack) throw new Error('generateSkeleton requires a theme pack');
  if (!rng) throw new Error('generateSkeleton requires an Rng (seeded)');

  const r = rng.derive('skeleton');

  // ---- the one root draw -------------------------------------------------
  const appetite = r.derive('appetite').pick(pack.appetites);
  // Only accommodations that make sense for this appetite. Drawing freely produced lines like
  // "had the faces struck from the young, so that nothing would ever age" — equation output.
  const fitting = pack.accommodations.filter(a => !a.fits || a.fits.includes(appetite.id));
  const accommodation = r.derive('accommodation').pick(fitting.length ? fitting : pack.accommodations);
  const claimant = r.derive('claimant').pick(pack.claimants);

  // ---- everything else is projected --------------------------------------
  const motifId = appetite.motif;
  const motif = pack.motifs[motifId];
  if (!motif) throw new Error(`theme pack has no motif "${motifId}"`);

  const prize = { kind: appetite.prize, ...(pack.prizes?.[appetite.prize] ?? {}) };

  const transgression =
    `The ${claimant} ${fill(accommodation.text, { conscript: appetite.conscript })}, ` +
    `so that ${appetite.purpose}.`;

  const bottomProblem = {
    label: `The ${claimant}`,
    wantNow: appetite.want,
    failureState: `is ${appetite.lack} now, and cannot bear it`,
    handledBy: 'giving them what they want, at a price',
  };

  // Primary faction is whoever was conscripted; a secondary is drawn for friction.
  const primary = {
    ...(pack.factions.find(f => f.handledBy === 'courtesy') ?? pack.factions[0]),
    conscriptedAs: appetite.conscript,
  };
  const secondary = r.derive('faction2').pick(pack.factions.filter(f => f.id !== primary.id));

  // Named for its occupant. Drawing the name separately produced tombs named after strangers.
  const placeName = `${r.derive('place').pick(pack.placeNames.first)} ${claimant}`;

  // ---- the foreshadow chain ----------------------------------------------
  const progression = pack.facetProgression ?? {};
  const used = new Set();
  const foreshadow = [];
  for (let i = 1; i <= areas; i++) {
    const role = arcRole(i, areas);
    const facet = progression[role] ?? 'institution';
    const fragment = drawFragment(motif, facet, used, r.derive('foreshadow', String(i)));
    if (fragment) used.add(fragment);
    foreshadow.push({ index: i, role, facet, fragment: fragment ?? null });
  }
  if (ending === 'authored' || ending === 'generated') {
    const facet = progression.ending ?? 'demand';
    foreshadow.push({
      index: areas + 1, role: 'ending', facet,
      fragment: drawFragment(motif, facet, used, r.derive('foreshadow', 'ending')),
    });
  }

  return {
    placeName,
    knot: {
      appetiteId: appetite.id,
      accommodationId: accommodation.id,
      claimant,
      conscript: appetite.conscript,
      transgression,
      cruelty: accommodation.cruelty,
    },
    motif: { id: motifId, danger: motif.danger, dangerLine: motif.dangerLine, trigger: motif.trigger },
    prize,
    bottomProblem,
    // The appeasement move is the delve's social spine: feed the appetite, pay the tab.
    // It projects from the appetite, which is why it is always thematically exact.
    appeasement: { ...appetite.appeasement, faction: primary.name },
    factions: [primary, secondary].filter(Boolean),
    foreshadow,
  };
}

/** A one-paragraph GM-truth summary — the thing a GM reads first. */
export function skeletonBlurb(sk) {
  return [
    `**${sk.placeName}.** ${sk.knot.transgression}`,
    `${sk.bottomProblem.label} ${sk.bottomProblem.failureState}.`,
    `The prize is ${sk.prize.label} — ${sk.prize.function}.`,
    `${sk.factions[0]?.name} are ${sk.factions[0]?.essence}; they are handled by ${sk.factions[0]?.handledBy}.`,
    `The motif is **${sk.motif.id}**, and the danger is ${sk.motif.danger}: ${sk.motif.dangerLine}.`,
  ].join(' ');
}
