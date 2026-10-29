import { describe, expect, it } from "vitest";
import {
  SCRAMBLE_CHARS,
  TEAR_STEPS,
  bands,
  enterIntensity,
  exitIntensity,
  glitchIntensity,
  glitchProgress,
  scramble,
  tearTable,
} from "@/lib/glitch";

/**
 * The glitch transitions are driven by these pure functions every frame, so
 * the properties below are load-bearing: determinism (no flicker), clean
 * ends (the effect never reads as a bug at rest), and in-bounds bands.
 */
describe("glitchIntensity", () => {
  it("is zero at both ends — clean at rest and after unpin", () => {
    expect(glitchIntensity(0)).toBe(0);
    expect(glitchIntensity(1)).toBe(0);
  });

  it("peaks in the middle range", () => {
    const values = Array.from({ length: 21 }, (_, i) =>
      glitchIntensity(i / 20),
    );
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    expect(peakIndex).toBeGreaterThan(2);
    expect(peakIndex).toBeLessThan(18);
    expect(values.at(-1)).toBe(0);
  });

  it("clamps out-of-range progress", () => {
    expect(glitchIntensity(-5)).toBe(0);
    expect(glitchIntensity(5)).toBe(0);
  });
});

describe("glitchProgress", () => {
  it("quantizes to discrete steps", () => {
    expect(glitchProgress(0.19, 10)).toBe(0.2);
    expect(glitchProgress(0.44, 10)).toBe(0.4);
  });

  it("clamps out-of-range progress", () => {
    expect(glitchProgress(-0.5)).toBe(0);
    expect(glitchProgress(1.7)).toBe(1);
  });
});

describe("scramble", () => {
  const text = "AI systems you can inspect, test, and trust.";

  it("resolves exactly to the text at progress 1", () => {
    expect(scramble(text, 1, 7)).toBe(text);
  });

  it("preserves spaces at every progress", () => {
    for (let p = 0; p < 1; p += 0.1) {
      const out = scramble(text, p, 7);
      out.split("").forEach((ch, i) => {
        if (text[i] === " ") expect(ch).toBe(" ");
      });
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(scramble(text, 0.37, 7)).toBe(scramble(text, 0.37, 7));
    expect(scramble(text, 0.0, 11)).toBe(scramble(text, 0.0, 11));
  });

  it("never resolves fewer real characters at higher progress", () => {
    let previous = 0;
    for (const p of [0.2, 0.4, 0.6, 0.8, 0.95, 1]) {
      const out = scramble(text, p, 7);
      const real = [...out].filter((ch, i) => text[i] !== " " && ch === text[i])
        .length;
      expect(real).toBeGreaterThanOrEqual(previous);
      previous = real;
    }
    expect(previous).toBe(text.replaceAll(" ", "").length);
  });

  it("scrambles everything at progress 0 except spaces", () => {
    const out = scramble(text, 0, 7);
    // Not the final text, and every scrambled slot shows a glyph from the
    // charset (or the preserved space).
    expect(out).not.toBe(text);
    [...out].forEach((ch) => {
      expect(ch === " " || SCRAMBLE_CHARS.includes(ch)).toBe(true);
    });
  });

  it("handles empty and single-character strings", () => {
    expect(scramble("", 0.5, 7)).toBe("");
    expect(scramble("A", 0, 7)).not.toBe("A");
    expect(scramble("A", 1, 7)).toBe("A");
  });
});

describe("enterIntensity", () => {
  it("starts high (the tear just happened) and ends at zero (clean unpin)", () => {
    expect(enterIntensity(0)).toBeGreaterThan(0.7);
    expect(enterIntensity(1)).toBe(0);
  });

  it("decays monotonically", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 20; i += 1) {
      const value = enterIntensity(i / 20);
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("exitIntensity", () => {
  it("starts clean and reaches full chaos at the teleport", () => {
    expect(exitIntensity(0)).toBe(0);
    expect(exitIntensity(1)).toBe(1);
  });

  it("ramps monotonically", () => {
    let previous = -1;
    for (let i = 0; i <= 20; i += 1) {
      const value = exitIntensity(i / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("holds back the tear early, then accelerates", () => {
    // A linear ramp would read as a wipe; the curve must stay subtle for the
    // first third and be most of the way there by the end.
    expect(exitIntensity(0.33)).toBeLessThan(0.25);
    expect(exitIntensity(0.9)).toBeGreaterThan(0.8);
  });
});

describe("tearTable", () => {
  it("returns one in-bounds band set per clone per step", () => {
    const table = tearTable();
    expect(table).toHaveLength(TEAR_STEPS);
    for (const step of table) {
      expect(step).toHaveLength(3);
      for (const entry of step) {
        expect(entry.top).toBeGreaterThanOrEqual(0);
        expect(entry.top + entry.height).toBeLessThanOrEqual(1);
        expect(entry.height).toBeGreaterThan(0);
        expect(Number.isFinite(entry.dx)).toBe(true);
      }
    }
  });

  it("is deterministic — same seed, same tear", () => {
    expect(tearTable()).toEqual(tearTable());
  });

  it("keeps the peak step's offsets inside the 64px budget", () => {
    for (const entry of tearTable().at(-1) ?? []) {
      expect(Math.abs(entry.dx)).toBeLessThanOrEqual(64);
    }
  });
});

describe("bands", () => {
  it("returns in-bounds, sorted, non-empty bands", () => {
    for (const seed of [1, 19, 4096]) {
      const list = bands(4, seed);
      expect(list).toHaveLength(4);
      for (const band of list) {
        expect(band.top).toBeGreaterThanOrEqual(0);
        expect(band.top + band.height).toBeLessThanOrEqual(1);
        expect(band.height).toBeGreaterThan(0);
      }
      const tops = list.map((b) => b.top);
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    }
  });

  it("is deterministic", () => {
    expect(bands(3, 5)).toEqual(bands(3, 5));
  });

  it("is empty for a zero count", () => {
    expect(bands(0, 5)).toEqual([]);
  });
});
