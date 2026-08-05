# DELVE — a dungeon layer for VANITY

*Working name `vanity-delve`. **Draft 7**, 2026-08-05.*
*Describes a tool that **exists** and is released. The core is built, tested and generating; the
Foundry module is published at v0.6.0.*

---

## 0. Status

| Build step | State |
|---|---|
| 1. Handwrite a delve, run it twice on paper | ✅ complete — [`paper/`](paper/) |
| 2. Seam spike | ✅ complete — [`spike/SPIKE-REPORT.md`](spike/SPIKE-REPORT.md) |
| 3. Land the Forge seams | ✅ **merged and released** — VANITY v0.10.4, PR #1 |
| 4. Core + content | ✅ built — [`core/`](core/), **39/39 tests passing** |
| 5. Curated overlays | not started |
| 6. Foundry vertical slice | ✅ **released** — v0.1.0 → v0.6.0 |
| 7. Growing Delve Map | not started |
| 8. More themes | ✅ **16 themes**, 68 motifs — all passing [`validate-pack.mjs`](core/validate-pack.mjs) |

**What runs today:** the module installs from its manifest and raises a whole delve in the world
on one button, and `node core/cli.mjs --new --seed=gilded-court-404` emits the same delve as a
worksheet at the desk. Samples in [`samples/`](samples/).

**What has never happened:** a live session. Everything since the two paper playtests has been
validated at the desk, by tests and by reading. Open question 1 is still open, and it is the only
one that matters.

### Versions

| | |
|---|---|
| Module | 0.6.0 |
| Requires | VANITY **0.10.4+** — the release the seams landed in |
| Foundry | v13 minimum, verified 14.365 |
| Generator stamp | `GENERATOR_VERSION` **0.2.0** — written into every delve file, **not** the module version |

`GENERATOR_VERSION` had sat at 0.1.0 while the emitted object gained the `authored` layer and the
content model moved under it, so files claimed a generator that no longer existed — the two
samples in [`samples/`](samples/) are both stamped 0.1.0 and only one of them has an `authored`
layer. It tracks the *shape of the delve file and what a seed yields*, and the comment on it now
says when to bump it. Old files still load.

---

## 1. What changed

### In draft 7 — the tool shipped

| Change | Source |
|---|---|
| **Seams: "unpushed branch" → merged** | PR #1 into `slaguru666/Vanity`, released in **v0.10.4** |
| **Step 6 shipped** | The Foundry module went v0.1.0 → v0.6.0 in a day |
| **One theme → 16** | Castle, then the interior, settlement and wild families — 68 motifs |
| **11 tests → 39** | The authoring layer, situations and the subtraction pass each brought invariants |
| **A pack validator exists** | [`validate-pack.mjs`](core/validate-pack.mjs) — the structural rules, checked per theme rather than rediscovered |
| **Required VANITY floor corrected** | The manifest said 0.10.0; the seams land in 0.10.4. Below that a delve emits 9 chat cards and 3 folders |

### In draft 6, since draft 5

| Change | Source |
|---|---|
| **Seven seams → six → four landed** | Spike: `populate:false` already existed; I listed work that was already done |
| **Seam 4 narrowed** | `forgeEncounter` already returned a good object; only `forgeHoard` returned nothing |
| **`post:false` promoted to the decisive seam** | Spike: 3 chat cards per area, 9 per delve, unsuppressable |
| **Browser-only constraint stated as a fact** | Spike: `forgeStage` needs `Image`/canvas/`XMLSerializer` — the CLI is map-free by necessity |
| **6 areas: "validated" → "working default"** | Review: one Barrow, one simulated table, two passes, one heat |
| **Bane target marked UNCALIBRATED** | Review: pass 2 reached 3, not 4–6 |
| **Survivability becomes a concrete test** | Review: "can the weakest PC survive one clean hit and two rounds of focus?" not a vibe tag |
| **The fiction model exists** | New — §3 |

---

## 2. What DELVE is — an authoring system

**This changed in draft 7, after four readings of generated output.**

DELVE is the dungeon-scale layer over VANITY's Forge — it generates the fiction, the order and
the pressure, and sequences the Forge without letting it talk over DELVE. But it is **not** a tool
that hands a GM a delve to run. Four independent reviews converged:

> *"The handwritten delve still tells the GM what matters faster."*
> *"Would you run this at a real table tomorrow, as-is?"* — **No.**

