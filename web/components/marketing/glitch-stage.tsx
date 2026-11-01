"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { claimTransition, releaseTransition, transitionOwnedElsewhere } from "@/lib/transition-ownership";
import {
  TEAR_STEPS,
  enterIntensity,
  exitIntensity,
  glitchProgress,
  scramble,
  tearTable,
} from "@/lib/glitch";

/**
 * GlitchStage (docs/hero-glitch-plan.md) — the site's signature transition,
 * played on **page-to-page navigation only**. Scrolling is left completely
 * native: no pins, no scrub, no scroll-triggered landings.
 *
 * An intercepted internal link click starts a fixed-length, time-based
 * sequence that always plays out in full:
 *
 *   1. EXIT: the current screen tears down — slice bands snap, the headline
 *      scrambles into chaos, hex fragments rise.
 *   2. TELEPORT: the route swap happens behind an opaque backdrop, so the
 *      screen never shows a half-loaded page.
 *   3. ENTER: the destination assembles out of the chaos and resolves clean;
 *      the stage lifts, revealing the identical real page underneath.
 *
 * Back/forward gets the same ENTER pass (there is no screen to tear down — the
 * old page is already gone). The first mount never glitches.
 *
 * Reduced motion: the controller never engages and links navigate normally.
 * Server markup is untouched — the stage is an empty, hidden overlay until a
 * navigation runs.
 */

/* Kimi-style hex/binary fragments, hand-placed (not random, so layouts stay
 * deliberate). `under` floats behind the content, `over` on top of it. */
type Fragment = {
  text: string;
  top: string;
  left: string;
  tone: "muted" | "ink";
  opacity: number;
};

const UNDER_FRAGMENTS: Fragment[] = [
  { text: "0xC8A4 11100010", top: "6%", left: "1%", tone: "muted", opacity: 0.9 },
  { text: "0x00FF", top: "13%", left: "64%", tone: "muted", opacity: 0.8 },
  { text: "00101100 0xAA91", top: "88%", left: "3%", tone: "muted", opacity: 0.9 },
  { text: "0x9E37 7F", top: "78%", left: "86%", tone: "muted", opacity: 0.8 },
  { text: "11001101 0xB2", top: "48%", left: "-1%", tone: "muted", opacity: 0.7 },
];

const OVER_FRAGMENTS: Fragment[] = [
  { text: "2F10 0xC8A4 11100010 0x00FF", top: "7%", left: "46%", tone: "ink", opacity: 0.55 },
  { text: "0x1E11 0xE0", top: "58%", left: "38%", tone: "ink", opacity: 0.3 },
  { text: "11010001", top: "93%", left: "62%", tone: "ink", opacity: 0.5 },
  { text: "0xABF2", top: "40%", left: "89%", tone: "ink", opacity: 0.4 },
];

/* Solid mask bars — the horizontal slabs in the reference glitch look. */
type Bar = {
  top: string;
  left: string;
  width: string;
  height: string;
  tone: "ink" | "soft" | "line";
  opacity: number;
};

const BARS: Bar[] = [
  { top: "24%", left: "-1.5%", width: "12%", height: "3.5%", tone: "soft", opacity: 0.9 },
  { top: "31%", left: "80%", width: "10%", height: "4%", tone: "ink", opacity: 0.75 },
  { top: "66%", left: "16%", width: "9%", height: "3%", tone: "line", opacity: 1 },
  { top: "75%", left: "58%", width: "14%", height: "4.5%", tone: "ink", opacity: 0.55 },
];

const BAR_TONES: Record<Bar["tone"], string> = {
  ink: "bg-ink/80",
  soft: "bg-accent-soft",
  line: "bg-line",
};

