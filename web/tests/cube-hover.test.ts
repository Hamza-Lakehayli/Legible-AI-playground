import { describe, expect, it } from "vitest";
import {
  CUBE_TEAR_DURATION_MS,
  CUBE_TEAR_PEAK_HOLD_MS,
  CUBE_TEAR_SEED,
  cubeHoverEnabled,
  cubeTearProgress,
  cubeTearSlices,
  pointerInsideCube,
  projectedCubeBounds,
} from "@/lib/cube-hover";

describe("cube hover projection", () => {
  it("covers the rotating face projections rather than only the untransformed box", () => {
    const bounds = projectedCubeBounds([
      { left: 14, right: 90, top: 20, bottom: 83 },
      { left: 35, right: 110, top: 9, bottom: 70 },
    ]);
    expect(bounds).toEqual({ left: 14, right: 110, top: 9, bottom: 83 });
    expect(pointerInsideCube(100, 30, bounds!)).toBe(true);
    expect(pointerInsideCube(111, 30, bounds!)).toBe(false);
    expect(pointerInsideCube(30, 84, bounds!)).toBe(false);
    expect(projectedCubeBounds([])).toBeNull();
  });
});

describe("cube hover safeguards", () => {
  const enabled = {
    finePointer: true,
    reducedMotion: false,
    paused: false,
    hidden: false,
    transitionOwned: false,
    running: true,
  };

  it("allows mouse interaction only while the scene is running", () => {
    expect(cubeHoverEnabled(enabled)).toBe(true);
    expect(cubeHoverEnabled({ ...enabled, running: false })).toBe(false);
  });

  it("disables glitches for touch, reduced motion, pause, hidden tabs, and navigation", () => {
    expect(cubeHoverEnabled({ ...enabled, finePointer: false })).toBe(false);
    expect(cubeHoverEnabled({ ...enabled, reducedMotion: true })).toBe(false);
    expect(cubeHoverEnabled({ ...enabled, paused: true })).toBe(false);
    expect(cubeHoverEnabled({ ...enabled, hidden: true })).toBe(false);
    expect(cubeHoverEnabled({ ...enabled, transitionOwned: true })).toBe(false);
  });
});

describe("cube frame tears", () => {
  it("partitions the projected frame into deterministic complementary strips", () => {
    for (const seed of [CUBE_TEAR_SEED, 19, 4096]) {
      for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
        const slices = cubeTearSlices(progress, 104, seed);
        const last = slices[slices.length - 1];
        expect(slices).toHaveLength(7);
        expect(slices[0]?.top).toBe(0);
        expect(last.top + last.height).toBeCloseTo(1);
        slices.forEach((slice, index) => {
          expect(slice.height).toBeGreaterThan(0);
          expect(slice.top).toBeGreaterThanOrEqual(0);
          expect(slice.top + slice.height).toBeLessThanOrEqual(1);
          if (index > 0) {
            expect(slice.top).toBeCloseTo(slices[index - 1].top + slices[index - 1].height);
          }
        });
        expect(slices).toEqual(cubeTearSlices(progress, 104, seed));
      }
    }
  });

  it("moves three bands by size-scaled offsets and resolves every strip exactly", () => {
    const small = cubeTearSlices(0, 36, CUBE_TEAR_SEED);
    const large = cubeTearSlices(0, 136, CUBE_TEAR_SEED);
    expect(small.filter((slice) => slice.dx !== 0)).toHaveLength(3);
    expect(large.filter((slice) => slice.dx !== 0)).toHaveLength(3);
    expect(Math.max(...large.map((slice) => Math.abs(slice.dx)))).toBeGreaterThan(
      Math.max(...small.map((slice) => Math.abs(slice.dx))),
    );
    expect(Math.max(...small.map((slice) => Math.abs(slice.dx)))).toBeGreaterThanOrEqual(4.5);
    expect(Math.max(...large.map((slice) => Math.abs(slice.dx)))).toBeGreaterThan(8);
    expect(Math.max(...large.map((slice) => Math.abs(slice.dx)))).toBeLessThanOrEqual(14);
    expect(cubeTearSlices(1, 136, CUBE_TEAR_SEED).every((slice) => slice.dx === 0)).toBe(true);
  });

  it("holds the strong first tear briefly before resolving within the same duration", () => {
    expect(cubeTearProgress(0)).toBe(0);
    expect(cubeTearProgress(CUBE_TEAR_PEAK_HOLD_MS)).toBe(0);
    expect(cubeTearProgress(CUBE_TEAR_DURATION_MS)).toBe(1);
    expect(cubeTearProgress(CUBE_TEAR_DURATION_MS + 10)).toBe(1);
    expect(cubeTearSlices(cubeTearProgress(0), 104, CUBE_TEAR_SEED)).toEqual(
      cubeTearSlices(cubeTearProgress(CUBE_TEAR_PEAK_HOLD_MS), 104, CUBE_TEAR_SEED),
    );
  });

  it("holds each tear pose to the existing stepped glitch cadence", () => {
    expect(cubeTearSlices(0.01, 72, CUBE_TEAR_SEED)).toEqual(
      cubeTearSlices(0.05, 72, CUBE_TEAR_SEED),
    );
  });
});
