/** Immutable spec snapshots only: no canvas measurements or live drag frames. */
export type History<T> = { past: T[]; present: T; future: T[]; group?: string };
export const HISTORY_LIMIT = 50;
export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}
export function commitHistory<T>(history: History<T>, next: T, group?: string): History<T> {
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  if (group && group === history.group && JSON.stringify(next) === JSON.stringify(history.past.at(-1))) {
    // Native input undo (or deleting newly typed text) can cancel an entire
    // editing session. Do not leave a redundant graph-level undo step behind.
    return { past: history.past.slice(0, -1), present: next, future: [] };
  }
  return {
    past: group && group === history.group ? history.past : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next, future: [], group,
  };
}
export function undoHistory<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1), present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redoHistory<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: history.future[0], future: history.future.slice(1),
  };
}
