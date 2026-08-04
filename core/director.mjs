/**
 * The director: decides, never generates. Draft 5 §4.
 *
 * Emits semantic instructions — "area 3 is a complication, heat=fight, hoard=cache, and it owes
 * the tab a Bane" — which the Foundry adapter executes against the Forge. The core never sees an
 * Actor, a UUID or a die.
 *
 * Two playtest findings are baked in:
 *   - Deadliness must not also change how *often* fights appear (draft 4 double-dipped). Severity
 *     and density are separate dials.
 *   - Every area needs a fallback route, not just a gate. Playtest 1 died because the good ending
 *     was gated on a threshold the table could fail without knowing.
 */

export const HEATS = ['skirmish', 'fight', 'battle', 'nightmare'];
export const HOARDS = ['pocket', 'cache', 'chest', 'vault', 'kingly'];

/** The Forge's own ladder (vanity.mjs HEAT_HOARD). */
const HEAT_TO_HOARD = { skirmish: 'pocket', fight: 'cache', battle: 'chest', nightmare: 'vault' };

const DEADLINESS_SHIFT = { forgiving: -1, standard: 0, cruel: +1 };
const GREED_SHIFT = { lean: -1, standard: 0, glutted: +1 };

/**
 * Fraction of areas carrying a planned encounter.
 * Standard ≈ 2 fights in 6 areas — playtest 2 ran that and it worked; playtest 1's ~60% was far
 * too many and the session overran with the finale unresolved.
 */
const DENSITY = { sparse: 0.20, standard: 0.34, infested: 0.55 };

const clamp = (i, arr) => Math.max(0, Math.min(arr.length - 1, i));

/**
 * The arc. Areas are assigned roles by position so a delve has a shape rather than a flat run of
 * rooms. Proportional, so it works at 3 areas or 12.
 */
export function arcRole(index, total) {
  const t = total <= 1 ? 1 : (index - 1) / (total - 1);   // 0..1
  if (t < 0.20) return 'approach';
  if (t < 0.45) return 'complication';
  if (t < 0.65) return 'turn';
  if (t < 0.85) return 'descent';
  return 'threshold';
}

/** Roles that should stay quiet. An empty area is what makes an occupied one land. */
const QUIET_ROLES = new Set(['approach']);

export function baseHeatIndex({ depth = 2, deadliness = 'standard', party = 4 }) {
  let i = Math.round((depth - 1) * (HEATS.length - 1) / 4);   // depth 1..5 → 0..3
  i += DEADLINESS_SHIFT[deadliness] ?? 0;
  if (party <= 2) i -= 1;
  if (party >= 7) i += 1;
  return clamp(i, HEATS);
}

/**
 * Plan the whole delve up front — the skeleton is cheap and must be coherent. Areas are
 * *materialised* lazily elsewhere; this is only the decision layer.
 */
export function planDelve(params = {}) {
  const {
    areas = 6, depth = 2, party = 4,
    deadliness = 'standard', density = 'standard', greed = 'standard',
    ending = 'authored', rng,
  } = params;

  if (!rng) throw new Error('planDelve requires an Rng (seeded)');

  const heatIdx = baseHeatIndex({ depth, deadliness, party });
  const wantFights = Math.max(1, Math.round(areas * (DENSITY[density] ?? DENSITY.standard)));

  // Choose which areas carry fights. Never the first area; prefer complication/turn/descent.
  const plan = [];
  const candidates = [];
  for (let i = 1; i <= areas; i++) {
    const role = arcRole(i, areas);
    plan.push({ index: i, role, heat: null, hoard: null, quiet: QUIET_ROLES.has(role) });
    if (i > 1 && !QUIET_ROLES.has(role)) candidates.push(i);
  }

  const chosen = new Set(rng.derive('density').pickN(candidates, Math.min(wantFights, candidates.length)));
  // The area just before the ending always carries something — the threshold should have teeth.
  if (areas >= 3) chosen.add(areas);

  for (const a of plan) {
    if (!chosen.has(a.index)) continue;
    // Escalate along the arc: later areas run hotter, within the band the dials allow.
    const lift = a.role === 'threshold' ? 1 : a.role === 'descent' ? 1 : 0;
    a.heat = HEATS[clamp(heatIdx + lift, HEATS)];
    const hoardBase = HOARDS.indexOf(HEAT_TO_HOARD[a.heat] ?? 'cache');
    a.hoard = HOARDS[clamp(hoardBase + (GREED_SHIFT[greed] ?? 0), HOARDS)];
  }

  // Treasure is not only behind fights: lean delves still need something to want.
  const treasureless = plan.filter(a => !a.hoard);
  if (greed !== 'lean' && treasureless.length) {
    const bonus = rng.derive('greed').pick(treasureless.filter(a => a.role !== 'approach')) ?? treasureless[0];
    if (bonus) bonus.hoard = HOARDS[clamp(HOARDS.indexOf('pocket') + (GREED_SHIFT[greed] ?? 0), HOARDS)];
  }

  return {
    areas: plan,
    ending: {
      index: areas + 1,
      role: 'ending',
      mode: ending,
      // Draft 5 §2: authored is a default, not a law. Generated endings get a real heat.
      heat: ending === 'generated' ? HEATS[clamp(heatIdx + 1, HEATS)] : null,
      hoard: ending === 'generated' ? HOARDS[clamp(HOARDS.indexOf('vault') + (GREED_SHIFT[greed] ?? 0), HOARDS)] : null,
    },
    budget: { plannedFights: chosen.size, heatBase: HEATS[heatIdx], wantFights },
  };
}

/**
 * Which Bane-banking beat an area should offer, given how the tab is tracking.
 * Playtest 1: the tab reached 1 of 6 because nothing emitted Banes deliberately.
 */
export function baneBeatFor(area, pressure, rng) {
  const pace = pressure.onPace(area.index);
  const pool = area.quiet
    ? ['noticing', 'announcing']
    : ['flattery', 'noticing', 'relicUse', 'refusal'];
  // Behind pace → always offer one. On pace → sometimes, so it does not feel mechanical.
  if (!pace.behind && !rng.chance(0.5)) return null;
  return rng.pick(pool);
}
