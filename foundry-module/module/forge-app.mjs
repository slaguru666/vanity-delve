/**
 * The DELVE Forge — one button, a form, and a complete dungeon injected into the world.
 *
 * Everything the generator knows becomes real Foundry content in one pass:
 *   • a folder per dungeon, holding its scenes, actors and journal
 *   • one scene per area, walls and lighting placed, raised via the VANITY Forge
 *   • encounter actors, in that folder rather than scattered
 *   • a JournalEntry — GM truth, one page per area, the ending — which IS the adventure
 *
 * The journal is the deliverable. Scenes without it are a pile of maps; the journal is what a
 * GM actually reads, and it is written so it can be read cold.
 */
import { generateDelve } from './core/delve.mjs';
import { coinSeed, Rng } from './core/rng.mjs';
import { foeStats, classifyFoes } from './foes.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const esc = s => foundry.utils.escapeHTML?.(String(s ?? '')) ?? String(s ?? '');

const MOD = 'vanity-delve';
let THEMES = [{ id: 'barrow', label: 'Barrow' }];

export function setThemes(list) { THEMES = list; }
const PICKS = {
  depth: [1, 2, 3, 4, 5],
  party: [1, 2, 3, 4, 5, 6, 7, 8],
  deadliness: ['forgiving', 'standard', 'cruel'],
  density: ['sparse', 'standard', 'infested'],
  greed: ['lean', 'standard', 'glutted'],
  clock: ['slow', 'standard', 'hunted'],
  ending: ['authored', 'generated'],
};

export class DelveForgeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'delve-forge',
    tag: 'form',
    window: { title: 'DELVE — raise a dungeon', icon: 'fas fa-mountain', resizable: true },
    position: { width: 520, height: 'auto' },
    form: { handler: DelveForgeApp.#submit, closeOnSubmit: true },
  };

  static PARTS = { body: { template: 'modules/vanity-delve/templates/forge.hbs' } };

  async _prepareContext() {
    const last = game.settings.get('vanity-delve', 'lastParams') ?? {};
    return {
      themes: THEMES,
      picks: PICKS,
      v: {
        theme: last.theme ?? 'barrow', areas: last.areas ?? 6, depth: last.depth ?? 2,
        party: last.party ?? 4, deadliness: last.deadliness ?? 'standard',
        density: last.density ?? 'standard', greed: last.greed ?? 'standard',
        clock: last.clock ?? 'standard', ending: last.ending ?? 'authored',
        seed: '', maps: last.maps ?? true, populate: last.populate ?? true,
      },
    };
  }

  static async #submit(event, form, formData) {
    const o = formData.object;
    const params = {
      theme: o.theme, areas: Number(o.areas), depth: Number(o.depth), party: Number(o.party),
      deadliness: o.deadliness, density: o.density, greed: o.greed, clock: o.clock,
      ending: o.ending, maps: !!o.maps, populate: !!o.populate,
      seed: (o.seed ?? '').trim() || undefined,
    };
    await game.settings.set('vanity-delve', 'lastParams', params);
    return raiseDungeon(params);
  }
}

/* ------------------------------------------------------------------ build */

/**
 * Build the whole dungeon. Long-running and chatty on purpose: raising five scenes takes a few
 * seconds each and a silent UI reads as a hang.
 */
