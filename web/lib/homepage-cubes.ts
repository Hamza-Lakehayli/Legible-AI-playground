/** Authored positions keep the shared space stable across renders and reloads. */
export const HOMEPAGE_CUBES = [
  { x: 6, y: 23, size: 72, opacity: 0.34, rotation: 38, drift: 19, delay: -7, accent: false },
  { x: 26, y: 17, size: 42, opacity: 0.2, rotation: 56, drift: 27, delay: -23, accent: false },
  { x: 86, y: 19, size: 104, opacity: 0.3, rotation: 46, drift: 23, delay: -15, accent: true },
  { x: 70, y: 31, size: 52, opacity: 0.24, rotation: 64, drift: 29, delay: -31, accent: false },
  { x: 2, y: 57, size: 136, opacity: 0.38, rotation: 52, drift: 25, delay: -19, accent: false },
  { x: 94, y: 49, size: 64, opacity: 0.35, rotation: 34, drift: 21, delay: -11, accent: false },
  { x: 23, y: 72, size: 88, opacity: 0.27, rotation: 48, drift: 24, delay: -29, accent: true },
  { x: 45, y: 82, size: 112, opacity: 0.3, rotation: 60, drift: 31, delay: -37, accent: false },
  { x: 68, y: 73, size: 74, opacity: 0.28, rotation: 42, drift: 26, delay: -17, accent: false },
  { x: 89, y: 87, size: 124, opacity: 0.36, rotation: 54, drift: 28, delay: -41, accent: false },
] as const;

export const CUBE_FACES = ["front", "back", "left", "right", "top", "bottom"] as const;
