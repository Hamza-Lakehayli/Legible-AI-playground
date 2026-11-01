"use client";

import { useEffect, type RefObject } from "react";
import type { Point } from "@/lib/playground-crawl";
import type { EntryPhase } from "@/lib/playground-transition";

export function PlaygroundEntryOverlay({ ref, phase, origin, onCancel, onRetry }: {
  ref: RefObject<HTMLDivElement | null>;
  phase: EntryPhase;
  origin: Point;
  onCancel: () => void;
  onRetry: () => void;
}) {
  useEffect(() => { if (phase === "error") ref.current?.focus({ preventScroll: true }); }, [phase, ref]);
  return (
    <div ref={ref} className="playground-entry-overlay" data-phase={phase}
      data-origin-x={origin.x} data-origin-y={origin.y}
      role={phase === "error" ? "alertdialog" : "dialog"} aria-modal="true"
      aria-label={phase === "error" ? "Playground is taking longer than expected" : "Opening Playground"} tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onCancel(); }
        if (event.key !== "Tab") return;
        const buttons = ref.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          event.preventDefault(); last.focus();
        } else if ((!event.shiftKey && document.activeElement === last) || document.activeElement === ref.current) {
          event.preventDefault(); first.focus();
        }
      }}>
      <canvas className="playground-entry-canvas" aria-hidden="true" />
      {phase === "loading" ? <p className="playground-entry-loading" role="status">Loading…</p> : null}
      {phase === "error" ? <div className="playground-entry-error">
        <p>Playground is taking longer than expected.</p>
        <p className="text-sm opacity-80">Try the connection again, or return to the page you came from.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="playground-entry-action" onClick={onRetry}>Try again</button>
          <button type="button" className="playground-entry-action playground-entry-action--quiet" onClick={onCancel}>Cancel and return</button>
        </div>
      </div> : null}
    </div>
  );
}
