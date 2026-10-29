import { describe, expect, it } from "vitest";
import { commitHistory, createHistory, HISTORY_LIMIT, redoHistory, undoHistory } from "../lib/builder/history";
import { duplicateNode, hasMeaningfulWork } from "../lib/builder/editing";
import { createWorkflowTemplate, TEMPLATE_WORKFLOW } from "../lib/builder/templates";
import { validateWorkflow, validateWorkflowDetails, workflowSchema } from "../lib/builder/schema";

describe("graph history", () => {
  it("groups one text editing session and separates subsequent transactions", () => {
    let h = createHistory("original");
    h = commitHistory(h, "o", "name-focus-1");
    h = commitHistory(h, "one", "name-focus-1");
    h = commitHistory(h, "two", "name-focus-2");
    expect(h.past).toEqual(["original", "one"]);
    expect(undoHistory(h).present).toBe("one");
    expect(undoHistory(undoHistory(h)).present).toBe("original");
    expect(redoHistory(undoHistory(h)).present).toBe("two");
  });

  it("ignores no-ops, caps history, and invalidates redo after a new edit", () => {
    let h = createHistory(0);
    expect(commitHistory(h, 0)).toBe(h);
    expect(undoHistory(h)).toBe(h);
    expect(redoHistory(h)).toBe(h);
    for (let i = 1; i <= 60; i++) h = commitHistory(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    h = commitHistory(undoHistory(h), 99);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(99);
  });

  it("drops a text transaction cancelled by native input undo", () => {
    let h = createHistory("original");
    h = commitHistory(h, "original typed", "focus-1");
    h = commitHistory(h, "original", "focus-1");
    expect(h.past).toEqual([]);
    expect(h.present).toBe("original");
  });

  it("restores graph structure, drag-end positions, labels, imports and template replacement", () => {
    const original = structuredClone(TEMPLATE_WORKFLOW);
    const moved = structuredClone(original);
    moved.nodes[1].position = { x: 100, y: 200 };
    const edited = structuredClone(moved);
    edited.edges[0].label = "updated";
    const imported = { ...structuredClone(edited), name: "Imported", nodes: edited.nodes.slice(0, -1) };
    const blank = createWorkflowTemplate("blank");
    let h = createHistory(original);
    for (const next of [moved, edited, imported, blank]) h = commitHistory(h, next);
    expect(h.past).toHaveLength(4);
    for (const expected of [imported, edited, moved, original]) {
      h = undoHistory(h);
      expect(h.present).toEqual(expected);
    }
    for (const expected of [moved, edited, imported, blank]) {
      h = redoHistory(h);
      expect(h.present).toEqual(expected);
    }
  });
});

describe("builder editing", () => {
  it("deep-copies ordinary nodes but not structural endpoints", () => {
    const agent = structuredClone(TEMPLATE_WORKFLOW.nodes[1]);
    const copy = duplicateNode(agent)!;
    expect(copy.id).not.toBe(agent.id);
    expect(copy.position).toEqual({ x: agent.position.x + 24, y: agent.position.y + 28 });
    copy.config.agent!.tools.length = 0;
    expect(agent.config.agent!.tools.length).toBeGreaterThan(0);
    for (const node of TEMPLATE_WORKFLOW.nodes.filter((n) => ["start", "end"].includes(n.type))) {
      expect(duplicateNode(node)).toBeNull();
    }
  });

  it("shares aggregate and per-node validation without inventing a tool requirement", () => {
    const graph = structuredClone(TEMPLATE_WORKFLOW);
    graph.nodes[1].config.agent!.tools = [];
    expect(validateWorkflow(graph)).toEqual([]);
    graph.nodes[1].config.agent!.systemPrompt = "";
    const details = validateWorkflowDetails(graph);
    expect(details.errors).toEqual(validateWorkflow(graph));
    expect(details.nodeErrors.get(graph.nodes[1].id)).toContainEqual(expect.stringContaining("system prompt"));
    const copy = duplicateNode(graph.nodes[1])!;
    const invalid = validateWorkflowDetails({ ...graph, nodes: [...graph.nodes, copy] });
    expect(invalid.nodeErrors.get(copy.id)).toContainEqual(expect.stringContaining("unreachable"));
  });

  it("creates distinct, independent, schema-valid templates and guards authored work", () => {
    const blank = createWorkflowTemplate("blank");
    const refund = createWorkflowTemplate("refund");
    expect(blank.id).not.toBe(refund.id);
    expect(workflowSchema.safeParse(blank).success).toBe(true);
    expect(validateWorkflow(blank)).toEqual([]);
    expect(validateWorkflow(refund)).toEqual([]);
    expect(hasMeaningfulWork(blank)).toBe(false);
    expect(hasMeaningfulWork(refund)).toBe(true);
    blank.nodes[0].position.x += 5;
    expect(hasMeaningfulWork(blank)).toBe(true);
    refund.nodes[1].config.agent!.tools.length = 0;
    expect(TEMPLATE_WORKFLOW.nodes[1].config.agent!.tools.length).toBeGreaterThan(0);
  });
});