Three renderer passes each fixed what the last review named and each introduced a new problem
(blocks → menu-like; subtraction → buried). The density is not a bug to render away: **everything
on the page is a vice at the table and a virtue at the desk.**

So a delve has two surfaces and one working file:

| | For | Carries |
|---|---|---|
| **Worksheet** | the desk | everything, labelled, reroll commands beside each component, explicit prompts where only a human can write |
| **Play sheet** | the table | the GM's own prose, the live leverage point, the decision on one line, the numbers. Nothing else |

The JSON file is the document. An `authored` layer holds what the GM writes and the generator
never touches it, so **rerolling a component cannot destroy prose**. Lock what is good, reroll
what is not, write the read-aloud, export the play sheet.

DELVE does not write the read-aloud and does not write the climax. It gets a GM to a strong first
draft in a minute instead of an evening, and then gets out of the way.

---

## 3. The fiction model — solved

Draft 5 asserted DELVE generates "prize, bottom problem, factions, motif, foreshadow" and never
said how. Four independent draws produce nonsense. The model that works has **one root draw**:

```
APPETITE  ──> motif ──> danger, attention trigger, every cue fragment
    │     ──> prize kind
    │     ──> who was conscripted
    └─ + ACCOMMODATION ──> the transgression, the bottom problem, the primary faction
```

An appetite is a want (*to be looked at*, *never to age*, *to be first*). An accommodation is the
monstrous thing someone did to satisfy it (*had the court interred alive*, *had the faces struck
off*). Everything else is **projected**, never drawn — which is why the fiction coheres.

**Content scales additively:** 8 appetites × 6 accommodations × 7 claimants = **336 kernels from
21 authored lines**. Measured: 60 generated delves produced **51 distinct kernels**.

### Cue fragments and facets

Fragments hang off the **motif**, tagged by **facet** — `institution · ritual · demand · wound ·
anchor` — so two delves sharing a motif draw different imagery. 15 fragments per motif, 8 motifs.

The **foreshadow chain** is a fixed facet progression mapped onto the arc:

| Arc role | Facet |
|---|---|
| approach | institution |
| complication | ritual |
| turn | demand |
| descent | wound |
| threshold | anchor |
| ending | demand |

This is why area 2's held bows and area 4's scratched-out eyes both point at the same faceless
queen: they are facets of one motif, drawn in a deliberate order. The progression was proposed
independently and **turned out to describe the hand-authored paper delve exactly** — which had
arrived at it by instinct. That convergence is the strongest evidence the model is right.

Fragments are dealt without replacement, borrowing from a neighbouring facet before repeating.

**The furniture is motif-scoped too.** Codex's review found that only the motif cue fragment was
projected — decisions and temptations came from global pools, making the output "a consistent
wrapper around generic room furniture". Both now live under `motifs.<id>`: **6 decisions and 5
temptations per motif**, 88 authored entries across 8 motifs. A `keeping` delve offers a flower
that has not wilted, a lamp on three-century-old oil, and a room you may search or leave exactly
as you found it. A `precedence` delve offers a corridor that will not let two walk abreast.

Two rules the tests enforce:
- **Nothing repeats inside one delve.** Decisions and temptations are dealt without replacement,
  not picked per area — picking independently repeated a temptation in 75 of 80 test delves.
- **Motif purity beats variety for temptations.** Decisions may top up from the generic pool if a
  long delve outruns its motif; temptations may not. A generic relic breaks the fiction, while a
  repeated one only looks thin.

**Closed in draft 7:** the `features` pool was the last piece of generic furniture, and it is now
motif-scoped too. Every pack carries **6 features, 6 decisions, 5 temptations and 6 situations per
motif**; the top-level pools survive only as fallbacks for a delve long enough to outrun its motif,
and the pack itself says so (`_globalPoolsNote`). Nothing generic reaches a six-area delve.

**Areas arrive as situations, not prompts.** A `situations` pool per motif gives each area an
occupant doing something, with a leverage point — *"The tide watch, turning a glass that has
already run through — it asks what the hour is, and means the tide."* Four test invariants police
the grammar, because the first pass rendered broken English.

### The appeasement move

The best mechanic in the hand-authored delve — bow back, be received as a guest, **+1 Vanity now,
+1 Bane later, repeatable** — turned out to project *exactly* from the appetite. Every appetite
implies how it is fed:

| Appetite | The move | Roll |
|---|---|---|
| to be looked at | look at it and say plainly what you see | Flair 2 |
| to be first | stand aside and let it go ahead of you | Poise 2 |
| never to age | tell it that it has not changed | Flair 2 |
| never to be alone | sit down and stay a while | Poise 2 |

