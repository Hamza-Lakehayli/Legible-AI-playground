import { describe, expect, it } from "vitest";
import {
  agentCardSchema,
  collectAgents,
  emptyAgentCard,
  newId,
  parseBundle,
  toRuntimeAgent,
  toRuntimeGraph,
  validateWorkflow,
  workflowSchema,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/builder/schema";
import { TEMPLATE_WORKFLOW } from "@/lib/builder/templates";

function node(
  id: string,
  type: WorkflowNode["type"],
  label = id,
  config: WorkflowNode["config"] = {},
): WorkflowNode {
  return { id, type, label, position: { x: 0, y: 0 }, config };
}

function edge(source: string, target: string, label?: string): WorkflowEdge {
  return { id: `${source}-${target}`, source, target, label };
}

describe("builder templates", () => {
  it("is a valid spec the canvas and runtime can both read", () => {
    expect(workflowSchema.safeParse(TEMPLATE_WORKFLOW).success).toBe(true);
  });

  it("ships a runnable workflow with no validation issues", () => {
    expect(validateWorkflow(TEMPLATE_WORKFLOW)).toEqual([]);
  });

  it("embeds an agent card in every agent node", () => {
    const agentNodes = TEMPLATE_WORKFLOW.nodes.filter((n) => n.type === "agent");
    expect(agentNodes.length).toBeGreaterThan(0);
    for (const node of agentNodes) {
      expect(node.config.agent).toBeDefined();
    }
  });
});

describe("agentCardSchema", () => {
  it("parses leniently while the card is half-typed", () => {
    const parsed = agentCardSchema.safeParse({ name: "", systemPrompt: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tools).toEqual([]);
      expect(parsed.data.approval).toEqual({});
    }
  });

  it("fills a fresh agent card with a starter prompt", () => {
    const card = emptyAgentCard();
    expect(card.systemPrompt).not.toBe("");
    expect(agentCardSchema.safeParse(card).success).toBe(true);
  });
});

describe("validateWorkflow", () => {
  it("requires exactly one Start and at least one End", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("b", "start", "Start 2"),
        node("c", "end", "End"),
      ],
      edges: [edge("a", "c")],
    });
    expect(errors.some((error) => error.includes("exactly one Start"))).toBe(true);
  });

  it("reports unreachable nodes", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("b", "llm", "Orphan", { prompt: "hi" }),
        node("c", "end", "End"),
      ],
      edges: [edge("a", "c")],
    });
    expect(errors.some((error) => error.includes("unreachable"))).toBe(true);
  });

  it("requires a label on every decision branch", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("d", "decision", "Check"),
        node("c", "end", "End"),
      ],
      edges: [edge("a", "d"), edge("d", "c")],
    });
    expect(errors.some((error) => error.includes("Every branch"))).toBe(true);
  });

  it("requires the configured yes/no labels on decision branches", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("d", "decision", "Check", {
          mode: "contains",
          value: "refund",
          trueLabel: "yes",
          falseLabel: "no",
        }),
        node("e1", "end", "End yes"),
        node("e2", "end", "End no"),
      ],
      edges: [
        edge("a", "d"),
        edge("d", "e1", "approve"),
        edge("d", "e2", "reject"),
      ],
    });
    expect(errors.some((error) => error.includes("no “yes” branch"))).toBe(true);
    expect(errors.some((error) => error.includes("no “no” branch"))).toBe(true);
  });

  it("accepts a default branch for the false side", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("d", "decision", "Check", {
          mode: "contains",
          value: "refund",
          trueLabel: "yes",
          falseLabel: "no",
        }),
        node("e1", "end", "End yes"),
        node("e2", "end", "End other"),
      ],
      edges: [
        edge("a", "d"),
        edge("d", "e1", "yes"),
        edge("d", "e2", "default"),
      ],
    });
    expect(errors).toEqual([]);
  });

  it("requires an agent card, a tool, and a prompt where the node needs one", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("b", "agent", "No card"),
        node("c", "tool", "No tool"),
        node("d", "llm", "No prompt"),
        node("e", "end", "End"),
      ],
      edges: [edge("a", "b"), edge("b", "c"), edge("c", "d"), edge("d", "e")],
    });
    expect(errors.some((error) => error.includes("needs its config card"))).toBe(true);
    expect(errors.some((error) => error.includes("no tool selected"))).toBe(true);
    expect(errors.some((error) => error.includes("needs a prompt"))).toBe(true);
  });

  it("flags an agent card whose prompt was cleared", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("b", "agent", "Empty prompt", {
          agent: { ...emptyAgentCard(), systemPrompt: "  " },
        }),
        node("c", "end", "End"),
      ],
      edges: [edge("a", "b"), edge("b", "c")],
    });
    expect(errors.some((error) => error.includes("needs a system prompt"))).toBe(true);
  });

  it("does not let an End node continue", () => {
    const errors = validateWorkflow({
      nodes: [node("a", "start", "Start"), node("b", "end", "End")],
      edges: [edge("a", "b"), edge("b", "a")],
    });
    expect(errors.some((error) => error.includes("cannot have outgoing"))).toBe(true);
  });

  it("accepts a cycle inside the step budget (loops are legal)", () => {
    const errors = validateWorkflow({
      nodes: [
        node("a", "start", "Start"),
        node("b", "llm", "Loop", { prompt: "{{last}}" }),
        node("c", "end", "End"),
      ],
      edges: [edge("a", "b"), edge("b", "a"), edge("a", "c")],
    });
    expect(errors).toEqual([]);
  });
});

