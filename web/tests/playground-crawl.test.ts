import { describe, expect, it } from "vitest";
import { createCrawlGeometry, fragmentProgress, viewportPoint } from "@/lib/playground-crawl";

describe("directional Playground crawl geometry", () => {
  it("moves fragment vectors toward the chosen activation point", () => {
    const origin = { x: 180, y: 220 };
    const geometry = createCrawlGeometry(900, 700, origin, 17, 80);
    for (const fragment of geometry.fragments) {
      const dot = fragment.inwardX * (origin.x - fragment.x) + fragment.inwardY * (origin.y - fragment.y);
      expect(dot).toBeGreaterThanOrEqual(-0.001);
    }
  });

  it("is deterministic and uses varied, in-bounds activation times", () => {
    const origin = { x: 720, y: 130 };
    const first = createCrawlGeometry(1200, 800, origin, 99, 180);
    const again = createCrawlGeometry(1200, 800, origin, 99, 180);
    expect(first).toEqual(again);
    expect(first.fragments.length).toBe(180);
    expect(first.fragments.every((fragment) => fragment.activation >= 0 && fragment.activation <= 0.94)).toBe(true);
    expect(new Set(first.fragments.map((fragment) => `${Math.round(fragment.width)}:${Math.round(fragment.height)}`)).size).toBeGreaterThan(20);
  });

  it("normalizes propagation to the nearest viewport boundary", () => {
    const centered = createCrawlGeometry(1000, 700, { x: 500, y: 350 }, 8, 120);
    const nearEdge = createCrawlGeometry(1000, 700, { x: 20, y: 40 }, 8, 120);
    expect(Math.min(...centered.fragments.map((item) => item.activation))).toBeLessThan(0.2);
    expect(Math.max(...centered.fragments.map((item) => item.activation))).toBeGreaterThan(0.7);
    expect(Math.min(...nearEdge.fragments.map((item) => item.activation))).toBeLessThan(0.2);
    expect(Math.max(...nearEdge.fragments.map((item) => item.activation))).toBeGreaterThan(0.7);
  });

  it("activates at the frontier, then settles each patch behind it", () => {
    const fragment = createCrawlGeometry(600, 500, { x: 300, y: 250 }, 2, 1).fragments[0];
    expect(fragmentProgress(fragment, fragment.activation - 0.001)).toBe(0);
    expect(fragmentProgress(fragment, fragment.activation + fragment.duration / 2)).toBeGreaterThan(0);
    expect(fragmentProgress(fragment, 1)).toBe(1);
  });

  it("clamps click positions and handles corners without invalid geometry", () => {
    expect(viewportPoint(-3, 900, 500, 300)).toEqual({ x: 0, y: 300 });
    const geometry = createCrawlGeometry(500, 300, { x: 0, y: 300 }, 4, 80);
    expect(geometry.fragments.every((fragment) =>
      Number.isFinite(fragment.x) && Number.isFinite(fragment.y) &&
      Number.isFinite(fragment.inwardX) && Number.isFinite(fragment.inwardY) &&
      Number.isFinite(fragment.activation),
    )).toBe(true);
  });
});
