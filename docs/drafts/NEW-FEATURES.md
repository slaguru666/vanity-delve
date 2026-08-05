# DELVE — proposed features

*Draft 1, 2026-08-05. Against `316716e`, module v0.6.1, generator 0.2.0.*
*Ranked. Every "Evidence" line was verified in the source or by running the code, not recalled.*

---

## The gate

**DELVE has never been run at a live table.** Sixteen themes, 39 tests, six releases and two paper
playtests of a *hand-written* delve — but no session has ever used the generated article.

That fact sets the order below. Items 1–4 are things I can justify without a session, because they
are defects or they are measurement. Items 5–9 are things I would not start until a table has run
one delve, because a session will change what they should be. **The most valuable thing that could
happen to this project is four hours and four players, not another feature.**

---

# TIER 1 — defects wearing feature costumes

*These should land before anything new is built. Both are the same root cause.*

## 1. Wire the live Pressure engine to the table

**What.** The Foundry module should instantiate `Pressure` from the loaded delve and drive the
clock through it, instead of reimplementing a degenerate version inline.

**Why.** `pressure.mjs` is 130 lines that exist *because two playtests falsified the originals* —
escalation, telegraphing, and pace-checking were each added to fix a specific observed failure.
None of that reaches a table. The module's clock is:

```js
const fired = roll.total <= 1;        // vanity-delve.mjs:147
```

A hardcoded 1. So:

- **Escalation never happens.** `Pressure.escalate()` widens the trigger from 1 to 2 if the clock
  has not fired by the halfway area. Playtest 1's central failure was a clock that rolled 1-in-6
  four times and never fired — the exact scenario escalation was written to prevent — and at the
  table it still cannot fire.
- **The telegraph never fires.** `telegraphDue()` is never called, so the "voice a cue one Turn
  ahead" rule is documentation only.
- **The timer never comes round.** `timerDue()` is never called. `st.turn` increments per area and
  is otherwise unused.
- **Pace-checking is generation-only.** `onPace()` shapes which Bane beats get *planned*, but the
  live tab (`st.tab`) never feeds back, so a table that banks Banes fast or slow changes nothing.

**Evidence.** The module imports exactly three core modules — `rng`, `authoring`, `forge-app`
([`vanity-delve.mjs:17-19`](../../foundry-module/module/vanity-delve.mjs)). `Pressure`,
`timerDue`, `telegraphDue`, `escalate`, `onPace` and `triggerNumber` appear **nowhere** in
`foundry-module/`. The only hit for "Pressure" is an `<h3>` in the panel.

**Cost.** Small. `Pressure` is already pure and serialisable; the module already persists
`st.clock` and `st.tab` as world state. This is roughly: construct on load, replay the recorded
rolls, call `recordClock()` instead of comparing to a literal, and surface `triggerNumber` in the
card.

**Risk.** Low, but it changes live behaviour mid-campaign for anyone with a delve loaded. Needs a
state migration or a version check on the stored state blob.

**Done when.** A delve that reaches its halfway area without a clock firing shows "something comes
on 1–2" on the next card, and the escalation is visible to the GM.

## 2. Make the pressure setting mean something

**What.** Record the clock period in the delve file and derive the panel text from it.

**Why.** `slow` / `standard` / `hunted` is offered in the UI, stored in `lastParams`, and passed
into generation — and then discarded. `Pressure.summary()`
([`pressure.mjs:119`](../../core/pressure.mjs)) emits `turn`, `clockRolls`, `clockFired`,
`triggerNumber`, `escalated`, `tab` and `target` — **but not `period`**. So the one number the
setting controls never leaves the constructor.

**Evidence.** Generating the same seed at all three settings produces byte-identical pressure
blocks:

```
slow     → {"turn":0,...,"triggerNumber":1,"escalated":false,"tab":6,"target":5}
standard → {"turn":0,...,"triggerNumber":1,"escalated":false,"tab":6,"target":5}
hunted   → {"turn":0,...,"triggerNumber":1,"escalated":false,"tab":6,"target":5}
```

And the panel hardcodes the standard value regardless
([`forge-app.mjs:188`](../../foundry-module/module/forge-app.mjs)):

> `Roll 1d6 on any attention trigger, or every 3 Turns.`

A GM who picks `hunted` is told 3 Turns and gets 3 Turns.

**Cost.** Trivial — add `period` to `summary()`, read it in the panel. It is item 1's prerequisite
and probably the same commit.

**Risk.** None beyond item 1. Old delve files lack `period`; default to 3.

---

# TIER 2 — build steps designed but never started

## 3. The overlay catalog *(build step 5)*

**What.** A curated encounter catalog layered over the Forge's output, with per-entry theme,
faction, role, uniqueness — plus two fields that must be **tests, not tags**:

- **playability** — *can a hero with a mundane weapon damage this at all?*
- **survivability** — *can the party's weakest member survive one clean hit and two rounds of being
  focused?*

**Why.** Both tests come from a corpse. The Wraith's immunity made a finale literally unwinnable; a
5d6 armour-ignoring attack that drains max Grit, against 3 Grit, is not a fight. DELVE currently
plans *heat* and hands composition to the Forge, so it cannot promise either property.

**Cost.** Large — it is authored content per theme plus a selection layer, and it interacts with
the roster data already in the packs.

