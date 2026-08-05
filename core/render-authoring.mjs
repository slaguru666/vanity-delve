/**
 * Two renders of one delve.
 *
 * WORKSHEET is for the desk: everything the generator knows, labelled, with the reroll commands
 * beside each component and an explicit prompt where only a human can write.
 *
 * PLAY is for the table: the GM's own prose, the live leverage point, the decision on one line,
 * the numbers. Nothing else. Four reviews said the same thing — "the handwritten delve tells the
 * GM what matters faster" — and the only way to be fast is to carry less.
 */
import { outstanding, isLocked, REROLLABLE } from './authoring.mjs';
import { initiativeWarning } from './roster.mjs';

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const cost = c => {
  if (!c) return 'free';
  const b = [];
  if (c.bane) b.push(`+${c.bane} Bane${c.bane > 1 ? 's' : ''}`);
  if (c.vice) b.push(`the Vice ${c.vice}`);
  return b.length ? b.join(', ') : 'free';
};
const au = (d, i) => d.authored?.areas?.[i] ?? {};

/* ------------------------------------------------------------- worksheet */

export function renderWorksheet(d) {
  const L = [];
  const sk = d.skeleton, ap = sk.appeasement;
  const todo = outstanding(d);

  L.push(`# WORKSHEET — ${d.authored?.title ?? sk.placeName}`);
  L.push('');
  L.push(`\`seed ${d.seed} · ${d.params.theme} · ${d.params.areas} areas · depth ${d.params.depth} · generator ${d.generatorVersion}\``);
  L.push('');
  L.push(todo.length
    ? `**${todo.length} things still need you.** This is a first draft, not a play document. Finish it, then export the play sheet.`
    : `**Finished.** Export the play sheet.`);
  L.push('');
  if (todo.length) { for (const t of todo) L.push(`- [ ] **${t.where}** — ${t.what}`); L.push(''); }
  L.push('---');
  L.push('');
  L.push('## The kernel');
  L.push('');
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| **Transgression** | ${sk.knot.transgression} |`);
  L.push(`| **Bottom problem** | ${sk.bottomProblem.label} — ${sk.bottomProblem.failureState} |`);
  L.push(`| **Prize** | ${sk.prize.label} — ${sk.prize.function} |`);
  L.push(`| **Motif / danger** | ${sk.motif.id} · ${sk.motif.danger} — ${sk.motif.dangerLine} |`);
  L.push(`| **Appeasement** | ${ap.move} \`[${ap.attribute} ${ap.successes}]\` — +${ap.gain.vanity} Vanity, +${ap.cost.bane} Bane, repeatable |`);
  L.push(`| **It asks** | ${d.ending.question} |`);
  L.push('');
  L.push(`**WRITE ▸ an opening paragraph.** ${d.authored?.intro ? '✔ written' : '_(nothing yet — set `authored.intro`)_'}`);
  if (d.authored?.intro) { L.push(''); L.push(`> ${d.authored.intro}`); }
  L.push('');
  L.push('---');
  L.push('');

  for (const a of d.areas) {
    const w = au(d, a.index);
    const locks = (w.locked ?? []);
    const rerollable = REROLLABLE.filter(c => !locks.includes(c) && (c !== 'temptation' || a.hoard));
    L.push(`## Area ${a.index} — ${w.nameOverride ?? a.name}`);
    L.push(`\`${a.role} · ${a.facet}${a.encounter ? ` · ${a.encounter.heat}` : ''}${a.hoard ? ` · ${a.hoard}` : ''}\``);
    L.push(`*reroll:* ${rerollable.map(c => `\`--reroll=${a.index}:${c}\``).join(' ')}${locks.length ? ` · *locked:* ${locks.join(', ')}` : ''}`);
    L.push('');
    L.push(`**IMAGE** ${a.cueFragments.join(' · ')}`);
    if (a.situation) {
      L.push(`**SITUATION** ${cap(a.situation.occupant)} — ${a.situation.doing}. On arrival, ${a.situation.onArrival}.`);
      L.push(`**WHY** ${cap(a.situation.because)}. **OFFERS** ${a.situation.offer}.`);
    }
    L.push(`**DECISION** ${cap(a.decision.cue)} — *${a.decision.cost}*`);
    const rv = a.decision.resolve ?? {};
    if (rv.roll) L.push(`  · \`[${rv.roll}]\` → ${rv.success}`);
    if (rv.failure) L.push(`  · **miss** → ${rv.failure}`);
    if (rv.orElse) L.push(`  · **or** ${rv.orElse}`);
    if (a.encounter?.roster) {
      const R = a.encounter.roster;
      L.push(`**ENCOUNTER** ${R.line} — ${R.foes.map(f => `${f.n}× ${f.name} atk${f.atk}/def${f.def}/G${f.grit}`).join(', ')}`);
      L.push(`  · harmed by ${R.harmedBy}${initiativeWarning(R) ? ` · ${initiativeWarning(R)}` : ''} · ${R.avoid}`);
    }
    if (a.temptation) {
      const t = a.temptation;
      L.push(`**TEMPTATION** ${cap(t.id)} — ${t.cue}: ${t.benefit}`);
      L.push(`  · take ${cost(t.acceptanceCost)} · use ${cost(t.useCost)} · standing: ${t.standingDrawback}`);
    }
    L.push(`**PRESSURE** trigger ${a.trigger}${a.baneBeat ? ` · bane beat ${a.baneBeat}` : ''} · fallback ${a.fallback.route}`);
    L.push('');
    L.push(`**WRITE ▸ read-aloud** — ≤3 sentences, built from the IMAGE and SITUATION above.`);
    L.push(w.readAloud ? `> ${w.readAloud}` : `> _(nothing yet)_`);
    if (w.notes) { L.push(''); L.push(`**Notes.** ${w.notes}`); }
    L.push('');
    L.push('---');
    L.push('');
  }

  const we = d.authored?.ending ?? {};
  L.push(`## Ending — ${d.ending.name}`);
  L.push(d.ending.authored ? '`AUTHORED SLOT — DELVE stops here on purpose`' : '`generated`');
  L.push('');
  L.push(`**IMAGE** ${d.ending.cueFragments.join(' · ')}`);
  L.push(`**IT WANTS** ${sk.bottomProblem.wantNow}. **IT ASKS** ${d.ending.question}`);
  L.push(`**APPEASED EVEN ONCE** it listens, and will trade ${sk.prize.label}.`);
  L.push('');
  L.push('**WRITE ▸ read-aloud**');
  L.push(we.readAloud ? `> ${we.readAloud}` : `> _(nothing yet)_`);
  L.push('');
  L.push('**WRITE ▸ the climax.** How it goes, what harms it, what it will take instead of a fight.');
  L.push(we.notes ? we.notes : `_(nothing yet — this is the seam; DELVE will not write it for you)_`);
  L.push('');
  return L.join('\n');
}

