/**
 * Adapter tests. No Foundry, no shim — foes.mjs is pure on purpose.
 *
 * These exist because the same decision broke twice in two releases. 0.6.2 showed the forged
 * actors and silently dropped the planned roster when nothing had been forged; 0.6.3 fixed that
 * but the choice still lived in two hand-written ternaries, one per surface. Every case below is
 * a bug that shipped or nearly shipped.
 *
 * Run: node foundry-module/test.mjs
 */
import { foeStats, foeLine, classifyFoes } from './module/foes.mjs';

let pass = 0, fail = 0;
const t = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? ' ok ' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const actor = {
  name: 'Morthollow-born', uuid: 'Actor.abc',
  system: { attack1: { pool: 4 }, defence: { pool: 3 }, grit: { value: 5 }, nerve: 6, trick: 'freezes on a hit' },
};
const roster = {
  line: '1 Ghoul and 2 Skeletons',
  foes: [{ n: 1, name: 'Ghoul', atk: 4, def: 3, grit: 4, nerve: 5, note: 'freezes' }],
  harmedBy: 'blessed, silvered or magical weapons ONLY — say so before initiative',
  avoid: 'the Ghoul goes for court dress first',
};
const withEnc = (extra = {}) => ({ encounter: { heat: 'fight', roster, ...extra } });

// --- reading a forged actor -------------------------------------------------
const f = foeStats(actor);
t('foeStats reads the stats off the document', f.atk === 4 && f.def === 3 && f.grit === 5 && f.nerve === 6);
t('foeStats keeps the uuid so the GM can open it', f.uuid === 'Actor.abc');
const bare = foeStats({ name: 'X', uuid: 'Actor.z', system: {} });
t('a missing stat degrades rather than throwing', bare.atk === null && foeLine(bare).includes('?/?/?'));
t('foeLine links the actor', foeLine(f).includes('@UUID[Actor.abc]{Morthollow-born}'));
t('foeLine omits an empty trick', !foeLine(bare).includes('<i>'));

// --- the four cases ---------------------------------------------------------
t('no encounter → none', classifyFoes({}, []).kind === 'none');
t('no encounter → none, even with stray actors', classifyFoes({}, [f]).kind === 'none');

const forged = classifyFoes(withEnc(), [f]);
t('actors forged → forged', forged.kind === 'forged' && forged.foes.length === 1);
t('forged keeps the plan, so it can be named as not-these', forged.planned === roster);

const planned = classifyFoes(withEnc(), []);
t('nothing forged but a roster → planned', planned.kind === 'planned' && planned.roster === roster,
  'the 0.6.2 regression: population off left no numbers at all');

const nothing = classifyFoes({ encounter: { heat: 'fight' } }, []);
t('heat but neither actors nor roster → unavailable', nothing.kind === 'unavailable',
  'must not render silence for an area labelled with combat');
t('unavailable still reports the heat', nothing.heat === 'fight');

// --- the invariant the two surfaces kept breaking ---------------------------
t('the plan is never the encounter while actors exist', forged.kind !== 'planned',
  'roster guidance names monsters the Forge did not create');
t('a forged classification carries no roster field to render from',
  forged.roster === undefined, 'so a surface cannot accidentally run the plan');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
