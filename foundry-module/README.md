# DELVE — Foundry module

Install by copying this directory to `Data/modules/vanity-delve/`, then copying the generator
into it:

    cp -R ../core foundry-module/module/core

`module/core/` is a verbatim copy of `core/`. It is not vendored in git because the standalone
generator is the source of truth — if the copy ever needs editing to run inside Foundry, the
portability claim in DESIGN.md §4 is false.

## Using it

The ⛏ button in the token controls opens the Forge. Set the parameters, press **Raise the
dungeon**, and it builds — in one folder per document type:

* one scene per area, walls and lighting placed, via the VANITY Forge
* encounter actors, foldered rather than scattered
* a JournalEntry: GM truth, one page per area, the ending — this is the adventure

Every document is stamped with a `dungeonId`, so the 🗑 button removes a whole dungeon and
nothing else.

Requires the VANITY system **0.10.4+** for quiet output; on older versions the Forge posts its
own cards over DELVE's and the module says so on startup.
