"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollProgressRing — the small circular page-progress indicator pinned to
 * the top-right corner of every page (docs/hero-glitch-plan.md).
 *
 * It is informational chrome, not decoration: the ring fills as the document
 * scrolls and the mono number reads out the percentage. rAF-throttled, so a
 * fast scroll or a resize storm still costs at most one update per frame.
 *
 * Sits below the sticky header (h-16) and above page content; the glitch
 * stage (z-60) covers it during transitions like everything else.
 */

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScrollProgressRing() {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const update = () => {
      frame.current = 0;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress((current) =>
        Math.abs(current - next) < 0.001 ? current : next,
      );
    };

    const schedule = () => {
      if (frame.current === 0) frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current !== 0) cancelAnimationFrame(frame.current);
    };
  }, []);

  const percent = Math.round(progress * 100);

  return (
    <div
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="fixed top-20 right-4 z-30 grid size-11 place-items-center rounded-full border border-line bg-page/90 backdrop-blur-[2px]"
    >
      <svg
        viewBox="0 0 36 36"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          className="stroke-line"
        />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className="stroke-accent-ink transition-[stroke-dashoffset] duration-150 ease-linear"
        />
      </svg>
      <span className="font-mono text-[10px] leading-none text-muted tabular-nums">
        {percent}
      </span>
    </div>
  );
}
