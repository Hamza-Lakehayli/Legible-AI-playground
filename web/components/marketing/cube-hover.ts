import {
  CUBE_TEAR_DURATION_MS,
  CUBE_TEAR_SEED,
  cubeHoverEnabled,
  cubeTearProgress,
  cubeTearSlices,
  pointerInsideCube,
  projectedCubeBounds,
} from "@/lib/cube-hover";
import { TEAR_STEPS, glitchProgress } from "@/lib/glitch";
import { subscribeTransitionOwnership, transitionIsOwned } from "@/lib/transition-ownership";

type PausedAnimation = {
  element: HTMLElement;
  playState: string;
};

type CubeTear = {
  cube: HTMLElement;
  layer: HTMLDivElement;
  strips: HTMLDivElement[];
  contents: HTMLDivElement[];
  motion: PausedAnimation[];
  visibility: string;
  frame: number;
  start: number;
  lastProgress: number;
};

/** Observe the pointer without giving a decorative background any hit targets. */
export function installCubeHover(host: HTMLElement): () => void {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cubes = [...host.querySelectorAll<HTMLElement>(".home-space-cube")];
  const cooldowns = new WeakMap<HTMLElement, number>();
  let hovered: HTMLElement | null = null;
  let activeTear: CubeTear | null = null;
  let pending: { x: number; y: number; target: EventTarget | null } | null = null;
  let frame = 0;

  const enabled = () => cubeHoverEnabled({
    finePointer: pointer.matches,
    reducedMotion: reduced.matches,
    paused: host.dataset.cubesPaused === "true",
    hidden: document.hidden,
    transitionOwned: transitionIsOwned(),
    running: host.dataset.spaceState === "running",
  });

  const restoreAnimations = (motion: PausedAnimation[]) => {
    motion.forEach(({ element, playState }) => {
      element.style.animationPlayState = playState;
    });
  };

  const finishTear = () => {
    if (!activeTear) return;
    const tear = activeTear;
    activeTear = null;
    cancelAnimationFrame(tear.frame);
    tear.layer.remove();
    tear.cube.style.visibility = tear.visibility;
    tear.cube.querySelector<HTMLElement>("[data-cube-glitch]")?.setAttribute(
      "data-cube-glitch",
      "idle",
    );
    restoreAnimations(tear.motion);
  };

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
    hovered = null;
    finishTear();
    host.querySelectorAll<HTMLElement>("[data-cube-glitch]").forEach((element) => {
      element.dataset.cubeGlitch = "idle";
    });
  };

  const freezeSnapshot = (cube: HTMLElement, clone: HTMLElement) => {
    clone.classList.add("home-space-cube--tear-snapshot");
    clone.removeAttribute("data-home-cube-group");
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    clone.style.setProperty("left", getComputedStyle(cube).left, "important");
    clone.style.setProperty("top", getComputedStyle(cube).top, "important");
    clone.style.setProperty(
      "--cube-size",
      getComputedStyle(cube).getPropertyValue("--cube-size"),
      "important",
    );
    clone.style.transform = "none";
    clone.querySelector<HTMLElement>("[data-cube-glitch]")?.setAttribute(
      "data-cube-glitch",
      "idle",
    );

    const sourceMotion = cube.querySelectorAll<HTMLElement>(
      ".home-space-cube__drift, .home-space-cube__body",
    );
    const cloneMotion = clone.querySelectorAll<HTMLElement>(
      ".home-space-cube__drift, .home-space-cube__body",
    );
    sourceMotion.forEach((source, index) => {
      const target = cloneMotion[index];
      if (!target) return;
      const computed = getComputedStyle(source);
      target.style.animation = "none";
      target.style.transform = computed.transform;
      target.style.transformOrigin = computed.transformOrigin;
    });
  };

  const updateStripClips = (
    tear: CubeTear,
    bounds: NonNullable<ReturnType<typeof projectedCubeBounds>>,
    progress: number,
    frameSize: number,
    seed: number,
  ) => {
    const height = window.innerHeight;
    const top = Math.max(0, Math.min(height, bounds.top));
    const bottom = Math.max(top, Math.min(height, bounds.bottom));
    const slices = cubeTearSlices(progress, frameSize, seed);

    slices.forEach((slice, index) => {
      const strip = tear.strips[index];
      const content = tear.contents[index];
      if (!strip || !content) return;
      const y1 = Math.max(top, Math.min(bottom, bounds.top + slice.top * (bounds.bottom - bounds.top)));
      const y2 = Math.max(
        y1,
        Math.min(
          bottom,
          bounds.top + (slice.top + slice.height) * (bounds.bottom - bounds.top),
        ),
      );
      const visible = y2 > y1;
      strip.style.visibility = visible ? "visible" : "hidden";
      strip.style.clipPath = visible
        ? `inset(${y1.toFixed(2)}px 0px ${(height - y2).toFixed(2)}px 0px)`
        : "inset(100%)";
      content.style.transform = `translate3d(${slice.dx.toFixed(2)}px, 0, 0)`;
    });
  };

  const startTear = (cube: HTMLElement, index: number) => {
    const motionNodes = [
      ...cube.querySelectorAll<HTMLElement>(
        ".home-space-cube__drift, .home-space-cube__body",
      ),
    ].map((element) => ({
      element,
      playState: element.style.animationPlayState,
    }));
    motionNodes.forEach(({ element }) => {
      element.style.animationPlayState = "paused";
    });

    const bounds = projectedCubeBounds(
      [...cube.querySelectorAll<SVGElement>(".home-space-cube__face")].map((face) =>
        face.getBoundingClientRect(),
      ),
    );
    if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
      restoreAnimations(motionNodes);
      return;
    }

    const layer = document.createElement("div");
    layer.className = "home-cube-tear-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("inert", "");
    const strips: HTMLDivElement[] = [];
    const contents: HTMLDivElement[] = [];
    const initialSlices = cubeTearSlices(
      0,
      Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top),
      CUBE_TEAR_SEED + (index + 1) * 131,
    );

    initialSlices.forEach(() => {
      const strip = document.createElement("div");
      strip.className = "home-cube-tear-strip";
      const content = document.createElement("div");
      content.className = "home-cube-tear-strip__content";
      content.style.willChange = "transform";
      const snapshot = cube.cloneNode(true) as HTMLElement;
      freezeSnapshot(cube, snapshot);
      content.appendChild(snapshot);
      strip.appendChild(content);
      layer.appendChild(strip);
      strips.push(strip);
      contents.push(content);
    });

    host.insertBefore(layer, cube.nextSibling);
    const visibility = cube.style.visibility;
    cube.style.visibility = "hidden";
    const tear: CubeTear = {
      cube,
      layer,
      strips,
      contents,
      motion: motionNodes,
      visibility,
      frame: 0,
      start: performance.now(),
      lastProgress: -1,
    };
    activeTear = tear;
    cube.querySelector<HTMLElement>("[data-cube-glitch]")?.setAttribute(
      "data-cube-glitch",
      "active",
    );

    const frameSize = Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top);
    const seed = CUBE_TEAR_SEED + (index + 1) * 131;
    const animate = (now: number) => {
      if (activeTear !== tear) return;
      if (!enabled()) {
        finishTear();
        return;
      }

      const elapsed = now - tear.start;
      const quantizedProgress = glitchProgress(
        cubeTearProgress(elapsed),
        TEAR_STEPS - 1,
      );
      if (quantizedProgress !== tear.lastProgress) {
        tear.lastProgress = quantizedProgress;
        updateStripClips(tear, bounds, quantizedProgress, frameSize, seed);
      }
      if (elapsed >= CUBE_TEAR_DURATION_MS) {
        finishTear();
        return;
      }
      tear.frame = requestAnimationFrame(animate);
    };

    updateStripClips(tear, bounds, 0, frameSize, seed);
    tear.frame = requestAnimationFrame(animate);
  };

  const inspectPointer = () => {
    frame = 0;
    if (!pending || !enabled()) {
      reset();
      return;
    }
    const { x, y, target } = pending;
    pending = null;
    // Never react through opaque sheets, header/footer, text, or an actual control.
    if (target instanceof Element && target.closest(
      ".home-sheet, header, footer, [data-home-backdrop-end], a, button, input, textarea, select, h1, h2, p",
    )) {
      hovered = null;
      finishTear();
      return;
    }

    const hit = cubes.find((cube) => {
      if (getComputedStyle(cube).display === "none") return false;
      const bounds = projectedCubeBounds(
        [...cube.querySelectorAll(".home-space-cube__face")].map((face) =>
          face.getBoundingClientRect(),
        ),
      );
      return bounds !== null && pointerInsideCube(x, y, bounds);
    }) ?? null;

    if (hit === hovered) return;
    if (activeTear) finishTear();
    hovered = hit;
    if (!hit || performance.now() - (cooldowns.get(hit) ?? -Infinity) < 1200) return;
    const glitch = hit.querySelector<HTMLElement>("[data-cube-glitch]");
    if (!glitch || glitch.dataset.cubeGlitch === "active") return;
    cooldowns.set(hit, performance.now());
    startTear(hit, cubes.indexOf(hit));
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !enabled()) return;
    pending = { x: event.clientX, y: event.clientY, target: event.target };
    if (!frame) frame = requestAnimationFrame(inspectPointer);
  };
  const onOwnershipChange = () => { if (transitionIsOwned()) reset(); };
  const onVisibilityChange = () => { if (document.hidden) reset(); };
  const stateObserver = new MutationObserver(() => { if (!enabled()) reset(); });
  stateObserver.observe(host, { attributes: true, attributeFilter: ["data-cubes-paused", "data-space-state"] });
  const unsubscribe = subscribeTransitionOwnership(onOwnershipChange);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("blur", reset);
  document.addEventListener("pointerleave", reset);
  document.addEventListener("visibilitychange", onVisibilityChange);
  pointer.addEventListener("change", reset);
  reduced.addEventListener("change", reset);

  return () => {
    reset();
    stateObserver.disconnect();
    unsubscribe();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("blur", reset);
    document.removeEventListener("pointerleave", reset);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    pointer.removeEventListener("change", reset);
    reduced.removeEventListener("change", reset);
  };
}
