"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Point } from "@/lib/playground-crawl";
import { entryReducer, idleEntry, RECOVERY_MS, REVEAL_MS, type EntryEvent } from "@/lib/playground-transition";
import { claimTransition, releaseTransition } from "@/lib/transition-ownership";
import { PlaygroundEntryOverlay } from "./playground-entry-overlay";

type EntryContextValue = {
  requestId: number | null;
  begin: (origin: Point) => boolean;
  signalReady: (id: number) => void;
};
const EntryContext = createContext<EntryContextValue | null>(null);

export function PlaygroundEntryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(idleEntry);
  const current = useRef(idleEntry);
  const sequence = useRef(0);
  const owner = useRef(Symbol("playground-entry"));
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sourceFocus = useRef<HTMLElement | null>(null);
  const cancelCanvas = useRef<(() => void) | null>(null);
  const active = state.phase !== "idle";

  // Updating the ref synchronously gates duplicate clicks in the same event turn.
  const send = useCallback((event: EntryEvent) => {
    const next = entryReducer(current.current, event);
    current.current = next;
    setState(next);
  }, []);
  const cancel = useCallback(() => {
    cancelCanvas.current?.();
    send({ type: "cancel" });
    releaseTransition(owner.current);
  }, [send]);
  const begin = useCallback((origin: Point) => {
    if (current.current.phase !== "idle") return true;
    if (window.location.pathname === "/playground" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!claimTransition(owner.current)) return true;
    router.prefetch("/playground");
    sourceFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    send({ type: "begin", id: ++sequence.current, origin: {
      x: Math.max(0, Math.min(window.innerWidth, origin.x)),
      y: Math.max(0, Math.min(window.innerHeight, origin.y)),
    }, source: window.location.pathname + window.location.search + window.location.hash });
    return true;
  }, [send, router]);
  const signalReady = useCallback((id: number) => send({ type: "ready", id }), [send]);

  useEffect(() => {
    if (!active) return;
    const transitionOwner = owner.current;
    const content = contentRef.current;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const padding = document.body.style.paddingRight;
    const inert = content?.inert ?? false;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    if (content) content.inert = true;
    overlayRef.current?.focus({ preventScroll: true });
    const onPopState = () => cancel();
    window.addEventListener("popstate", onPopState);
    return () => {
      root.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (content) content.inert = inert;
      window.removeEventListener("popstate", onPopState);
      releaseTransition(transitionOwner);
    };
  }, [active, cancel]);

  useEffect(() => {
    if (state.phase !== "crawling") return;
    let cancelled = false;
    const id = state.id;
    // Canvas code and geometry are not part of the homepage's startup work.
    void import("./playground-crawl-renderer").then(({ runCrawl }) => {
      if (cancelled || current.current.id !== id) return;
      const canvas = overlayRef.current?.querySelector("canvas");
      if (!canvas) return;
      cancelCanvas.current = runCrawl(canvas, state.origin, () => send({ type: "covered", id }));
    }).catch(() => { if (!cancelled) send({ type: "covered", id }); });
    // A slow/missing animation chunk must never strand the navigation.
    const safety = window.setTimeout(() => send({ type: "covered", id }), 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      cancelCanvas.current?.();
      cancelCanvas.current = null;
    };
  }, [state.phase, state.id, state.origin, send]);

  useEffect(() => {
    if (state.phase !== "loading" || state.requested) return;
    // The DOM has committed the opaque loading background before router.push.
    const frame = requestAnimationFrame(() => {
      send({ type: "requested", id: state.id });
      try { router.push("/playground"); }
      catch { send({ type: "failed", id: state.id }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [state.phase, state.requested, state.id, router, send]);

  useEffect(() => {
    const id = current.current.id;
    if (current.current.phase !== "idle") send({ type: "route", id, path: pathname });
  }, [pathname, state.requested, send]);

  useEffect(() => {
    if (state.phase !== "loading") return;
    const timer = window.setTimeout(() => send({ type: "timeout", id: state.id }), RECOVERY_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.id, send]);

  useEffect(() => {
    if (state.phase !== "revealing") return;
    const timer = window.setTimeout(() => {
      send({ type: "finished", id: state.id });
      releaseTransition(owner.current);
      requestAnimationFrame(() => document.getElementById("playground-main")?.focus({ preventScroll: true }));
    }, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.id, send]);

  const returnToSource = () => {
    const source = current.current.source;
    const requested = current.current.requested;
    cancel();
    // A newer navigation supersedes any late response from the cancelled push.
    if (requested) router.replace(source);
    requestAnimationFrame(() => {
      if (sourceFocus.current?.isConnected) sourceFocus.current.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>("[data-playground-focus-fallback]")?.focus({ preventScroll: true });
    });
  };
  const retry = () => {
    const id = ++sequence.current;
    send({ type: "retry", id });
    // Re-request readiness from a mounted editor without discarding its work.
    // If the route never arrived, the previous push can be safely superseded.
    if (pathname !== "/playground") {
      router.push("/playground");
    }
  };
  const requestId = active && state.committed && pathname === "/playground" && (state.phase === "loading" || state.phase === "error") ? state.id : null;
  const value = useMemo(() => ({ requestId, begin, signalReady }), [requestId, begin, signalReady]);

  return (
    <EntryContext.Provider value={value}>
      <div ref={contentRef} className="contents">{children}</div>
      {active ? <PlaygroundEntryOverlay ref={overlayRef} phase={state.phase} origin={state.origin} onCancel={returnToSource} onRetry={retry} /> : null}
    </EntryContext.Provider>
  );
}

export function usePlaygroundEntry() {
  const value = useContext(EntryContext);
  if (!value) throw new Error("Playground entry requires PlaygroundEntryProvider");
  return value;
}
