/**
 * Pressure: the clock and the tab. Draft 5 §9.
 *
 * Two engines, both rebuilt after playtest 1 falsified the originals:
 *   - The clock fired 0 times in 4 rolls on a 3-Turn timer; the attention trigger fired on the
 *     first roll of pass 2. So triggers lead and the timer is a floor.
 *   - The tab banked 1 Bane in ~40 rolls, because Stumbles are rare. So Banes are *emitted* by
 *     named beats, never hoped for.
 *
 * This module NEVER rolls a die. Draft 5 §11 puts the clock in the "live" column: the core
 * decides *when* a roll is due and what it means; the adapter rolls it at the table. Keeping
 * generation and table dice apart is the whole reason the seed promise is honest.
 */

export const CLOCK_SETTINGS = {
  slow:     { period: 4, trigger: 1 },
  standard: { period: 3, trigger: 1 },
  hunted:   { period: 2, trigger: 1 },
};

/** Attention triggers. Each area must emit at least one. */
export const TRIGGERS = {
  announced:   'entered somewhere grandly, announcing yourself',
  seenTwice:   'reflected, echoed or witnessed twice over',
  loud:        'a raised voice, a broken door, a shout',
  lingering:   'stayed too long in one place',
  disturbed:   'struck or moved something that had not moved in years',
};

/** Bane sources. The tab's engine — deliberate, not incidental. */
export const BANE_SOURCES = {
  flattery:    'played to something’s vanity to be received',
  noticing:    'caught your own reflection and looked',
  relicUse:    'spent a relic’s favour',
  announcing:  'announced yourself rather than slipping in',
  refusal:     'refused an offer that would have cost you nothing yet',
  push:        'pushed a roll',
  stumble:     'stumbled — a failure with two or more ones',
};

export class Pressure {
  /**
   * @param {object}  opts
   * @param {number}  opts.areas       area count (excluding the ending slot)
   * @param {string}  opts.clock       'slow' | 'standard' | 'hunted'
   * @param {number}  opts.baneTarget  Banes wanted by the ending (draft 5 says 4–6; UNCALIBRATED —
   *                                   playtest 2 reached 3. Treated as a target, not a promise.)
   */
  constructor({ areas = 6, clock = 'standard', baneTarget = 5 } = {}) {
    this.settings = CLOCK_SETTINGS[clock] ?? CLOCK_SETTINGS.standard;
    this.areas = areas;
    this.baneTarget = baneTarget;
    this.turn = 0;
    this.lastClockTurn = 0;
    this.clockRolls = [];        // { turn, cause, die, fired }
    this.tab = [];               // { hero, source, area, note }
    this.escalated = false;
  }

  // ---- time -------------------------------------------------------------

  advanceTurn(n = 1) { this.turn += n; return this.turn; }

  /** True when the timer has come round. Triggers bypass this entirely. */
  timerDue() { return this.turn - this.lastClockTurn >= this.settings.period; }

  /** One Turn before the timer is due — the GM voices a cue. */
  telegraphDue() { return this.turn - this.lastClockTurn === this.settings.period - 1; }

  /**
   * Escalation: if the clock has not fired by the halfway area, widen the trigger number.
   * Playtest 1 rolled 1-in-6 four times and never fired; a clock that never bites is decoration.
   */
  escalate(areaIndex) {
    const halfway = Math.ceil(this.areas / 2);
    if (!this.escalated && areaIndex >= halfway && !this.clockRolls.some(r => r.fired)) {
      this.escalated = true;
      this.settings = { ...this.settings, trigger: this.settings.trigger + 1 };
    }
    return this.escalated;
  }

  /** What number the die must come up at or under for "something comes". */
  get triggerNumber() { return this.settings.trigger; }

  /**
   * Record a clock roll. The die is supplied by the caller — a real table roll.
   * @param {number} die   1..6, rolled at the table
   * @param {string} cause 'timer' or a TRIGGERS key
   */
  recordClock(die, cause = 'timer') {
    const fired = die <= this.settings.trigger;
    this.clockRolls.push({ turn: this.turn, cause, die, fired });
    this.lastClockTurn = this.turn;
    return fired;
  }

  // ---- the tab ----------------------------------------------------------

  bankBane(hero, source, area = null, note = '') {
    if (!(source in BANE_SOURCES)) throw new Error(`unknown Bane source: ${source}`);
    this.tab.push({ hero, source, area, note });
    return this.tabFor(hero);
  }

  tabFor(hero) { return this.tab.filter(b => b.hero === hero).length; }
  tabTotal() { return this.tab.length; }
  reckoningDue(hero) { return this.tabFor(hero) >= 6; }

  /**
   * Is the tab on pace? Used by the director to decide whether an area should offer another
   * Bane-banking beat. Without this the Reckoning never arrives — playtest 1's central failure.
   */
  onPace(areaIndex) {
    const expected = (this.baneTarget * areaIndex) / Math.max(this.areas, 1);
    return { expected: Math.round(expected * 10) / 10, actual: this.tabTotal(), behind: this.tabTotal() < expected };
  }

  summary() {
    return {
      turn: this.turn,
      clockRolls: this.clockRolls.length,
      clockFired: this.clockRolls.filter(r => r.fired).length,
      triggerNumber: this.triggerNumber,
      escalated: this.escalated,
      tab: this.tabTotal(),
      target: this.baneTarget,
    };
  }
}