**Risk.** This is the item most likely to be wrong before a live session. Heat may turn out to be
sufficient at a real table, in which case a curated catalog is a lot of authoring for a problem
that only appeared in simulation. **I would hold this until after the session.**

## 4. A Bane calibration harness

**What.** A pure-core simulator: run N delves against a modelled table, count Banes at the ending,
report the distribution. Then set `baneTarget` from data instead of intuition.

**Why.** The target has been marked **UNCALIBRATED** since draft 5. It is ~5; playtest 2 reached 3.
Every Bane-beat decision in `baneBeatFor()` keys off `onPace()`, which keys off that number — so an
uncalibrated target silently miscalibrates the whole tab engine.

**Cost.** Small, and it needs no Foundry and no table. This is the cheapest real answer available
right now.

**Risk.** A simulated table is not a table. The output is a *prior*, not a calibration, and should
be labelled as one — the same mistake as "6 areas: validated" would be easy to repeat here.

**Done when.** DESIGN.md can state a target with a measured distribution behind it, and open
question 4 either closes or gets sharper.

---

# TIER 3 — worth doing, but after a session

## 5. The play sheet as a Foundry surface

**What.** Render the play sheet in-world — a GM window carrying the current area's prose, the
decision, the numbers, and the live tab, instead of scrollback.

**Why.** The play sheet is currently CLI markdown only. At the table the GM card is *chat*, and
chat scrolls away. The whole two-surface design exists because table-facing material must be
scannable; a surface you have to scroll back through is not.

**Cost.** Medium. Renderer exists (`render-authoring.mjs`); this is a Foundry Application over it.

## 6. In-world authoring

**What.** Write the read-aloud, notes and title inside Foundry — the `authored` layer is already
the right shape for it.

**Why.** Today the only authoring path is the CLI, which means a GM who wants to fix one area's
prose leaves the VTT, edits JSON, and reloads. The module can already *detect* unfinished work
(`outstanding()` is exposed on `game.delve`) but offers no way to resolve it.

**Cost.** Medium. Needs a save-back path to `worlds/<id>/delves/`, which the module currently only
reads.

**Risk.** Two writers on one file. Needs a clear rule about which side owns the file.

## 7. A theme quality audit beyond Barrow

**What.** Read one generated delve per theme against the barrow benchmark, and add whatever
invariant each failure implies.

**Why.** Sixteen packs pass `validate-pack.mjs`, but validation is structural — it proves a pack
*can* fill six areas without repeating, not that the result is any good. Only barrow has ever been
read closely against a playtest. **A pack can pass every invariant and still be dull.**

**Cost.** Medium, and mostly reading rather than coding.

**Risk.** None. This is the item most likely to find something surprising per hour spent.

## 8. The growing delve map *(build step 7)*

**What.** A map that accumulates as areas are staged — the pointcrawl made visible.

**Why.** v1 is explicitly a pointcrawl and players will ask where they are.

**Cost.** Large. Browser-only by necessity (`forgeStage` needs `Image`/canvas/`XMLSerializer`), so
it cannot be tested in the CLI, which is where all 39 tests live.

**Risk.** High. This is the feature most likely to consume a week and produce something a GM
sketches better on paper. **I would want a session to ask for it before building it.**

## 9. Injectable RNG in the Forge → full replay

**What.** Thread a seeded RNG through VANITY's Forge so a seed replays the population too.

**Why.** It closes the honesty gap in the seed promise (§5 of the app draft).

**Cost.** Large and it is in the *other* repo — 36 `Math.random` sites across four helpers. It was
explicitly deferred as not gating a first release, and that judgment still looks right.

---

# TIER 4 — proposed and rejected

**More themes.** Sixteen is already more than has been validated at a table. Another family adds
authored content behind an unmeasured quality bar. **Stop until item 7 runs.**

**Multi-motif or two-faction delves.** The fiction model coheres *because* it has one root draw.
Two motifs is the most plausible way to break the thing that currently works best.

**Generated read-aloud prose.** Named in DESIGN.md as the one dishonest thing this tool could do.
Still true. The cue-fragment ceiling is the honest one.

**A balance guarantee.** Out of scope by design, and the overlay tests (item 3) are the correct
scoped version of this instinct.

---

## Suggested sequence

1. **Items 1 + 2** — one commit, small, fixes a rule that is documented but not running.
2. **Item 4** — cheap, no table needed, turns an admitted unknown into a number.
3. **Run a session.** Four hours, four players, one barrow delve, generated not hand-written.
4. **Item 7** while the session is fresh.
5. Re-rank 3, 5, 6, 8 against what the session actually showed. **I expect at least one of them to
   look wrong afterwards, and I would rather find out which one before building it than after.**

## Where I am least confident

- **Item 3's priority.** I have ranked a designed-and-documented build step below a simulation
  harness and a reading exercise. That is arguable, and the argument turns entirely on whether
  heat-without-curation survives a real fight.
- **Whether items 5 and 6 are one feature.** A play-sheet window that cannot be edited may be half
  a thing; shipping both at once may be the smaller total change.
- **The whole ranking assumes the session happens.** If it realistically will not happen soon, tier
  3 should be reordered to whatever makes the tool most useful at the desk — probably 6, then 5.