/* Timing. */
const SCRAMBLE_SEED = 7;
const EXIT_MS = 420;
const ENTER_MS = 520;
const NAV_TIMEOUT_MS = 2500;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** rAF-driven phase tween — the animation always finishes, whatever the user does. */
function animate(
  durationMs: number,
  apply: (p: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      apply(p);
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export function GlitchStage() {
  const pathname = usePathname();
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  /* Latest values for the long-lived controller (listeners mount once). */
  const pathRef = useRef(pathname);
  const pathWaiters = useRef<Array<() => void>>([]);
  const routerRef = useRef(router);
  const enterOnlyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    const waiters = pathWaiters.current;
    pathWaiters.current = [];
    waiters.forEach((resolve) => resolve());
  }, [pathname]);

  useEffect(() => {
    const stage = stageRef.current;
    const host = hostRef.current;
    const backdrop = backdropRef.current;
    if (!stage || !host || !backdrop) return;

    const table = tearTable();
    const fragments = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-glitch-fragment]"),
    );
    let busy = false;
    let cancelled = false;
    const owner = Symbol("marketing-glitch");
    let scrollLock: { overflow: string; padding: string } | null = null;

    const isReduced = () => reducedMotion();

    const lockScroll = () => {
      scrollLock = { overflow: document.documentElement.style.overflow, padding: document.body.style.paddingRight };
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = "hidden";
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    };
    const unlockScroll = () => {
      if (!scrollLock) return;
      document.documentElement.style.overflow = scrollLock.overflow;
      document.body.style.paddingRight = scrollLock.padding;
      scrollLock = null;
      releaseTransition(owner);
    };

    /* ---------- clone stage ---------- */

    type CloneWrap = {
      root: HTMLDivElement;
      base: HTMLElement;
      clones: HTMLElement[];
      overlay: HTMLElement | null;
      original: string;
      /** Height of the visible slice of the block (band math). */
      height: number;
      /** How much of the block sits above the viewport. */
      offset: number;
      /** Full height of the block (residue clip math). */
      fullHeight: number;
    };

    /**
     * Clone one block, cropped to its visible slice: the stage only ever
     * shows what the viewport shows, so tear bands always land on-screen even
     * for long sections.
     */
    const buildWrap = (source: HTMLElement): CloneWrap => {
      const rect = source.getBoundingClientRect();
      const offset = Math.max(0, Math.round(-rect.top));
      const height = Math.max(
        0,
        Math.round(Math.min(rect.height - offset, window.innerHeight - Math.max(0, rect.top))),
      );

      const root = document.createElement("div");
      root.className = "glitch-stage-clone";
      root.style.top = `${Math.max(0, Math.round(rect.top))}px`;
      root.style.height = `${height}px`;
      root.style.overflow = "hidden";

      const base = source.cloneNode(true) as HTMLElement;
      base.classList.add("glitch-stage-base");
      base.style.marginTop = `${-offset}px`;
      base.setAttribute("inert", "");
      base.setAttribute("aria-hidden", "true");
      root.appendChild(base);

      /* Residue frames are cloned BEFORE the headline is swapped, so bands
       * show clean resolved text while the base frame scrambles. */
      const clones = [0, 1, 2].map((c) => {
        const clone = source.cloneNode(true) as HTMLElement;
        clone.classList.add("glitch-clone");
        if (c === 0) clone.classList.add("glitch-clone--bright");
        if (c === 2) clone.classList.add("glitch-clone--dark");
        clone.style.top = `${-offset}px`;
        clone.style.height = `${Math.round(rect.height)}px`;
        clone.setAttribute("inert", "");
        clone.setAttribute("aria-hidden", "true");
        root.appendChild(clone);
        return clone;
      });

      /* Headline scramble: the real heading text stays in place (hidden) so
       * the clone's layout never reflows — wide block glyphs would otherwise
       * re-wrap the heading into extra lines. The scrambled text is painted
       * in an overlay clipped to the heading's own box. */
      const heading = base.querySelector<HTMLElement>("h1, h2");
      const original = heading?.textContent ?? "";
      let overlay: HTMLElement | null = null;
      if (heading && original.trim()) {
        heading.style.position = "relative";
        const layout = document.createElement("span");
        layout.style.visibility = "hidden";
        while (heading.firstChild) layout.appendChild(heading.firstChild);
        heading.appendChild(layout);

        overlay = document.createElement("span");
        overlay.setAttribute("aria-hidden", "true");
        overlay.style.cssText =
          "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
        /* Match the heading's own wrapping so the resolved frame is
         * pixel-identical to the real one (balanced headings included). */
        const wrapStyle = window.getComputedStyle(heading).textWrap;
        if (wrapStyle) overlay.style.textWrap = wrapStyle;
        overlay.textContent = original;
        heading.appendChild(overlay);
      }

      host.appendChild(root);
      return {
        root,
        base,
        clones,
        overlay,
        original,
        height,
        offset,
        fullHeight: Math.round(rect.height),
      };
    };

    /** Every block intersecting the viewport — the whole screen, torn. */
    const buildWraps = (): CloneWrap[] => {
      const vh = window.innerHeight;
      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>("main > *"),
      );
      const footer = document.querySelector<HTMLElement>("footer");
      const all = footer ? [...blocks, footer] : blocks;
      return all
        .filter((el) => {
          if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;
          const rect = el.getBoundingClientRect();
          return rect.height > 0 && rect.bottom > 0 && rect.top < vh;
        })
        .map((el) => buildWrap(el));
    };

    const buildChrome = () => {
      const header = document.querySelector<HTMLElement>("header");
      if (!header) return null;
      const clone = header.cloneNode(true) as HTMLElement;
      clone.classList.add("glitch-stage-chrome");
      clone.setAttribute("inert", "");
      clone.setAttribute("aria-hidden", "true");
      clone.style.top = "0px";
      host.appendChild(clone);
      return clone;
    };

    const applyTear = (
      wrap: CloneWrap,
      phase: "exit" | "enter",
      p: number,
    ) => {
      const intensity = phase === "exit" ? exitIntensity(p) : enterIntensity(p);
      const step = Math.max(
        0,
        Math.min(
          TEAR_STEPS - 1,
          Math.round(glitchProgress(p, TEAR_STEPS - 1) * (TEAR_STEPS - 1)),
        ),
      );
      const clean = intensity < 0.01;

      wrap.clones.forEach((clone, c) => {
        if (clean) {
          clone.style.visibility = "hidden";
          return;
        }
        const entry = table[step][c];
        const band = Math.min(entry.height * wrap.height, 90);
        const top = wrap.offset + entry.top * wrap.height;
        const bottom = wrap.fullHeight - (top + band);
        clone.style.visibility = "visible";
        clone.style.clipPath = `inset(${top.toFixed(1)}px 0px ${bottom.toFixed(1)}px 0px)`;
        const dx = [1, -1, 1][c] * entry.dx * intensity;
        clone.style.transform = `translateX(${dx.toFixed(1)}px)`;
        clone.style.opacity = c === 1 ? "0.85" : "0.7";
      });

      const shudder = (step % 2 === 0 ? 1 : -1) * 1.5 * intensity;
      wrap.base.style.transform = clean ? "" : `translateX(${shudder.toFixed(2)}px)`;

      if (wrap.overlay) {
        wrap.overlay.textContent = scramble(wrap.original, 1 - intensity, SCRAMBLE_SEED);
      }

      fragments.forEach((fragment, index) => {
        const base = Number(fragment.dataset.base ?? 0.5);
        const driftY = 16 + (index % 5) * 7;
        const driftX = index % 2 === 0 ? -10 : 10;
        fragment.style.opacity = String(base * intensity);
        fragment.style.transform = `translate(${((p - 0.5) * driftX).toFixed(1)}px, ${((p - 0.5) * driftY).toFixed(1)}px)`;
      });
    };

    const clearStage = () => {
      host.innerHTML = "";
      fragments.forEach((f) => {
        f.style.opacity = "0";
        f.style.transform = "";
      });
      backdrop.style.opacity = "0";
      stage.dataset.state = "off";
    };

    /* ---------- navigation transitions ---------- */

    const waitForPath = (href: string): Promise<void> => {
      const target = href.split("?")[0].split("#")[0];
      if (window.location.pathname === target) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          pathWaiters.current = pathWaiters.current.filter((fn) => fn !== done);
          resolve();
        }, NAV_TIMEOUT_MS);
        const done = () => {
          window.clearTimeout(timer);
          resolve();
        };
        pathWaiters.current.push(done);
      });
    };

    const runTransition = async (href: string): Promise<void> => {
      if (busy || isReduced() || !claimTransition(owner)) return;
      busy = true;

      lockScroll();
      stage.dataset.state = "on";

      let wraps = buildWraps();
      buildChrome();

      /* EXIT — tear the current screen down into chaos. */
      await animate(EXIT_MS, (p) => {
        backdrop.style.opacity = String(Math.min(1, p * 5));
        wraps.forEach((wrap) => applyTear(wrap, "exit", p));
      });
      if (cancelled) return;

      /* Teleport behind the chaos (opaque backdrop + full-intensity tear). */
      routerRef.current.push(href);
      await waitForPath(href);
      if (cancelled) return;
      window.scrollTo({ top: 0, behavior: "instant" });

      /* ENTER — the destination assembles out of the chaos and resolves. */
      await nextFrame();
      host.innerHTML = "";
      buildChrome();
      wraps = buildWraps();
      await animate(ENTER_MS, (p) => {
        backdrop.style.opacity = "1";
        wraps.forEach((wrap) => applyTear(wrap, "enter", p));
      });

      clearStage();
      unlockScroll();
      busy = false;
    };

    /** Enter-only pass (back/forward and any navigation we didn't intercept). */
    const runEnterOnly = async (): Promise<void> => {
      if (busy || isReduced() || !claimTransition(owner)) return;
      busy = true;
      lockScroll();
      stage.dataset.state = "on";
      backdrop.style.opacity = "1";
      buildChrome();
      const wraps = buildWraps();
      await animate(ENTER_MS, (p) => {
        wraps.forEach((wrap) => applyTear(wrap, "enter", p));
      });
      clearStage();
      unlockScroll();
      busy = false;
    };

    /* ---------- input ---------- */

    /* Scrolling is native. While a transition runs, input that would move the
     * document is swallowed so the real page can't drift under the chaos. */
    const onWheel = (event: WheelEvent) => {
      if (busy) event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!busy) return;
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === " " ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (busy) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (transitionOwnedElsewhere(owner)) { event.preventDefault(); return; }
      if (isReduced()) return;
      /* Clicks during a transition are swallowed: the page under the cursor
       * is about to be replaced by the destination. */
      if (busy) {
        event.preventDefault();
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      // Playground owns a persistent root-level transition; keep this
      // marketing-only stage from competing for the same click.
      if (anchor.hasAttribute("data-playground-entry")) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page: native
      event.preventDefault();
      void runTransition(url.pathname + url.search);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("click", onClick, true);

    /* Back/forward (and any navigation we didn't intercept) gets an
     * enter-only pass once the new page has rendered. The pathname effect
     * below calls this; during an intercepted transition `busy` is still set,
     * so the runner stays a no-op there. */
    enterOnlyRef.current = () => {
      void runEnterOnly();
    };

    return () => {
      cancelled = true;
      enterOnlyRef.current = null;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("click", onClick, true);
      clearStage();
      unlockScroll();
      releaseTransition(owner);
    };
  }, []);

  /* Enter-only glitch when the pathname changes outside a transition
   * (back/forward buttons, programmatic router pushes). The first render is
   * skipped so the landing page never glitches on load. */
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    enterOnlyRef.current?.();
  }, [pathname]);

  const renderFragment = (fragment: Fragment) => (
    <span
      key={fragment.text}
      data-glitch-fragment
      data-base={fragment.opacity}
      className={cn(
        "glitch-fragment absolute font-mono text-[11px] leading-none whitespace-nowrap",
        fragment.tone === "ink" ? "text-accent-ink" : "text-muted",
      )}
      style={{ top: fragment.top, left: fragment.left, opacity: 0 }}
    >
      {fragment.text}
    </span>
  );

  return (
    <div
      ref={stageRef}
      className="glitch-stage"
      data-state="off"
      aria-hidden="true"
    >
      <div ref={backdropRef} className="glitch-backdrop bg-page" />
      <div className="glitch-layer glitch-layer--under">
        {UNDER_FRAGMENTS.map(renderFragment)}
        {BARS.map((bar) => (
          <span
            key={bar.top + bar.left}
            data-glitch-fragment
            data-base={bar.opacity}
            className={cn("glitch-fragment absolute block", BAR_TONES[bar.tone])}
            style={{
              top: bar.top,
              left: bar.left,
              width: bar.width,
              height: bar.height,
              opacity: 0,
            }}
          />
        ))}
      </div>
      <div ref={hostRef} className="glitch-stage-host" />
      <div className="glitch-layer glitch-layer--over">
        {OVER_FRAGMENTS.map(renderFragment)}
      </div>
    </div>
  );
}
