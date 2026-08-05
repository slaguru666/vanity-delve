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

const MOD = 'vanity-delve';
const FLAG = 'state';

let PACK = null;
let seamsPresent = false;

const getState = () => game.settings.get(MOD, FLAG) ?? null;
const setState = async s => game.settings.set(MOD, FLAG, s);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const list = items => `<ul>${items.filter(Boolean).map(i => `<li>${i}</li>`).join('')}</ul>`;

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
  const d = newWorkingFile({ pack: PACK, ...params, seed });
  ui.notifications.warn('DELVE: unfinished draft. Write the read-aloud in the worksheet first.');
  return load(d);
}

async function enter() {
  const st = getState();
  if (!st) return ui.notifications.warn('DELVE: nothing loaded.');
  const d = st.delve;
  if (st.at >= d.areas.length) return ending();

  const area = d.areas[st.at];
  const w = d.authored?.areas?.[area.index] ?? {};
  const name = w.nameOverride ?? area.name;
  ui.notifications.info(`DELVE: raising ${name}…`);

  const quiet = seamsPresent ? { post: false, folderId: st.folderId } : {};
  const stage = await game.vanity.forge.stage({
    type: PACK.forgeStageType, size: 'medium', name, populate: false, activate: true, ...quiet,
  });
  if (area.encounter) await game.vanity.forge.encounter({
    heat: area.encounter.heat, forStage: name,
    ...(seamsPresent ? { hoard: false, post: false, folderId: st.folderId } : {}),
  });
  if (area.hoard) await game.vanity.forge.hoard({ size: area.hoard, ...(seamsPresent ? { post: false } : {}) });

  // Players first — the scene is up and this is what they came for.
  await readAloudCard(name, w.readAloud ?? `<i>(unwritten)</i> ${area.cueFragments.join('. ')}.`);

  // Then the GM, quietly.
  const R = area.encounter?.roster;
  const rv = area.decision?.resolve ?? {};
  await gmCard(`⛏ ${area.index} · ${name}`, `${area.role} · ${area.facet}`,
    `${area.situation ? `<p><b>Here:</b> ${cap(area.situation.occupant)}, ${area.situation.doing} — ${area.situation.onArrival}.<br>
        <b>They can:</b> ${area.situation.offer}. <i>${cap(area.situation.because)}.</i></p>` : ''}
     <p><b>${cap(area.decision.cue)}</b>${rv.roll ? ` — [${rv.roll}] ${rv.success}` : ''}${rv.failure ? `<br><b>Miss:</b> ${rv.failure}` : ''}${rv.orElse ? `<br><b>Or:</b> ${rv.orElse}` : ''}</p>
     ${R ? `<p><b>${cap(area.encounter.heat)}:</b> ${R.line}</p>${list(R.foes.map(f => `${f.n}× <b>${f.name}</b> — ${f.atk}/${f.def}/${f.grit}, Nerve ${f.nerve}. <i>${f.note}</i>`))}
            <p><b>Harmed by ${R.harmedBy}.</b> ${R.avoid}.</p>` : ''}
     ${area.temptation ? `<p><b>${cap(area.temptation.id)}:</b> ${area.temptation.benefit}. <i>Use: ${area.temptation.useCost?.bane ? `+${area.temptation.useCost.bane} Bane` : '—'}. ${area.temptation.standingDrawback}.</i></p>` : ''}
     ${w.notes ? `<p><b>Your note:</b> ${w.notes}</p>` : ''}
     <p><code>${area.trigger}${area.baneBeat ? ` · ${area.baneBeat}` : ''} · fallback: ${area.fallback.route}</code></p>`);

  st.at += 1; st.turn += 1;
  await setState(st);
  return { stage, area };
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
});

Hooks.once('ready', async () => {
  if (!game.user.isGM) return;
  PACK = await foundry.utils.fetchJsonWithTimeout(`modules/${MOD}/module/core/content/barrow.json`)
    .catch(() => fetch(`modules/${MOD}/module/core/content/barrow.json`).then(r => r.json()));
  seamsPresent = /post\s*=\s*true/.test(String(game.vanity?.forge?.hoard ?? ''));

  game.delve = { load, loadFile, draft, enter, ending, bane, clock, state: getState,
                 outstanding: () => outstanding(getState()?.delve ?? { areas: [] }),
                 ready: () => readyToPlay(getState()?.delve ?? { areas: [] }),
                 get pack() { return PACK; } };
  console.log(`DELVE | ready. Forge seams ${seamsPresent ? 'present' : 'ABSENT'}.`);
  if (!seamsPresent) ui.notifications.warn('DELVE: Forge seams not installed — see the delve-seams branch.');
});

Hooks.on('getSceneControlButtons', controls => {
  if (!game.user.isGM) return;
  const group = Array.isArray(controls) ? controls.find(c => c.name === 'token') : controls.token;
  if (!group) return;
  const tools = Array.isArray(group.tools) ? group.tools : Object.values(group.tools ?? {});
  const warn = () => ui.notifications.warn('DELVE: load a finished delve first — game.delve.loadFile("name")');
  tools.push({
    name: 'delve', title: 'DELVE — stage the next area', icon: 'fas fa-mountain', button: true,
    onClick: () => (getState() ? enter() : warn()),
    onChange: () => (getState() ? enter() : warn()),
  });
});
