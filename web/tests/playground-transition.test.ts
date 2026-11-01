import { describe, expect, it } from "vitest";
import { entryReducer, idleEntry } from "@/lib/playground-transition";

const start = { type: "begin" as const, id: 1, origin: { x: 40, y: 80 }, source: "/about?from=work" };

describe("Playground entry lifecycle", () => {
  it("waits for both a committed route and a ready editor before revealing", () => {
    let state = entryReducer(idleEntry, start);
    state = entryReducer(state, { type: "covered", id: 1 });
    state = entryReducer(state, { type: "requested", id: 1 });
    state = entryReducer(state, { type: "ready", id: 1 }); // rejected until navigation commits
    expect(state.ready).toBe(false);
    state = entryReducer(state, { type: "route", id: 1, path: "/playground" });
    expect(state.committed).toBe(true);
    expect(state.phase).toBe("loading");
    state = entryReducer(state, { type: "ready", id: 1 });
    expect(state.phase).toBe("revealing");
    expect(entryReducer(state, { type: "finished", id: 1 })).toBe(idleEntry);
  });

  it("ignores stale readiness and timeout callbacks from previous attempts", () => {
    let state = entryReducer(idleEntry, start);
    state = entryReducer(state, { type: "covered", id: 1 });
    state = entryReducer(state, { type: "requested", id: 1 });
    state = entryReducer(state, { type: "route", id: 1, path: "/playground" });
    state = entryReducer(state, { type: "timeout", id: 1 });
    expect(state.phase).toBe("error");
    state = entryReducer(state, { type: "retry", id: 2 });
    expect(state.phase).toBe("loading");
    expect(state.ready).toBe(false);
    expect(entryReducer(state, { type: "ready", id: 1 })).toEqual(state);
    expect(entryReducer(state, { type: "timeout", id: 1 })).toEqual(state);
    state = entryReducer(state, { type: "ready", id: 2 });
    expect(state.phase).toBe("revealing");
  });

  it("returns to idle on cancellation or navigation to an unrelated route", () => {
    let state = entryReducer(idleEntry, start);
    state = entryReducer(state, { type: "covered", id: 1 });
    state = entryReducer(state, { type: "requested", id: 1 });
    expect(entryReducer(state, { type: "route", id: 1, path: "/pricing" })).toBe(idleEntry);
    expect(entryReducer(state, { type: "cancel" })).toBe(idleEntry);
  });
});
