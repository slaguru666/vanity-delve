// DELVE seam spike — three linked areas through the Forge, measuring the seams in draft 5 §5.
import { boot, log, reset } from './harness.mjs';
const SYS = 'file:///Users/timevans/Library/Application%20Support/FoundryVTT/Data/systems/vanity/vanity.mjs';

const forge = await boot(SYS);
if (!forge) { console.log('BOOT FAILED — game.vanity not populated'); process.exit(1); }
console.log('booted. forge API:', Object.keys(forge.forge).join(', '), '\n');

const snap = () => ({ chat: log.chat.length, folders: log.folders.length, actors: log.actors.length,
                      scenes: log.scenes.length, uploads: log.uploads.length, random: log.random });
async function measure(label, fn) {
  reset();
  const t0 = Date.now();
  let ret, err = null;
  try { ret = await fn(); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  const s = snap();
  console.log(`── ${label}`);
  if (err) { console.log(`   THREW: ${err.message.slice(0,90)}  @ ${(String(err.stack).match(/vanity\.mjs:(\d+)/)||[])[0] ?? "?"}`); }
  console.log(`   returns : ${ret === undefined ? 'undefined  ⚠ NOTHING RETURNED' : Array.isArray(ret) ? `array(${ret.length})` : typeof ret === 'object' && ret ? `object {${Object.keys(ret).join(',')}}` : String(ret)}`);
  console.log(`   chat=${s.chat}  folders=${s.folders}  actors=${s.actors}  scenes=${s.scenes}  uploads=${s.uploads}  Math.random=${s.random}  ${ms}ms`);
  return { ret, s, err };
}

console.log('=== SEAM 1+4: forgeHoard — forced coupling target, and does it return? ===');
await measure("forgeHoard({size:'cache'})", () => forge.forge.hoard({ size: 'cache' }));

console.log('\n=== SEAM 1+3+5: forgeEncounter — does it force a hoard? own folder? own chat? ===');
await measure("forgeEncounter({heat:'fight',kind:'undead'})", () => forge.forge.encounter({ heat: 'fight', kind: 'undead' }));

console.log('\n=== SEAM 2: forgeStage populate:false vs true — is the nesting escapable? ===');
await measure("forgeStage({type:'barrow',populate:false})", () => forge.forge.stage({ type: 'barrow', size: 'small', populate: false, activate: false }));
await measure("forgeStage({type:'barrow',populate:true,heat:'fight'})", () => forge.forge.stage({ type: 'barrow', size: 'small', populate: true, heat: 'fight', activate: false }));

console.log('\n=== THE SPIKE: three linked areas, as DELVE would sequence them ===');
reset();
const t0 = Date.now();
for (const [i, heat] of [['1','skirmish'],['2','fight'],['3','battle']]) {
  try { await forge.forge.stage({ type: 'barrow', size: 'small', name: `Area ${i}`, populate: true, heat, activate: false }); }
  catch (e) { console.log(`   area ${i} threw: ${e.message.slice(0,80)}`); }
}
const s = snap();
console.log(`   3 areas → chat=${s.chat} folders=${s.folders} actors=${s.actors} scenes=${s.scenes} uploads=${s.uploads} Math.random=${s.random}  ${Date.now()-t0}ms`);
console.log(`   per area: ${(s.chat/3).toFixed(1)} chat cards, ${(s.folders/3).toFixed(1)} folders, ${(s.actors/3).toFixed(1)} actors`);
