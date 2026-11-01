// Browser-only callers claim this in effects/events, never during render/SSR.
let owner: symbol | null = null;

export function claimTransition(candidate: symbol): boolean {
  if (owner !== null && owner !== candidate) return false;
  owner = candidate;
  return true;
}
export function releaseTransition(candidate: symbol) {
  if (owner === candidate) owner = null;
}
export function transitionOwnedElsewhere(candidate: symbol): boolean {
  return owner !== null && owner !== candidate;
}
