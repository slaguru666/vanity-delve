/**
 * The one place that decides whether a fight needs a warning before initiative.
 *
 * Some rosters carry a restriction a party cannot discover safely: a Wraith that only blessed,
 * silvered or magical weapons touch, a Troll that only stays down if fire closes the wound. Finding
 * that out by swinging and missing is how playtest 1 died, so the GM says it aloud first.
 *
 * This was a renderer heuristic — synthesise the line whenever `harmedBy` contained the word ONLY.
 * It printed twice on the rosters that already said it in prose, and when the heuristic was deleted
 * the warning vanished from twelve rosters at once. Worse, the spelling was never the semantics:
 * barrow's nightmare Wraith and forest's battle Troll carry the same restriction without the word.
 *
 * So it is authored data now — `roster.beforeInitiative` — and this module is the only thing that
 * reads it. RESTRICTS remains, but only as a tripwire: it tells the validator that new content
 * *looks* like it needs the field, and it recovers the warning for delve files generated before the
 * field existed. It is not the source of truth; the packs are.
 */

/** Vocabulary the packs actually use for "your weapon may not work". A tripwire, not an oracle. */
export const RESTRICTS = /\bONLY\b|blessed|silvered|magical|only stays down|fire for the/i;

/**
 * What to say before initiative, or null. Never returns a line the prose already carries, so it
 * cannot print twice.
 */
export function initiativeWarning(roster) {
  if (!roster) return null;
  if (roster.beforeInitiative) return roster.beforeInitiative;
  const prose = `${roster.harmedBy ?? ''} ${roster.avoid ?? ''}`;
  if (/say so before initiative/i.test(prose)) return null;     // a legacy file that says it itself
  return RESTRICTS.test(roster.harmedBy ?? '') ? 'Say so before initiative.' : null;
}
