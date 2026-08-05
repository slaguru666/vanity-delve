/**
 * Who is actually in the room.
 *
 * A pack's roster is the encounter DELVE *planned* — "1 Ghoul and 2 Skeletons", with stats and,
 * in some themes, tactical notes naming specific monsters. The Forge takes no cast: it rolls its
 * own from the heat. So the plan and the world are two different lists, and the rule both surfaces
 * follow is **show what exists**:
 *
 *   forged      the Forge made actors — run those, and say the plan's tactics are not about them
 *   planned     nothing was forged (population off, or the Forge failed) — the plan IS the
 *               encounter, so it renders in full and its guidance applies
 *   unavailable an area carries combat heat but has neither — say so rather than render nothing
 *   none        no encounter here at all
 *
 * This file is deliberately Foundry-free so the decision can be tested without a VTT. The two
 * surfaces disagreed about it twice — 0.6.2 lost the planned roster entirely when nothing was
 * forged, and the caption claimed the plan's guidance applied either way — because each surface
 * made the choice for itself in a ternary. They now both switch on `kind`.
 */

/** What a forged actor actually is, read off the document rather than off the plan. */
export const foeStats = a => ({
  name: a.name,
  uuid: a.uuid,
  atk: a.system?.attack1?.pool ?? null,
  def: a.system?.defence?.pool ?? null,
  grit: a.system?.grit?.value ?? null,
  nerve: a.system?.nerve ?? null,
  trick: a.system?.trick ?? '',
});

/** One forged foe as a line of stats, in the roster's vocabulary so the two read alike. */
export const foeLine = f =>
  `<b>@UUID[${f.uuid}]{${f.name}}</b> — ${f.atk ?? '?'}/${f.def ?? '?'}/${f.grit ?? '?'}, Nerve ${f.nerve ?? '?'}${f.trick ? `. <i>${f.trick}</i>` : ''}`;

/**
 * Decide which of the four cases an area is in.
 * @param {object} area    a delve area
 * @param {Array}  forged  actors the Forge created, already through foeStats — [] if it failed
 */
export function classifyFoes(area, forged = []) {
  if (!area?.encounter) return { kind: 'none' };
  const heat = area.encounter.heat;
  const planned = area.encounter.roster ?? null;
  if (forged.length) return { kind: 'forged', heat, foes: forged, planned };
  if (planned) return { kind: 'planned', heat, roster: planned };
  return { kind: 'unavailable', heat };
}
