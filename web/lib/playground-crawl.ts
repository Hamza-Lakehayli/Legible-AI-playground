export type Point = { x: number; y: number };
export type CrawlFragment = {
  x: number; y: number; width: number; height: number; angle: number;
  inwardX: number; inwardY: number; activation: number; duration: number; seed: number; tone: number;
};
export type CoveragePatch = { x: number; y: number; width: number; height: number; activation: number; tone: number };
export type CrawlGeometry = { width: number; height: number; origin: Point; fragments: CrawlFragment[]; patches: CoveragePatch[] };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function random(seed: number) {
  let value = seed >>> 0 || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** Perimeter-normalized propagation: every viewport side can start first. */
export function createCrawlGeometry(width: number, height: number, origin: Point, seed = 41, count = 320): CrawlGeometry {
  const w = Math.max(1, width), h = Math.max(1, height);
  const center = viewportPoint(origin.x, origin.y, w, h);
  const rng = random(seed);
  const sectors = Array.from({ length: 16 }, () => (rng() - 0.5) * 0.12);
  const activationAt = (x: number, y: number) => {
    const dx = x - center.x, dy = y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return 0.94;
    const ux = dx / distance, uy = dy / distance;
    const tx = ux > 0 ? (w - center.x) / ux : ux < 0 ? -center.x / ux : Infinity;
    const ty = uy > 0 ? (h - center.y) / uy : uy < 0 ? -center.y / uy : Infinity;
    const rayLength = Math.max(distance, Math.min(tx > 0 ? tx : Infinity, ty > 0 ? ty : Infinity));
    const sector = Math.floor((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * 16) % 16;
    return clamp((1 - distance / rayLength) * 0.94 + sectors[sector] + Math.sin(x * 0.022 + y * 0.016) * 0.025, 0, 0.94);
  };

  // Uneven rectangles partition the entire screen. The settled trail is a
  // connected navy surface, not hundreds of floating disconnected particles.
  const patches: CoveragePatch[] = [];
  const cells = [{ x: 0, y: 0, width: w, height: h }];
  while (cells.length && patches.length + cells.length < 850) {
    const cell = cells.pop()!;
    const splitX = cell.width / 72 > cell.height / 28;
    if ((splitX ? cell.width > 64 : cell.height > 26) && cell.width > 12 && cell.height > 8) {
      const fraction = 0.3 + rng() * 0.4;
      if (splitX) {
        const size = cell.width * fraction;
        cells.push({ ...cell, width: size }, { ...cell, x: cell.x + size, width: cell.width - size });
      } else {
        const size = cell.height * fraction;
        cells.push({ ...cell, height: size }, { ...cell, y: cell.y + size, height: cell.height - size });
      }
    } else {
      patches.push({ ...cell, activation: activationAt(cell.x + cell.width / 2, cell.y + cell.height / 2), tone: rng() });
    }
  }
  for (const cell of cells) patches.push({ ...cell, activation: activationAt(cell.x + cell.width / 2, cell.y + cell.height / 2), tone: rng() });

  const fragments: CrawlFragment[] = [];
  for (let index = 0; index < clamp(count, 1, 600); index++) {
    const x = rng() * w, y = rng() * h;
    const dx = center.x - x, dy = center.y - y;
    const distance = Math.hypot(dx, dy);
    const ux = distance > 0.001 ? dx / distance : 0;
    const uy = distance > 0.001 ? dy / distance : -1;
    fragments.push({
      x, y, width: 18 + rng() ** 1.8 * Math.min(100, w * 0.16),
      height: 2 + rng() ** 1.5 * Math.min(22, h * 0.04),
      angle: Math.atan2(uy, ux) + (rng() - 0.5) * 0.15,
      inwardX: ux, inwardY: uy,
      activation: clamp(activationAt(x, y) - 0.07 + (rng() - 0.5) * 0.06, 0, 0.9),
      duration: 0.08 + rng() * 0.09, seed: rng(), tone: rng(),
    });
  }
  return { width: w, height: h, origin: center, fragments, patches };
}

export function fragmentProgress(fragment: CrawlFragment, progress: number): number {
  return progress < fragment.activation ? 0 : clamp((progress - fragment.activation) / fragment.duration, 0, 1);
}
export function viewportPoint(x: number, y: number, width: number, height: number): Point {
  return { x: clamp(x, 0, Math.max(0, width)), y: clamp(y, 0, Math.max(0, height)) };
}
