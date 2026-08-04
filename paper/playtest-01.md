# PLAYTEST 01 — The Vault of the Gilded Court v1

**Pass:** 1 of 2 (GM chair, full table simulation)
**Scenario version:** v1, 2026-08-04
**Result: FAILS. Do not run at a table until fixes 1–4 are applied.**

---

## 1. Method

- Ran as GM while playing all four house archetypes: **methodical veteran** (Bram the Warrior),
  **roleplay-first talker** (Pinch the Rogue), **rules-literate tactician** (Sister Wren the
  Cleric), **lore-digger** (Yrsa the Mage).
- **Pregens are the system's own**, pulled from the `pregens` compendium with their real numbers:
  Bram brawn 3 / Grit 9 · Pinch flair 4 / Grit 6 · Wren poise 4, brawn 2 / Grit 7 ·
  Yrsa wits 4 / Grit 3. All start Vanity 3.
- **Foes are the real bestiary blocks** — Skeleton atk 3 / def 2 / Grit 1; Bandit 3/3/2;
  Ghoul 4/3/4; Wraith 5/3/10.
- **Every contested beat rolled honestly** with a CSPRNG. No re-rolls, no fudging.
- **Damage model verified in code** (`vanity.mjs:163`, `:438`): a hit is **1 Grit + 1 per extra
  success spent**; **spells deal 0 base**, damage only from bought extras.

**Assumptions I had to invent** — each is a finding in itself (see fix 6):
- PC attack pool = attribute + 1 (weapon knack). The scenario states no PC-side numbers.
- PC defence = 3 (Yrsa 2). Not specified anywhere.

**Instrument note:** my roller flagged "Stumble" on NPC defence rolls. Banes are a PC mechanic;
those flags are an artifact and were ignored.

---

## 2. Play log

### A1 — The Mourners' Steps · planned 20 · **actual ~12**
Party took the Servants' Stair (veteran's call, cost 1 Turn). Yrsa's Observation for the chisel
marks: `4d6 [3,3,2,1] → 0 successes, FAIL` (lone 1 — free twist). Clock `[6]`, quiet.

⚠ **The clue died with the roll.** The party never learned the faces were struck off *from
inside*, which is the seed for the whole motif. The scenario states a failure case for the *area*
but not for its clue — a direct violation of "state the failure case" for every clue.

Ran short because with the clue failed there was nothing else to interrogate.

### A2 — The Antechamber of Bows · planned 30 · **actual ~18**
Pinch went straight for the bow, in character. `5d6 [6,2,5,1,1] → 2 successes, PASS`.
+1 Vanity to Pinch (→4), 1 Bane banked against him. The Host resumed bowing. No fight.

Landed well — the best beat of the session, and the talker's moment. But:

⚠ **Only one hero bowed, and that is the natural outcome.** Nobody else had a reason to. The
finale's survivable route requires **2+**, so a single-talker table — the common case — is
silently routed to the unwinnable branch four areas later, with no warning and no way back.

### A3 — The Hall of Little Mirrors · planned 30 · **actual ~45**
Pell Quill reaction: `2d6 [1,3] → 0 successes → **Hostile**`. Fight with 4 Bandits.

Three rounds rolled; **the fight was not over**. Bram: `[3,4,2,2]→0`, `[1,2,4,4]→0`,
`[2,4,5,6]→2` (one hit, 1 damage) — two whiffed rounds out of three. Bram took 3 Grit.
Yrsa's mirror Observation also failed: `4d6 [3,2,4,1] → 0`.

⚠ **A Hostile reaction adds an unplanned third fight** and blows the 30-minute budget by half.
The design claims "2 planned fights"; the dice can make it three with no GM lever.
⚠ **Second clue lost to a single roll** — same fault as A1, same character, same 4d6.
⚠ Killing the gang means A5's trap fires unwarned. The dice chose this, not the players.

### A4 — The Weeping Gallery · planned 25 · **actual ~35**
Two Ghouls. Pinch destroyed Ghoul B alone (net 3, then net 1). Ghoul A finished the three rolled
rounds **completely untouched**. Bram: `0, 0, 2` successes against defence `1, 1, 3` — **zero
damage in three rounds**, on top of two whiffed rounds in A3.

