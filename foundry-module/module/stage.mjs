/**
 * Raising one area, as a sequence of decisions rather than a sequence of Foundry calls.
 *
 * Every effect arrives as an injected function, so the whole thing runs under plain node and its
 * failure paths can be tested. That is the point: three releases in a row shipped a bug on a path
 * that only runs when the Forge misbehaves, and reasoning about those paths turned out not to be
 * evidence.
 *
 * The contract, which the tests hold:
 *
 *   The scene is the commit point. If it fails, nothing was entered — no cards, no advance, and a
 *   retry is safe. Once it exists the area IS entered, so the turn advances immediately and
 *   everything after it degrades loudly rather than rolling back. A retry after a later failure
 *   must not raise the same scene twice.
 *
 * Every degradation says what the GM has lost. Silence is what made the old hoard failure
 * invisible and the old population failure lie about a roster that did not exist.
 */
import { foeStats, foeLine, classifyFoes } from './foes.mjs';
import { initiativeWarning } from './core/roster.mjs';

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const list = items => `<ul>${items.filter(Boolean).map(i => `<li>${i}</li>`).join('')}</ul>`;

/**
 * Run one injected effect, surviving both a rejected promise and a synchronous throw.
 * `Promise.resolve(fn())` is not enough: a synchronous throw escapes before there is a promise to
 * attach a catch to, which is how the first version of this file crashed the whole of enter().
 */
const attempt = async (fx, fn) => {
  try { return { ok: true, value: await fn() }; }
  catch (e) { fx.log?.(e); return { ok: false, value: null }; }
};

/** The foe section of the GM card. Mirrors forge-app's foeSection; both switch on the same kind. */
export function foeBlock(c) {
  if (c.kind === 'forged') return `<p><b>${cap(c.heat)} — in the world:</b></p>${list(c.foes.map(foeLine))}${
    c.planned ? `<p><i>DELVE planned ${c.planned.line}; the Forge rolled its own, so the plan's tactics do not describe these.</i></p>` : ''}`;
  if (c.kind === 'planned') return `<p><b>${cap(c.heat)} — not cast.</b> Nothing was forged; run the plan by hand:</p>${
      list(c.roster.foes.map(f => `${f.n}× <b>${f.name}</b> — ${f.atk}/${f.def}/${f.grit}, Nerve ${f.nerve}. <i>${f.note}</i>`))
    }<p><b>Harmed by ${c.roster.harmedBy}.</b>${initiativeWarning(c.roster) ? ` <b>${initiativeWarning(c.roster)}</b>` : ''} ${c.roster.avoid}.</p>`;
  if (c.kind === 'unavailable') return `<p><b>${cap(c.heat)} — nothing to run.</b> No actors, and no roster at this heat. Improvise or skip; the decision and fallback still stand.</p>`;
  return '';
}

/** The two cards an area posts: the players' read-aloud, and the GM's card. */
export function areaCards({ area, name, authored = {}, classification }) {
  const rv = area.decision?.resolve ?? {};
  return {
    readAloud: authored.readAloud ?? `<i>(unwritten)</i> ${area.cueFragments.join('. ')}.`,
    gm: {
      label: `⛏ ${area.index} · ${name}`,
      sub: `${area.role} · ${area.facet}`,
      body: `${area.situation ? `<p><b>Here:</b> ${cap(area.situation.occupant)}, ${area.situation.doing} — ${area.situation.onArrival}.<br>
        <b>They can:</b> ${area.situation.offer}. <i>${cap(area.situation.because)}.</i></p>` : ''}
     <p><b>${cap(area.decision.cue)}</b>${rv.roll ? ` — [${rv.roll}] ${rv.success}` : ''}${rv.failure ? `<br><b>Miss:</b> ${rv.failure}` : ''}${rv.orElse ? `<br><b>Or:</b> ${rv.orElse}` : ''}</p>
     ${foeBlock(classification)}
     ${area.temptation ? `<p><b>${cap(area.temptation.id)}:</b> ${area.temptation.benefit}. <i>Use: ${area.temptation.useCost?.bane ? `+${area.temptation.useCost.bane} Bane` : '—'}. ${area.temptation.standingDrawback}.</i></p>` : ''}
     ${authored.notes ? `<p><b>Your note:</b> ${authored.notes}</p>` : ''}
     <p><code>${area.trigger}${area.baneBeat ? ` · ${area.baneBeat}` : ''} · fallback: ${area.fallback.route}</code></p>`,
    },
  };
}

/**
 * @param {object} fx   injected effects: stage, encounter, hoard, commit, readAloud, gm, warn, error
 * @param {object} ctx  { area, name, authored }
 * @returns {{entered: boolean, failed?: string, kind?: string}}
 */
export async function stageArea(fx, { area, name, authored = {} }) {
  const scene = await attempt(fx, () => fx.stage(name));
  if (!scene.ok || !scene.value) {
    fx.error(`DELVE: the Forge could not raise ${name}. Nothing staged; try again.`);
    return { entered: false, failed: 'stage' };
  }

  // The scene exists, so this area has been entered. Commit before anything that may fail, or a
  // retry restages it. If the commit itself fails the scene is still real and the delve is still
  // playable, but the index no longer matches the world — say so, because the next press of ⏩
  // would raise this area a second time.
  const committed = await attempt(fx, () => fx.commit());
  if (!committed.ok) fx.warn(`DELVE: ${name} is staged, but the delve's progress could not be saved. Pressing ⏩ again will raise it a second time — reload and check before continuing.`);

  let forged = [];
  if (area.encounter) {
    const enc = await attempt(fx, () => fx.encounter(area.encounter.heat));
    if (enc.ok && enc.value) forged = (enc.value.actors ?? []).map(foeStats);
    else fx.warn(area.encounter.roster
      ? `DELVE: could not populate ${name} — the planned roster stands in.`
      : `DELVE: could not populate ${name}, and this theme has no roster at ${area.encounter.heat}. Improvise the fight or skip it.`);
  }

  if (area.hoard) {
    const h = await attempt(fx, () => fx.hoard(area.hoard));
    if (!h.ok || !h.value) fx.warn(`DELVE: could not lay the ${area.hoard} hoard in ${name} — improvise it or skip it.`);
  }

  const classification = classifyFoes(area, forged);
  const cards = areaCards({ area, name, authored, classification });

  // Players first — the scene is up and this is what they came for.
  const said = (await attempt(fx, () => fx.readAloud(name, cards.readAloud))).ok;
  const told = (await attempt(fx, () => fx.gm(cards.gm.label, cards.gm.sub, cards.gm.body))).ok;
  if (!said || !told) fx.warn(`DELVE: ${name} is staged but its ${!said && !told ? 'cards' : !said ? 'read-aloud' : 'GM card'} did not post. The turn has advanced; read from the worksheet.`);

  return { entered: true, committed: committed.ok, kind: classification.kind };
}
