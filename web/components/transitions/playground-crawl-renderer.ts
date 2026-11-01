import { createCrawlGeometry, fragmentProgress, type CrawlGeometry, type Point } from "@/lib/playground-crawl";
import { CRAWL_MS } from "@/lib/playground-transition";

export const NAVY = "#071426";

/** Deterministic frame rendering, also used by the visual-preview harness. */
export function drawCrawlFrame(ctx: CanvasRenderingContext2D, geometry: CrawlGeometry, progress: number) {
  const { width, height } = geometry;
  ctx.clearRect(0, 0, width, height);
  const p = Math.min(1, Math.max(0, progress));
  // Gentle acceleration with coherent irregularities in the spatial delays.
  const advance = 1 - Math.pow(1 - p, 1.15);
  for (const patch of geometry.patches) {
    if (advance < patch.activation) continue;
    const age = advance - patch.activation;
    ctx.fillStyle = age < 0.065 && patch.tone > 0.76 ? "#102944" : NAVY;
    ctx.fillRect(patch.x, patch.y, patch.width + 0.7, patch.height + 0.7);
  }
  for (const fragment of geometry.fragments) {
    const travel = fragmentProgress(fragment, advance);
    if (travel <= 0 || travel >= 1) continue;
    const distance = 25 + fragment.seed * 78;
    // Translate in WORLD space, then rotate just the rectangular shape. Using
    // world vectors after rotation would rotate the direction twice.
    ctx.save();
    ctx.translate(fragment.x - fragment.inwardX * distance * (1 - travel), fragment.y - fragment.inwardY * distance * (1 - travel));
    ctx.rotate(fragment.angle);
    ctx.globalAlpha = Math.sin(travel * Math.PI) * (fragment.tone > 0.96 ? 0.65 : 0.9);
    ctx.fillStyle = fragment.tone > 0.988 ? "#A96B98" : fragment.tone > 0.96 ? "#79BDD9" : fragment.tone > 0.82 ? "#244463" : "#0D2240";
    ctx.fillRect(-fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height);
    ctx.restore();
  }
  if (p === 1) { ctx.fillStyle = NAVY; ctx.fillRect(0, 0, width, height); }
}

/** No idle animation loop: the last frame is solid, and all listeners detach. */
export function runCrawl(canvas: HTMLCanvasElement, origin: Point, onCovered: () => void): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) { onCovered(); return () => {}; }
  const width = window.innerWidth, height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / Math.max(1, width * height)));
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const geometry = createCrawlGeometry(width, height, origin, 41, width < 600 ? 160 : 320);
  let frame = 0, stopped = false;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", finish);
    document.removeEventListener("visibilitychange", visibility);
    media.removeEventListener("change", motion);
  };
  const finish = () => {
    if (stopped) return;
    stopped = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NAVY; ctx.fillRect(0, 0, canvas.width, canvas.height);
    cleanup();
    onCovered();
  };
  const visibility = () => { if (document.hidden) finish(); };
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motion = () => { if (media.matches) finish(); };
  const start = performance.now();
  const tick = (now: number) => {
    if (stopped) return;
    const progress = Math.min(1, (now - start) / CRAWL_MS);
    drawCrawlFrame(ctx, geometry, progress);
    if (progress === 1) finish();
    else frame = requestAnimationFrame(tick);
  };
  window.addEventListener("resize", finish);
  document.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", motion);
  frame = requestAnimationFrame(tick);
  return () => { stopped = true; cleanup(); };
}
