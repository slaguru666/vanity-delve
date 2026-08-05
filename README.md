# DELVE

An authoring system and Foundry VTT module for the **VANITY** tabletop RPG. Press one button and
it generates a whole dungeon — fiction, areas, maps, encounters, hoards and a journal you can read
cold — then drops it into your world.

## Install (Foundry)

**Add-on Modules → Install Module → Manifest URL:**

```
https://github.com/slaguru666/vanity-delve/releases/latest/download/module.json
```

Requires the [VANITY](https://github.com/slaguru666/Vanity) system, **0.10.4 or later** — that is
the release the Forge seams landed in, and without them a delve emits nine stray chat cards and
three stray folders.

* **⛏** raise a dungeon
* **🗑** remove one you don't want — it deletes exactly what it made and nothing else
* **⏩** stage a delve you finished at the desk

## Also a CLI

`core/` is pure JavaScript with no Foundry dependencies, so a delve can be generated, rerolled and
finished outside the VTT:

```bash
node core/cli.mjs --new --seed=my-delve --file=my.json
node core/cli.mjs --file=my.json --worksheet    # everything, with prompts for what only you can write
node core/cli.mjs --file=my.json --reroll=3:situation
node core/cli.mjs --file=my.json --play         # the tight, table-facing sheet
```

## What it does and does not do

It generates the fiction, the order and the pressure. It does **not** write your read-aloud text
or your climax, and it says so — those are prompts, not output. It gets you to a strong first
draft in a minute instead of an evening, then gets out of the way.

[`DESIGN.md`](DESIGN.md) has the whole design history, including four rounds of adversarial review
and two paper playtests that failed before anything worked.

## Layout

| | |
|---|---|
| `core/` | the generator — pure JS, 41 tests |
| `foundry-module/` | the Foundry module, with `core/` vendored — 60 tests |
| `paper/` | a hand-written delve and both playtest logs |
| `spike/` | the harness that measured VANITY's Forge outside Foundry |
| `samples/` | generated output |

## Licence

MIT — see [LICENSE](LICENSE).
