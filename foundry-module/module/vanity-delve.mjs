/**
 * DELVE — the Foundry adapter. Stages a delve the GM has already finished at the desk.
 *
 * The core/ directory is copied verbatim from the standalone project; nothing in it knows what
 * Foundry is. This file is the only part that does.
 *
 * DELVE is an authoring system: the GM writes the read-aloud and the climax in the worksheet,
 * then brings the finished JSON here to be staged. So this module does not generate at the table.
 * It raises the scenes, populates them, and puts the right text in front of the right people —
 * two audiences, always:
 *
 *   PLAYERS get the read-aloud. That is what it is for.
 *   THE GM gets the truth, the numbers and the leverage point, whispered.
 *
 * A draft can still be generated in-world, but it announces itself as unfinished.
 */
import { coinSeed, Rng } from './core/rng.mjs';
import { newWorkingFile, outstanding, readyToPlay } from './core/authoring.mjs';
import { DelveForgeApp, raiseDungeon, listDungeons, removeDungeon, removeDungeonDialog, setThemes } from './forge-app.mjs';
import { stageArea, singleFlight } from './stage.mjs';

const MOD = 'vanity-delve';
const FLAG = 'state';

let PACK = null;
let seamsPresent = false;
let loadPack = async () => null;

/** The geometries VANITY's Forge can actually build — mirrors validate-pack.mjs. */
const GEOMETRIES = ['barrow', 'cave', 'fen', 'village', 'forest'];

const getState = () => game.settings.get(MOD, FLAG) ?? null;
const setState = async s => game.settings.set(MOD, FLAG, s);

/**
 * The pack a delve was actually authored against.
 *
 * PACK is only a boot-time default. A delve brought in from the desk may be any of the sixteen
 * themes, and staging one with the wrong pack gives a harbour delve a barrow map — the fiction
 * says quayside and the geometry says burial chamber. Resolved per call rather than once at load,
 * because the global resets on a page reload while the staged delve in world state does not.
 *
 * `params.theme` is written from `pack.id` at generation time, so every delve the generator made
 * carries it. `load()` also accepts hand-edited JSON, and there the field may be absent — which is
 * why this fails closed rather than falling back to barrow. Guessing the geometry is the bug.
 */
async function packById(id) {
  if (!id) return null;
  const usable = p => GEOMETRIES.includes(p?.forgeStageType);
  if (PACK?.id === id && usable(PACK)) return PACK;           // validate the cache too
  const p = await loadPack(id);
  if (!usable(p)) return null;
  PACK = p;
  return p;
}

/** The pack a staged delve was authored against. Never guesses. */
async function packFor(d) {
  const id = d?.params?.theme;
  if (!id) {
    ui.notifications.error('DELVE: that delve does not record a theme — refusing to stage, the geometry would be a guess.');
    return null;
  }
  const p = await packById(id);
  if (!p) ui.notifications.error(`DELVE: could not load the ${id} theme — refusing to stage, it would use the wrong geometry.`);
  return p;
}
/** GM-only: truth, numbers, leverage. Never read aloud. */
const gmCard = (label, sub, body) => ChatMessage.create({
  speaker: { alias: 'DELVE' },
  whisper: ChatMessage.getWhisperRecipients('GM'),
  content: `<div class="vanity-roll delve-card">
    <header><span class="delve-label">${label}</span><span class="delve-sub">${sub}</span></header>${body}</div>`,
});

/** Everyone: the GM's own prose. This is what the players are here for. */
const readAloudCard = (title, prose) => ChatMessage.create({
  speaker: { alias: title },
  content: `<div class="vanity-roll delve-card delve-read"><p>${prose}</p></div>`,
});

