/**
 * Seeded randomness with derived streams.
 *
 * Draft 5 §11: a delve is reproducible from its skeleton seed. That only holds if every
 * component draws from its *own* stream — otherwise materialising areas in a different order
 * changes every subsequent draw. So each component derives a named sub-seed:
 *
 *     seed::skeleton
 *     seed::area::a3::feature
 *     seed::area::a3::encounter
 *
 * Two rules make this work:
 *   1. Never share an Rng between components.
 *   2. Never let draw *count* in one component affect another.
 */

/** xmur3: string → 32-bit seed. */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** sfc32: small, fast, good enough for content generation. */
function sfc32(a, b, c, d) {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seedString) {
    this.seed = String(seedString);
    const h = xmur3(this.seed);
    this._next = sfc32(h(), h(), h(), h());
    this.draws = 0;
  }

  /** A new independent stream. Order-independent by construction. */
  derive(...parts) {
    return new Rng(`${this.seed}::${parts.join('::')}`);
  }

  float() { this.draws++; return this._next(); }

  /** Integer in [0, n). */
  int(n) { return Math.floor(this.float() * n); }

  /** Integer in [min, max] inclusive. */
  between(min, max) { return min + this.int(max - min + 1); }

  chance(p) { return this.float() < p; }

  pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[this.int(arr.length)];
  }

  /** n distinct items, or as many as exist. Never returns undefined holes. */
  pickN(arr, n) {
    const pool = [...(arr ?? [])];
    const out = [];
    while (n-- > 0 && pool.length) out.push(pool.splice(this.int(pool.length), 1)[0]);
    return out;
  }

  shuffle(arr) {
    const a = [...(arr ?? [])];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Weighted pick from {key: weight} or [[value, weight], ...]. */
  weighted(spec) {
    const entries = Array.isArray(spec) ? spec : Object.entries(spec);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return undefined;
    let r = this.float() * total;
    for (const [value, w] of entries) { r -= w; if (r < 0) return value; }
    return entries[entries.length - 1][0];
  }

  /** d6 pool; VANITY counts 5–6 as Successes. Used for generation only, never table dice. */
  pool(n) { return Array.from({ length: n }, () => this.between(1, 6)); }
}

/** A random, human-sayable seed — two words and a number. */
export function coinSeed(rng = new Rng(String(Date.now()))) {
  const a = ['gilded', 'hollow', 'salt', 'ember', 'quiet', 'crooked', 'pale', 'brazen'];
  const b = ['court', 'crown', 'mirror', 'vigil', 'debt', 'mask', 'hymn', 'tally'];
  return `${rng.pick(a)}-${rng.pick(b)}-${rng.between(100, 999)}`;
}