This is the delve's social spine, it is always thematically exact, and it is the reason the
generated delve has a way through that is not violence.

**Accommodations are filtered by appetite.** Drawing freely produced "had the faces struck from
the young, so that nothing would ever age" — legible but not folklore. Each accommodation now
declares which appetites it fits.

---

## 4. Architecture (built)

```
core/                  pure JS, seeded, zero Foundry globals, Node-testable
  rng.mjs              derived streams — seed::area::3::encounter. Order-independent.
  skeleton.mjs         the fiction kernel (§3)
  director.mjs         arc roles, heat, hoard tier, density, Bane beats
  beat.mjs             an area as a beat: Cue + Truth
  pressure.mjs         the clock and the tab — never rolls a die
  delve.mjs            composition; GENERATOR_VERSION
  authoring.mjs        the working file — reroll, lock, setAuthored, outstanding
  render.mjs           markdown
  render-authoring.mjs the two surfaces — worksheet and play sheet (§2)
  cli.mjs              --new --file --theme --themes --seed --areas
                       --reroll --lock --unlock --write --text
                       --play --json --todo --out   (worksheet is the default)
  validate-pack.mjs    the structural rules a theme pack must satisfy
  build-index.mjs      regenerates content/index.json
  content/*.json       16 theme packs + index.json
  test.mjs             39 invariants
```

**The core never sees an Actor, a UUID, HTML or a roll.** `pressure.mjs` decides *when* a clock
roll is due and what it means; the adapter rolls it at the table. That separation is what makes
the seed promise honest.

**The module vendors the core.** `foundry-module/module/core/` is a copy of `core/` minus the
Node-only tools (`cli.mjs`, `test.mjs`, `validate-pack.mjs`, `build-index.mjs`). It must stay
byte-identical to `core/` for the shared files — a drift there means the table and the desk
generate different delves from the same seed.

**Themes are pluggable.** A pack declares its `forgeStageType` from the five geometries VANITY can
build — `barrow · cave · fen · village · forest` — so a new theme is authored content, not code:

| Geometry | Themes |
|---|---|
| barrow | barrow, castle, church, palace, temple |
| village | city, market, port, town, village |
| cave | cave, mountain |
| forest | forest, valley |
| fen | lake, river |

---

## 5. The Forge seams — landed

Merged into `slaguru666/Vanity` as PR #1 from branch `delve-seams`, and **published in VANITY
v0.10.4**. All default to current behaviour, so nothing changed for existing callers.

**This is the module's hard floor.** `module.json` requires VANITY 0.10.4 or later. On anything
earlier the seams simply are not there, and every delve emits the 9 chat cards and 3 folders the
spike measured — the exact failure the seams exist to prevent.

| Seam | Change | Verified |
|---|---|---|
| 1 | `forgeEncounter({ hoard: false })` | loot decoupled from combat |
| 3 | `{ post: false }` on all three | **9 chat cards → 0** across three areas |
| 4 | `forgeHoard` returns `{size,label,goods,relics,lines,card}` | was `undefined` |
| 5 | `forgeEncounter({ folderId })` | **3 folders → 0** |
| — | guard two unchecked `rnd()` calls | latent crash on an empty pack |

**Deferred:** injectable RNG (36 `Math.random` sites, four helpers) and live Reaction `Roll`.
Neither gates a first release.

---

## 6. Parameters

| Parameter | Range | Default | Confidence |
|---|---|---|---|
| **Areas** (excludes ending slot) | 3–12 | **6** | *working default* — one theme, one table, two passes |
| Theme | 16 packs, 5 geometries (§4) | Barrow | all validate; **only Barrow is playtested** |
| Depth | 1–5 | 2 | |
| Party | 1–8 | 4 | |
| Deadliness | forgiving/standard/cruel | standard | **severity only** |
| Density | sparse/standard/infested | standard | **frequency only** — 2 fights in 6 |
| Greed | lean/standard/glutted | standard | |
| Pressure | slow/standard/hunted | standard | |
| Ending | authored/generated | authored | a default, not a law |
| Skeleton seed | string | random | **not a replay seed** |

---

## 7. Encounters and the overlay catalog

Heat is a coarse shape dial. Authored overrides stay for the bottom problem and any named foe.

The overlay needs six fields. The last two came from two dead mages, and the review is right that
they must be **tests, not tags**:

