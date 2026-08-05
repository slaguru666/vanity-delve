/** Render a delve to GM-readable markdown, in the house style. */
import { skeletonBlurb } from './skeleton.mjs';

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Costs read as English in a GM document, never as JSON. */
const cost = c => {
  if (!c) return 'free';
  const bits = [];
  if (c.bane) bits.push(`**+${c.bane} Bane${c.bane > 1 ? 's' : ''}** on the tab`);
  if (c.vice) bits.push(`take the Vice **${c.vice}**`);
  if (c.vanity) bits.push(`**+${c.vanity} Vanity**`);
  return bits.length ? bits.join(', ') : 'free';
};

export function renderMarkdown(d) {
  const L = [];
  const sk = d.skeleton;

  L.push(`# ${sk.placeName.toUpperCase()}`);
  L.push('');
  L.push(`> *${sk.motif.dangerLine}.*`);
  L.push('');
  L.push(`**VANITY · ${cap(d.params.theme)} · Depth ${d.params.depth} · ${d.params.party} heroes · ` +
         `${d.params.areas} areas + ${d.ending.authored ? 'an authored ending' : 'a generated ending'}**`);
  L.push(`**Seed \`${d.seed}\` · generator ${d.generatorVersion} · catalog ${d.catalogVersion}**`);
  L.push('');
  L.push('> **Skeleton seed, not a replay seed.** It reproduces the fiction, the area order, the');
  L.push('> heat and the hoard tiers. It does **not** reproduce encounter composition, mood or');
  L.push('> hoard contents — those come from the Forge, which is not seeded.');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## The truth (GM only)');
  L.push('');
  L.push(skeletonBlurb(sk));
  L.push('');
  L.push(`**They will ask you:** ${d.ending.question}`);
  L.push('');
  L.push('## Pressure');
  L.push('');
  L.push(`- **The clock.** Roll 1d6 on a trigger, or every ${d.pressure.triggerNumber === 1 ? '3' : '3'} Turns. ` +
         `**${d.pressure.triggerNumber} or under — something comes.** Telegraph one Turn ahead.`);
  L.push(`- **Triggers this delve:** ${[...new Set(d.areas.map(a => a.trigger))].join(' · ')}`);
  L.push(`- **The tab.** Target **${d.pressure.target} Banes** by the ending. Banes are *offered by named beats*, never hoped for.`);
  L.push(`- **The danger is ${sk.motif.danger}:** ${sk.motif.dangerLine}.`);
  L.push('');
  const ap = sk.appeasement;
  L.push('## The way through — the appeasement');
  L.push('');
  L.push(`Anyone may **${ap.move}**. \`[VANITY: ${ap.attribute} — ${ap.successes} successes]\``);
  L.push(`On success ${ap.why}, and ${sk.factions[0]?.name} will not open hostilities first.`);
  L.push(`**Cost: +${ap.gain.vanity} Vanity now, +${ap.cost.bane} Bane on the tab.** Shine now, bill later.`);
  L.push(`**Repeatable in every area.** Say the Bane aloud when it banks — the table must be able to see the route is open.`);
  L.push('');
  L.push('## Factions');
  L.push('');
  for (const f of sk.factions) L.push(`- **${f.name}** (${f.kind}) — ${f.essence}. Handled by *${f.handledBy}*.`);
  L.push('');
  L.push(`**Planned fights:** ${d.budget.plannedFights} of ${d.params.areas} areas · base heat *${d.budget.heatBase}*`);
  L.push('');
  L.push('---');
  L.push('');

  for (const a of d.areas) {
    L.push(`### AREA ${a.index} — ${a.name}`);
    L.push(`*${a.role} · facet: ${a.facet}${a.encounter ? ` · encounter: ${a.encounter.heat}` : ' · no encounter'}` +
           `${a.hoard ? ` · hoard: ${a.hoard}` : ''}*`);
    L.push('');
    L.push('**Cue** — *assemble aloud; these are fragments, not read-aloud text*');
    for (const c of a.cueFragments) L.push(`- ${c}`);
    L.push('');
    L.push(`**Truth.** ${a.truth}`);
    L.push('');
    if (a.clue.automatic) {
      L.push(`**The clue is automatic:** ${a.clue.automatic}.`);
      L.push(`${a.clue.extra}`);
      L.push('');
    }
    L.push(`**The decision.** ${a.decision.cue} — *${a.decision.cost}*`);
    const rv = a.decision.resolve;
    if (rv) {
      if (rv.roll) {
        L.push(`- **Attempt it:** \`[VANITY: ${rv.roll}]\``);
        L.push(`- **Success:** ${rv.success}`);
        L.push(`- **Failure:** ${rv.failure}`);
      }
      L.push(`- **Or simply:** ${rv.orElse}`);
    }
    L.push('');
    if (a.encounter) {
      const R = a.encounter.roster;
      L.push(`**Encounter — ${a.encounter.heat}.** ${R ? R.line : a.encounter.kind}`);
      if (R) {
        L.push('');
        L.push('| Foe | atk | def | Grit | Nerve | |');
        L.push('|---|---|---|---|---|---|');
        for (const f of R.foes) L.push(`| ${f.n}× ${f.name} | ${f.atk} | ${f.def} | ${f.grit} | ${f.nerve} | ${f.note} |`);
        L.push('');
        L.push(`- **Harmed by:** ${R.harmedBy}${R.harmedBy.includes('ONLY') ? ' — **say this before initiative**' : ''}`);
        L.push(`- **Avoidable:** ${R.avoid}`);
      }
      L.push(`- *Forge:* \`forgeEncounter({heat:"${a.encounter.heat}", hoard:false, post:false, folderId})\``);
    }
    if (a.hoard) L.push(`**Hoard.** Tier **${a.hoard}**.`);
    if (a.temptation) {
      const t = a.temptation;
      L.push(`**Temptation — ${t.id}.** ${t.cue}`);
      L.push(`- *Benefit:* ${t.benefit}`);
      L.push(`- *Accept:* ${cost(t.acceptanceCost)} · *Use:* ${cost(t.useCost)}`);
      L.push(`- *Standing:* ${t.standingDrawback}`);
    }
    L.push('');
    L.push(`**Attention trigger:** ${a.trigger}.`);
    if (a.baneBeat) {
      const rules = {
        flattery: ['whoever performs the appeasement', 'each time it is used', 'repeatable'],
        noticing: ['whoever lingers on their own reflection', 'once per hero here', 'repeatable across areas'],
        relicUse: ['whoever spends the relic', 'each use', 'repeatable'],
        announcing: ['the whole party', 'once, on entering loudly', 'once only'],
        refusal: ['whoever refuses the offer', 'once', 'once only'],
      };
      const [who, when, rep] = rules[a.baneBeat] ?? ['a hero', 'once', 'once only'];
      L.push(`**Bane beat — ${a.baneBeat}.** Who: *${who}*. When: *${when}*. ${rep}. Say it aloud when it banks.`);
    }
    L.push(`**Fallback route.** ${a.fallback.route} — cost: ${a.fallback.cost}.`);
    L.push('');
    L.push(`*Failure case.* ${a.failureCase}`);
    L.push('');
    L.push('---');
    L.push('');
  }

  L.push(`### ENDING — ${d.ending.name}`);
  L.push(d.ending.authored ? '### ⟨ AUTHORED SLOT — this is the seam ⟩' : `*generated · heat ${d.ending.heat} · hoard ${d.ending.hoard}*`);
  L.push('');
  if (d.ending.authored) {
    L.push('**Areas 1–' + d.params.areas + ' are what DELVE generates. This is what it hands over.**');
    L.push('');
  }
  L.push('**Cue** — *fragments*');
  for (const c of d.ending.cueFragments) L.push(`- ${c}`);
  L.push('');
  L.push(`**${sk.bottomProblem.label}** — ${sk.bottomProblem.failureState}. Wants: *${sk.bottomProblem.wantNow}*.`);
  L.push(`Handled by ${sk.bottomProblem.handledBy}.`);
  L.push('');
  L.push(`**They open by asking:** ${d.ending.question}`);
  L.push('');
  L.push('| Party\'s route | The audience |');
  L.push('|---|---|');
  L.push(`| Appeased it even once (**${ap.move}**) | It listens. It will trade ${sk.prize.label} for the real thing, done to its face. \`[VANITY: ${ap.attribute} — ${ap.successes}]\` or take **Rattled**. |`);
  L.push('| Refused throughout, tab under 4 | It offers a Vice — take the shine, bank the bill. Refusing starts the fight. |');
  L.push(`| Carrying ${sk.prize.label} | It wants that more than it wants you. |`);
  L.push('| Fighting | Winnable by two engaged heroes. **Name what harms it before initiative.** |');
  L.push('');
  L.push('> **Before initiative, always say what can hurt it.** Playtest 1 was unwinnable because');
  L.push('> the table discovered the immunity by failing.');
  L.push('');
  const g = d.triggerGlossary ?? {};
  if (Object.keys(g).length) {
    L.push('## Trigger glossary');
    L.push('');
    for (const [k, v] of Object.entries(g)) L.push(`- **${k}** — ${v}`);
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('*Private VANITY development material — not for sale or distribution.*');
  return L.join('\n');
}
