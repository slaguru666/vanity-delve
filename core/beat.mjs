/**
 * An area is a beat. Draft 5 §6 — two faces, not four.
 *
 * Cue (what players perceive) and Truth (what is going on) are required. Consequence is inline
 * bracketed mechanics, the way the house style already does it. Reveal appears only where a
 * secret genuinely differs from the Cue.
 *
 * DELVE does not write prose. The playtest was explicit that the read-aloud paragraphs are most
 * of what makes a delve playable and they are hand-written. So the Cue is emitted as *fragments*
 * for the GM to assemble aloud, labelled as such. Faking prose here would be the one dishonest
 * thing this tool could do.
 */

const FACET_TRUTH = {
  institution: 'this is how the place was ordered, and it still is',
  ritual:      'the office is still being performed, for someone who is no longer served by it',
  demand:      'here the want is explicit — the place asks something of whoever enters',
  wound:       'this is the damage the want did to those who had to satisfy it',
  anchor:      'the thing the whole barrow is arranged around is close',
  demandEnd:   'the question itself, asked directly',
};

export function buildArea({ skeleton, planned, pack, pressure, rng, baneBeat = null, feature, decision }) {
  const r = rng.derive('area', String(planned.index));
  const fs = skeleton.foreshadow.find(f => f.index === planned.index) ?? {};
  const names = pack.areaNames?.[planned.role] ?? pack.areaNames?.approach ?? ['Unnamed'];

  // feature/decision are dealt by the caller without replacement across the delve — drawing them
  // per-area from pools of 8 and 6 made repeats near-certain inside a single delve.
  const temptation = planned.hoard
    ? r.derive('temptation').pick(pack.temptations)
    : null;

  // Every area emits at least one attention trigger — draft 5 §9 weights triggers over the timer.
  const trigger = fs.facet === 'demand' ? skeleton.motif.trigger
    : r.derive('trigger').pick(['announced', 'loud', 'lingering', 'seenTwice', 'disturbed']);

  return {
    index: planned.index,
    role: planned.role,
    name: r.derive('name').pick(names),
    facet: fs.facet ?? null,

    // Cue: fragments, not prose.
    cueFragments: [fs.fragment, feature].filter(Boolean),

    truth: `${FACET_TRUTH[fs.facet] ?? ''}. ${skeleton.knot.transgression}`,

    decision,
    encounter: planned.heat
      ? { heat: planned.heat, kind: skeleton.factions[0]?.kind ?? 'undead', roster: pack.rosters?.[planned.heat] ?? null }
      : null,
    hoard: planned.hoard ?? null,
    temptation,
    trigger,
    baneBeat,

    // Clues are automatic on entry; the roll buys extra. Playtest 1 lost both its clues to
    // single unopposed rolls and the motif never reached the table.
    clue: {
      automatic: fs.fragment ? `${fs.fragment} — and it was done deliberately` : null,
      extra: '[VANITY: Observation — 1 success] buys who did it, and roughly when',
    },

    failureCase: planned.role === 'threshold'
      ? 'If they skip this, the ending opens with them holding nothing the bottom problem wants.'
      : 'If they skip this, move its cue fragment into the next area so the motif still completes.',
  };
}

/** Every area must offer a way on that is not gated. Playtest 1 died on a gate with no fallback. */
export function fallbackRoute(area, skeleton) {
  return {
    route: `${skeleton.factions[0]?.name} will receive anyone who ${skeleton.factions[0]?.handledBy === 'courtesy' ? 'behaves as a guest' : 'offers a trade'}`,
    cost: 'one Bane on the tab, and they will expect it again',
  };
}
