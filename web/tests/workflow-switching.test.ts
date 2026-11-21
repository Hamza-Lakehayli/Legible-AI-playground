import { afterEach, describe, expect, it, vi } from "vitest";
import { exportBundle, getSavedGraphsSnapshot, importBundle, loadSavedGraphs, saveGraphDraft, saveGraphs, subscribeSavedGraphs } from "@/lib/builder/store";
import { createWorkflowTemplate, TEMPLATE_WORKFLOW } from "@/lib/builder/templates";
import {
  persistWorkflowTransition,
  renameWorkflow,
  resolveWorkflowById,
} from "@/lib/builder/workflow-actions";
import type { WorkflowSpec } from "@/lib/builder/schema";

function workflow(id: string, name: string): WorkflowSpec {
  return { ...structuredClone(TEMPLATE_WORKFLOW), id, name };
}

function installStorage() {
  const values = new Map<string, string>();
  const listeners = new Set<(event: Event) => void>();
  let failWrites = false;
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error("storage full");
      values.set(key, value);
    },
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent: (event: Event) => {
      for (const listener of listeners) listener(event);
      return true;
    },
    addEventListener: (_type: string, listener: (event: Event) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: Event) => void) => listeners.delete(listener),
  });
  return {
    values,
    failWrites(next: boolean) {
      failWrites = next;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("workflow switching", () => {
  it("persists the current draft by ID before the destination becomes active", () => {
    const current = workflow("workflow-current", "Same title");
    current.nodes[1].label = "Edited in the current draft";
    const olderSavedVersion = workflow("workflow-current", "Same title");
    const duplicateTitle = workflow("workflow-other", "Same title");
    const destination = workflow("workflow-destination", "Destination");
    const calls: string[] = [];

    const result = persistWorkflowTransition(
      current,
      destination,
      [olderSavedVersion, duplicateTitle],
      (workflows) => {
        calls.push("workflows");
        expect(workflows.filter((item) => item.id === current.id)).toHaveLength(1);
        expect(workflows.find((item) => item.id === current.id)?.nodes[1].label).toBe(
          "Edited in the current draft",
        );
        return true;
      },
      (draft) => {
        calls.push("draft");
        expect(draft.id).toBe(destination.id);
        return true;
      },
      "2026-11-13T12:00:00.000Z",
    );

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["workflows", "draft"]);
    expect(resolveWorkflowById(duplicateTitle.id, current, [duplicateTitle])).toBe(
      duplicateTitle,
    );
  });

  it("leaves activation untouched when saving the outgoing workflow fails", () => {
    const current = workflow("current", "Current");
    const destination = workflow("destination", "Next");
    let draftWrites = 0;

    const result = persistWorkflowTransition(
      current,
      destination,
      [],
      () => false,
      () => {
        draftWrites += 1;
        return true;
      },
    );

    expect(result).toEqual({ ok: false, reason: "workflows" });
    expect(draftWrites).toBe(0);
  });

  it("does not report a destination active when its draft write fails", () => {
    const current = workflow("current", "Current");
    const destination = workflow("destination", "Next");
    let collection: WorkflowSpec[] = [];

    const result = persistWorkflowTransition(
      current,
      destination,
      [],
      (workflows) => {
        collection = workflows;
        return true;
      },
      () => false,
    );

    expect(result).toEqual({ ok: false, reason: "draft" });
    expect(collection.map((item) => item.id)).toEqual([current.id]);
  });

  it("selects duplicate workflow names by ID and keeps the active draft current", () => {
    const current = workflow("active", "Quarterly review");
    const sameName = workflow("saved-other", "Quarterly review");

    expect(resolveWorkflowById(current.id, current, [sameName])).toBe(current);
    expect(resolveWorkflowById(sameName.id, current, [sameName])).toBe(sameName);
    expect(resolveWorkflowById("missing", current, [sameName])).toBeUndefined();
  });

  it("renames with the existing 80-character limit and rejects blank names", () => {
    const current = workflow("active", "Before");
    expect(renameWorkflow(current, "  After  ", "now")?.name).toBe("After");
    expect(renameWorkflow(current, "x".repeat(81), "now")?.name).toHaveLength(80);
    expect(renameWorkflow(current, "   ")).toBeNull();
  });
});

describe("workflow persistence", () => {
  it("saves and reloads distinct workflows that share a name", () => {
    installStorage();
    const first = workflow("first", "Untitled workflow");
    const second = workflow("second", "Untitled workflow");

    expect(saveGraphs([first, second])).toBe(true);
    expect(loadSavedGraphs().map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("publishes saves to an open workflow list without a reload", () => {
    installStorage();
    const onChange = vi.fn();
    const unsubscribe = subscribeSavedGraphs(onChange);

    expect(saveGraphs([workflow("saved", "Saved workflow")])).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
    expect(getSavedGraphsSnapshot().map((item) => item.id)).toEqual(["saved"]);
    unsubscribe();
  });

  it("returns a failure instead of claiming a local save succeeded", () => {
    const storage = installStorage();
    const first = workflow("first", "First");
    expect(saveGraphs([first])).toBe(true);

    storage.failWrites(true);
    expect(saveGraphs([workflow("second", "Second")])).toBe(false);
    expect(loadSavedGraphs().map((item) => item.id)).toEqual(["first"]);
  });

  it("reports a failed active-draft write", () => {
    const storage = installStorage();
    storage.failWrites(true);
    expect(saveGraphDraft(workflow("active", "Active"))).toBe(false);
  });

  it("keeps import/export usable and merges by ID rather than title", () => {
    const first = workflow("first", "Same title");
    const second = workflow("second", "Same title");
    const exported = exportBundle([first, second]);
    const merged = importBundle(exported, { graphs: [first] });

    expect(merged).toMatchObject({ ok: true, added: 1, skipped: 1 });
    if (merged.ok) expect(merged.graphs.map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("creates unique blank and template workflows without changing the template source", () => {
    const blank = createWorkflowTemplate("blank");
    const refund = createWorkflowTemplate("refund");
    expect(blank.id).not.toBe(refund.id);
    expect(blank.id).not.toBe(TEMPLATE_WORKFLOW.id);
    expect(refund.id).not.toBe(TEMPLATE_WORKFLOW.id);
    expect(TEMPLATE_WORKFLOW.name).toBe("Refund review");
  });
});