- theme · faction · role · uniqueness
- **playability** — *can a hero with a mundane weapon damage this at all?* (the Wraith's immunity
  made a finale unwinnable)
- **survivability** — *can the party's weakest member survive one clean hit and two rounds of
  being focused?* (a 5d6 armour-ignoring attack that drains max Grit, against 3 Grit, cannot)

Not built yet — step 5.

---

## 8. Temptation — at the point of use

Both playtests: every free-acceptance item was taken without discussion. Free acceptance is not a
temptation, it is an automatic yes. The decision lives at **use**.

```json
{ "id": "ledger", "cue": "a book of names, one line left blank",
  "benefit": "write a name and the Host obeys it once",
  "acceptanceCost": { "vice": "Pride" },
  "useCost": { "bane": 2 },
  "standingDrawback": "your own name is now in it" }
```

A minority carry real acceptance friction so "do we take it?" is sometimes a genuine question.
Vanity is **fuel, not a cost** (`vanity.mjs:1224`). No sheet writes in v1 — DELVE offers.

---

## 9. Pressure

**Clock: triggers lead, the timer is a floor.** Every area emits an attention trigger. Escalates
if it has not fired by the halfway area. Telegraphed one Turn ahead. **The core never rolls it.**

**The tab: Banes are emitted by named beats**, never hoped for — playtest 1 banked 1 in ~40 rolls
because Stumbles are rare. The director offers a Bane beat when the tab falls behind pace.

**Target: ~5 Banes by the ending. UNCALIBRATED** — playtest 2 reached 3. Needs another pass.

---

## 10. The skeleton seed

| Reproducible | Recorded only | Live |
|---|---|---|
| Fiction, area order, heat, hoard tier, foreshadow chain | Encounter composition, mood, hoard contents | The clock, player choices |

The UI must say this plainly. A partial seed sold as a full one is worse than no seed.

---

## 11. What v1 will not do

- No physically coherent tiled dungeon — **v1 is a pointcrawl**.
- No balance guarantee.
- No sheet writes.
- **No system-generated climax by default** — the ending slot is the GM's.
- No full replay from seed until the RNG seam lands.
- **No generated read-aloud prose.** Cue fragments only, labelled as fragments. This is the
  honest ceiling, and faking prose would be the one dishonest thing this tool could do.

---

## 12. The quality verdict — and what it changed

Codex read three generated delves against the playtested hand-written one:

> *"The paper delve has procedures. The generated delves mostly have prompts."*
> *"Not yet... still a very good random-table document with a coherence engine and CLI in front."*

That was right, and specific. The cue-fragment gap was **not** the problem — fragments are fine
if the rest of the packet is operational. It wasn't. Fixed since:

- **The appeasement move** (above) — the social route, projected, repeatable, priced
- **Concrete encounter blocks** — foe counts and atk/def/Grit/Nerve in a table, plus
  **"harmed by"** stated before initiative and **"avoidable"** spelled out
- **Bane beats state who, when, and whether they repeat** — not just a tag
- **A trigger glossary**, so `seenTwice` is not shorthand
- **Accommodation/appetite compatibility**, killing the equation-output kernels

**Draft 7 closed most of the rest.** "Mostly prompts" was the charge; the answer was to make every
area arrive as a situation with an occupant, a leverage point and a way through, and to enforce it
with tests: every decision now states success *and* failure, offers an attempt rather than a pick,
and never gates progress without an alternative — playtest 1 died on exactly that.

Still missing, and still the gap to a document: per-area read-aloud (deliberately — §11), exact
route costs, concrete clue answers, and a full ending packet with negotiation terms.

## 13. Open questions

1. **Does the module beat a document?** The mechanical half is now settled *in shipped code* — the
   unmodified Forge emits 9 cards and 3 folders per delve that no document could intercept, and
   the released seams take that to 0. The *table* half is still open, and no amount of desk work
   will close it. **This is the blocking question.**
2. Is `Ending: Authored` right, or right only for its author?
3. Is 6 areas right beyond one theme and one simulated table?
4. Is the ~5-Bane target reachable without feeling mechanical? Still **UNCALIBRATED** — the target
   is ~5, playtest 2 reached 3, and nothing since has been measured against a real table.
5. Do cue *fragments* work at a live table, or does a GM need prose?
6. **Do the other 15 themes hold up?** They validate structurally, but only Barrow has ever been
   read closely against a playtest. A pack can pass every invariant and still be dull.

---

*VANITY development notes — part of [DELVE](https://github.com/slaguru666/vanity-delve).*
