import {
  TEAR_STEPS,
  enterIntensity,
  glitchProgress,
  tearTable,
} from "@/lib/glitch";

export interface CubeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CubeTearSlice {
  top: number;
  height: number;
  dx: number;
}

export const CUBE_TEAR_DURATION_MS = 320;
export const CUBE_TEAR_PEAK_HOLD_MS = 64;
export const CUBE_TEAR_SEED = 0x4c4547;

export function cubeTearProgress(elapsedMs: number): number {
  return Math.max(
    0,
    Math.min(
      1,
      (elapsedMs - CUBE_TEAR_PEAK_HOLD_MS) /
        (CUBE_TEAR_DURATION_MS - CUBE_TEAR_PEAK_HOLD_MS),
    ),
  );
}

/** Face projections change during rotation; use their union, not the layout box. */
export function projectedCubeBounds(faces: CubeBounds[]): CubeBounds | null {
  if (faces.length === 0) return null;
  return {
    left: Math.min(...faces.map((face) => face.left)),
    right: Math.max(...faces.map((face) => face.right)),
    top: Math.min(...faces.map((face) => face.top)),
    bottom: Math.max(...faces.map((face) => face.bottom)),
  };
}

export function pointerInsideCube(x: number, y: number, bounds: CubeBounds): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function cubeHoverEnabled(options: {
  finePointer: boolean;
  reducedMotion: boolean;
  paused: boolean;
  hidden: boolean;
  transitionOwned: boolean;
  running: boolean;
}): boolean {
  return options.finePointer && !options.reducedMotion && !options.paused &&
    !options.hidden && !options.transitionOwned && options.running;
}

/** A deterministic, complete frame partition with three independently moving bands. */
export function cubeTearSlices(
  progress: number,
  frameSize: number,
  seed = CUBE_TEAR_SEED,
): CubeTearSlice[] {
  const quantizedProgress = glitchProgress(progress, TEAR_STEPS - 1);
  const step = Math.round(quantizedProgress * (TEAR_STEPS - 1));
  const sourceBands = (tearTable(TEAR_STEPS, seed)[step] ?? []).map((band) => ({
    ...band,
    height: Math.min(0.2, band.height * 1.25),
  }));
  const normalizedBands: Array<{ top: number; height: number; dx: number }> = [];
  let cursor = 0;

  sourceBands.forEach((band, index) => {
    const remaining = sourceBands.slice(index + 1);
    const remainingSpace =
      remaining.reduce((total, next) => total + next.height, 0) +
      remaining.length * 0.02 +
      0.02;
    const minTop = cursor + 0.02;
    const maxTop = 1 - band.height - remainingSpace;
    const top = Math.min(Math.max(band.top, minTop), maxTop);
    normalizedBands.push({ top, height: band.height, dx: band.dx });
    cursor = top + band.height;
  });

  const maxDisplacement = Math.min(14, Math.max(5, frameSize * 0.1));
  const minDisplacement = Math.min(maxDisplacement, Math.max(5, frameSize * 0.075));
  const intensity = enterIntensity(quantizedProgress);
  const slices: CubeTearSlice[] = [];
  cursor = 0;

  normalizedBands.forEach((band) => {
    if (band.top > cursor) {
      slices.push({ top: cursor, height: band.top - cursor, dx: 0 });
    }
    const bandScale = Math.min(1, Math.abs(band.dx) / 64);
    const magnitude =
      (minDisplacement + bandScale * (maxDisplacement - minDisplacement)) *
      intensity;
    slices.push({
      top: band.top,
      height: band.height,
      dx: Math.sign(band.dx) * magnitude,
    });
    cursor = band.top + band.height;
  });

  if (cursor < 1) {
    slices.push({ top: cursor, height: 1 - cursor, dx: 0 });
  }
  return slices;
}
