/** Mulberry32 — deterministic PRNG for reproducible synthetic data. */
export function createSeededRng(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
  };
}
