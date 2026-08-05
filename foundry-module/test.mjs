/**
 * Adapter tests. No Foundry, no shim — foes.mjs and stage.mjs are pure on purpose.
 *
 * These exist because the same area of code broke in three consecutive releases, every time on a
 * path that only runs when something misbehaves, and every time I convinced myself by reading it.
 * Each case below is a bug that shipped or nearly shipped.
 *
 * Run: node foundry-module/test.mjs
 */
import { foeStats, foeLine, classifyFoes } from './module/foes.mjs';
import { stageArea, areaCards, foeBlock } from './module/stage.mjs';

let pass = 0, fail = 0;
const t = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? ' ok ' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const actor = {
  name: 'Morthollow-born', uuid: 'Actor.abc',
  system: { attack1: { pool: 4 }, defence: { pool: 3 }, grit: { value: 5 }, nerve: 6, trick: 'freezes on a hit' },
};
const roster = {
  line: '1 Ghoul and 2 Skeletons',
  foes: [{ n: 1, name: 'Ghoul', atk: 4, def: 3, grit: 4, nerve: 5, note: 'freezes' }],
  harmedBy: 'blessed, silvered or magical weapons ONLY',
  beforeInitiative: 'Say so before initiative.',
  avoid: 'send someone plain',
};
const area = (extra = {}) => ({
  index: 2, role: 'complication', facet: 'ritual', name: 'The Sail Loft',
  cueFragments: ['a tide glass turned by the watch'],
  decision: { cue: 'a bell rope still swinging', resolve: { roll: 'Poise 2', success: 'it comes to order', failure: 'the harbour turns early', orElse: 'leave it' } },
  trigger: 'seenTwice', fallback: { route: 'the dead will receive a guest' },
  ...extra,
});
const withEnc = (r = roster) => area({ encounter: { heat: 'fight', roster: r } });

// ---------------------------------------------------------------- reading actors
const f = foeStats(actor);
t('foeStats reads stats off the document', f.atk === 4 && f.def === 3 && f.grit === 5 && f.nerve === 6);
t('foeStats keeps the uuid so the GM can open it', f.uuid === 'Actor.abc');
const bare = foeStats({ name: 'X', uuid: 'Actor.z', system: {} });
t('a missing stat degrades rather than throwing', bare.atk === null && foeLine(bare).includes('?/?/?'));
t('foeLine links the actor', foeLine(f).includes('@UUID[Actor.abc]{Morthollow-born}'));

// ---------------------------------------------------------------- the four kinds
t('no encounter → none', classifyFoes(area(), []).kind === 'none');
t('actors forged → forged', classifyFoes(withEnc(), [f]).kind === 'forged');
t('nothing forged but a roster → planned', classifyFoes(withEnc(), []).kind === 'planned',
  'the 0.6.2 regression: population off left no numbers at all');
t('heat but neither → unavailable', classifyFoes(area({ encounter: { heat: 'fight' } }), []).kind === 'unavailable');
t('a forged classification exposes no roster to render from', classifyFoes(withEnc(), [f]).roster === undefined);

// ---------------------------------------------------------------- what reaches the card
const forgedBlock = foeBlock(classifyFoes(withEnc(), [f]));
t('forged block runs off the actors', forgedBlock.includes('Morthollow-born') && forgedBlock.includes('in the world'));
t('forged block never asserts the plan\'s tactics', !forgedBlock.includes('blessed, silvered'),
  'roster guidance names monsters the Forge did not create');
t('forged block still names the plan', forgedBlock.includes('1 Ghoul and 2 Skeletons'));

const plannedBlock = foeBlock(classifyFoes(withEnc(), []));
t('planned block is runnable', plannedBlock.includes('Ghoul') && plannedBlock.includes('4/3/4'));
t('planned block carries the immunity', plannedBlock.includes('blessed, silvered'));
t('planned block warns before initiative', plannedBlock.includes('Say so before initiative.'),
  'the 0.6.4 regression: deleting the ONLY gate stripped this from 12 rosters');
t('the warning is said exactly once',
  (plannedBlock.match(/say so before initiative/gi) ?? []).length === 1);
t('unavailable says so rather than rendering nothing',
  foeBlock(classifyFoes(area({ encounter: { heat: 'fight' } }), [])).includes('nothing to run'));