/** Bring in a finished working file. This is the intended entry point. */
async function load(working) {
  if (!game.user.isGM) return ui.notifications.warn('DELVE is a GM tool.');
  const d = typeof working === 'string' ? JSON.parse(working) : working;
  if (!d?.skeleton || !Array.isArray(d.areas)) return ui.notifications.error('DELVE: that is not a delve file.');

  const todo = outstanding(d);
  if (!await packFor(d)) return;                 // before anything is created in the world
  const folder = await Folder.create({ name: `Delve — ${d.authored?.title ?? d.skeleton.placeName}`, type: 'Actor' });
  await setState({ delve: d, folderId: folder.id, at: 0, turn: 0, tab: [], clock: [] });

  const sk = d.skeleton, ap = sk.appeasement;
  await gmCard('⛏ Delve loaded', `${d.authored?.title ?? sk.placeName} · ${d.areas.length} areas · seed ${d.seed}`,
    `${todo.length ? `<p><b>⚠ ${todo.length} unfinished:</b> ${todo.map(t => t.where).join(', ')}. Fragments will show where nothing was written.</p>` : '<p><b>Finished.</b> Ready to stage.</p>'}
     <p class="delve-truth"><b>Truth.</b> ${sk.knot.transgression} ${sk.bottomProblem.label} ${sk.bottomProblem.failureState}.</p>
     <p><b>Prize:</b> ${sk.prize.label}. <b>It asks:</b> ${d.ending.question}</p>
     <p><b>Appease:</b> ${ap.move} [${ap.attribute} ${ap.successes}] — +${ap.gain.vanity} Vanity now, +${ap.cost.bane} Bane later. Repeatable.</p>`);
  ui.notifications.info(`DELVE: ${d.authored?.title ?? sk.placeName} loaded${todo.length ? ` (${todo.length} unfinished)` : ''}.`);
  return d;
}

/** Load from the world's delves/ folder — where the CLI writes finished files. */
async function loadFile(name) {
  const path = `worlds/${game.world.id}/delves/${String(name).replace(/\.json$/, '')}.json`;
  const json = await foundry.utils.fetchJsonWithTimeout(path).catch(() => null);
  if (!json) return ui.notifications.error(`DELVE: could not read ${path}`);
  return load(json);
}

/** Generate an unfinished draft in-world. Convenience only — the desk is the right place. */
async function draft(params = {}) {
  const seed = params.seed || coinSeed(new Rng(String(game.world.id)));
  const theme = params.theme ?? 'barrow';         // drafting picks a theme; staging must be told one
  const pack = await packById(theme);
  if (!pack) return ui.notifications.error(`DELVE: could not load the ${theme} theme.`);
  const d = newWorkingFile({ ...params, seed, pack });   // pack last — see raiseDungeon
  ui.notifications.warn('DELVE: unfinished draft. Write the read-aloud in the worksheet first.');
  return load(d);
}

const enter = singleFlight(
  () => enterOnce(),
  () => ui.notifications.warn('DELVE: already raising an area — wait for it to finish.'),
);

async function enterOnce() {
  const st = getState();
  if (!st) return ui.notifications.warn('DELVE: nothing loaded.');
  const d = st.delve;
  if (st.at >= d.areas.length) return ending();

  const area = d.areas[st.at];
  const w = d.authored?.areas?.[area.index] ?? {};
  const name = w.nameOverride ?? area.name;
  const pack = await packFor(d);
  if (!pack) return;
  ui.notifications.info(`DELVE: raising ${name}…`);

  // The decisions live in stage.mjs so their failure paths can be tested; this is only the wiring.
  const quiet = seamsPresent ? { post: false, folderId: st.folderId } : {};
  const fx = {
    stage: n => game.vanity.forge.stage({
      type: pack.forgeStageType, size: 'medium', name: n, populate: false, activate: true, ...quiet,
    }),
    encounter: heat => game.vanity.forge.encounter({
      heat, forStage: name,
      ...(seamsPresent ? { hoard: false, post: false, folderId: st.folderId } : {}),
    }),
    hoard: size => game.vanity.forge.hoard({ size, ...(seamsPresent ? { post: false } : {}) }),
    // An incremented copy, never a mutation of st: a failed write must leave the in-memory state
    // exactly as it was, or the retry advice in the warning is wrong.
    commit: () => setState({ ...st, at: st.at + 1, turn: st.turn + 1 }),
    readAloud: readAloudCard,
    gm: gmCard,
    warn: m => ui.notifications.warn(m),
    error: m => ui.notifications.error(m),
    log: e => console.error('DELVE | staging', e),
  };
  return stageArea(fx, { area, name, authored: w });
}

async function ending() {
  const st = getState();
  const d = st.delve, sk = d.skeleton, we = d.authored?.ending ?? {};
  await readAloudCard(d.ending.name, we.readAloud ?? `<i>(unwritten)</i> ${d.ending.cueFragments.join('. ')}.`);
  await gmCard('⛏ The ending', d.ending.authored ? 'the authored slot' : 'generated',
    `<p><b>It asks:</b> ${d.ending.question}</p>
     ${we.notes ? `<p>${we.notes}</p>` : '<p><b>⚠ The climax is unwritten.</b> DELVE leaves this to you on purpose — improvise, or stop and write it.</p>'}
     <p><b>Appeased even once</b> → it listens, and will trade ${sk.prize.label}.</p>`);
  return true;
}

