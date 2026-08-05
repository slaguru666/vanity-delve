# DELVE — the App and the Rules

*Draft 1, 2026-08-05. Written against the code at `316716e`, module v0.6.1, generator 0.2.0.*
*Every number here was read out of the source, not remembered. Line references are live.*

---

## 0. What this document is

`DESIGN.md` is a design history — it records how DELVE was argued into existence, including the
parts that failed. It is the wrong thing to hand someone who asks "what is this and how do I run
it?"

This is that document. Two halves:

- **The App** — what the software is, the two surfaces, and the workflow at the desk and the table.
- **The Rules** — the in-play procedure a GM actually runs, stated as rules rather than as
  architecture.

It is a draft. §7 lists what I believe is wrong with it.

---

## 1. Design intent

1. **DELVE is an authoring system, not an adventure generator.** It gets a GM to a strong first
   draft in a minute instead of an evening. It does not hand over something to run cold.
2. **It generates the fiction, the order and the pressure.** It does not generate read-aloud prose
   or the climax, and it says so on the page where they are missing.
3. **The fiction coheres because it is projected from one root draw**, not assembled from four
   independent tables.
4. **Generation and table dice stay apart.** The core decides *when* a roll is due and what it
   means; the table rolls it. This is what makes the seed promise honest.
5. **It is deliberately not a balance engine.** It plans pressure; it does not guarantee a fair
   fight.

---

# PART ONE — THE APP

## 2. The two surfaces and one working file

Four independent reviews of generated output converged on the same verdict: *"the handwritten
delve still tells the GM what matters faster."* The density was the problem — and it turned out
not to be a bug to render away. **Everything on the page is a vice at the table and a virtue at
the desk.**

So there are two surfaces over one file:

| | For | Carries |
|---|---|---|
| **Worksheet** | the desk | everything, labelled, reroll commands beside each component, explicit prompts where only a human can write |
| **Play sheet** | the table | the GM's own prose, the live leverage point, the decision on one line, the numbers. Nothing else |

**The JSON file is the document.** It carries an `authored` layer the generator never touches
([`authoring.mjs:22`](../../core/authoring.mjs)), so **rerolling a component cannot destroy
prose**. Lock what is good, reroll what is not, write the read-aloud, export the play sheet.

- Authored fields: `readAloud`, `notes`, `nameOverride`
- Rerollable components: `situation`, `decision`, `temptation`, `feature`, `name`
- A reroll draws from a salted seed and avoids what the rest of the delve already uses; when the
  pool is exhausted it duplicates another area rather than handing back the same thing, because
  **a reroll that changes nothing looks broken**

## 3. At the desk — the CLI

`core/` is pure JavaScript with no Foundry dependencies, so the whole authoring loop runs in Node.

```bash
node core/cli.mjs --new --seed=my-delve --theme=port --file=my.json
node core/cli.mjs --file=my.json                  # the worksheet (default)
node core/cli.mjs --file=my.json --reroll=3:situation
node core/cli.mjs --file=my.json --lock=3:decision
node core/cli.mjs --file=my.json --write=3:readAloud --text="They have been waiting."
node core/cli.mjs --file=my.json --todo            # what still needs a human
node core/cli.mjs --file=my.json --play            # the table-facing sheet
node core/cli.mjs --themes                         # list the 16 packs
```

**A fresh delve is not ready to play, and says so.** `outstanding()` returns the intro, one
read-aloud per area, the ending read-aloud, and — when the ending is `authored` — the climax
itself. A six-area delve starts with **9 outstanding items**. The play sheet prints a warning
banner until they are gone.

## 4. At the table — the Foundry module

Three tools in the scene controls:

| | Tool | Does |
|---|---|---|
| ⛏ | `delve-forge` | raise a dungeon — opens the panel, generates or loads, stages it in the world |
| 🗑 | `delve-remove` | remove one — deletes exactly what it made and nothing else |
| ⏩ | `delve-next` | stage the next area of a delve you finished at the desk |

