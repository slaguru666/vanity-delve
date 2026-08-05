# PLAYTEST 02 — The Vault of the Gilded Court v2 (contrarian)

**Pass:** 2 of 2 (contrarian: Court Door · nobody bows · ally the gang · take the portrait)
**Scenario version:** v2, absorbing playtest-01 fixes 1–8
**Result: PASSES. Runnable. Four fixes to carry into v2.1, none blocking.**

---

## 1. Method

Same instrument as pass 1 — same four pregens with real compendium numbers, real bestiary blocks,
CSPRNG for every contested beat, damage model per `vanity.mjs:163`. Contrarian choices taken at
every fork, including the ones v1 punished hardest.

**Instrument gap, found mid-run:** my opposed-roll helper did not check for Stumbles, so combat
Banes went uncounted. I re-scanned the log by hand and found **two** (Pinch `[1,4,1,3,1]` in A2,
Bram `[2,4,1,1]` in A6). Corrected below. Pass 1's Bane count was likely understated for the same
reason — its headline finding still stands, but "one Bane" should read "one Bane plus any combat
Stumbles I failed to log".

---

## 2. Play log

### A1 — Court Door · ~10 min
Contrarian: the grand entrance. Clock rolled **immediately** per the attention trigger:
`1d6 [1]` → ***Something comes.***

**The attention rule works.** The party announced itself and the barrow answered within a minute
of play. That is exactly the intended cause-and-effect, and it fired on the very first roll.

Fix 4 held: the chisel-mark clue arrived automatically, so the motif seeded even though the party
was in a hurry. In pass 1 this clue died on a roll.

### A2 — Nobody bows · ~25 min
Three Skeletons (def 2 after fix 5). **Wren carried it** — `3d6[5,5,6]=3` net 2, then net 1,
killing two. Pinch stumbled: `5d6[1,4,1,3,1]` — 0 successes, three 1s → **+1 Bane**.

⚠ **Bram missed again**: net −1, net −1. Across both passes he has now landed **2 hits in 12
attack rounds**. Fix 5 lowered Ghoul and Skeleton defence and it was not enough — the problem is
his 4d6 pool, not the opposition.

### A3 — Ally the gang · ~20 min
Reaction `2d6 [2,1]` → **Hostile**, again. The contrarian plan to ally was simply not on offer.

**Fix 7 worked exactly as intended** — the gang fought one round and broke on Nerve 2. Twenty
minutes, not forty-five. This is the single clearest win of the pass.

⚠ **But Hostile is the modal result.** `2d6` needing 5–6 gives **~44% Hostile**, and it has now
come up in both passes. The scenario offers "ally, rob, or abandon" as though allying is a live
option; nearly half the time the dice remove it before the players speak.

Yrsa lingered at a mirror (contrarian) → noticed → **+1 Bane**. The mirror rule is now a working
Bane source, as fix 3 intended.

### A4 — One Ghoul · ~15 min
Round 1: both missed. Round 2: Pinch rolled `5d6[5,5,5,4,5]=4` → net 4 → **destroyed it outright**.

**Fixes 5 and 8 worked.** Pass 1's two-Ghoul, defence-3 version ran 35 minutes and left one
untouched. This ran 15 and resolved cleanly.

### A5 — Take the portrait · ~20 min
The door trap fired (gang was hostile, so unwarned): Bram `4d6[2,5,2,5]` → 2 successes, clear.
**The Cantor's silvered blade was found** — fix 1's insurance.

Portrait **taken**. The Queen woke here, on her ground.

⚠ *Sim inconsistency:* my run notes said "allied, so warned" while the reaction had been Hostile.
The roll was made and passed either way, so the outcome is unaffected — flagging it for honesty.

### A6 — The Queen, in the Wardrobe · ~40 min
Nobody had bowed and the tab was low, so **she offered a Vice** — fix 2's fallback. The contrarian
party **refused**, and the fight started. That is exactly the branch v1 killed people with.

| Round | Queen Grit | Yrsa |
|---|---|---|
| 1 | 6 → 4 | untouched |
| 2 | 4 → 2 | −1 Grit, −1 max |
| 3 | 2 → 1 | −3 Grit, −1 max |
| 4 | 1 | −1 Grit, −1 max |
| 5 | 1 → **0** | — |

**The Queen died in five rounds.** Bram contributed two hits with the silvered blade. Bram also
stumbled in round 5 (`[2,4,1,1]`) → **+1 Bane**.

**Fix 1 is confirmed.** Pass 1: unwinnable, ~40 rounds, dead mage, Queen at 9/10. Pass 2:
won in 5, with the mundane fighter participating.

⚠ **Yrsa still goes down.** She took 5 Grit against a maximum of 3, plus **3 permanent max Grit
drained**. Defence 2 against a 5d6 attack that ignores armour is not survivable, and every hit
also shrinks her permanently. Lowering the Queen's Grit made the fight winnable but did nothing
for the mage.