async function bane(who = 'the party', why = 'a beat') {
  const st = getState(); if (!st) return;
  st.tab.push({ who, why }); await setState(st);
  await gmCard('⛏ The tab grows', `${who} — ${why}`,
    `<p>The tab reads <b>${st.tab.length}</b>.${st.tab.length >= 6 ? ' <b>THE RECKONING.</b>' : ''}</p>`);
}

/** The clock is a live table roll. The core decides when; it never rolls. */
async function clock(cause = 'timer') {
  const st = getState(); if (!st) return;
  const roll = await new Roll('1d6').evaluate();
  const fired = roll.total <= 1;
  st.clock.push({ cause, die: roll.total, fired }); await setState(st);
  await roll.toMessage({ speaker: { alias: 'DELVE' }, flavor: `Wandering the Dark — ${cause}` });
  if (fired) await gmCard('⛏ Something comes', `${cause} · rolled ${roll.total}`, '<p>Roll <b>Reaction (2d6)</b> for its mood.</p>');
  return fired;
}

Hooks.once('init', () => {
  game.settings.register(MOD, FLAG, { scope: 'world', config: false, type: Object, default: null });
  game.settings.register(MOD, 'lastParams', { scope: 'world', config: false, type: Object, default: null });
});

Hooks.once('ready', async () => {
  if (!game.user.isGM) return;
  const fetchJson = p => foundry.utils.fetchJsonWithTimeout(p).catch(() => fetch(p).then(r => r.json()).catch(() => null));
  const base = `modules/${MOD}/module/core/content`;
  const index = await fetchJson(`${base}/index.json`);
  if (index?.themes?.length) setThemes(index.themes);
  const packs = {};
  loadPack = async id => (packs[id] ??= await fetchJson(`${base}/${id}.json`));
  await packById('barrow');            // sets PACK, and validates it like any other
  seamsPresent = /post\s*=\s*true/.test(String(game.vanity?.forge?.hoard ?? ''));

  game.delve = { forge: () => new DelveForgeApp().render(true), raise: raiseDungeon,
                 list: listDungeons, remove: removeDungeon, removeDialog: removeDungeonDialog,
                 load, loadFile, draft, enter, ending, bane, clock, state: getState,
                 outstanding: () => outstanding(getState()?.delve ?? { areas: [] }),
                 ready: () => readyToPlay(getState()?.delve ?? { areas: [] }),
                 // the validating resolver, not the raw fetcher — raiseDungeon stages from this,
                 // so a pack with no forgeStageType must never reach forge.stage({type: undefined})
                 loadPack: id => packById(id),
                 get pack() { return PACK; } };
  console.log(`DELVE | ready. Forge seams ${seamsPresent ? 'present' : 'ABSENT'}.`);
  if (!seamsPresent) ui.notifications.warn('DELVE: Forge seams not installed — see the delve-seams branch.');
});

Hooks.on('getSceneControlButtons', controls => {
  if (!game.user.isGM) return;
  // Foundry v13+ passes controls as a record keyed by name — the token group is `tokens`, plural —
  // and each group's `tools` is a record too, not an array. Written for the old array shape, this
  // hook silently added nothing and the button never appeared.
  const group = controls.tokens ?? controls.token;
  if (!group?.tools) return;

  const tool = (name, title, icon, order, onClick) => {
    const entry = { name, title, icon, order, button: true,
                    onChange: (event, active) => { if (active !== false) onClick(); },
                    onClick };
    if (Array.isArray(group.tools)) group.tools.push(entry);
    else group.tools[name] = entry;
  };

  tool('delve-forge', 'DELVE — raise a dungeon', 'fas fa-mountain', 90,
       () => new DelveForgeApp().render(true));
  tool('delve-remove', 'DELVE — remove a generated dungeon', 'fas fa-trash-can', 91,
       () => removeDungeonDialog());
  tool('delve-next', 'DELVE — stage the next area of a pre-authored delve', 'fas fa-forward', 92,
       () => (getState() ? enter() : ui.notifications.info('DELVE: no staged delve — use ⛏ to raise one.')));
});