describe("runtime payloads", () => {
  it("strip canvas-only fields and mark agent configs with the node id", () => {
    const payload = toRuntimeGraph(TEMPLATE_WORKFLOW);
    expect(payload.nodes[0]).not.toHaveProperty("position");
    expect(payload.nodes[0]).toMatchObject({
      id: "node_start",
      type: "start",
    });
    const agentPayload = payload.nodes.find((n) => n.id === "node_agent");
    expect(agentPayload?.config).toMatchObject({ agentId: "node_agent" });
    expect(agentPayload?.config).not.toHaveProperty("agent");
    expect(payload.edges.find((edge) => edge.id === "edge_decision_summary")).toMatchObject({
      label: "yes",
    });
  });

  it("build the agents map keyed by node id", () => {
    const agents = collectAgents(TEMPLATE_WORKFLOW);
    expect(Object.keys(agents)).toEqual(["node_agent"]);
    expect(agents.node_agent.system_prompt).toBe(
      TEMPLATE_WORKFLOW.nodes[1].config.agent?.systemPrompt,
    );
    // Agent nodes without cards are absent from the map; validateWorkflow
    // already stops the run before a payload gets built.
    expect(collectAgents({ nodes: [node("x", "llm", "L", { prompt: "p" })] })).toEqual({});
  });

  it("snake_case the agent card and drop builder-only lists", () => {
    const card = TEMPLATE_WORKFLOW.nodes[1].config.agent!;
    const payload = toRuntimeAgent(card);
    expect(payload.name).toBe(card.name);
    expect(payload.system_prompt).toBe(card.systemPrompt);
    expect(payload).not.toHaveProperty("systemPrompt");
    expect(payload).not.toHaveProperty("mcpServers");
    expect(payload.approval).toEqual({ "orders.refund": "ask" });
    expect(payload.name).not.toBe("");
  });
});

describe("bundle import", () => {
  it("round-trips a versioned bundle (graphs carry their agent cards)", () => {
    const text = JSON.stringify({
      version: 1,
      graphs: [TEMPLATE_WORKFLOW],
    });
    const result = parseBundle(text);
    expect("bundle" in result).toBe(true);
    if ("bundle" in result) {
      expect(result.bundle.graphs[0].id).toBe(TEMPLATE_WORKFLOW.id);
      const agentNode = result.bundle.graphs[0].nodes.find((n) => n.type === "agent");
      expect(agentNode?.config.agent).toBeDefined();
    }
  });

  it("strips unknown keys such as an older bundle's agents", () => {
    const result = parseBundle(
      JSON.stringify({ version: 1, agents: [{ id: "stale" }], graphs: [] }),
    );
    expect("bundle" in result).toBe(true);
  });

  it("rejects non-JSON and foreign documents", () => {
    expect(parseBundle("not json")).toEqual({ error: "That file is not valid JSON." });
    expect(parseBundle("{}")).toEqual({
      error: "That file is not a Legible builder bundle.",
    });
    expect(
      parseBundle(JSON.stringify({ version: 2, graphs: [] })),
    ).toEqual({ error: "That file is not a Legible builder bundle." });
  });
});

describe("newId", () => {
  it("prefixes and stays unique", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId("node")));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.startsWith("node_")).toBe(true);
  });
});
