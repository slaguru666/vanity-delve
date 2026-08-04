# SEAM SPIKE — measured results

**Build-order step 2. 2026-08-04.**
**Method:** VANITY's Forge run *outside Foundry* against an instrumented stub harness
(`harness.mjs`), driven by `spike.mjs`. Every Foundry global is faked; the side-effecting calls
(`ChatMessage.create`, `Folder.create`, `Actor.create`, `Scene.create`, `FilePicker.upload`) are
recorders, and `Math.random` is counted. **Nothing real was created** — no world was touched.

Booted successfully: `game.vanity.forge = { hero, monster, face, hoard, encounter, stage, adventure }`.

---

## 1. Measurements

| Call | returns | chat | folders | actors | scenes | uploads | `Math.random` |
|---|---|---|---|---|---|---|---|
| `forgeHoard({size:'cache'})` | **undefined** ⚠ | 1 | 0 | 0 | 0 | 0 | 9 |
| `forgeEncounter({heat:'fight'})` | object ✅ | **2** | 1 | 5 | 0 | 0 | 58 |
| `forgeStage({populate:false})` | Scene ✅ | 1 | 0 | 0 | 1 | 1 | 360 |
| `forgeStage({populate:true,heat:'fight'})` | Scene ✅ | **3** | 1 | 3 | 1 | 1 | 552 |
| **3 linked areas** | — | **9** | **3** | **16** | 3 | 3 | **1472** |

**Per area: 3 chat cards · 1 folder · 5.3 actors · 1 scene · 1 upload · ~490 `Math.random` calls.**

---

## 2. Seam list, corrected against measurement

| # | Seam | Verdict |
|---|---|---|
| 1 | `hoard: false` | **Confirmed needed.** `forgeEncounter` posts 2 chat cards — its own and a forced hoard. |
| 2 | `populate: false` | **ALREADY EXISTS — remove from the list.** `forgeStage({populate:false})` runs clean: 0 actors, 0 folders, scene created. It is already the escape hatch. |
| 3 | `post: false` | **Confirmed, and it is the big one.** 3 cards per area, 9 for a three-area delve, none suppressible. |
| 4 | Structured returns | **Confirmed, but narrower than drafted.** `forgeHoard` returns `undefined`. `forgeEncounter` *already* returns `{actors, situation, terrain, complication, mood, folder}` — only the hoard needs work. |
| 5 | Caller-supplied folder | **Confirmed.** 1 folder + 5.3 actors per area → 3 folders and 16 loose Actors for three areas. |
| 6 | Live Reaction as a `Roll` | **Confirmed.** No `Roll` was ever constructed during `forgeEncounter`; mood comes from `rollDice()` over `Math.random`. |
| 7 | Injectable RNG | **Confirmed large.** ~490 calls per area, 1472 for three. Draft 4 called this "small"; it is not. |

**Net: draft 5's seven seams become six.** Seam 2 was already solved and I did not check before writing it down.

---

## 3. Two findings the spike produced that no review did

**A. `forgeStage` cannot run outside a browser.** It needs `Image`, `document.createElement('canvas')`,
`canvas.toBlob`, `XMLSerializer` and `URL.createObjectURL` to rasterise its SVG. Draft 5 says "the
CLI is map-free" as a design choice — it is not a choice, it is a **hard constraint**. Any
non-Foundry surface for DELVE can never produce maps without reimplementing rasterisation.

**B. An unguarded `rnd()` on a possibly-empty array — `vanity.mjs:1969`.**
```js
const consumables = gear.filter(g => g.system.consumable);
if (Math.random() < tier.consum) found.push(rnd(consumables));   // rnd([]) → undefined
...found.map(d => `@UUID[${d.uuid}]...`)                          // throws
```
`rnd()` returns `undefined` on an empty array and `.uuid` is unread-guarded. My harness triggered
this with unfiltered fake gear. **In the shipped system the gear pack has consumables, so it
almost certainly never fires** — but it is a one-line guard worth taking while the seams are open.

---

## 4. What the spike cannot tell you

**Latency.** The harness stubs rasterisation and upload, so everything ran in 1–2 ms. The real
`forgeStage` encodes a PNG and uploads it before the scene is usable. **The prewarm requirement in
draft 5 §10 remains unmeasured** and must be timed inside real Foundry before it is designed
around.

**Table feel.** Nothing here says whether the output is *good* — only how much of it there is.

---

## 5. The economic question

Codex's draft-5 verdict set the right gate: *the next test is economic, not conceptual — does
DELVE as a module beat DELVE as a well-made document?* The spike gives the first hard number
towards it.

**Unmodified, the Forge produces per three-area delve: 9 chat cards, 3 Actor folders, 16 loose
Actors — none of which the caller can suppress, redirect or own.**

- A **document** cannot fix this. It has no way to intervene between the Forge and the table.
- A **module without seams 1, 3, 4, 5** cannot fix it either. It would be a wrapper watching the
  Forge talk over it.
- A **module with them** can: one folder per delve, output DELVE decides, hoards on its own terms.

So the module's economic case rests entirely on landing four small seams. That is a genuinely
cheap, genuinely testable bet — and if the seams are refused, the honest answer is to ship the
document.

---

## 6. Recommendation

1. **Update draft 5 §5**: seven seams → six; seam 2 already exists; seam 4 narrows to `forgeHoard`.
2. **Add the browser-only constraint** to §13 as a stated non-goal, not a design preference.
3. **Land seams 1, 3, 4, 5** — all small, all in `vanity.mjs`, and together they *are* the module's
   reason to exist. Defer 6 and 7.
4. **Time `forgeStage` in real Foundry** before designing prewarm.
5. Take the `rnd()` guard while in there.

Step 2 is complete. The thesis survived: DELVE is a sequencing layer, and the Forge can be
sequenced — but only if it stops talking to the table on its own.

---

*Private VANITY development material — not for sale or distribution.*
