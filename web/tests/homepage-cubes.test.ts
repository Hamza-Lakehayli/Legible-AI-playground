import { describe, expect, it } from "vitest";
import { CUBE_FACES, HOMEPAGE_CUBES } from "@/lib/homepage-cubes";

describe("homepage cube space", () => {
  it("defines all six faces for real three-dimensional rotation", () => {
    expect(new Set(CUBE_FACES).size).toBe(6);
    expect(CUBE_FACES).toEqual(["front", "back", "left", "right", "top", "bottom"]);
  });

  it("distributes cubes through the scene, including behind the central sheets", () => {
    expect(HOMEPAGE_CUBES.length).toBe(10);
    expect(HOMEPAGE_CUBES.some((cube) => cube.x > 35 && cube.x < 70)).toBe(true);
    expect(HOMEPAGE_CUBES.some((cube) => cube.x < 10)).toBe(true);
    expect(HOMEPAGE_CUBES.some((cube) => cube.x > 85)).toBe(true);
    expect(HOMEPAGE_CUBES.some((cube) => cube.y < 25)).toBe(true);
    expect(HOMEPAGE_CUBES.some((cube) => cube.y > 75)).toBe(true);
  });

  it("uses slow, varied movement and a restrained outline palette", () => {
    expect(new Set(HOMEPAGE_CUBES.map((cube) => cube.rotation)).size).toBeGreaterThan(5);
    expect(HOMEPAGE_CUBES.filter((cube) => cube.accent)).toHaveLength(2);
    for (const cube of HOMEPAGE_CUBES) {
      expect(cube.rotation).toBeGreaterThanOrEqual(30);
      expect(cube.drift).toBeGreaterThanOrEqual(18);
      expect(cube.opacity).toBeLessThan(0.5);
      expect(cube.size).toBeGreaterThan(32);
      expect(cube.x).toBeGreaterThanOrEqual(0);
      expect(cube.x).toBeLessThan(100);
    }
  });
});
