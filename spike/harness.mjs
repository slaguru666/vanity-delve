// DELVE seam spike — runs VANITY's Forge outside Foundry against instrumented stubs,
// to measure the side effects draft 5 §5 claims. Read-only: creates nothing real.
export const log = { chat: [], folders: [], actors: [], scenes: [], uploads: [], random: 0, notifications: [] };

// A permissive auto-stub: callable, constructible, and any property yields another stub.
const stub = (name = 'stub') => new Proxy(function () {}, {
  get(t, p) {
    if (p === Symbol.toPrimitive) return () => name;
    if (p === 'then') return undefined;                 // never look thenable
    if (p === Symbol.iterator) return function* () {};
    if (p === 'name') return name;
    if (p === 'prototype') return t.prototype;
    if (!(p in t)) t[p] = stub(`${name}.${String(p)}`);
    return t[p];
  },
  apply: () => stub(`${name}()`),
  construct: () => stub(`new ${name}`),
});

const hooks = { init: [], ready: [], other: [] };
globalThis.Hooks = {
  once: (h, fn) => (hooks[h] ?? hooks.other).push(fn),
  on:   (h, fn) => (hooks[h] ?? hooks.other).push(fn),
  callAll: () => true, call: () => true,
};

globalThis.CONFIG = stub('CONFIG');
globalThis.CONST = new Proxy({}, { get: (_t, p) => {
  if (p === 'CHAT_MESSAGE_STYLES' || p === 'CHAT_MESSAGE_TYPES') return { OTHER: 0, OOC: 1, IC: 2, EMOTE: 3, WHISPER: 4, ROLL: 5 };
  if (p === 'DOCUMENT_OWNERSHIP_LEVELS') return { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 };
  if (p === 'TOKEN_DISPOSITIONS') return { HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1, SECRET: -2 };
  if (p === 'GRID_TYPES') return { GRIDLESS: 0, SQUARE: 1 };
  return 0;
} });
globalThis.Handlebars = { registerHelper: () => {} };
globalThis.canvas = stub('canvas');
globalThis.fromUuid = async () => null;
globalThis.mergeObject = (a, b) => ({ ...a, ...b });
globalThis.duplicate = o => JSON.parse(JSON.stringify(o));
globalThis.Dialog = stub('Dialog');
globalThis.ui = { notifications: {
  info: m => log.notifications.push(['info', m]),
  warn: m => log.notifications.push(['warn', m]),
  error: m => log.notifications.push(['error', m]),
} };

let uid = 0;
const doc = (kind, data) => {
  const id = `${kind}${++uid}`;
  return { id, _id: id, uuid: `${kind}.${id}`, name: data?.name ?? id, img: data?.img ?? '',
           ...data, update: async () => {}, createEmbeddedDocuments: async () => [],
           setFlag: async () => {}, getFlag: () => undefined, sheet: { render: () => {} } };
};

// These must be CLASSES — the system subclasses them (`class VanityActor extends Actor`).
class BaseDoc {
  constructor(data = {}) { Object.assign(this, doc('doc', data)); }
  async update() {} async createEmbeddedDocuments() { return []; }
  async setFlag() {} getFlag() { return undefined; }
  prepareData() {} prepareDerivedData() {}
  static async create(d) { return doc('doc', d); }
}
globalThis.ChatMessage = class ChatMessage extends BaseDoc {
  static async create(d) { log.chat.push(d?.content ?? ''); return doc('msg', d); }
  static getWhisperRecipients() { return ['gm']; }
  static applyRollMode(d) { return d; }
};
globalThis.Folder = class Folder extends BaseDoc {
  static async create(d) { log.folders.push(d?.name); return doc('fld', d); }
};
globalThis.Actor = class Actor extends BaseDoc {
  static async create(d) { log.actors.push(d?.name); return doc('act', d); }
};
globalThis.Item = class Item extends BaseDoc {
  static async create(d) { return doc('itm', d); }
};
globalThis.Scene = class Scene extends BaseDoc {
  static async create(d) { log.scenes.push(d?.name); return doc('scn', d); }
};

class FakeRoll {
  constructor(f) { this.formula = f; this.total = 0; this.terms = []; this.dice = []; }
  async evaluate() { const n = parseInt(this.formula) || 1; this.total = n; return this; }
  async toMessage(d) { log.chat.push(`[Roll ${this.formula}]`); return doc('msg', d); }
}
globalThis.Roll = FakeRoll;