**Entering an area** ([`vanity-delve.mjs:83`](../../foundry-module/module/vanity-delve.mjs)) does
five things in a fixed order:

1. Builds the scene — `forge.stage({ populate: false, activate: true })`
2. Forges the encounter, if the area plans one — with `hoard: false` so loot is decoupled
3. Forges the hoard, if the area plans one — at its own tier
4. **Posts the read-aloud to everyone** — the GM's prose, or the cue fragments marked *(unwritten)*
5. **Posts the GM card, quietly** — situation, decision with resolution, foe block, temptation,
   and a code line carrying the trigger, the Bane beat and the fallback route

Players first, then the GM. That ordering is deliberate: the scene is up and the read-aloud is
what the table came for.

**The seams.** DELVE requires VANITY **0.10.4+**. Below that floor the Forge's suppression options
do not exist and every delve emits 9 stray chat cards and 3 stray folders. The module detects this
at boot and warns. Requires Foundry v13+, verified on 14.365.

## 5. What the seed promises

State this plainly in any UI. **A partial seed sold as a full one is worse than no seed.**

| Reproducible from the seed | Recorded only | Live at the table |
|---|---|---|
| Fiction, area order, heat, hoard tier, foreshadow chain, situations, decisions, temptations | Encounter composition, mood, hoard contents | The clock, the tab, player choices |

The gap exists because VANITY's Forge uses `Math.random` internally (36 sites). Until an injectable
RNG lands, a seed replays the *delve* but not the *dungeon's population*.

`GENERATOR_VERSION` (currently **0.2.0**) is stamped into every file. It tracks the shape of the
file and what a seed yields — **not** the module version.

---

# PART TWO — THE RULES

*This is the procedure. A GM who has read this section can run a delve.*

## 6. The kernel — where a delve comes from

One root draw, everything else projected:

```
APPETITE  ──> motif ──> danger, attention trigger, every cue fragment
    │     ──> prize kind
    │     ──> who was conscripted
    └─ + ACCOMMODATION ──> the transgression, the bottom problem, the primary faction
```

An **appetite** is a want — *to be looked at*, *never to age*, *to be first*. An
**accommodation** is the monstrous thing someone did to satisfy it — *had the court interred
alive*, *had the faces struck off*. Accommodations declare which appetites they fit, because
drawing freely produced legible nonsense.

8 appetites × 6 accommodations × 7 claimants = **336 kernels from 21 authored lines**. Measured:
60 generated delves produced **51 distinct kernels**.

**The GM needs one line of this at the table:** the transgression, the bottom problem, and what
the thing at the bottom is now unable to bear.

## 7. The shape of a delve

Areas are assigned **arc roles** by position, so a delve has a shape rather than a flat run of
rooms. Proportional — works at 3 areas or 12 ([`director.mjs:37`](../../core/director.mjs)):

| Position | Role | Foreshadow facet |
|---|---|---|
| first 20% | approach | institution |
| to 45% | complication | ritual |
| to 65% | turn | demand |
| to 85% | descent | wound |
| last 15% | threshold | anchor |
| — | ending (separate slot) | demand |

The facet column is the **foreshadow chain**, and it is why area 2's held bows and area 4's
scratched-out eyes point at the same faceless queen — they are facets of one motif, dealt in a
deliberate order. The progression was proposed independently and turned out to describe the
hand-authored paper delve exactly.

**Approach areas stay quiet.** An empty area is what makes an occupied one land.

## 8. An area, as the GM runs it

Every area carries the same parts, in this order on the card:

**1 · The situation.** Someone doing something, and what changes when the players walk in.
> *"The tide watch, turning a glass that has already run through — it asks what the hour is, and
> means the tide."*

It comes with an **offer** — what the players can get out of it — and a **because**, the reason it
behaves that way. Situations are drawn from the motif, never a global pool.

**2 · The decision.** One thing you can do about the situation. Always states three outcomes:

`[Wits 2]` success · **miss** what failure costs · **or** the alternative that needs no roll

Four test invariants police this: every decision states success **and** failure, offers an attempt
rather than a pick, and **never gates progress without an alternative**. Playtest 1 died on a gate
with no fallback.

**3 · The clue.** Automatic on entry — the cue fragment, plus *"and it was done deliberately"*.
The roll buys extra: `[VANITY: Observation — 1 success]` buys **who** did it and **roughly when**.
Clues are never gated behind a roll; playtest 1 lost both its clues to single unopposed rolls and
the motif never reached the table.

**4 · The encounter**, where one is planned. Foe counts and atk/def/Grit/Nerve in a table, plus
**"harmed by"** stated *before* initiative and **"avoidable"** spelled out.

**5 · The temptation**, where there is a hoard. The decision lives at **use**, not acceptance —
both playtests took every free-acceptance item without discussion, so free acceptance is not a
temptation, it is an automatic yes.

```
benefit          what it does
useCost          usually +2 Bane
standingDrawback what it costs you for the rest of the delve
```

**6 · The failure case.** Every area states it. Ordinary areas: *"if they skip this, move its cue
fragment into the next area so the motif still completes."* The threshold: *"if they skip this,
the ending opens with them holding nothing the bottom problem wants."*

**Nothing repeats inside one delve.** Situations, decisions, temptations and features are dealt
without replacement. Picking independently per area repeated a temptation in **75 of 80** test
delves.

## 9. The appeasement move — the way through that is not violence

The best mechanic in the hand-authored delve turned out to project *exactly* from the appetite.
Every appetite implies how it is fed:

| Appetite | The move | Roll |
|---|---|---|
| to be looked at | look at it and say plainly what you see | `[Flair 2]` |
| to be first | stand aside and let it go ahead of you | `[Poise 2]` |
| never to age | tell it that it has not changed | `[Flair 2]` |
| never to be alone | sit down and stay a while | `[Poise 2]` |

**+1 Vanity now, +1 Bane later. Repeatable, in every area.**

> **Say the Bane aloud when it banks**, so the table can see the route is open.

This is the delve's social spine. It is always thematically exact, and a party that appeases even
once reaches an ending that will *trade* rather than fight.

## 10. The clock — Wandering the Dark

**Triggers lead; the timer is a floor.** Playtest 1's clock fired 0 times in 4 rolls on a 3-Turn
timer, while the attention trigger fired on the first roll of pass 2.

Every area emits at least one **attention trigger**:

| Trigger | Means |
|---|---|
| `announced` | entered somewhere grandly, announcing yourself |
| `seenTwice` | reflected, echoed or witnessed twice over |
| `loud` | a raised voice, a broken door, a shout |
| `lingering` | stayed too long in one place |
| `disturbed` | struck or moved something that had not moved in years |

**Procedure.** Roll `1d6` on any attention trigger, or when the timer comes round.
**1 — something comes.** Telegraph one Turn ahead — the GM voices a cue before it is due. When it
fires, roll **Reaction (2d6)** for its mood.

| Pressure setting | Timer period |
|---|---|
| slow | every 4 Turns |
| standard | every 3 Turns |
| hunted | every 2 Turns |

**Escalation.** If the clock has not fired by the halfway area, the trigger number widens from 1
to 2 for the rest of the delve. A clock that never bites is decoration.

> ⚠ **The escalation and the period do not currently reach the table.** See §7 of the features
> draft — this section describes the rule as designed and as implemented in `pressure.mjs`, not as
> the Foundry module currently behaves.

## 11. The tab and the Reckoning

**Banes are emitted by named beats, never hoped for.** Playtest 1 banked 1 Bane in ~40 rolls
because Stumbles are rare. The director offers a Bane beat when the tab falls behind pace — always
when behind, and only half the time when on pace, so it does not feel mechanical.