⚠ **The warrior does not work.** Bram is 4d6 (expect 1.33 successes) into Ghoul defence 3d6
(expect 1.0). Net expected damage ≈ 0.6/round. Across A3 and A4 he landed **one hit in six
rounds** while carrying the party's highest Grit. The player with the least to do was the one
built to fight.

### A5 — The Wardrobe of the Court · planned 25 · **actual ~15**
Unwarned (gang dead). Bram made the door: `4d6 [5,2,5,5] → 3, PASS` — no drama. Party voted to
**leave the portrait covered** (veteran: "we're not waking anything"). Clock `[5]`, quiet.

The decision landed exactly as designed and was genuinely argued. **This area works.**

### A6 — The Gilded Audience · planned 40 · **actual ~50, unresolved**
One hero had bowed, not two → routed to **"Fought throughout"**. Straight fight, Wraith Grit 10.

Four rounds rolled:

| | Wraith damage taken | Yrsa damage taken |
|---|---|---|
| R1 | 0 (Yrsa net 1 — **spells deal 0 base**) | 1 + 1 max Grit |
| R2 | 1 (Wren) | 3 + 1 max Grit |
| R3 | 0 | 1 + 1 max Grit |
| R4 | 0 | 3 + 1 max Grit |

⚠⚠ **The fight is unwinnable and Yrsa is dead in round 2.** She has Grit 3 and took 8 across four
rounds, plus 4 permanent max Grit drained. The Wraith ended on **9 of 10 Grit**. At the observed
rate it needs roughly **forty rounds** to kill.

Compounding causes, all in the stat block I chose without checking:
- **Only magic/silvered/blessed weapons harm it** — Bram and Pinch, the two functioning
  attackers, cannot participate at all.
- **Chill touch is 5d6 and ignores armour**, versus Yrsa's 2d6 defence.
- **Spells deal 0 base damage** — the mage's whole contribution is buying extras she rarely has.
- The scenario then *adds* "three Skeletons per round for three rounds."

**Total: planned 2h50 · actual ~2h55 with the finale unresolved and a dead PC.**

### The clock
Rolled four times: `6, 3, 3, 5`. **Never fired.** Needs a 1.

⚠⚠ **Design intent 4 is falsified.** The delve is supposed to bank its sixth Bane during the
audience. Actual Banes banked all session: **one** — Pinch's flattery. Stumbles require *failing
with 2+ ones*, which happened to a PC **zero times** in ~40 rolls. There is no natural Bane
pressure at this length; the Reckoning cannot arrive on schedule because it cannot arrive at all.

---

## 3. Player-hat verdicts

| Archetype | Verdict | Score |
|---|---|---|
| **Methodical veteran** (Bram) | "I hit nothing for six rounds and then couldn't touch the boss. Why am I the fighter?" | **1/5** |
| **Roleplay-first talker** (Pinch) | "The bow was the best thing I've done in months — and then I killed both real threats too." | **5/5** |
| **Rules-literate tactician** (Wren) | "I was the only one who could hurt the Wraith and I do 1 damage a round. That's not a tactic, it's a queue." | **2/5** |
| **Lore-digger** (Yrsa) | "Two Observation rolls, both zero, so I learned nothing about the barrow. Then I died in round two." | **1/5** |

The scenario works beautifully for exactly one archetype.

---

## 4. Fix list

Prioritised. Nothing rewritten here — these are instructions for v2.

**1. ⚠⚠ Area 6 is not survivable. — blocking**
*Problem:* Wraith Grit 10 / atk 5 / immune to mundane weapons versus a Depth 2 party; only 2 of 4
heroes can engage, and spells do 0 base damage. Unwinnable and lethal.
*Fix:* Make the Queen's Grit **6**, drop the added Skeletons entirely, and give the barrow a
**silvered blade in the A5 hoard** so a mundane fighter can participate. State plainly in A6 that
she is incorporeal and name what harms her — *before* initiative.
*Where:* Area 6 stat line; A5 temptation index.