export async function raiseDungeon(params = {}) {
  if (!game.user.isGM) return ui.notifications.warn('DELVE is a GM tool.');
  // Load the chosen theme's pack on demand — only the default is preloaded.
  const PACK = await game.delve.loadPack(params.theme ?? 'barrow');
  if (!PACK) return ui.notifications.error(`DELVE: could not load the ${params.theme} theme.`);
  const seed = params.seed || coinSeed(new Rng(String(Date.now())));
  // pack last: a programmatic caller passing params.pack would otherwise generate from one pack
  // while the maps below are staged from the one actually loaded.
  const d = generateDelve({ ...params, seed, pack: PACK });
  const sk = d.skeleton;
  const title = sk.placeName;

  const seams = /post\s*=\s*true/.test(String(game.vanity?.forge?.hoard ?? ''));
  const quiet = seams ? { post: false } : {};

  // One folder per dungeon, for every document type it creates.
  // Stamp every created document so a dungeon can be found and removed later. Colour is not an
  // identifier — it is a Color object, and a GM may recolour a folder.
  const dungeonId = foundry.utils.randomID();
  const stamp = { flags: { [MOD]: { dungeonId, dungeonName: title } } };
  const folders = {};
  for (const type of ['Scene', 'Actor', 'JournalEntry']) {
    folders[type] = await Folder.create({ name: title, type, color: '#7a5cff', ...stamp });
  }

  const notify = (i, n, what) => ui.notifications.info(`DELVE ${i}/${n} — ${what}`);
  const total = d.areas.length + 2;
  let step = 0;

  // 1. Scenes, one per area.
  const scenes = [];
  for (const area of d.areas) {
    notify(++step, total, `raising ${area.name}`);
    let scene = null;
    if (params.maps !== false) {
      scene = await game.vanity.forge.stage({
        type: PACK.forgeStageType, size: 'medium', name: area.name,
        populate: false, activate: false, ...quiet,
        ...(seams ? { folderId: folders.Actor.id } : {}),
      }).catch(e => { console.error('DELVE | stage failed', e); return null; });
      if (scene) await scene.update({ folder: folders.Scene.id, ...stamp });
    }
    scenes.push(scene);

    if (params.populate !== false && area.encounter) {
      const enc = await game.vanity.forge.encounter({
        heat: area.encounter.heat, forStage: area.name,
        ...(seams ? { hoard: false, post: false, folderId: folders.Actor.id } : {}),
      }).catch(e => { console.error('DELVE | encounter failed', e); return null; });
      area._foes = (enc?.actors ?? []).map(foeStats);
    }
    if (area.hoard) {
      const h = await game.vanity.forge.hoard({ size: area.hoard, ...quiet })
        .catch(() => null);
      area._hoard = h?.lines ?? null;
    }
  }

  // 2. The journal — this is the adventure.
  notify(++step, total, 'writing the journal');
  const journal = await JournalEntry.create({
    name: title, folder: folders.JournalEntry.id, ...stamp,
    pages: buildPages(d, scenes),
  });
  // Stamp the actors the Forge made for us — it knows nothing about DELVE.
  const mine = game.actors.filter(a => a.folder?.id === folders.Actor.id);
  if (mine.length) await Actor.updateDocuments(mine.map(a => ({ _id: a.id, ...stamp })));

  // 3. Land on something useful rather than leaving the GM to hunt.
  notify(++step, total, 'done');
  await journal.sheet.render(true);
  if (scenes[0]) await scenes[0].view();

  await ChatMessage.create({
    speaker: { alias: 'DELVE' },
    whisper: ChatMessage.getWhisperRecipients('GM'),
    content: `<div class="vanity-roll delve-card">
      <header><span class="delve-label">⛏ ${esc(title)}</span>
      <span class="delve-sub">${d.areas.length} areas · ${esc(d.params.theme)} · depth ${d.params.depth} · seed ${esc(seed)}</span></header>
      <p>${scenes.filter(Boolean).length} scenes, ${game.actors.filter(a => a.folder?.id === folders.Actor.id).length} actors and a journal, all in the folder <b>${esc(title)}</b>.</p>
      <p>@UUID[${journal.uuid}]{Open the adventure}</p>
      ${seams ? '' : '<p><b>⚠ Forge seams missing</b> — update the VANITY system to 0.10.5 for quiet output.</p>'}
    </div>`,
  });

  return { delve: d, journal, scenes, folders, dungeonId };
}

/* ---------------------------------------------------------------- journal */

/**
 * The journal's foe section, driven by classifyFoes so it cannot disagree with the chat card.
 * The roster's tactical notes name particular monsters, so they print only where the plan is
 * itself the encounter.
 */
function foeSection(c) {
  const table = rows => `<table><thead><tr><th>Foe</th><th>atk</th><th>def</th><th>Grit</th><th>Nerve</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  if (c.kind === 'forged') return `
    <p><b>${esc(cap(c.heat))} — in the world.</b> These are the actors the Forge created; run the fight off these.</p>
    ${table(c.foes.map(f => `<tr><td>@UUID[${f.uuid}]{${esc(f.name)}}</td><td>${f.atk ?? '?'}</td><td>${f.def ?? '?'}</td><td>${f.grit ?? '?'}</td><td>${f.nerve ?? '?'}</td><td><i>${esc(f.trick)}</i></td></tr>`).join(''))}
    ${c.planned ? `<p><i>DELVE planned ${esc(c.planned.line)}. The Forge rolls its own cast, so the plan's foes are not these — its tactical notes describe monsters that were not created.</i></p>` : ''}`;
  if (c.kind === 'planned') return `
    <p><b>${esc(cap(c.heat))} — not cast.</b> Nothing was forged for this area, so the plan is the encounter. Cast it by hand:</p>
    ${table(c.roster.foes.map(f => `<tr><td>${f.n}× ${esc(f.name)}</td><td>${f.atk}</td><td>${f.def}</td><td>${f.grit}</td><td>${f.nerve}</td><td><i>${esc(f.note)}</i></td></tr>`).join(''))}
    <p>Harmed by ${esc(c.roster.harmedBy)}.${c.roster.beforeInitiative ? ` <b>${esc(c.roster.beforeInitiative)}</b>` : ''} <i>${esc(c.roster.avoid)}.</i></p>`;
  if (c.kind === 'unavailable') return `
    <p><b>${esc(cap(c.heat))} — nothing to run.</b> No actors were created and this theme has no roster at this heat. Improvise the fight or skip it; the area's decision and fallback still stand.</p>`;
  return '';
}