| Source | Banks a Bane when you… |
|---|---|
| `flattery` | played to something's vanity to be received |
| `noticing` | caught your own reflection and looked |
| `relicUse` | spent a relic's favour |
| `announcing` | announced yourself rather than slipping in |
| `refusal` | refused an offer that would have cost you nothing yet |
| `push` | pushed a roll |
| `stumble` | stumbled — a failure with two or more ones |

**Target: ~5 Banes by the ending. THE RECKONING falls at 6.**

> ⚠ **The target is UNCALIBRATED.** Playtest 2 reached 3. It is a target, not a promise.

Quiet areas offer only `noticing` and `announcing`; louder areas add `flattery`, `relicUse` and
`refusal`.

## 12. Endings

The ending is a **separate slot** after the last area, and by default it is **yours**.

- **`authored`** (default) — DELVE writes the question the place asks and leaves the climax blank.
  It says so on the card: *"the climax is unwritten. DELVE leaves this to you on purpose —
  improvise, or stop and write it."*
- **`generated`** — the ending gets a real heat (one step above the delve's base) and a vault-tier
  hoard.

**Appeased even once → it listens, and will trade the prize.** That is the ending the social spine
buys.

## 13. Parameters

| Parameter | Range | Default | Confidence |
|---|---|---|---|
| Areas (excludes the ending slot) | 3–12 | 6 | working default — one theme, one table, two passes |
| Theme | 16 packs, 5 geometries | barrow | all validate; **only barrow is playtested** |
| Depth | 1–5 | 2 | |
| Party | 1–8 | 4 | ≤2 softens the heat, ≥7 hardens it |
| Deadliness | forgiving / standard / cruel | standard | **severity only** |
| Density | sparse / standard / infested | standard | **frequency only** — 0.20 / 0.34 / 0.55 of areas |
| Greed | lean / standard / glutted | standard | shifts the hoard tier one step |
| Pressure | slow / standard / hunted | standard | ⚠ **currently inert — see features draft** |
| Ending | authored / generated | authored | a default, not a law |

**Heat** runs `skirmish → fight → battle → nightmare`; **hoards** run
`pocket → cache → chest → vault → kingly`. Descent and threshold areas run one step hotter. The
area before the ending always carries something — the threshold should have teeth. Treasure is not
only behind fights: unless greed is `lean`, one treasureless area gets a bonus hoard.

## 14. What DELVE will not do

- **No physically coherent tiled dungeon.** v1 is a pointcrawl.
- **No balance guarantee.**
- **No sheet writes.** DELVE offers; the players and the GM decide.
- **No system-generated climax by default.**
- **No full replay from seed** until the Forge's RNG seam lands.
- **No generated read-aloud prose.** Cue fragments only, labelled as fragments. This is the honest
  ceiling, and faking prose would be the one dishonest thing this tool could do.

---

## 15. What I think is wrong with this draft

Flagging these rather than hiding them, since this is going out for review.

1. **§10 and §13 document a rule the software does not run.** The pressure setting is inert end to
   end and the escalation never reaches the table. I have written the rule as designed and flagged
   it twice, but a rules document that describes unimplemented behaviour is a liability. The
   alternative — documenting the degenerate behaviour — is worse. **The right fix is in the code,
   not here.**
2. **Part Two is written for a GM; Part One is written for a developer.** They may want to be two
   files. I kept them together because the seed promise and the two surfaces are rules-relevant.
3. **No worked example.** A rules document of this kind usually ends with one complete annotated
   area. I have not included one because the samples in `samples/` are stamped generator 0.1.0 and
   one lacks the authored layer.
4. **The Reckoning is underspecified here.** I state that it falls at 6 because that is what
   `reckoningDue()` returns, but *what happens* at a Reckoning is VANITY's rule, not DELVE's, and I
   have not cross-checked the rulebook. Someone should.
5. **Nothing here has been tested at a table.** Every claim is read from source or from two paper
   playtests of a hand-written delve.