⚠ **Spells deal 0 base damage**, confirmed twice more: Yrsa scored net-1 hits in rounds 1 and 3
and dealt **nothing** both times. Her only real contribution was round 5's net 2. A mage in a
straight fight is close to a bystander.

**Total: ~2h10.**

---

## 3. Player-hat verdicts

| Archetype | Verdict | Pass 1 | Pass 2 |
|---|---|---|---|
| **Methodical veteran** (Bram) | "The silvered blade finally let me into the boss fight. I still can't hit anything else." | 1/5 | **3/5** |
| **Roleplay-first talker** (Pinch) | "One roll deleted the Ghoul. Less to talk to this time — my own fault for not bowing." | 5/5 | **4/5** |
| **Rules-literate tactician** (Wren) | "I killed two skeletons and mattered in the finale. This is a real character now." | 2/5 | **4/5** |
| **Lore-digger** (Yrsa) | "Both clues arrived free, which was lovely. Then I did no damage for four rounds and got drained to nothing." | 1/5 | **2/5** |

Average 2.25 → **3.25**. The scenario now works for three of four archetypes.

---

## 4. Fix list for v2.1

**1. Yrsa dies in every finale. — high**
*Problem:* Defence 2 vs a 5d6 armour-ignoring attack that also drains max Grit. Winnable fight,
dead mage.
*Fix:* The Queen **attacks whoever last looked at her** — a stated, thematic targeting rule the
table can play around, instead of defaulting to the squishiest. Add: *"she turns to whoever last
met her gaze."*
*Where:* Area 6 stat line.

**2. Hostile is the modal reaction, so "ally" is rarely offered. — high**
*Problem:* ~44% Hostile, and it landed in both passes. The three-way choice is often a one-way.
*Fix:* Give Pell Quill **+1 die on the reaction if the party arrived by the Servants' Stair**
(they didn't announce themselves) and let a hero **spend 1 Vanity** to re-roll it as a parley.
*Where:* Area 3 reaction block.

**3. Bram cannot hit anything. — high**
*Problem:* 2 hits in 12 attack rounds across both passes. Fix 5 was insufficient.
*Fix:* This is a **pregen problem, not a scenario problem** — Bram's 4d6 is simply low for a
fighter. Give the scenario's own §2b a note: *the warrior should open with Cleave or a Called
Shot rather than trading attacks*, and put a **shield-wall option** in A2 so he has a job that
isn't rolling to hit.
*Where:* §2b; Area 2.

**4. The tab reached 3, not 6. — medium**
*Problem:* Banes: Pinch stumble, Yrsa mirror, Bram stumble = 3. The Reckoning still did not fire —
though it is now plausibly reachable, where in pass 1 it was not.
*Fix:* Add **+1 Bane for entering by the Court Door** (announcing yourself is vanity) and **+1 for
refusing the Queen's Vice**. Both are pure character moments and would have put this party on 5.
*Where:* Areas 1 and 6; §9.

---

## 5. What this says about DELVE (draft 4/5)

| # | Finding | Consequence |
|---|---|---|
| 1 | **6 areas ran ~2h10 once the fixes landed** | Pass 1's "6 is too many" was wrong — it was *2h55 because the content was broken*, not because six is too many. **Withdraw the recommendation to drop to 4–5.** Codex's caution was reasonable but the evidence now says 6 is fine at this heat. |
| 2 | **The clock fired on the first roll, from a player choice** | Attention-triggered clocks work far better than turn-count clocks. DELVE should weight *triggers* over the 3-Turn timer. |
| 3 | **`acceptanceCost: null` is not a temptation — it is an automatic yes** | In both passes every free-acceptance item was taken without discussion. The decision only ever appeared at **use**. Draft 5 should stop describing acceptance as the temptation and put the whole economy at the point of use — or give a minority of relics real acceptance friction. **This answers scenario question 3, finally.** |
| 4 | **A "way back in" rescued the branch that killed pass 1** | The Vice offer meant a party that ignored the intended route still had an ending. DELVE's generated areas should always emit a fallback route, not just a gate. |
| 5 | **Two content traps came from stat blocks, again** | Confirms the overlay catalog needs a playability field. Add a second: *"is this fight survivable by the party's weakest member?"* — both passes lost the mage. |

---

## 6. Status

**The Vault of the Gilded Court v2 is runnable.** Apply the four v2.1 fixes before a live table;
none of them block a run today.

Build-order step 1 is **complete**: one handwritten delve, run twice, findings folded back. The
scenario went from unwinnable to won-in-five, and produced five structural findings for the design
that no amount of further architecture work would have surfaced.

Next: **step 2, the seam spike.**

---

*VANITY development notes — part of [DELVE](https://github.com/slaguru666/vanity-delve).*
