/**
 * DELVE as an authoring system.
 *
 * Four readings of generated output landed on the same verdict: the fiction and the structure are
 * good, the table-readiness is not, and the honest product is a strong first draft a GM finishes.
 * "The handwritten delve still tells the GM what matters faster."
 *
 * That reframes the density problem rather than solving it. Everything on the page is a vice at
 * the table and a virtue at the desk. So a delve now has two surfaces:
 *
 *   WORKSHEET — everything, labelled, with explicit prompts for what only a human can write.
 *   PLAY SHEET — only what survived, in the GM's own words, tight enough to scan.
 *
 * The delve JSON is the working file. It carries an `authored` layer that the generator never
 * touches, so rerolling a component cannot destroy written prose.
 */

import { Rng } from './rng.mjs';
import { generateDelve } from './delve.mjs';

/** Fields a GM writes. Anything here, once written, outranks the generated text. */
export const AUTHORED_FIELDS = ['readAloud', 'notes', 'nameOverride'];

/** Components that can be individually rerolled. */
export const REROLLABLE = ['situation', 'decision', 'temptation', 'feature', 'name'];

/** A fresh working file: the generated delve plus an empty authored layer per area. */
export function newWorkingFile(params) {
  const delve = generateDelve(params);
  delve.authored = { title: null, intro: null, areas: {} };
  for (const a of delve.areas) {
    delve.authored.areas[a.index] = { readAloud: null, notes: null, nameOverride: null, locked: [] };
  }
  delve.authored.ending = { readAloud: null, notes: null, locked: [] };
  return delve;
}

const authoredFor = (d, i) => d.authored?.areas?.[i] ?? { locked: [] };

export const isLocked = (d, i, component) => (authoredFor(d, i).locked ?? []).includes(component);

export function lock(d, i, component) {
  const a = authoredFor(d, i);
  if (!a.locked.includes(component)) a.locked.push(component);
  return d;
}

export function unlock(d, i, component) {
  const a = authoredFor(d, i);
  a.locked = (a.locked ?? []).filter(c => c !== component);
  return d;
}

export function setAuthored(d, i, field, value) {
  if (!AUTHORED_FIELDS.includes(field)) throw new Error(`not an authored field: ${field}`);
  if (i === 'ending') { d.authored.ending[field] = value; return d; }
  authoredFor(d, i)[field] = value;
  return d;
}

/**
 * Reroll one component of one area, keeping everything else — including anything written.
 *
 * Regeneration draws from a salted seed so a reroll gives something genuinely different rather
 * than the same draw again, and the salt is recorded so the file stays reproducible.
 */
export function reroll(d, i, component, pack) {
  if (!REROLLABLE.includes(component)) throw new Error(`not rerollable: ${component}`);
  if (isLocked(d, i, component)) return d;

  d.rerolls = d.rerolls ?? {};
  const key = `${i}:${component}`;
  d.rerolls[key] = (d.rerolls[key] ?? 0) + 1;

  const salt = `${d.seed}::reroll::${key}::${d.rerolls[key]}`;
  const rng = new Rng(salt);
  const motif = pack.motifs?.[d.skeleton.motif.id] ?? {};
  const area = d.areas.find(a => a.index === i);
  if (!area) throw new Error(`no area ${i}`);

  /**
   * Draw fresh, avoiding what the rest of the delve uses. When every option is already in play —
   * six areas against a six-item pool — prefer duplicating another area over handing back what is
   * already here. A reroll that changes nothing looks broken.
   */
  const choose = (all, taken, keyOf, current) => {
    const fresh = all.filter(x => !taken.has(keyOf(x)));
    if (fresh.length) return rng.pick(fresh);
    const notCurrent = all.filter(x => keyOf(x) !== current);
    return notCurrent.length ? rng.pick(notCurrent) : null;
  };

  // Draw fresh, avoiding what the rest of the delve is already using.
  const used = (get, current) => {
    const taken = new Set(d.areas.filter(x => x.index !== i).map(get).filter(Boolean));
    if (current) taken.add(current);      // never hand back what is already there
    return taken;
  };
  switch (component) {
    case 'situation': {
      const taken = used(a => a.situation?.occupant + a.situation?.doing, area.situation ? area.situation.occupant + area.situation.doing : null);
      const pick = choose(motif.situations ?? [], taken, x => x.occupant + x.doing,
                          area.situation ? area.situation.occupant + area.situation.doing : null);
      if (pick) area.situation = { occupant: pick.occupant, doing: pick.doing, onArrival: pick.onArrival, because: pick.because, offer: pick.offer };
      break;
    }
    case 'decision': {
      const taken = used(a => a.decision?.cue, area.decision?.cue);
      const pick = choose(motif.decisions ?? [], taken, x => x.cue, area.decision?.cue);
      if (pick) area.decision = pick;
      break;
    }
    case 'temptation': {
      if (!area.hoard) break;
      const taken = used(a => a.temptation?.id, area.temptation?.id);
      const pick = choose(motif.temptations ?? [], taken, x => x.id, area.temptation?.id);
      if (pick) area.temptation = pick;
      break;
    }
    case 'feature': {
      const taken = used(a => a.cueFragments?.[1], area.cueFragments?.[1]);
      const pick = choose(motif.features ?? [], taken, x => x, area.cueFragments?.[1]);
      if (pick) area.cueFragments = [area.cueFragments[0], pick].filter(Boolean);
      break;
    }
    case 'name': {
      const names = pack.areaNames?.[area.role] ?? [];
      const taken = used(a => a.name, area.name);
      const pick = choose(names, taken, x => x, area.name);
      if (pick) area.name = pick;
      break;
    }
  }
  return d;
}

/** What still needs a human. This is the worksheet's to-do list and the play sheet's gate. */
export function outstanding(d) {
  const todo = [];
  if (!d.authored?.intro) todo.push({ where: 'intro', what: 'an opening paragraph for the delve' });
  for (const a of d.areas) {
    const au = authoredFor(d, a.index);
    if (!au.readAloud) todo.push({ where: `area ${a.index}`, what: 'read-aloud text' });
  }
  if (!d.authored?.ending?.readAloud) todo.push({ where: 'ending', what: 'read-aloud text' });
  if (d.ending.authored && !d.authored?.ending?.notes) todo.push({ where: 'ending', what: 'the authored climax — DELVE deliberately leaves this to you' });
  return todo;
}

export const readyToPlay = d => outstanding(d).length === 0;