/* ------------------------------------------------------------ play sheet */

export function renderPlay(d) {
  const L = [];
  const sk = d.skeleton, ap = sk.appeasement;
  const todo = outstanding(d);

  L.push(`# ${d.authored?.title ?? sk.placeName}`);
  L.push('');
  if (todo.length) {
    L.push(`> ⚠ **${todo.length} unfinished** — ${todo.slice(0, 3).map(t => t.where).join(', ')}${todo.length > 3 ? '…' : ''}.`);
    L.push('> Fragments are shown where nothing was written. Run the worksheet first.');
    L.push('');
  }
  if (d.authored?.intro) { L.push(`> ${d.authored.intro}`); L.push(''); }
  L.push(`**Appease:** ${ap.move} \`[${ap.attribute} ${ap.successes}]\` — +1 Vanity now, +1 Bane later. Repeatable, every area.`);
  L.push(`**Clock:** 1d6 on a trigger. **1 — something comes.** **Tab:** ${d.pressure.target} by the end.`);
  L.push(`**GM truth:** ${sk.knot.transgression} ${sk.bottomProblem.label} ${sk.bottomProblem.failureState}.`);
  L.push('');
  L.push('---');
  L.push('');

  for (const a of d.areas) {
    const w = au(d, a.index);
    const rv = a.decision.resolve ?? {};
    L.push(`### ${a.index} · ${w.nameOverride ?? a.name}`);
    L.push('');
    L.push(w.readAloud ? `> ${w.readAloud}` : `> *(unwritten)* ${a.cueFragments.join('. ')}.`);
    L.push('');
    if (a.situation) L.push(`**Here:** ${cap(a.situation.occupant)}, ${a.situation.doing} — ${a.situation.onArrival}. **They can:** ${a.situation.offer}.`);
    L.push(`**${cap(a.decision.cue)}** — ${rv.roll ? `\`[${rv.roll}]\` ${rv.success}` : ''}${rv.failure ? ` · **miss** ${rv.failure}` : ''}${rv.orElse ? ` · **or** ${rv.orElse}` : ''}`);
    if (a.encounter?.roster) {
      const R = a.encounter.roster;
      L.push(`**${cap(a.encounter.heat)}:** ${R.foes.map(f => `${f.n}× ${f.name} \`${f.atk}/${f.def}/${f.grit}\``).join(' · ')} — harmed by ${R.harmedBy}.`
             + `${initiativeWarning(R) ? ` **${initiativeWarning(R)}**` : ''}`);
    }
    if (a.temptation) L.push(`**${cap(a.temptation.id)}:** ${a.temptation.benefit}. *Use: ${cost(a.temptation.useCost)}. ${a.temptation.standingDrawback}.*`);
    if (w.notes) L.push(`**Note:** ${w.notes}`);
    L.push(`\`${a.trigger}${a.baneBeat ? ` · ${a.baneBeat}` : ''} · skipped → move the image on\``);
    L.push('');
  }

  const we = d.authored?.ending ?? {};
  L.push(`### ${d.ending.name}`);
  L.push('');
  L.push(we.readAloud ? `> ${we.readAloud}` : `> *(unwritten)* ${d.ending.cueFragments.join('. ')}.`);
  L.push('');
  L.push(`**It asks:** ${d.ending.question}`);
  L.push(we.notes ? we.notes : `*(the climax is unwritten — this is the authored slot)*`);
  L.push('');
  return L.join('\n');
}