const cards = areaCards({ area: withEnc(), name: 'The Sail Loft', authored: {}, classification: classifyFoes(withEnc(), [f]) });
t('an unwritten read-aloud is marked as such', cards.readAloud.includes('(unwritten)'));
t('written prose outranks the fragments',
  areaCards({ area: withEnc(), name: 'x', authored: { readAloud: 'They have been waiting.' }, classification: classifyFoes(withEnc(), [f]) })
    .readAloud === 'They have been waiting.');
t('the GM card carries the decision and its miss', cards.gm.body.includes('Poise 2') && cards.gm.body.includes('Miss:'));

// ---------------------------------------------------------------- the failure matrix
const spy = (over = {}) => {
  const log = { calls: [], warns: [], errors: [], committed: 0, cards: 0 };
  const fx = {
    stage: n => { log.calls.push('stage'); return { id: 'scn1', name: n }; },
    encounter: () => { log.calls.push('encounter'); return { actors: [actor] }; },
    hoard: () => { log.calls.push('hoard'); return { size: 'cache' }; },
    commit: async () => { log.committed++; },
    readAloud: () => { log.cards++; },
    gm: () => { log.cards++; },
    warn: m => log.warns.push(m),
    error: m => log.errors.push(m),
    ...over,
  };
  return { fx, log };
};
const boom = () => { throw new Error('forge exploded'); };
const ctx = (a = withEnc()) => ({ area: { ...a, hoard: 'cache' }, name: 'The Sail Loft', authored: {} });

{
  const { fx, log } = spy();
  const r = await stageArea(fx, ctx());
  t('happy path enters, commits once and posts both cards',
    r.entered && log.committed === 1 && log.cards === 2 && !log.warns.length && !log.errors.length);
  t('happy path reports the kind it rendered', r.kind === 'forged');
}
{
  const { fx, log } = spy({ stage: boom });
  const r = await stageArea(fx, ctx());
  t('a failed scene enters nothing', !r.entered && r.failed === 'stage');
  t('a failed scene does not commit — a retry is safe', log.committed === 0,
    'the v0.6.3 bug: scene left behind, index unchanged, retry duplicated it');
  t('a failed scene posts no cards and says why', log.cards === 0 && log.errors.length === 1);
  t('a failed scene never calls the Forge again', !log.calls.includes('encounter'));
}
{
  const { fx, log } = spy({ encounter: boom });
  const r = await stageArea(fx, ctx());
  t('a failed population still enters — the scene is up', r.entered && log.committed === 1);
  t('a failed population falls back to the plan', r.kind === 'planned');
  t('a failed population says the roster stands in', log.warns.some(w => /planned roster stands in/.test(w)));
  t('a failed population still posts both cards', log.cards === 2);
}
{
  const { fx, log } = spy({ encounter: boom });
  const r = await stageArea(fx, ctx(area({ encounter: { heat: 'fight' } })));
  t('a failed population with no roster does not claim one', !log.warns.some(w => /roster stands in/.test(w)),
    'the 0.6.4 regression: it promised a roster that did not exist');
  t('a failed population with no roster says what is actually lost',
    log.warns.some(w => /no roster at fight/.test(w)) && r.kind === 'unavailable');
}
{
  const { fx, log } = spy({ hoard: boom });
  const r = await stageArea(fx, ctx());
  t('a failed hoard still enters', r.entered && log.committed === 1);
  t('a failed hoard is visible to the GM', log.warns.some(w => /hoard/.test(w)),
    'the 0.6.4 regression: swallowed to console while the turn advanced');
}
{
  const { fx, log } = spy({ gm: boom });
  const r = await stageArea(fx, ctx());
  t('a failed GM card does not roll back the turn', r.entered && log.committed === 1);
  t('a failed GM card tells the GM to read from the worksheet',
    log.warns.some(w => /GM card did not post/.test(w)));
}
{
  const { fx, log } = spy({ readAloud: boom, gm: boom });
  await stageArea(fx, ctx());
  t('both cards failing reports once, not twice', log.warns.filter(w => /did not post/.test(w)).length === 1);
}
{
  // async rejections, not just throws — the Forge returns promises
  const { fx, log } = spy({ encounter: () => Promise.reject(new Error('async')) });
  const r = await stageArea(fx, ctx());
  t('a rejected promise is handled like a throw', r.entered && r.kind === 'planned' && log.warns.length === 1);
}
{
  const { fx, log } = spy({ stage: () => null });
  const r = await stageArea(fx, ctx());
  t('a Forge that returns nothing counts as a failed scene', !r.entered && log.committed === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