globalThis.foundry = new Proxy({}, { get(t, p) {
  if (p === 'appv1')  return { sheets: { ActorSheet: class {}, ItemSheet: class {} } };
  if (p === 'utils')  return { mergeObject: globalThis.mergeObject, duplicate: globalThis.duplicate, randomID: () => `id${++uid}` };
  if (p === 'applications') return { apps: { FilePicker: { implementation: {
      createDirectory: async () => {},
      upload: async (_s, dir, file) => { log.uploads.push(`${dir}/${file?.name ?? 'file'}`); return { path: `${dir}/x.png` }; },
  } } }, api: { ApplicationV2: class {}, HandlebarsApplicationMixin: c => c }, sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} } };
  if (p === 'documents') return new Proxy({}, { get(_t, q) {
      if (q === 'collections') return {
        Actors: { registerSheet: () => {}, unregisterSheet: () => {} },
        Items:  { registerSheet: () => {}, unregisterSheet: () => {} } };
      return class extends BaseDoc {};   // Combatant, Combat, TokenDocument, ...
  } });
  return stub(`foundry.${String(p)}`);
} });
globalThis.FilePicker = globalThis.foundry.applications.apps.FilePicker.implementation;

// Browser APIs forgeStage() needs to rasterise its SVG. Their absence in Node is itself a
// finding: the Forge's map path cannot run outside a browser at all.
globalThis.Image = class { set src(v) { this._s = v; queueMicrotask(() => this.onload?.()); } get src() { return this._s; } };
globalThis.Blob = globalThis.Blob ?? class { constructor(p, o) { this.parts = p; this.type = o?.type; } };
globalThis.File = globalThis.File ?? class { constructor(p, n, o) { this.name = n; this.type = o?.type; } };
globalThis.URL.createObjectURL = () => 'blob:fake';
globalThis.URL.revokeObjectURL = () => {};
globalThis.XMLSerializer = class { serializeToString() { return '<svg/>'; } };
globalThis.document = {
  createElement: tag => tag === 'canvas'
    ? { width: 0, height: 0, getContext: () => ({ drawImage() {}, fillRect() {} }),
        toBlob: cb => cb(new globalThis.Blob([''], { type: 'image/png' })) }
    : { style: {}, setAttribute() {}, appendChild() {}, remove() {} },
  querySelector: () => null, body: { appendChild() {}, removeChild() {} },
};

// Foundry extends String.prototype; the Forge relies on it.
String.prototype.slugify = function (o) { return this.toLowerCase().replace(/[^a-z0-9]+/g, o?.replacement ?? '-').replace(/^-|-$/g, ''); };
String.prototype.titleCase = function () { return this.replace(/\b\w/g, c => c.toUpperCase()); };

// A pack stub so compendium-backed generators (hoards, bestiary picks) can complete.
const fakePack = (name) => ({
  metadata: { id: `vanity.${name}`, label: name },
  index: { contents: [], find: () => null, filter: () => [] },
  // Some gear must be consumable: forgeHoard does rnd(gear.filter(g => g.system.consumable))
  // and rnd() on an empty array returns undefined, which then throws on .uuid (vanity.mjs:1969).
  getDocuments: async () => Array.from({ length: 40 }, (_, i) =>
    doc('itm', { name: `${name} item ${i + 1}`, type: 'gear',
                 system: { consumable: i % 3 === 0, relic: i % 5 === 0 } })),
  getDocument: async () => doc('itm', { name: `${name} item`, type: 'gear', system: {} }),
  getIndex: async () => [],
});

globalThis.game = {
  user: { isGM: true, id: 'gm', name: 'GM' },
  users: { filter: () => [], find: () => null },
  i18n: { localize: s => s, format: s => s },
  settings: { register: () => {}, get: () => true, set: async () => {} },
  packs: { get: id => fakePack(String(id).split('.').pop()), find: () => fakePack('x'), filter: () => [] },
  folders: { find: () => null, filter: () => [] },
  actors: { find: () => null, filter: () => [], get: () => null },
  items:  { find: () => null, filter: () => [] },
  scenes: { find: () => null, filter: () => [] },
  tables: { find: () => null, getName: () => null },
  messages: { get: () => null },
  combat: null, combats: [], system: { version: '0.10.3' },
  modules: { get: () => ({ active: false }) },
};

export async function boot(systemPath) {
  const realRandom = Math.random;
  Math.random = () => { log.random++; return realRandom(); };
  await import(systemPath);
  for (const fn of hooks.init) await fn();
  return globalThis.game.vanity;
}
export function reset() { for (const k of ['chat','folders','actors','scenes','uploads','notifications']) log[k] = []; log.random = 0; }