function buildPages(d, scenes) {
  const sk = d.skeleton, ap = sk.appeasement;
  const pages = [];
  const GM_ONLY = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };

  pages.push({
    name: '① The truth', type: 'text', ownership: GM_ONLY,
    text: { content: `
      <h2>${esc(sk.placeName)}</h2>
      <p><i>${esc(sk.motif.dangerLine)}.</i></p>
      <p><b>What was done.</b> ${esc(sk.knot.transgression)}</p>
      <p><b>What is left.</b> ${esc(sk.bottomProblem.label)} ${esc(sk.bottomProblem.failureState)}. It wants <b>${esc(sk.bottomProblem.wantNow)}</b>, and it opens by asking ${esc(d.ending.question)}</p>
      <p><b>The prize.</b> ${esc(sk.prize.label)} — ${esc(sk.prize.function)}.</p>
      <p><b>The danger.</b> ${esc(sk.motif.danger)}: ${esc(sk.motif.dangerLine)}.</p>
      <h3>The way through</h3>
      <p>Anyone may <b>${esc(ap.move)}</b> <code>[${esc(ap.attribute)} ${ap.successes}]</code>.
      On success ${esc(ap.why)}, and ${esc(sk.factions[0]?.name ?? 'the dead')} will not open hostilities.
      <b>It costs +${ap.gain.vanity} Vanity now and +${ap.cost.bane} Bane later.</b> Repeatable in every area —
      say the Bane aloud when it banks, so the table can see the route is open.</p>
      <h3>Pressure</h3>
      <ul>
        <li><b>Clock.</b> Roll 1d6 on any attention trigger, or every 3 Turns. <b>1 — something comes.</b> Telegraph one Turn ahead.</li>
        <li><b>The tab.</b> Aim for ${d.pressure.target} Banes by the ending. Banes come from named beats, not from hoping for Stumbles.</li>
      </ul>
      <h3>Factions</h3>
      <ul>${sk.factions.map(f => `<li><b>${esc(f.name)}</b> (${esc(f.kind)}) — ${esc(f.essence)}. Handled by <i>${esc(f.handledBy)}</i>.</li>`).join('')}</ul>
      <p><code>seed ${esc(d.seed)} · generator ${esc(d.generatorVersion)} · ${d.budget.plannedFights} planned fights</code></p>` },
  });

  d.areas.forEach((a, i) => {
    const scene = scenes[i];
    const rv = a.decision?.resolve ?? {};
    const R = a.encounter?.roster;
    pages.push({
      name: `${a.index}. ${a.name}`, type: 'text', ownership: GM_ONLY,
      text: { content: `
        <p><code>${esc(a.role)} · ${esc(a.facet)}${a.encounter ? ` · ${esc(a.encounter.heat)}` : ''}${a.hoard ? ` · ${esc(a.hoard)} hoard` : ''}</code>
        ${scene ? ` — @UUID[${scene.uuid}]{open the map}` : ''}</p>
        <blockquote><p>${esc(a.cueFragments.join('. '))}.
        ${a.situation ? `${esc(cap(a.situation.occupant))} — ${esc(a.situation.doing)}. When you walk in, ${esc(a.situation.onArrival)}.` : ''}</p></blockquote>
        <p><b>Read that aloud, or rewrite it in your own words — it is a prompt, not a script.</b></p>
        ${a.situation ? `<p><b>Why.</b> ${esc(cap(a.situation.because))}. <b>They can:</b> ${esc(a.situation.offer)}.</p>` : ''}
        <p><b>${esc(cap(a.decision.cue))}</b> — <i>${esc(a.decision.cost)}</i></p>
        <ul>
          ${rv.roll ? `<li><code>[${esc(rv.roll)}]</code> → ${esc(rv.success)}</li>` : ''}
          ${rv.failure ? `<li><b>Miss</b> → ${esc(rv.failure)}</li>` : ''}
          ${rv.orElse ? `<li><b>Or</b> ${esc(rv.orElse)}</li>` : ''}
        </ul>
        ${foeSection(classifyFoes(a, a._foes ?? []))}
        ${a.temptation ? `<p><b>${esc(cap(a.temptation.id))}</b> — ${esc(a.temptation.cue)}: ${esc(a.temptation.benefit)}.<br>
          <i>Using it costs ${a.temptation.useCost?.bane ? `+${a.temptation.useCost.bane} Bane` : '—'}. While carried, ${esc(a.temptation.standingDrawback)}.</i></p>` : ''}
        ${a._hoard?.length ? `<p><b>Hoard.</b></p><ul>${a._hoard.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
        <p><code>trigger: ${esc(a.trigger)}${a.baneBeat ? ` · bane beat: ${esc(a.baneBeat)}` : ''} · fallback: ${esc(a.fallback.route)} · if skipped: ${esc(a.failureCase)}</code></p>` },
    });
  });

  const e = d.ending;
  pages.push({
    name: `⌀ ${e.name}`, type: 'text', ownership: GM_ONLY,
    text: { content: `
      <blockquote><p>${esc(e.cueFragments.join('. '))}.</p></blockquote>
      ${e.authored ? '<p><b>This is the authored slot.</b> DELVE stages the approach and stops here on purpose — the climax is yours to write.</p>' : ''}
      <p><b>${esc(sk.bottomProblem.label)}</b> — ${esc(sk.bottomProblem.failureState)}. It opens by asking ${esc(e.question)}</p>
      <table><thead><tr><th>What they did</th><th>The audience</th></tr></thead><tbody>
        <tr><td>Appeased it, even once</td><td>It listens, and will trade ${esc(sk.prize.label)} for the real thing, said to its face.</td></tr>
        <tr><td>Never appeased, tab under 4</td><td>It offers a Vice — the shine now, the bill later. Refusing starts the fight.</td></tr>
        <tr><td>Carrying the prize</td><td>It wants that more than it wants them.</td></tr>
        <tr><td>Fighting</td><td>Winnable by two engaged heroes. <b>Name what harms it before initiative.</b></td></tr>
      </tbody></table>
      <p><b>The Reckoning.</b> If the tab reads six mid-audience, stop and roll it. A delve about vanity billing them in front of this thing is the best ending it has — do not soften it.</p>` },
  });

  return pages;
}


/* ----------------------------------------------------------------- remove */

/** Every dungeon DELVE has built in this world. */
export function listDungeons() {
  const byId = new Map();
  for (const f of game.folders) {
    const id = f.getFlag(MOD, 'dungeonId');
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, { id, name: f.getFlag(MOD, 'dungeonName') ?? f.name, folders: [] });
    byId.get(id).folders.push(f);
  }
  for (const d of byId.values()) {
    d.scenes = game.scenes.filter(s => s.getFlag(MOD, 'dungeonId') === d.id);
    d.actors = game.actors.filter(a => a.getFlag(MOD, 'dungeonId') === d.id);
    d.journals = game.journal.filter(j => j.getFlag(MOD, 'dungeonId') === d.id);
  }
  return [...byId.values()];
}

/** Delete one generated dungeon and everything it made. Confirms with exact counts first. */
export async function removeDungeon(dungeonId, { confirm = true } = {}) {
  const d = listDungeons().find(x => x.id === dungeonId);
  if (!d) return ui.notifications.warn('DELVE: no such dungeon.');

  if (confirm) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Remove ${d.name}?` },
      content: `<p>This deletes <b>${d.scenes.length} scenes</b>, <b>${d.actors.length} actors</b>,
        <b>${d.journals.length} journal(s)</b> and <b>${d.folders.length} folders</b>.</p>
        <p>Nothing else in the world is touched, and this cannot be undone.</p>`,
      rejectClose: false, modal: true,
    });
    if (!ok) return false;
  }

  // Never delete the scene the GM is standing in.
  if (d.scenes.some(s => s.active)) {
    const other = game.scenes.find(s => !d.scenes.includes(s));
    if (other) await other.activate();
  }
  if (d.scenes.length) await Scene.deleteDocuments(d.scenes.map(s => s.id));
  if (d.actors.length) await Actor.deleteDocuments(d.actors.map(a => a.id));
  if (d.journals.length) await JournalEntry.deleteDocuments(d.journals.map(j => j.id));
  if (d.folders.length) await Folder.deleteDocuments(d.folders.map(f => f.id));
  ui.notifications.info(`DELVE: removed ${d.name}.`);
  return true;
}

/** Pick one to remove. */
export async function removeDungeonDialog() {
  const all = listDungeons();
  if (!all.length) return ui.notifications.info('DELVE: no generated dungeons in this world.');
  const options = all.map(d => `<option value="${d.id}">${d.name} — ${d.scenes.length} scenes, ${d.actors.length} actors</option>`).join('');
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'DELVE — remove a dungeon' },
    content: `<p>Which dungeon should go?</p><select name="id" style="width:100%">${options}</select>`,
    ok: { label: 'Choose', callback: (e, b, dlg) => dlg.element.querySelector('[name=id]').value },
    rejectClose: false, modal: true,
  });
  if (id) return removeDungeon(id);
}
