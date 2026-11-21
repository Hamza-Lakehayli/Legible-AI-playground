// Browser-only callers claim this in effects/events, never during render/SSR.
let owner: symbol | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeTransitionOwnership(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function transitionIsOwned(): boolean {
  return owner !== null;
}

export function claimTransition(candidate: symbol): boolean {
  if (owner !== null && owner !== candidate) return false;
  if (owner === candidate) return true;
  owner = candidate;
  notify();
  return true;
}
export function releaseTransition(candidate: symbol) {
  if (owner !== candidate) return;
  owner = null;
  notify();
}
export function transitionOwnedElsewhere(candidate: symbol): boolean {
  return owner !== null && owner !== candidate;
}
