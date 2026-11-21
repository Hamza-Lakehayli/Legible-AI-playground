import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimTransition,
  releaseTransition,
  subscribeTransitionOwnership,
  transitionIsOwned,
} from "@/lib/transition-ownership";

const owners: symbol[] = [];

afterEach(() => {
  owners.splice(0).forEach(releaseTransition);
});

describe("transition ownership notifications", () => {
  it("notifies listeners when an exclusive owner claims and releases", () => {
    const owner = Symbol("test-owner");
    owners.push(owner);
    const onChange = vi.fn();
    const unsubscribe = subscribeTransitionOwnership(onChange);

    expect(transitionIsOwned()).toBe(false);
    expect(claimTransition(owner)).toBe(true);
    expect(transitionIsOwned()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    releaseTransition(owner);
    expect(transitionIsOwned()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("keeps ownership exclusive and ignores releases by a different owner", () => {
    const owner = Symbol("current-owner");
    const other = Symbol("other-owner");
    owners.push(owner);
    const onChange = vi.fn();
    const unsubscribe = subscribeTransitionOwnership(onChange);

    expect(claimTransition(owner)).toBe(true);
    expect(claimTransition(other)).toBe(false);
    releaseTransition(other);
    expect(transitionIsOwned()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    releaseTransition(owner);
    unsubscribe();
  });
});
