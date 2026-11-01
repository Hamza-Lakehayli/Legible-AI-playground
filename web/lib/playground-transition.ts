import type { Point } from "./playground-crawl";

export const CRAWL_MS = 920;
export const REVEAL_MS = 220;
export const RECOVERY_MS = 12_000;
export type EntryPhase = "idle" | "crawling" | "loading" | "error" | "revealing";
export type EntryState = {
  phase: EntryPhase;
  id: number;
  origin: Point;
  source: string;
  requested: boolean;
  committed: boolean;
  ready: boolean;
};
export const idleEntry: EntryState = {
  phase: "idle", id: 0, origin: { x: 0, y: 0 }, source: "/",
  requested: false, committed: false, ready: false,
};
export type EntryEvent =
  | { type: "begin"; id: number; origin: Point; source: string }
  | { type: "covered" | "requested" | "ready" | "timeout" | "failed" | "finished"; id: number }
  | { type: "route"; id: number; path: string }
  | { type: "retry"; id: number }
  | { type: "cancel" };

/** Events from abandoned attempts cannot reveal or re-block a newer page. */
export function entryReducer(state: EntryState, event: EntryEvent): EntryState {
  if (event.type === "cancel") return idleEntry;
  if (event.type === "begin") {
    return state.phase === "idle" ? {
      ...idleEntry, phase: "crawling", id: event.id, origin: event.origin, source: event.source,
    } : state;
  }
  if (state.phase === "idle") return state;
  if (event.type === "retry") {
    return state.phase === "error" ? { ...state, id: event.id, phase: "loading", ready: false } : state;
  }
  if (event.id !== state.id) return state;
  switch (event.type) {
    case "covered": return state.phase === "crawling" ? { ...state, phase: "loading" } : state;
    case "requested": return state.phase === "loading" ? { ...state, requested: true } : state;
    case "route": {
      if (event.path === "/playground" && state.requested) {
        return { ...state, committed: true, phase: state.ready ? "revealing" : state.phase };
      }
      return event.path !== state.source.split(/[?#]/)[0] ? idleEntry : state;
    }
    case "ready": {
      if ((state.phase !== "loading" && state.phase !== "error") || !state.committed) return state;
      return { ...state, ready: true, phase: "revealing" };
    }
    case "timeout": case "failed":
      return state.phase === "loading" && !state.ready ? { ...state, phase: "error" } : state;
    case "finished": return state.phase === "revealing" ? idleEntry : state;
    default: return state;
  }
}