**2. ⚠⚠ The flattery gate routes the common case into the fatal branch. — blocking**
*Problem:* The survivable ending needs 2+ heroes to have bowed. One talker bowing is the normal
outcome; the party is condemned in A2 and finds out in A6.
*Fix:* Lower the gate to **1 hero**, and make flattery *repeatable per area* so a party can climb
into the good ending. Add a visible signal — the Host addresses flatterers by title — so players
can see the route is open.
*Where:* Area 2 flattery block; Area 6 resolution table.

**3. ⚠⚠ There is no Bane pressure, so the Reckoning never arrives. — blocking**
*Problem:* One Bane in ~40 rolls. Design intent 4 cannot fire.
*Fix:* Stop relying on Stumbles. Bank a Bane on **every** flattery, **every** mirror-noticing in
A3, and **every** relic use — and put a **Bane counter in the area header** so the GM can see the
tab climbing. If the tab is below 4 entering A6, the Queen offers a Vice outright.
*Where:* Areas 2, 3, 5; new running header.

**4. ⚠ Two clues die on single unopposed rolls. — high**
*Problem:* Both Observation clues failed; the motif's seed never reached the table.
*Fix:* Make both **automatic on entry**, with the roll buying *extra*. House rule already says
state the failure case for every clue; v1 states it for areas only.
*Where:* Areas 1 and 3.

**5. ⚠ The warrior contributes nothing. — high**
*Problem:* 4d6 vs defence 3 is ~0.6 damage/round; one hit in six rounds.
*Fix:* Drop Ghoul defence to **2** ("gorged, slow"), and give the Skeletons in A2 defence 2 as
written. Add a note that Ghouls are *slow* so a fighter can dictate range.
*Where:* Areas 2 and 4 stat lines.

**6. ⚠ The scenario states no PC-side numbers. — high**
*Problem:* I had to invent attack pools and defence to run it. A stand-in GM cannot.
*Fix:* Add a four-line block giving each pregen's attack pool, defence and one signature move.
*Where:* new §2b, after the Master Rules block.

**7. A Hostile reaction silently adds a third fight. — medium**
*Problem:* A3 ran 45 minutes against 30 and the schedule never recovers.
*Fix:* On Hostile, the gang **fights for one round then breaks** (Nerve 2 — they are three days
past brave). Note the 15-minute overrun in the timing table.
*Where:* Area 3; §4.

**8. A4 carries no reward and is the second-longest area. — medium**
*Problem:* 35 minutes for the "empty beat".
*Fix:* Keep it rewardless but cut to **one** Ghoul. The point is the portraits, not the fight.
*Where:* Area 4.

---

## 5. What this says about DELVE (draft 4)

The scenario's failures are mostly *content* failures, but three are structural and belong in
draft 5:

| # | Finding | Consequence for the design |
|---|---|---|
| 1 | **6 areas ran ~2h55 with the finale unresolved** — and that was with two of six areas running *short* because clues failed | Codex's **4–5 areas** default is right. 6 is optimistic. |
| 2 | **The clock never fired in four rolls** | A 1-in-6 trigger is too sparse at delve length. DELVE should escalate the die as the tab climbs, or the pressure engine is decorative. |
| 3 | **Banes do not accrue from play** | The temptation economy cannot be the *only* Bane source, or the Reckoning never lands. DELVE must generate Bane-banking beats deliberately, not hope Stumbles supply them. |
| 4 | **Every stat-block trap came from content I never cross-checked** | The curated overlay catalog (draft 4 §7) needs a *playability* field — "can a mundane fighter hurt this?" — not just theme/faction/role. |

Question 3 from the scenario's §10 — is `acceptanceCost: null` actually tempting? — **not
answered.** The party took the Gilded Mask without discussion and left the portrait covered for
tactical reasons, not moral ones. Needs pass 2.

---

## 6. Next

Apply fixes 1–6, bump to **v2**, then run **pass 2 contrarian**: take the Court Door, ally with
the gang, take the portrait in A5, and have nobody bow — the path v1 punishes hardest.

---

*Private VANITY development material — not for sale or distribution.*
