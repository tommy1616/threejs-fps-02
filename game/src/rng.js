export function mulberry32(seed) {
 let a = seed >>> 0;
 return function random() {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

export function normalizeSeed(seed) {
 const numeric = Number(seed);
 if (Number.isFinite(numeric) && numeric > 0) return numeric >>> 0;
 const text = String(seed ?? 'saltworks');
 let hash = 2166136261;
 for (let index = 0; index < text.length; index += 1) {
  hash ^= text.charCodeAt(index);
  hash = Math.imul(hash, 16777619);
 }
 return hash >>> 0;
}

export function nextRange(rng, min, max) {
 return min + (max - min) * rng();
}

export function nextInt(rng, min, maxExclusive) {
 return min + Math.floor(rng() * (maxExclusive - min));
}

export function pick(rng, items) {
 return items[Math.floor(rng() * items.length) % items.length];
}

export function nextSign(rng) {
 return rng() < 0.5 ? -1 : 1;
}
