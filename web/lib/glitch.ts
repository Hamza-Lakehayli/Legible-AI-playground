/**
 * Pure helpers for the glitch transitions (docs/hero-glitch-plan.md).
 *
 * Everything here is deterministic: the same (text, progress, seed) always
 * produces the same output, so the animation never flickers or repaints
 * differently frame-to-frame. Transition progress is quantized into discrete
 * steps before these functions are called, which is what gives the glitch
 * its "tearing" snap instead of a smooth glide.
 *
 * v3 — discrete landings: transitions are time-based sequences (exit tear →
 * teleport behind the chaos → enter decay) rather than a scroll scrub, so a
 * paused scroll can never freeze a half-torn frame. Both curves below are
 * clean at 0 and 1.
 */

/** Mulberry32 — small, fast, seeded PRNG. Deterministic across calls. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Scramble glyph vocabulary: hex, binary, and a few block characters.
 * All fixed-width/mono-safe; pairs with Geist Mono styling.
 */
export const SCRAMBLE_CHARS = "01ABCDEFabcdef01234567▖▗▘▝▚▞█▌▐░▒▓";

/**
 * glitchIntensity(p): visual intensity for raw progress p in [0,1].
 * Zero at both ends, peaking mid-range — otherwise the effect would read as
 * a bug.
 */
export function glitchIntensity(p: number): number {
  const x = clamp01(p);
  return (4 * x * (1 - x) ** 1.5 + x * (1 - x)) ** 0.8;
}

/**
 * glitchProgress(p): quantized scroll progress. Scroll scrub advances in
 * `steps` discrete jumps between 0 and 1 — the discrete snap that makes
 * slices and glyphs jump rather than glide (plan: "reset snap offsets").
 */
export function glitchProgress(p: number, steps = 24): number {
  return Math.round(clamp01(p) * steps) / steps;
}

/**
 * scramble(text, progress, seed): chars resolve into the final text as
 * progress advances, roughly left-to-right. Spaces never scramble (word
 * shapes stay stable, which keeps the tear legible against Kimi's version).
 *
 * At progress >= 1 the output is exactly `text` — the transition must
 * resolve cleanly before the hero unpins.
 */
export function scramble(text: string, progress: number, seed: number): string {
  if (progress >= 1) return text;
  const resolveRandom = rng(seed);
  const glyphRandom = rng(seed ^ 0x9e3779b9);

  // Per-index resolve time: spreads the decode across progress 0.12–0.96
  // with per-char jitter. Chars lock in out of order (like token streaming);
  // late chars never resolve before the scrub is nearly done.
  const resolveAt = [...text].map((_, i) => {
    const t = 0.12 + (i / Math.max(1, text.length - 1)) * 0.72;
    return Math.min(0.96, t + resolveRandom() * 0.12);
  });

  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === " " || resolveAt[i] <= progress) {
      out += ch;
    } else {
      out += SCRAMBLE_CHARS[Math.floor(glyphRandom() * SCRAMBLE_CHARS.length)];
    }
  }
  return out;
}

/**
 * enterIntensity(p): the tear-in decay. Starts strong (≈ the peak of
 * glitchIntensity — "the swap just happened") and decays monotonically to a
 * clean frame. `reach` maps p into the descending tail of glitchIntensity
 * (starting at its ~0.48 peak) so the curve is strictly decreasing.
 */
export function enterIntensity(p: number): number {
  return glitchIntensity(0.48 + clamp01(p) * 0.52);
}

/**
 * exitIntensity(p): the tear-out ramp. The inverse of enterIntensity: clean
 * at 0, fully chaotic at 1 (the teleport happens at the peak of the chaos).
 */
export function exitIntensity(p: number): number {
  return clamp01(p) ** 1.6;
}

/**
 * Number of discrete tear buckets per transition, and the tear table built
 * from them: `tearTable()[step][clone]` = one band (top/height as fractions
 * of the content height) plus a horizontal offset `dx` in px, precomputed so
 * the tear snaps between bucket states instead of sliding.
 */
export const TEAR_STEPS = 9;
export const TEAR_SEED = 991;

export type TearEntry = { top: number; height: number; dx: number };

export function tearTable(steps = TEAR_STEPS, seed = TEAR_SEED): TearEntry[][] {
  return Array.from({ length: steps }, (_, step) => {
    const random = rng((step + 1) * seed);
    const intensity = glitchIntensity(step / (steps - 1));
    const reach = (0.35 + intensity) / 1.35;
    return bands(3, (step + 1) * seed).map((band) => ({
      ...band,
      dx: (random() < 0.5 ? -1 : 1) * (8 + random() * 56) * reach,
    }));
  });
}

/**
 * bands(count, seed): horizontal slice-tear bands as fractions of the
 * content height, sorted top-to-bottom and within [0, 1].
 */
export function bands(
  count: number,
  seed: number,
): Array<{ top: number; height: number }> {
  const random = rng(seed);
  const result: Array<{ top: number; height: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const height = 0.04 + random() * 0.12;
    const top = random() * Math.max(0, 1 - height);
    result.push({ top, height });
  }
  return result.sort((a, b) => a.top - b.top);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
